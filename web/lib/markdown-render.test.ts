/**
 * markdown-render 的回归守护——零依赖，用 Node 内置 node:test 跑（type stripping，
 * 直接执行 .ts，无需 jest/vitest）。
 *
 * 跑法（Node ≥ 22.6）：
 *   cd web && npm test
 *   或：node --test --experimental-strip-types lib/markdown-render.test.ts
 *
 * 重点钉死 parseKbLink 对 **percent-encoded 中文文件名** 的还原：react-markdown 渲染
 * `[text](kb://raw/notes/前6期选题.md#^t-1-abc)` 时会把非 ASCII 与 `^` 都 percent-encode，
 * parseKbLink 必须把 target 和 anchor 都 decode 回干净形式，否则：
 *   - popover 头部把 `raw/notes/%E5%89%8D...` 当中文显示（乱码）
 *   - refNum 注册表用干净中文建键、查表用 encoded 形式 → miss，[n] 上标失效
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseKbLink,
  preprocessWikiLinks,
  relocateTableRowAnchors,
  relocateCodeFenceAnchors,
  extractCodeBlockAnchor,
  normalizeBlockAnchors,
} from "./markdown-render.ts";

const FENCE = "`".repeat(3); // 避免在源码里写三反引号干扰编辑器/围栏

test("parseKbLink: 还原 percent-encoded 中文 target", () => {
  // react-markdown 归一化后的 href：中文 percent-encoded、^ → %5E
  const encoded =
    "kb://raw/notes/%E5%89%8D6%E6%9C%9F%E9%80%89%E9%A2%98-%E6%9C%80%E6%96%B0%E4%BF%AE%E8%AE%A2%E7%89%88.md#%5Et-17-db7c57";
  const parsed = parseKbLink(encoded);
  assert.ok(parsed);
  assert.equal(parsed.target, "raw/notes/前6期选题-最新修订版.md");
  assert.equal(parsed.anchor, "^t-17-db7c57");
  assert.equal(parsed.relation, null);
});

test("parseKbLink: 纯 ASCII target 不受影响", () => {
  const parsed = parseKbLink("kb://wiki/concepts/attention.md#%5Eh-2-3-a3f2c1");
  assert.ok(parsed);
  assert.equal(parsed.target, "wiki/concepts/attention.md");
  assert.equal(parsed.anchor, "^h-2-3-a3f2c1");
});

test("parseKbLink: 中文 target + ?rel= 关系类型并存", () => {
  // preprocessWikiLinks 写入顺序为 target?query#fragment
  const encoded = "kb://wiki/concepts/%E6%B3%A8%E6%84%8F%E5%8A%9B.md?rel=SUPPORTS#%5Ep-3-abc123";
  const parsed = parseKbLink(encoded);
  assert.ok(parsed);
  assert.equal(parsed.target, "wiki/concepts/注意力.md");
  assert.equal(parsed.relation, "SUPPORTS");
  assert.equal(parsed.anchor, "^p-3-abc123");
});

test("parseKbLink: 无 anchor 的中文 target", () => {
  const parsed = parseKbLink("kb://wiki/sources/%E5%89%8D6%E6%9C%9F%E9%80%89%E9%A2%98.md");
  assert.ok(parsed);
  assert.equal(parsed.target, "wiki/sources/前6期选题.md");
  assert.equal(parsed.anchor, null);
});

test("parseKbLink: 畸形 percent 序列不抛错，原样返回", () => {
  // 单独 % 不是合法 escape，decodeURIComponent 会抛 URIError → catch 兜底
  const parsed = parseKbLink("kb://raw/notes/100%bad.md");
  assert.ok(parsed);
  assert.equal(parsed.target, "raw/notes/100%bad.md");
});

test("parseKbLink: 非 kb:// 前缀返回 null", () => {
  assert.equal(parseKbLink("https://example.com"), null);
  assert.equal(parseKbLink("wiki/concepts/x.md"), null);
});

test("relocateTableRowAnchors: 把多余单元格锚点搬进最后一格（3 列表）", () => {
  // convert.py 产物：锚点跟在最后一个 | 之后 → GFM 当多余单元格丢弃 → 表格拿不到 id
  const broken = "| 免费直播 | 转化 | 少量重钩子里 | ^t-19-ecbd68";
  assert.equal(
    relocateTableRowAnchors(broken),
    "| 免费直播 | 转化 | 少量重钩子里 ^t-19-ecbd68 |",
  );
});

test("relocateTableRowAnchors: 多列表 + 多锚点形态（^t- 带 level 段）", () => {
  const broken =
    "| 三 · 进阶 | 有粉有钱 | 按数据调 | 持续 | 加重 | 持续 | ^t-16-ffad41";
  assert.equal(
    relocateTableRowAnchors(broken),
    "| 三 · 进阶 | 有粉有钱 | 按数据调 | 持续 | 加重 | 持续 ^t-16-ffad41 |",
  );
});

test("relocateTableRowAnchors: 已正确落在单元格内的锚点不被改写", () => {
  // 行以 | 收尾、锚点已在最后一格内 → 不是行末多余单元格 → 保持原样
  const ok = "| 免费直播 | 转化 | 少量 ^t-19-ecbd68 |";
  assert.equal(relocateTableRowAnchors(ok), ok);
});

test("relocateTableRowAnchors: 非表格行（普通段落行末锚点）不受影响", () => {
  // 段落锚点在真正的行尾、不在 | 之后，由 extractTrailingAnchor 处理，这里不能动它
  const para = "这意味着准确率达到 95.3%。 ^p-12-7d8e9a";
  assert.equal(relocateTableRowAnchors(para), para);
});

test("relocateTableRowAnchors: 表头 / 分隔行无锚点，整表只动带锚点的那一行", () => {
  const table = [
    "| 选题 | 主线 | 判决 |",
    "|---|---|---|",
    "| A | 趋势 | 机会主义 |",
    "| 免费直播 | 转化 | 少量 | ^t-19-ecbd68",
  ].join("\n");
  const expected = [
    "| 选题 | 主线 | 判决 |",
    "|---|---|---|",
    "| A | 趋势 | 机会主义 |",
    "| 免费直播 | 转化 | 少量 ^t-19-ecbd68 |",
  ].join("\n");
  assert.equal(relocateTableRowAnchors(table), expected);
});

test("relocateCodeFenceAnchors: 闭合栅栏行尾锚点下沉为代码块最后一行", () => {
  const broken = `${FENCE}python\nprint(1)\n${FENCE} ^c-14-03a7d0`;
  const expected = `${FENCE}python\nprint(1)\n^c-14-03a7d0\n${FENCE}`;
  assert.equal(relocateCodeFenceAnchors(broken), expected);
});

test("relocateCodeFenceAnchors: 缩进围栏保持缩进，~~~ 围栏同样处理", () => {
  const broken = "  ~~~\n  code\n  ~~~ ^c-2-df976c";
  const expected = "  ~~~\n  code\n  ^c-2-df976c\n  ~~~";
  assert.equal(relocateCodeFenceAnchors(broken), expected);
});

test("relocateCodeFenceAnchors: 后续正文不再被吞（栅栏恢复闭合）", () => {
  const broken = `${FENCE}\ncode\n${FENCE} ^c-5-abcd12\n\n后续段落 ^p-3-aaaaaa`;
  const out = relocateCodeFenceAnchors(broken);
  // 闭合栅栏后只剩干净 ```，后续段落留在代码块之外
  assert.match(out, /\n\^c-5-abcd12\n`{3}\n\n后续段落 \^p-3-aaaaaa$/);
});

test("relocateCodeFenceAnchors: 正常代码块（无锚点）不被改写", () => {
  const ok = `${FENCE}js\nconst a = 1;\n${FENCE}`;
  assert.equal(relocateCodeFenceAnchors(ok), ok);
});

test("extractCodeBlockAnchor: 抽出末行下沉锚点并剥掉", () => {
  const { display, id } = extractCodeBlockAnchor("print(1)\nprint(2)\n^c-14-03a7d0");
  assert.equal(display, "print(1)\nprint(2)");
  assert.equal(id, "c-14-03a7d0");
});

test("extractCodeBlockAnchor: 无锚点时原样返回、无 id", () => {
  const { display, id } = extractCodeBlockAnchor("const a = 1;\nconst b = 2;");
  assert.equal(display, "const a = 1;\nconst b = 2;");
  assert.equal(id, undefined);
});

test("relocateTableRowAnchors: CRLF 行尾仍能匹配并搬正（Windows 编辑的文件）", () => {
  const out = relocateTableRowAnchors("| d | e | f | ^t-1-abc123\r\n");
  assert.match(out, /\| f \^t-1-abc123 \|/); // 锚点进了最后一格
});

test("relocateCodeFenceAnchors: CRLF 行尾仍能下沉锚点", () => {
  const out = relocateCodeFenceAnchors(`${FENCE}\r\ncode\r\n${FENCE} ^c-1-abc123\r\n`);
  assert.match(out, /\^c-1-abc123\n`{3}/); // 锚点下沉到末行 + 干净闭合栅栏
});

test("normalizeBlockAnchors: 表格 + 代码块锚点一次性归位", () => {
  const md = [
    "| a | b |",
    "|---|---|",
    "| c | d | ^t-3-abc123",
    "",
    `${FENCE}\ncode\n${FENCE} ^c-1-def456`,
  ].join("\n");
  const out = normalizeBlockAnchors(md);
  assert.match(out, /\| c \| d \^t-3-abc123 \|/); // 表格锚点进最后一格
  assert.match(out, /\n\^c-1-def456\n`{3}$/); // 代码锚点下沉到末行 + 干净闭合栅栏
});

test("preprocessWikiLinks: 端到端搬正表格锚点（保证渲染时表格能拿到 id）", () => {
  const md = "| 免费直播 | 转化 | 少量 [[wiki/x|别名]] | ^t-19-ecbd68";
  const out = preprocessWikiLinks(md);
  // 锚点已进入最后一格内（行以 | 收尾、锚点在 | 之前）
  assert.match(out, /少量 \[别名\]\(kb:\/\/wiki\/x\.md\) \^t-19-ecbd68 \|$/);
});

test("preprocessWikiLinks → parseKbLink 往返保形（中文名）", () => {
  // 端到端：源 markdown 的 [[...]] 经 preprocess 变成 [text](kb://...)，
  // 取出 href 再 parse，target/anchor 必须还原回源里的干净中文。
  // 注：preprocess 不会 percent-encode（那是 react-markdown 的事），所以这里 href
  // 本身是干净中文；额外再测一遍 encoded 版本由上面的用例覆盖。
  const md = "见 [[raw/notes/前6期选题-最新修订版#^t-17-db7c57]]。";
  const processed = preprocessWikiLinks(md);
  const hrefMatch = processed.match(/\((kb:\/\/[^)]+)\)/);
  assert.ok(hrefMatch);
  const parsed = parseKbLink(hrefMatch[1]);
  assert.ok(parsed);
  assert.equal(parsed.target, "raw/notes/前6期选题-最新修订版.md");
  assert.equal(parsed.anchor, "^t-17-db7c57");
});
