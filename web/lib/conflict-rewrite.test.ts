/**
 * conflict-rewrite 的回归守护——零依赖，用 Node 内置 node:test 跑（type stripping，
 * 直接执行 .ts，无需 jest/vitest）。
 *
 * 跑法（Node ≥ 22.6）：
 *   cd web && npm test
 *   或：node --test --experimental-strip-types lib/conflict-rewrite.test.ts
 *
 * 这四个函数是发布后最易静默改坏 wiki 正文的多行正则替换。下面对每个函数喂
 * 「单冲突块 / 多冲突块 / 块内含 ⏳ / newClaim 含 markdown」等样本，钉死行为：
 * 只改首个块、历史观点不丢、空行折叠正确。日期参数注入固定值断言确定输出。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  removeConflictBlock,
  convertConflictToWatching,
  adoptNewFromConflict,
  mergeConflict,
} from "./conflict-rewrite.ts";

const DAY = "2026-06-14";

const oneConflict = [
  "# 页面标题",
  "",
  "正文一段。",
  "",
  "> [!WARNING] 知识更新冲突 — 2026-01-01",
  "> **旧观点**：A 是对的。",
  "> **新证据**：B 推翻了 A。",
  "> **状态**：⏳ 待人类判别",
  "",
  "结尾一段。",
  "",
].join("\n");

const twoConflicts = [
  "# 标题",
  "",
  "> [!WARNING] 知识更新冲突 — 第一处",
  "> **状态**：⏳ 待人类判别",
  "",
  "中间正文。",
  "",
  "> [!WARNING] 知识更新冲突 — 第二处",
  "> **状态**：⏳ 待人类判别",
  "",
  "末尾。",
  "",
].join("\n");

test("removeConflictBlock 删掉冲突块并折叠空行，保留其余正文", () => {
  const out = removeConflictBlock(oneConflict);
  assert.ok(!out.includes("[!WARNING]"), "WARNING 块应被删除");
  assert.ok(!out.includes("待人类判别"), "块内行应一并删除");
  assert.ok(out.includes("正文一段。"), "块前正文保留");
  assert.ok(out.includes("结尾一段。"), "块后正文保留");
  assert.ok(!/\n{3,}/.test(out), "不应残留 3+ 连续空行");
});

test("removeConflictBlock 删除多个冲突块（g flag）", () => {
  const out = removeConflictBlock(twoConflicts);
  assert.ok(!out.includes("[!WARNING]"), "两个冲突块都应删除");
  assert.ok(out.includes("中间正文。") && out.includes("末尾。"), "正文保留");
});

test("convertConflictToWatching 把 WARNING→NOTE、⏳→🟢，块整体保留", () => {
  const out = convertConflictToWatching(oneConflict, DAY);
  assert.ok(out.includes(`> [!NOTE] 持续观察 — ${DAY}`), "标题转持续观察 + 日期");
  assert.ok(out.includes("🟢 持续观察中"), "状态行转换");
  assert.ok(!out.includes("[!WARNING]"), "不应残留 WARNING");
  assert.ok(out.includes("**旧观点**：A 是对的。"), "块内容仍保留（仅改标记，不删）");
});

test("adoptNewFromConflict 新论断成为主文本、旧块转历史 NOTE 保留", () => {
  const out = adoptNewFromConflict(oneConflict, "现已确认 **B 正确**。", DAY);
  const newIdx = out.indexOf("现已确认 **B 正确**。");
  const histIdx = out.indexOf("> [!NOTE] 历史观点");
  assert.ok(newIdx >= 0, "新论断写入");
  assert.ok(histIdx >= 0, `历史 NOTE 写入（日期 ${DAY}）`);
  assert.ok(out.includes(DAY), "历史 NOTE 含决议日期");
  assert.ok(newIdx < histIdx, "新论断在历史 NOTE 之前（成为主文本）");
  assert.ok(out.includes("✅ 已采纳新观点"), "状态行转为已采纳");
  assert.ok(out.includes("**旧观点**：A 是对的。"), "旧观点不丢失（删除即标记）");
  assert.ok(!out.includes("[!WARNING]"), "不应残留 WARNING 头");
});

test("adoptNewFromConflict 只改首个冲突块，第二个原样保留", () => {
  const out = adoptNewFromConflict(twoConflicts, "采纳新观点。", DAY);
  assert.equal((out.match(/\[!WARNING\]/g) || []).length, 1, "应只剩第二个 WARNING 块");
  assert.ok(out.includes("第二处"), "第二个冲突块未被动");
  assert.ok(out.includes("历史观点"), "首个块转历史 NOTE");
});

test("mergeConflict 用整合文本替换首个块 + 挂溯源 NOTE", () => {
  const out = mergeConflict(oneConflict, "综合两方：A 在场景 X 成立，B 在场景 Y 成立。", DAY);
  assert.ok(out.includes("综合两方：A 在场景 X 成立"), "整合文本写入");
  assert.ok(out.includes(`> [!NOTE] 多视角合并 — ${DAY}（由人类合写）`), "溯源 NOTE + 日期");
  assert.ok(!out.includes("[!WARNING]"), "原冲突块被替换");
  assert.ok(out.includes("结尾一段。"), "块后正文保留");
});

test("mergeConflict 只改首个冲突块", () => {
  const out = mergeConflict(twoConflicts, "合并结论。", DAY);
  assert.equal((out.match(/\[!WARNING\]/g) || []).length, 1, "第二个 WARNING 块保留");
});

test("无冲突块时各函数不改动内容", () => {
  const plain = "# 标题\n\n纯正文，无冲突块。\n";
  assert.equal(removeConflictBlock(plain), plain);
  assert.equal(convertConflictToWatching(plain, DAY), plain);
  assert.equal(adoptNewFromConflict(plain, "x", DAY), plain, "无块时 adopt_new 不应注入");
  assert.equal(mergeConflict(plain, "x", DAY), plain, "无块时 merge 不应注入");
});
