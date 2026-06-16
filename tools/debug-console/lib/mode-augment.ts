/**
 * Mode-driven 自动增强：在 LLM / CC 的工具调用结果回来后，agent-loop 调本模块
 * 注入"模式专属强制工具调用"——目前两个：
 *
 *  - audit  ：抽出 read 结果里所有 [[raw/...#^p-]] 块锚点 → 强制 read_block 反查（前 N 个）
 *  - explore：第一次 wiki read_page 完成后 → 强制 backlinks + outlinks + 读邻居 top N
 *
 * 注入的事件标 synthetic: true。SSE 透传给前端，flow graph 视觉标橙色"强制"。
 * 不计入 user-driven 预算，但有独立上限（5 / 6）避免爆炸。
 *
 * 重要：synthetic 事件**只用于可视化**——不喂回 LLM 下一轮上下文（避免 tool_call_id 不匹配）。
 * CC 是 self-contained agent，本来就不接受 mid-stream 反馈；非 CC provider 我们手动确保 synthetic
 * 不进入 messages 数组（agent-loop 负责）。
 */
import type { AgentEvent } from "./providers/types";
import { executeTool } from "./kb-http-client";

const AUDIT_MAX_PER_READ = 5;
const EXPLORE_MAX_NEIGHBORS = 6;

/** 哪些 tool 算"读了一个文件"——可能是 wiki/raw 内容 */
const READ_TOOLS = new Set(["read_page", "read_section", "Read"]);

/** 抽 markdown 文本里所有的块锚点引用 [[wiki/X#^p-…]] / [[raw/Y#^h-…]] */
function extractBlockAnchorRefs(
  content: string,
): Array<{ path: string; anchor: string }> {
  const out: Array<{ path: string; anchor: string }> = [];
  const seen = new Set<string>();
  // 形如 [[wiki/concepts/x#^p-12-abc123]] 或 [[raw/papers/y#^h-2-3-def]]
  const re =
    /\[\[((?:wiki|raw)\/[^\[\]|#]+?)#\^([ptcfh]-[0-9a-z-]+)(?:\|[^\[\]]+?)?\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    let path = m[1];
    if (!/\.(md|html|pdf|outline\.json)$/i.test(path)) path += ".md";
    const anchor = m[2];
    const key = `${path}#${anchor}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ path, anchor });
  }
  return out;
}

/** 从工具结果 data 里提取主文本内容（用于 audit 扫锚点） */
function extractTextContent(data: unknown): string {
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (typeof d.content === "string") return d.content;
    if (typeof d.text === "string") return d.text;
    if (typeof d.preview === "string") return d.preview;
  }
  return "";
}

/** 从工具 args 里抽 path 字段（兼容 KB 工具的 path / CC 的 file_path） */
function extractArgPath(args: Record<string, unknown>): string | null {
  const p = args.path || args.file_path || args.target_file;
  if (typeof p !== "string") return null;
  return p.replace(/.*\/(wiki|raw)\//, "$1/");
}

/** 从 backlinks/outlinks 结果里抽 paths */
function extractPathsFromLinkResult(
  data: unknown,
  field: "from_path" | "target",
): string[] {
  if (!data) return [];
  let arr: unknown = data;
  if (!Array.isArray(arr) && typeof arr === "object") {
    const obj = arr as Record<string, unknown>;
    if (Array.isArray(obj.hits)) arr = obj.hits;
    else if (Array.isArray(obj.results)) arr = obj.results;
  }
  if (!Array.isArray(arr)) return [];
  const out: string[] = [];
  for (const item of arr) {
    if (item && typeof item === "object") {
      const p = (item as Record<string, unknown>)[field];
      if (typeof p === "string") out.push(p);
    }
  }
  return out;
}

let synthCounter = 0;
function synthId(prefix: string): string {
  synthCounter += 1;
  return `syn-${prefix}-${Date.now()}-${synthCounter}`;
}

/** 通用：emit synthetic tool-call + 执行 + emit tool-result（单个） */
async function* runSynthCall(
  prefix: string,
  name: string,
  args: Record<string, unknown>,
): AsyncGenerator<AgentEvent> {
  const id = synthId(prefix);
  yield {
    kind: "tool-call",
    id,
    name,
    args,
    synthetic: true,
  };
  const r = await executeTool(name, args);
  yield {
    kind: "tool-result",
    id,
    name,
    ok: r.ok,
    data: r.data,
    error: r.error,
    duration_ms: r.duration_ms,
    synthetic: true,
  };
}

interface SynthCallSpec {
  prefix: string;
  name: string;
  args: Record<string, unknown>;
}

/**
 * 并行执行多个 synthetic call。前端 UI 体验：
 *  1. 所有 tool-call 卡片瞬间批量出现（pending 状态）
 *  2. 后端 Promise.all 并行 executeTool
 *  3. 所有完成后批量 emit tool-result（按 specs 原序）
 * 总耗时 ≈ max(单个 call 耗时) 而不是 sum，对 audit/explore 提速显著。
 * 返回每个 spec 的 result（顺序与 specs 对应），让调用方能基于结果做下一阶段动作（如 explore BFS Phase 2）。
 */
async function* runParallelSynthCalls(
  specs: SynthCallSpec[],
): AsyncGenerator<
  AgentEvent,
  Array<{ ok: boolean; data?: unknown; error?: string }>
> {
  if (specs.length === 0) return [];
  const withIds = specs.map((s) => ({ ...s, id: synthId(s.prefix) }));
  for (const s of withIds) {
    yield {
      kind: "tool-call",
      id: s.id,
      name: s.name,
      args: s.args,
      synthetic: true,
    };
  }
  const results = await Promise.all(
    withIds.map((s) => executeTool(s.name, s.args)),
  );
  for (let i = 0; i < withIds.length; i++) {
    const r = results[i];
    const s = withIds[i];
    yield {
      kind: "tool-result",
      id: s.id,
      name: s.name,
      ok: r.ok,
      data: r.data,
      error: r.error,
      duration_ms: r.duration_ms,
      synthetic: true,
    };
  }
  return results.map((r) => ({ ok: r.ok, data: r.data, error: r.error }));
}

// ============================================================
// AUDIT: 每次 read 后强制反查 anchor
// ============================================================

export async function* auditAugment(
  triggerCall: { name: string; args: Record<string, unknown> },
  triggerResult: { ok: boolean; data?: unknown },
): AsyncGenerator<AgentEvent> {
  if (!READ_TOOLS.has(triggerCall.name)) return;
  if (!triggerResult.ok) return;

  const content = extractTextContent(triggerResult.data);
  if (!content) return;

  const anchors = extractBlockAnchorRefs(content);
  if (anchors.length === 0) return;

  // 限流：每次 read 最多反查 N 个；并行执行（每 turn 最多 5 个，不会打爆 web/）
  const todo = anchors.slice(0, AUDIT_MAX_PER_READ);
  yield* runParallelSynthCalls(
    todo.map((a) => ({
      prefix: "audit",
      name: "read_block",
      args: { path: a.path, anchor: a.anchor },
    })),
  );
}

// ============================================================
// EXPLORE: 第一次 wiki read 后强制 BFS
// ============================================================

export interface ExploreState {
  /** 是否已经跑过 BFS（每对话只跑一次，防止链式爆炸） */
  bfsDone: boolean;
}

export function createExploreState(): ExploreState {
  return { bfsDone: false };
}

export async function* exploreAugment(
  triggerCall: { name: string; args: Record<string, unknown> },
  triggerResult: { ok: boolean; data?: unknown },
  state: ExploreState,
): AsyncGenerator<AgentEvent> {
  if (state.bfsDone) return;
  if (!READ_TOOLS.has(triggerCall.name)) return;
  if (!triggerResult.ok) return;

  const path = extractArgPath(triggerCall.args);
  if (!path || !path.startsWith("wiki/")) return;

  state.bfsDone = true;

  // Phase 1: backlinks + outlinks 并行（互不依赖）
  const phase1 = yield* runParallelSynthCalls([
    { prefix: "explore-bl", name: "backlinks", args: { path } },
    { prefix: "explore-ol", name: "outlinks", args: { path } },
  ]);
  const [blRes, olRes] = phase1;

  // Phase 2 准备：从 backlinks + outlinks 拿 top N 邻居 path
  const blPaths = blRes.ok
    ? extractPathsFromLinkResult(blRes.data, "from_path")
    : [];
  const olPaths = olRes.ok
    ? extractPathsFromLinkResult(olRes.data, "target")
    : [];
  const seen = new Set<string>([path]);
  const neighbors: string[] = [];
  const maxEach = Math.ceil(EXPLORE_MAX_NEIGHBORS / 2);
  for (let i = 0; i < maxEach && (blPaths[i] || olPaths[i]); i++) {
    for (const cand of [blPaths[i], olPaths[i]]) {
      if (!cand) continue;
      const norm = cand.endsWith(".md") ? cand : `${cand}.md`;
      if (seen.has(norm)) continue;
      seen.add(norm);
      neighbors.push(norm);
      if (neighbors.length >= EXPLORE_MAX_NEIGHBORS) break;
    }
    if (neighbors.length >= EXPLORE_MAX_NEIGHBORS) break;
  }

  // Phase 2: 并行 read_page 所有邻居（最多 6 个，不会打爆 web/）
  yield* runParallelSynthCalls(
    neighbors.map((np) => ({
      prefix: "explore-rp",
      name: "read_page",
      args: { path: np },
    })),
  );
}
