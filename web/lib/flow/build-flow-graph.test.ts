/**
 * 推理图 ↔ 讲解步骤「契约」回归守护——零依赖，用 Node 内置 node:test 跑（type stripping）。
 *
 * 跑法（Node ≥ 22.6）：
 *   cd web && npm test
 *   或：node --test --experimental-strip-types lib/flow/build-flow-graph.test.ts
 *
 * /walkthrough 的推理图与下方 15 个讲解步骤靠一个**隐式契约**对齐，分散在三处手维护：
 *   (1) ex1-trace.ts 的 EX1_MESSAGE（【TYPE】思考标记 + tool-call 的顺序与数量）
 *   (2) ex1-trace.ts 的 EX1_STEPS（stepRef → 徽章/标题）
 *   (3) ex1.zh.html 里写死的 .step / step-num 01..15
 * buildFlowGraph 按时间序产出节点，stepRef = 节点下标（0=起始问题，1..15=步骤），
 * 详情面板用 EX1_STEPS.find(ref) 取徽章、用 wt-step-${ref} 跳步骤。任一处增删一个标记/步骤，
 * 节点数就不再是 16、stepRef 会静默错位（卡片跳到错步骤 / 面板显示错徽章），却没有任何其它测试会红。
 * 本测试钉死这个契约：节点数、kind 时间序、EX1_STEPS 自洽、ex1.zh.html 步骤号一一对应。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildFlowGraph } from "./build-flow-graph.ts";
import { EX1_MESSAGE, EX1_QUERY, EX1_STEPS, EX1_NOTES } from "../../components/walkthrough/ex1-trace.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

// 节点按时间序的 kind 序列——任一 thought 标记 / tool-call 增删都会改变它
const EXPECTED_KINDS = [
  "query",
  "thought", // 01 INTENT
  "file", // 02 VIEW 硬必读 root_index ## 领域目录（v0.6 新增的硬前置工序）
  "thought", // 03 STRATEGY
  "search", // 04 SEARCH
  "thought", // 05 EVAL
  "file", // 06 READ concept
  "thought", // 07 EXTRACT
  "thought", // 08 CONFLICT
  "list", // 09 LINK outlinks
  "thought", // 10 DECIDE
  "file", // 11 READ comparison
  "thought", // 12 EXTRACT
  "thought", // 13 DECIDE
  "file", // 14 VERIFY read-block 核验冲突块 ^p-8-1775c9（细节下钻判据）
  "result", // 15 ANSWER
];

test("buildFlowGraph 产出 16 节点、15 边，kind 时间序锁死", () => {
  const { nodes, edges } = buildFlowGraph(EX1_MESSAGE, EX1_QUERY);
  assert.equal(nodes.length, 16, "节点数必须是 16（query + 15 步）");
  assert.equal(edges.length, 15, "线性链路应为 15 条边");
  assert.deepEqual(
    nodes.map((n) => n.data.kind),
    EXPECTED_KINDS,
    "节点 kind 时间序漂移——ex1-trace 的标记/工具顺序被改动",
  );
});

test("EX1_STEPS 与时间序下标一一对应（stepRef === 下标）", () => {
  assert.equal(EX1_STEPS.length, 16, "EX1_STEPS 必须覆盖 0..15");
  EX1_STEPS.forEach((s, i) => assert.equal(s.ref, i, `EX1_STEPS[${i}].ref 应为 ${i}`));
  // 每个 stepRef（含 0）都该有针对性讲解
  for (let i = 0; i <= 15; i++) {
    assert.ok(EX1_NOTES[i] && EX1_NOTES[i].length > 0, `EX1_NOTES[${i}] 缺失`);
  }
});

test("ex1.zh.html 的步骤号恰为 01..15，与 EX1_STEPS 的 ref 1..15 对齐", () => {
  const html = readFileSync(join(HERE, "../../components/walkthrough/ex1.zh.html"), "utf8");
  const nums = [...html.matchAll(/class="step-num">(\d+)</g)].map((m) => parseInt(m[1], 10));
  assert.deepEqual(
    nums,
    Array.from({ length: 15 }, (_, i) => i + 1),
    "ex1.zh.html 的 .step-num 必须恰为 01..15（ref 0 是起始问题、无步骤卡片）",
  );
  // 步骤卡片号 ↔ 推理图节点 stepRef（1..14）必须一一命中
  nums.forEach((n) => {
    const step = EX1_STEPS.find((s) => s.ref === n);
    assert.ok(step, `ex1.html 步骤 ${n} 在 EX1_STEPS 找不到对应 stepRef`);
  });
});
