/**
 * 推理图构建：把一条 assistant 消息（text 思考段 + tool-call）转成 react-flow {nodes, edges}。
 *
 * 这是查询控制台（tools/debug-console）里那张「推理图」的移植版——同一套节点类型 / 同一套
 * 解析逻辑，让 /walkthrough 讲解页能展示**和控制台一致**的推理图。两点差异：
 *   1. 数据源是静态轨迹（components/walkthrough/ex1-trace.ts），不是 LLM 实时流（KB 不调 LLM）。
 *   2. 布局不用 dagre（web 未装），改用本文件自带的无依赖分层布局 layoutGraph。
 *
 * 节点类型：
 *   - query   起始用户问题（紫色大卡片）
 *   - thought 每个 **【TYPE】标题** 段 → 一个小思考节点（带 body 全文）
 *   - file    tool call 读到的文件（按 type 着色）
 *   - search  tool call 搜索（带 query）
 *   - list    list_* / outlinks / backlinks（查关系）
 *   - result  最终答案（金色大卡片）
 *   - other   兜底
 *
 * 链式构建：query → thought → thought → tool → thought → tool → …
 * 同一 file path 多次读 = 同一节点 hitCount + 1（不重复建）
 */
// 带 .ts 扩展的相对导入（同 lib/markdown-render.ts 的约定）——让本模块能被 node --test
// 直接加载做回归测试（见 build-flow-graph.test.ts），Next/webpack 同样解析。
import { t as i18nT, DEFAULT_LOCALE, type Locale } from "../i18n.ts";

// ── 静态轨迹用的最小消息模型（对齐控制台 UIMessage / ToolCallVizData 的子集） ──
export interface ToolCallVizData {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: {
    ok: boolean;
    data?: unknown;
    error?: string;
    duration_ms: number;
  };
}

export type MessagePart =
  | { kind: "text"; text: string }
  | { kind: "tool-call"; call: ToolCallVizData };

export interface UIMessage {
  id: string;
  role: "user" | "assistant" | "system" | "error";
  parts: MessagePart[];
}

export type NodeKind = "query" | "file" | "search" | "list" | "thought" | "result" | "other";
export type NodeStatus = "pending" | "ok" | "error";

export type FileType =
  | "concept" | "analysis" | "source" | "entity"
  | "index" | "raw" | "thoughts" | "unknown";

export interface FlowNodeData {
  key: string;
  kind: NodeKind;
  fileType: FileType;
  title: string;
  subtitle?: string;
  /** thought 节点的正文 / file 节点的 args / 等等——用于详情面板 */
  body?: string;
  /** thought 节点的 TYPE（INTENT/READ/...）——用于色彩 */
  thoughtType?: string;
  path?: string;
  anchor?: string;
  isBlock?: boolean;
  hitCount: number;
  status: NodeStatus;
  durationMs?: number;
  order: number;
  toolCallIds: string[];
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  resultPreview?: string;
  /** 讲解页专属：本节点对应的讲解步骤号（0 = 起始问题，1..13 = 步骤）。由 ex1-trace 回填。 */
  stepRef?: number;
  [k: string]: unknown;
}

export interface FlowEdgeData {
  seq: number;
  stepType?: string;
  stepTitle?: string;
  isFanIn?: boolean;
  [k: string]: unknown;
}

export type GraphNode = {
  id: string;
  type: "kbcard";
  position: { x: number; y: number };
  data: FlowNodeData;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  data: FlowEdgeData;
  label?: string;
  animated?: boolean;
};

// ============================================================
// 文本解析 helpers
// ============================================================

/**
 * 抽 thoughts：每个 **【TYPE】标题** 段，从标记后到下一个同类标记 / 末尾。
 * 段内首行 = 标题（剥掉首尾的 ** 加粗符），其余 = 正文。
 *
 * 注：控制台版用单条非贪婪正则，标题分组实测会被吞进 body 且残留 `**`；这里独立移植
 * 改为「先定位所有标记、再按段切」，标题/正文分离干净。两库各自独立，无 drift 约束。
 */
function extractThoughts(text: string): Array<{ type: string; title: string; body: string }> {
  const out: Array<{ type: string; title: string; body: string }> = [];
  const markerRe = /(?:\*\*)?【([A-Za-z]+)】/g;
  const marks: Array<{ type: string; start: number; contentStart: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = markerRe.exec(text)) !== null) {
    marks.push({ type: m[1].toUpperCase(), start: m.index, contentStart: markerRe.lastIndex });
  }
  for (let i = 0; i < marks.length; i++) {
    const segEnd = i + 1 < marks.length ? marks[i + 1].start : text.length;
    const seg = text.slice(marks[i].contentStart, segEnd);
    const nl = seg.indexOf("\n");
    const titleRaw = (nl === -1 ? seg : seg.slice(0, nl)).trim();
    const title = titleRaw.replace(/^\*+/, "").replace(/\*+$/, "").trim();
    const body = nl === -1 ? "" : seg.slice(nl + 1).trim();
    out.push({ type: marks[i].type, title, body });
  }
  return out;
}

function classifyCall(name: string, args: Record<string, unknown>): {
  kind: NodeKind;
  key: string;
  title: string;
  subtitle?: string;
  path?: string;
  anchor?: string;
  isBlock?: boolean;
} {
  const rawPath =
    (typeof args.path === "string" && args.path) ||
    (typeof args.file_path === "string" && args.file_path) ||
    (typeof args.target_file === "string" && args.target_file) ||
    "";
  const anchor = typeof args.anchor === "string" ? args.anchor : undefined;

  // backlinks / outlinks 也带 path arg 但不是"读文件"——是查链接关系
  if (name === "backlinks" || name === "outlinks") {
    const norm = rawPath ? normalizeAbsToRel(rawPath) : "(unknown)";
    return {
      kind: "list",
      key: `${name}:${norm}`,
      title: name === "backlinks" ? `← ${basename(norm)}` : `→ ${basename(norm)}`,
      subtitle: name,
    };
  }

  if (rawPath) {
    const normPath = normalizeAbsToRel(rawPath);
    return {
      kind: "file",
      key: anchor ? `${normPath}#${anchor}` : normPath,
      title: basename(normPath),
      subtitle: dirOf(normPath),
      path: normPath,
      anchor,
      isBlock: anchor ? /^[ptcf]-/.test(anchor) : false,
    };
  }
  if (name === "search" || name === "Grep" || name === "Glob") {
    const q =
      (typeof args.query === "string" && args.query) ||
      (typeof args.pattern === "string" && args.pattern) || "";
    return {
      kind: "search",
      key: `search:${name}:${q}`,
      title: q ? `🔍 ${q.slice(0, 32)}` : `🔍 ${name}`,
      subtitle: name,
    };
  }
  if (name.startsWith("list_") || name.startsWith("list-")) {
    return {
      kind: "list",
      key: `list:${name}`,
      title: name.replace(/[_-]/g, " "),
      subtitle: "list",
    };
  }
  return {
    kind: "other",
    key: `other:${name}:${JSON.stringify(args).slice(0, 64)}`,
    title: name,
    subtitle: "tool",
  };
}

function normalizeAbsToRel(p: string): string {
  const m = p.match(/\/(wiki|raw|my_thoughts|exports)\/(.+)$/);
  if (m) return `${m[1]}/${m[2]}`;
  return p.replace(/\\/g, "/").replace(/^\.?\/+/, "");
}

function basename(p: string): string {
  const seg = p.split("/").pop() || p;
  return seg.replace(/\.(md|outline\.json|html|pdf)$/i, "");
}

function dirOf(p: string): string {
  const parts = p.split("/");
  parts.pop();
  return parts.join("/");
}

function inferFileType(path?: string): FileType {
  if (!path) return "unknown";
  if (path.startsWith("wiki/concepts/")) return "concept";
  if (path.startsWith("wiki/analyses/")) return "analysis";
  if (path.startsWith("wiki/sources/")) return "source";
  if (path.startsWith("wiki/entities/")) return "entity";
  if (path.startsWith("wiki/indexes/") || path === "wiki/root_index.md") return "index";
  if (path.startsWith("raw/")) return "raw";
  if (path.startsWith("my_thoughts/")) return "thoughts";
  return "unknown";
}

function aggregateStatus(calls: ToolCallVizData[]): NodeStatus {
  const latest = calls[calls.length - 1];
  if (!latest.result) return "pending";
  if (!latest.result.ok) return "error";
  return "ok";
}

function formatResultPreview(
  result: ToolCallVizData["result"] | undefined,
  locale: Locale,
): string {
  if (!result) return "";
  if (!result.ok) return `❌ ${result.error || ""}`;
  if (result.data === undefined || result.data === null) return i18nT("flow.empty", locale);
  const str =
    typeof result.data === "string" ? result.data : JSON.stringify(result.data, null, 2);
  return str.slice(0, 800) + (str.length > 800 ? "\n" + i18nT("flow.truncated", locale) : "");
}

// ============================================================
// 主函数
// ============================================================

export interface BuildResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function buildFlowGraph(
  msg: UIMessage | null | undefined,
  userQuery?: string | null,
  locale: Locale = DEFAULT_LOCALE,
): BuildResult {
  if (!msg && !userQuery) return { nodes: [], edges: [] };

  const nodeMap = new Map<string, FlowNodeData>();
  const orderedKeys: string[] = [];
  const callsByKey = new Map<string, ToolCallVizData[]>();
  const edges: GraphEdge[] = [];
  let edgeSeq = 0;
  let prevKey: string | null = null;
  let toolOrder = 0;

  const pushNode = (key: string, data: FlowNodeData) => {
    nodeMap.set(key, data);
    orderedKeys.push(key);
  };

  // 起始 Query
  const QUERY_KEY = "__query__";
  if (userQuery && userQuery.trim()) {
    const trimmed = userQuery.trim();
    pushNode(QUERY_KEY, {
      key: QUERY_KEY,
      kind: "query",
      fileType: "unknown",
      title: i18nT("flow.node_question", locale),
      subtitle: trimmed.length > 80 ? trimmed.slice(0, 80) + "…" : trimmed,
      body: trimmed,
      hitCount: 1,
      status: "ok",
      order: 0,
      toolCallIds: [],
    });
    prevKey = QUERY_KEY;
  }

  if (!msg) return finalize(orderedKeys, nodeMap, edges);

  let thoughtCounter = 0;

  for (const part of msg.parts) {
    if (part.kind === "text") {
      const thoughts = extractThoughts(part.text);
      for (const th of thoughts) {
        thoughtCounter += 1;

        // ANSWER 段（有 body）→ 金色 ✨ 最终答案大卡片，不再额外建 thought 节点
        const isAnswerResult = th.type === "ANSWER" && th.body && th.body.length > 0;
        const nodeKey = isAnswerResult ? `result:${thoughtCounter}` : `thought:${thoughtCounter}`;

        pushNode(nodeKey, {
          key: nodeKey,
          kind: isAnswerResult ? "result" : "thought",
          fileType: "unknown",
          thoughtType: isAnswerResult ? undefined : th.type,
          title: isAnswerResult ? i18nT("flow.node_final_answer", locale) : th.type,
          subtitle: th.title,
          body: th.body,
          hitCount: 1,
          status: "ok",
          order: thoughtCounter,
          toolCallIds: [],
        });

        if (prevKey !== null) {
          edgeSeq += 1;
          edges.push({
            id: `e${edgeSeq}-${prevKey}->${nodeKey}`,
            source: prevKey,
            target: nodeKey,
            animated: true,
            label: "",
            data: { seq: edgeSeq, stepType: th.type, stepTitle: th.title },
          });
        }
        prevKey = nodeKey;
      }
      continue;
    }

    // tool-call
    const cls = classifyCall(part.call.name, part.call.args);
    const key = cls.key;
    const callList = callsByKey.get(key) || [];
    callList.push(part.call);
    callsByKey.set(key, callList);

    if (!nodeMap.has(key)) {
      toolOrder += 1;
      pushNode(key, {
        key,
        kind: cls.kind,
        fileType: inferFileType(cls.path),
        title: cls.title,
        subtitle: cls.subtitle,
        path: cls.path,
        anchor: cls.anchor,
        isBlock: cls.isBlock,
        hitCount: 0,
        status: "pending",
        order: toolOrder,
        toolCallIds: [],
        toolName: part.call.name,
        toolArgs: part.call.args,
      });
    }
    const node = nodeMap.get(key)!;
    node.hitCount += 1;
    node.toolCallIds.push(part.call.id);
    node.status = aggregateStatus(callList);
    node.durationMs = part.call.result?.duration_ms;
    node.resultPreview = formatResultPreview(part.call.result, locale);

    if (prevKey !== null && prevKey !== key) {
      edgeSeq += 1;
      edges.push({
        id: `e${edgeSeq}-${prevKey}->${key}`,
        source: prevKey,
        target: key,
        animated: true,
        label: "",
        data: { seq: edgeSeq },
      });
    }
    prevKey = key;
  }

  return finalize(orderedKeys, nodeMap, edges);
}

function finalize(
  orderedKeys: string[],
  nodeMap: Map<string, FlowNodeData>,
  edges: GraphEdge[],
): BuildResult {
  const nodes: GraphNode[] = orderedKeys
    .filter((k) => nodeMap.has(k))
    .map((k) => ({
      id: k,
      type: "kbcard" as const,
      position: { x: 0, y: 0 },
      data: nodeMap.get(k)!,
    }));
  return { nodes, edges };
}

// ============================================================
// 无依赖蛇形换行布局（替代 dagre —— web 未装 dagre）
// ============================================================
// 控制台里推理图是 dagre LR 单行；但讲解页面板有限，14 张卡片排成一行会被 fitView
// 缩到看不清。这里改成「蛇形换行网格」：按时间序逐张放入网格，奇数行反向（snake），
// 让相邻卡片的连线始终是短横/短竖、不交叉。卡片与连线本身和控制台完全一致，只是排布换行
// 以适配面板、让整条推理链一眼可读。

const NODE_W_DEFAULT = 240;
const NODE_H_DEFAULT = 96;
const NODE_W_THOUGHT = 208;
const NODE_H_THOUGHT = 66;
const NODE_W_QUERY = 280;
const NODE_H_QUERY = 92;
const NODE_W_RESULT = 360;
const NODE_H_RESULT = 168;

function nodeSize(kind: NodeKind): { w: number; h: number } {
  if (kind === "thought") return { w: NODE_W_THOUGHT, h: NODE_H_THOUGHT };
  if (kind === "query") return { w: NODE_W_QUERY, h: NODE_H_QUERY };
  if (kind === "result") return { w: NODE_W_RESULT, h: NODE_H_RESULT };
  return { w: NODE_W_DEFAULT, h: NODE_H_DEFAULT };
}

export interface LayoutOpts {
  /** 每行列数；不给则按节点数自动取一个接近面板比例的值 */
  cols?: number;
}

export function layoutGraph(
  nodes: GraphNode[],
  _edges: GraphEdge[],
  opts: LayoutOpts = {},
): GraphNode[] {
  if (nodes.length === 0) return nodes;
  const n = nodes.length;
  const cols = Math.max(1, opts.cols ?? Math.round(Math.sqrt(n * 1.3)));
  const rows = Math.ceil(n / cols);
  const COL_SEP = 60;
  const ROW_SEP = 54;

  // 网格坐标（蛇形：奇数行列序反向）
  const cell = nodes.map((_, i) => {
    const r = Math.floor(i / cols);
    let c = i % cols;
    if (r % 2 === 1) c = cols - 1 - c;
    return { r, c };
  });

  // 每列最大宽 / 每行最大高（卡片尺寸不一，按格对齐避免重叠）
  const colW = new Array(cols).fill(0);
  const rowH = new Array(rows).fill(0);
  nodes.forEach((nd, i) => {
    const { w, h } = nodeSize(nd.data.kind);
    colW[cell[i].c] = Math.max(colW[cell[i].c], w);
    rowH[cell[i].r] = Math.max(rowH[cell[i].r], h);
  });

  const colX: number[] = [];
  let x = 0;
  for (let c = 0; c < cols; c++) {
    colX[c] = x;
    x += colW[c] + COL_SEP;
  }
  const rowY: number[] = [];
  let y = 0;
  for (let r = 0; r < rows; r++) {
    rowY[r] = y;
    y += rowH[r] + ROW_SEP;
  }

  return nodes.map((nd, i) => {
    const { w, h } = nodeSize(nd.data.kind);
    const { r, c } = cell[i];
    return {
      ...nd,
      position: { x: colX[c] + (colW[c] - w) / 2, y: rowY[r] + (rowH[r] - h) / 2 },
    };
  });
}
