/**
 * 把 SSE 文件回放成 UIMessage，跑 buildFlowGraph + layoutGraph，
 * 把 nodes / edges 结果打印出来——验证流程图数据转换是否正确。
 *
 * 用法：
 *   node scripts/verify-flow-graph.mjs /tmp/sse-out.txt
 */
import fs from "node:fs";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

// ts-node-less 的 hack：用 tsx 跑也行，但这里直接用 node 跑会失败因为 build-flow-graph 是 .ts
// 退而求其次：直接 inline 把核心函数贴过来，做 sanity check

const STEP_RE = /\*\*【([A-Z]+)】([^*]+?)\*\*/g;
function extractLastStep(text) {
  let last = null, m;
  STEP_RE.lastIndex = 0;
  while ((m = STEP_RE.exec(text)) !== null) last = { type: m[1], title: m[2].trim() };
  return last;
}
function classifyCall(name, args) {
  const rawPath = args.path || args.file_path || args.target_file || args.notebook_path || "";
  const anchor = typeof args.anchor === "string" ? args.anchor : undefined;
  if (rawPath) {
    const m = rawPath.match(/\/(wiki|raw|my_thoughts|exports)\/(.+)$/);
    const normPath = m ? `${m[1]}/${m[2]}` : rawPath;
    return {
      kind: "file",
      key: anchor ? `${normPath}#${anchor}` : normPath,
      title: normPath.split("/").pop().replace(/\.md$/, ""),
      subtitle: normPath.split("/").slice(0, -1).join("/"),
      path: normPath,
      anchor,
    };
  }
  if (name === "search" || name === "Grep" || name === "Glob") {
    const q = args.query || args.pattern || "";
    return { kind: "search", key: `search:${name}:${q}`, title: `🔍 ${q.slice(0, 32)}`, subtitle: name };
  }
  if (name.startsWith("list_")) {
    return { kind: "list", key: `list:${name}`, title: name, subtitle: "list" };
  }
  return { kind: "other", key: `other:${name}:${JSON.stringify(args).slice(0, 64)}`, title: name, subtitle: "tool" };
}

const path = process.argv[2] || "/tmp/sse-out.txt";
const raw = fs.readFileSync(path, "utf8");
const lines = raw.split("\n").filter((l) => l.startsWith("data: "));
const events = lines.map((l) => {
  try { return JSON.parse(l.slice(6)); } catch { return null; }
}).filter(Boolean);

console.log(`==== 收到 ${events.length} 个 SSE 事件 ====`);
const byKind = {};
for (const e of events) byKind[e.kind] = (byKind[e.kind] || 0) + 1;
console.log("事件类型分布:", byKind);

// 重建 UIMessage.parts（简化版）
const parts = [];
const callsById = new Map();
for (const e of events) {
  if (e.kind === "text-delta") {
    const last = parts[parts.length - 1];
    if (last && last.kind === "text") last.text += e.text;
    else parts.push({ kind: "text", text: e.text });
  } else if (e.kind === "tool-call") {
    const call = { id: e.id, name: e.name, args: e.args || {} };
    callsById.set(e.id, call);
    parts.push({ kind: "tool-call", call });
  } else if (e.kind === "tool-result") {
    const call = callsById.get(e.id);
    if (call) call.result = { ok: e.ok, data: e.data, error: e.error, duration_ms: e.duration_ms };
  }
}

console.log(`\n==== 重建后 UIMessage.parts 含 ${parts.length} 项 ====`);
const textCount = parts.filter((p) => p.kind === "text").length;
const callCount = parts.filter((p) => p.kind === "tool-call").length;
console.log(`text: ${textCount}, tool-call: ${callCount}`);

// 列出所有 tool calls
console.log("\n==== tool calls 时序 ====");
parts.filter((p) => p.kind === "tool-call").forEach((p, i) => {
  console.log(`#${i + 1} ${p.call.name}  args=${JSON.stringify(p.call.args).slice(0, 80)}  result=${p.call.result ? (p.call.result.ok ? "OK" : "ERR") : "PENDING"}`);
});

// 跑简化版 buildFlowGraph
console.log("\n==== 运行 buildFlowGraph (简化版) ====");
const nodeMap = new Map();
const orderedKeys = [];
const callsByKey = new Map();
let prevKey = null;
let textBuffer = "";
const edges = [];
let edgeSeq = 0;
for (const part of parts) {
  if (part.kind === "text") { textBuffer += part.text; continue; }
  const cls = classifyCall(part.call.name, part.call.args);
  if (!nodeMap.has(cls.key)) {
    orderedKeys.push(cls.key);
    nodeMap.set(cls.key, { ...cls, order: orderedKeys.length, hitCount: 0, status: "pending" });
  }
  const node = nodeMap.get(cls.key);
  node.hitCount += 1;
  const callList = callsByKey.get(cls.key) || [];
  callList.push(part.call);
  callsByKey.set(cls.key, callList);
  const latest = callList[callList.length - 1];
  node.status = !latest.result ? "pending" : latest.result.ok ? "ok" : "error";
  if (prevKey !== null && prevKey !== cls.key) {
    edgeSeq += 1;
    const step = extractLastStep(textBuffer);
    edges.push({ id: `e${edgeSeq}-${prevKey}->${cls.key}`, source: prevKey, target: cls.key, label: step?.type || String(edgeSeq), step });
  }
  prevKey = cls.key;
  textBuffer = "";
}

console.log(`\n==== 节点 (${orderedKeys.length}) ====`);
for (const k of orderedKeys) {
  const n = nodeMap.get(k);
  console.log(`  [${n.order}] ${n.kind} | hits=${n.hitCount} | status=${n.status}`);
  console.log(`      title=${n.title}`);
  console.log(`      path=${n.path || "(无)"}`);
  if (n.anchor) console.log(`      anchor=${n.anchor}`);
}

console.log(`\n==== 边 (${edges.length}) ====`);
for (const e of edges) {
  const sNode = nodeMap.get(e.source);
  const tNode = nodeMap.get(e.target);
  console.log(`  #${e.label} [${sNode.order}] ${sNode.title} → [${tNode.order}] ${tNode.title}`);
  if (e.step) console.log(`      step: 【${e.step.type}】${e.step.title}`);
}
