/**
 * UIMessage.parts → react-flow {nodes, edges}
 *
 * 节点类型：
 *   - query   起始用户问题（紫色大卡片）
 *   - thought 每个 **【TYPE】标题** 段 → 一个小思考节点（带 body 全文，悬浮可看）
 *   - file    tool call 读到的文件（按 type 着色）
 *   - search  tool call 搜索（带 query）
 *   - list    list_* 工具
 *   - ghost   文本里 [[wiki/...]] 引用但**没**真去读的文件（虚框灰显）
 *   - other   兜底
 *
 * 链式构建：query → thought → thought → tool → thought → tool → ...
 * 同一 file path 多次读 = 同一节点 hitCount + 1（不重复建）
 * ghost 节点从最近的 thought 节点拉虚线过去
 */
import type { UIMessage } from "@/components/MessageBubble";
import type { ToolCallVizData } from "@/components/ToolCallCard";

export type NodeKind = "query" | "file" | "search" | "list" | "thought" | "ghost" | "result" | "warning" | "other";
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
  /** file 节点专属：第一次调用的 args + result preview（详情面板用） */
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  resultPreview?: string;
  /** mode 自动增强（audit anchor 反查 / explore BFS）—— UI 加 "强制" 标识 */
  synthetic?: boolean;
  [k: string]: unknown;
}

export interface FlowEdgeData {
  seq: number;
  stepType?: string;
  stepTitle?: string;
  /** 是否 ghost 边（虚线） */
  isGhost?: boolean;
  /** 是否 parallel sibling 边（同 turn 多 tool_use）*/
  isParallel?: boolean;
  /** 是否 synthetic 边（mode 自动增强）—— 视觉橙色 */
  isSynthetic?: boolean;
  /** 是否 fan-in 边（并行组结束后，多个 sibling 汇入下一个节点）*/
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

/** 抽 thoughts：每个 **【TYPE】标题** 或 【TYPE】 后到下一个同类标记或末尾的段落
 * 兼容格式：
 *   **【EXTRACT】提取关键信息**   ← 加粗包裹（agent 推荐格式）
 *   【EXTRACT】提取关键信息       ← 无加粗
 *   【extract】                    ← 大小写不敏感、无标题
 */
function extractThoughts(text: string): Array<{ type: string; title: string; body: string }> {
  const out: Array<{ type: string; title: string; body: string }> = [];
  // (?:\*\*)? 可选加粗；([A-Za-z]+) 大小写不敏感；([^\n]*?) 标题可空；(?:\*\*)? 可选加粗结尾
  const re = /(?:\*\*)?【([A-Za-z]+)】([^\n]*?)(?:\*\*)?([\s\S]*?)(?=(?:\*\*)?【[A-Za-z]+】|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push({
      type: m[1].toUpperCase(), // 统一大写，匹配 THOUGHT_COLOR 等色表
      title: m[2].trim(),
      body: m[3].trim(),
    });
  }
  return out;
}

/** 抽 wiki refs —— 两种语法：
 *   1. 严格双链：[[wiki/concepts/X]] 或 [[raw/papers/Y#^p-12]]
 *   2. 裸 path：wiki/concepts/X 或 raw/articles/Y（CC 写文本时很常见）
 *
 *  返回去重的 path 列表。anchor 仅严格双链能携带。
 */
function extractWikiRefs(text: string): Array<{ path: string; anchor?: string; isBlock: boolean }> {
  const out: Array<{ path: string; anchor?: string; isBlock: boolean }> = [];
  const seen = new Set<string>();

  const add = (rawPath: string, rawAnchor?: string) => {
    let path = rawPath;
    if (!/\.(md|html|pdf|outline\.json)$/i.test(path)) path += ".md";
    let anchor = rawAnchor;
    let isBlock = false;
    if (anchor?.startsWith("^")) {
      anchor = anchor.slice(1);
      isBlock = true;
    }
    const dedupKey = anchor ? `${path}#${anchor}` : path;
    if (seen.has(dedupKey)) return;
    seen.add(dedupKey);
    out.push({ path, anchor: anchor || undefined, isBlock });
  };

  // 1. 严格双链
  const linkRe = /\[\[((?:wiki|raw)\/[^\[\]|#]+?)(?:#([^\[\]|]+?))?(?:\|[^\[\]]+?)?\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(text)) !== null) {
    add(m[1], m[2]);
  }

  // 2. 裸 path —— 至少 wiki/<sub>/<basename> 三段，否则太泛误伤
  //    sub 限定为已知子目录，避免 "wiki/任何" 都被抓
  const bareRe =
    /\b(wiki\/(?:concepts|analyses|sources|entities|indexes|_templates|_archive_[a-z_]+)\/[A-Za-z0-9_\-一-鿿]+(?:\.md)?|raw\/(?:papers|articles|assets)\/[A-Za-z0-9_\-一-鿿]+(?:\.md)?|wiki\/root_index(?:\.md)?)\b/g;
  while ((m = bareRe.exec(text)) !== null) {
    add(m[1]);
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
    (typeof args.notebook_path === "string" && args.notebook_path) ||
    "";
  const anchor = typeof args.anchor === "string" ? args.anchor : undefined;

  // backlinks / outlinks 也带 path arg 但不是"读文件"——是查链接关系
  // 必须先于通用 path 检查，避免被误分类为 file
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
  if (name.startsWith("list_")) {
    return {
      kind: "list",
      key: `list:${name}`,
      title: name.replace(/_/g, " "),
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

/** 从 search/list 类工具返回结果里抽候选 paths —— 实现 search 一击 N 候选的分支可视 */
function extractCandidatePaths(result?: ToolCallVizData["result"]): string[] {
  if (!result?.ok || result.data == null) return [];
  let arr: unknown = result.data;
  // 兼容 {hits: [...]}, {results: [...]}, [{path}, ...]
  if (!Array.isArray(arr) && typeof arr === "object") {
    const obj = arr as Record<string, unknown>;
    if (Array.isArray(obj.hits)) arr = obj.hits;
    else if (Array.isArray(obj.results)) arr = obj.results;
    else if (Array.isArray(obj.data)) arr = obj.data;
  }
  if (!Array.isArray(arr)) return [];
  const out: string[] = [];
  for (const item of arr) {
    if (typeof item === "string" && /^(wiki|raw)\//.test(item)) {
      out.push(item);
    } else if (item && typeof item === "object") {
      const p =
        (item as { path?: unknown }).path ||
        (item as { from_path?: unknown }).from_path ||
        (item as { target?: unknown }).target;
      if (typeof p === "string" && /^(wiki|raw)\//.test(p)) out.push(p);
    }
    if (out.length >= 8) break;
  }
  return out;
}

function formatResultPreview(result?: ToolCallVizData["result"]): string {
  if (!result) return "";
  if (!result.ok) return `❌ ${result.error || ""}`;
  if (result.data === undefined || result.data === null) return "(空)";
  const str =
    typeof result.data === "string" ? result.data : JSON.stringify(result.data, null, 2);
  return str.slice(0, 800) + (str.length > 800 ? "\n…(已截断)" : "");
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
      title: "问题",
      subtitle: trimmed.length > 80 ? trimmed.slice(0, 80) + "…" : trimmed,
      body: trimmed,
      hitCount: 1,
      status: "ok",
      order: 0,
      toolCallIds: [],
    });
    prevKey = QUERY_KEY;
  }

  if (!msg) {
    return finalize(orderedKeys, nodeMap, edges);
  }

  // Pass 1：收集实际被 tool 调到的 path（用于 ghost 判断）
  const toolCalledPaths = new Set<string>();
  for (const part of msg.parts) {
    if (part.kind !== "tool-call") continue;
    const cls = classifyCall(part.call.name, part.call.args);
    if (cls.path) toolCalledPaths.add(cls.path);
  }

  // Pass 2：建图
  let thoughtCounter = 0;
  let ghostCounter = 0;
  const ghostKeyByPath = new Map<string, string>(); // path → ghost node key（去重）

  /**
   * 并行检测：两个 tool-call 之间没有任何 text part（或 text 只是空白）
   * → 说明它们来自同一个 assistant message（CC 在一轮里 emit 多个 tool_use）
   * → 视为 sibling，共享父节点
   *
   * parallelGroupParent != null 时，下一个 tool-call 不接 prevKey，而是接 parallelGroupParent
   * 任何实质 text part / thought 都会重置为 null（结束 group）
   */
  let parallelGroupParent: string | null = null;

  /**
   * 并行组成员追踪：当前 group 内累积的 sibling key 列表。
   * group 结束（text 到来）且 length > 1 时，移交给 pendingFanIn，
   * 让下一个非 sibling 节点（thought 或下一个 tool）从所有 sibling 扇入，
   * 而不是只挂在最后一个 sibling 上（旧行为会让前面 sibling 变断头）。
   */
  let parallelSiblings: string[] = [];
  let pendingFanIn: string[] | null = null;

  /**
   * Synthetic 锚点：mode 自动增强（audit/explore）生成的 synthetic tool-call
   * 不应该被当成 parallel sibling，也不应该污染主链 prevKey；
   * 它们应该从触发它们的真实工具节点扇出。
   * preSyntheticPrevKey 保存"进入 synthetic 链之前的 prevKey"，多个连续 synthetic
   * 共享同一 anchor，下一个非 synthetic 事件出现时恢复 prevKey 接主链。
   */
  let preSyntheticPrevKey: string | null = null;

  for (const part of msg.parts) {
    if (part.kind === "text") {
      if (part.text.trim().length > 0) {
        // 并行组关闭：若组内 ≥2 个 sibling，把它们全部移交给下一个节点扇入
        if (parallelSiblings.length > 1) {
          pendingFanIn = [...parallelSiblings];
        }
        parallelSiblings = [];
        parallelGroupParent = null; // 任何实质文本打断 parallel group
        // synthetic 链结束 —— 真实文本到来，恢复主链 prevKey
        if (preSyntheticPrevKey !== null) {
          prevKey = preSyntheticPrevKey;
          preSyntheticPrevKey = null;
        }
      }
      const thoughts = extractThoughts(part.text);
      for (const t of thoughts) {
        thoughtCounter += 1;

        // ANSWER 段（有 body）→ 只画金色 ✨ 最终答案大卡片，不再额外建 thought 节点；
        // 否则会出现"小 ANSWER thought + 大 ANSWER result"两个标题内容相同的卡片
        const isAnswerResult =
          t.type === "ANSWER" && t.body && t.body.length > 0;

        const nodeKey = isAnswerResult
          ? `result:${thoughtCounter}`
          : `thought:${thoughtCounter}`;

        pushNode(nodeKey, {
          key: nodeKey,
          kind: isAnswerResult ? "result" : "thought",
          fileType: "unknown",
          thoughtType: isAnswerResult ? undefined : t.type,
          title: isAnswerResult ? "最终答案" : t.type,
          subtitle: t.title,
          body: t.body,
          hitCount: 1,
          status: "ok",
          order: thoughtCounter,
          toolCallIds: [],
        });

        const fanInSources =
          pendingFanIn && pendingFanIn.length > 1 ? pendingFanIn : null;
        const incomingSources =
          fanInSources ?? (prevKey !== null ? [prevKey] : []);
        for (const src of incomingSources) {
          edgeSeq += 1;
          edges.push({
            id: `e${edgeSeq}-${src}->${nodeKey}`,
            source: src,
            target: nodeKey,
            animated: true,
            // 线性思考边不再标 type —— 目标节点左上角的分类 chip 已经写了同样的字，
            // 边上再重复一遍是噪声。边的语义由颜色（edgeColor by stepType）承载。
            label: "",
            data: {
              seq: edgeSeq,
              stepType: t.type,
              stepTitle: t.title,
              isFanIn: fanInSources !== null || undefined,
            },
          });
        }
        if (fanInSources) pendingFanIn = null;
        prevKey = nodeKey;

        // 不再生成"考虑未读 ghost"节点 —— 被动标签无价值。
        // 真想看 AI 提到过的 ref：右侧详情面板里 thought body 的 [[wiki/X]] 可点击预览。
        // 真想强制读完所有候选：切到 Audit / Explore 模式让 agent-loop 帮忙跑。
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
        synthetic: part.call.synthetic,
      });
    }
    const node = nodeMap.get(key)!;
    node.hitCount += 1;
    node.toolCallIds.push(part.call.id);
    node.status = aggregateStatus(callList);
    node.durationMs = part.call.result?.duration_ms;
    node.resultPreview = formatResultPreview(part.call.result);
    // 如果同一节点有 synthetic 和 user-driven 两种 call，user-driven 优先（不标 synthetic）
    if (!part.call.synthetic) node.synthetic = false;

    // 如果这个 path 之前是 ghost，现在真去读了——把 ghost 移除（替换为 file 节点）
    if (cls.path) {
      const ghostKey = ghostKeyByPath.get(cls.path);
      if (ghostKey && ghostKey !== key) {
        // 移除 ghost 节点 + 其相关边
        nodeMap.delete(ghostKey);
        const idx = orderedKeys.indexOf(ghostKey);
        if (idx >= 0) orderedKeys.splice(idx, 1);
        for (let i = edges.length - 1; i >= 0; i--) {
          if (edges[i].source === ghostKey || edges[i].target === ghostKey) {
            edges.splice(i, 1);
          }
        }
        ghostKeyByPath.delete(cls.path);
      }
    }

    // ── 决定 edge source：synthetic / parallel sibling / 顺序 chain ──
    const isSynthetic = !!part.call.synthetic;
    let edgeSource: string | null;
    let edgeLabel: string;

    if (isSynthetic) {
      // synthetic：从最近的真实工具节点扇出（不参与 parallel detection、不污染主链 prevKey）
      if (preSyntheticPrevKey === null) preSyntheticPrevKey = prevKey;
      edgeSource = preSyntheticPrevKey;
      // 按工具名区分两种 mode 增强类型
      edgeLabel =
        part.call.name === "read_block"
          ? "强制反查"
          : part.call.name === "backlinks" ||
              part.call.name === "outlinks" ||
              part.call.name === "read_page"
            ? "强制 BFS"
            : "强制";
    } else {
      // 真实事件：恢复 synthetic 之前的主链状态
      if (preSyntheticPrevKey !== null) {
        prevKey = preSyntheticPrevKey;
        preSyntheticPrevKey = null;
      }
      if (parallelGroupParent !== null) {
        edgeSource = parallelGroupParent;
        edgeLabel = "并行"; // 表示这是并行分支（有信息量）；不带内部序号（无意义）
        parallelSiblings.push(key);
      } else {
        // 非并行分支：如果有上一组遗留的 fan-in，扇入到本工具；否则单边
        if (pendingFanIn && pendingFanIn.length > 1) {
          for (const src of pendingFanIn) {
            edgeSeq += 1;
            edges.push({
              id: `e${edgeSeq}-${src}->${key}`,
              source: src,
              target: key,
              animated: true,
              label: "", // 扇入边：用更粗的线宽（isFanIn）区分即可，不标内部序号
              data: { seq: edgeSeq, isFanIn: true },
            });
          }
          pendingFanIn = null;
          edgeSource = null; // 已发完扇入边，跳过下方单边推送
          edgeLabel = "";
        } else {
          edgeSource = prevKey;
          edgeLabel = ""; // 顺序工具边：用颜色 + 节点自身的序号 badge 表达，不在边上重复内部序号
        }
        parallelGroupParent = prevKey;
        parallelSiblings = [key];
      }
    }

    if (edgeSource !== null && edgeSource !== key) {
      edgeSeq += 1;
      edges.push({
        id: `e${edgeSeq}-${edgeSource}->${key}`,
        source: edgeSource,
        target: key,
        animated: !isSynthetic, // synthetic 边不动画，与真实边视觉区分
        label: edgeLabel,
        data: {
          seq: edgeSeq,
          isParallel: !isSynthetic && parallelGroupParent === edgeSource && edgeSource !== prevKey,
          isSynthetic,
        },
      });
    }

    // synthetic 不更新 prevKey —— 让下一个 synthetic 继续 anchor 到同一 trigger
    // 真实事件正常更新 prevKey
    if (!isSynthetic) {
      prevKey = key;
    }

    // 不再为 search / list / backlinks / outlinks 的返回 candidates 生成 ghost 节点 ——
    // search 返回 N 个 hit 是 BM25 噪声，AI 没选不代表"考虑过"，铺一堆虚框只会让图变脏。
    // 想看完整 hit 列表：点 search/list 节点右侧详情面板可看完整 result preview。
  }

  // 注：以前这里有"AI 没给 ANSWER 段就结束"的兜底 warning 节点逻辑——
  // v6 起改由 agent-loop 自动续写补完 ANSWER 段（见 agent-loop.ts），
  // warning 节点不再生成。warning kind 类型保留供未来其他兜底场景。

  // synthetic 边标签去重：同一 source + 同类型（强制 BFS / 强制反查 / 强制）
  // 多条边只在第一条显示「label ×N」总标签，其余清空，避免视觉上 N 个标签堆在一起
  const syntheticGroups = new Map<string, GraphEdge[]>();
  for (const e of edges) {
    if (!e.data.isSynthetic) continue;
    const k = `${e.source}|${e.label || ""}`;
    const arr = syntheticGroups.get(k) || [];
    arr.push(e);
    syntheticGroups.set(k, arr);
  }
  for (const arr of syntheticGroups.values()) {
    if (arr.length <= 1) continue;
    arr[0].label = `${arr[0].label} ×${arr.length}`;
    for (let i = 1; i < arr.length; i++) {
      arr[i].label = "";
    }
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
// dagre 自动布局
// ============================================================
import dagre from "dagre";

const NODE_W_DEFAULT = 240;
const NODE_H_DEFAULT = 96;
const NODE_W_THOUGHT = 200;
const NODE_H_THOUGHT = 64;
const NODE_W_QUERY = 280;
const NODE_H_QUERY = 88;
const NODE_W_RESULT = 360;
const NODE_H_RESULT = 160;

function nodeSize(kind: NodeKind, synthetic?: boolean): { w: number; h: number } {
  if (kind === "thought") return { w: NODE_W_THOUGHT, h: NODE_H_THOUGHT };
  if (kind === "query") return { w: NODE_W_QUERY, h: NODE_H_QUERY };
  if (kind === "result") return { w: NODE_W_RESULT, h: NODE_H_RESULT };
  if (kind === "warning") return { w: 260, h: 90 };
  // synthetic 工具卡（mode 自动增强）走紧凑尺寸，视觉上从主链让位
  if (synthetic) return { w: 168, h: 60 };
  return { w: NODE_W_DEFAULT, h: NODE_H_DEFAULT };
}

export function layoutGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  direction: "TB" | "LR" = "LR",
): GraphNode[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: direction === "LR" ? 28 : 50,
    ranksep: direction === "LR" ? 90 : 70,
    marginx: 24,
    marginy: 24,
  });

  nodes.forEach((n) => {
    const { w, h } = nodeSize(n.data.kind, n.data.synthetic);
    g.setNode(n.id, { width: w, height: h });
  });
  edges.forEach((e) => g.setEdge(e.source, e.target));

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    const { w, h } = nodeSize(n.data.kind, n.data.synthetic);
    return {
      ...n,
      position: { x: pos.x - w / 2, y: pos.y - h / 2 },
    };
  });
}
