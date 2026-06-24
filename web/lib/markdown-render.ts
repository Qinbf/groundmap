/**
 * 把 markdown 中的 [[link]] 预处理为标准 markdown 链接，
 * 然后由 react-markdown 渲染时通过自定义组件接管链接行为。
 *
 * 协议约定：
 *   [[wiki/concepts/X]]            → [wiki/concepts/X.md](kb://wiki/concepts/X.md)
 *   [[wiki/concepts/X#section]]    → [wiki/concepts/X.md#section](kb://wiki/concepts/X.md#section)
 *   [[wiki/concepts/X|别名]]       → [别名](kb://wiki/concepts/X.md)
 *   [[wiki/concepts/X|SUPPORTS]]   → [wiki/concepts/X.md](kb://wiki/concepts/X.md?rel=SUPPORTS)
 *   [[raw/papers/Y#^anchor]]       → [raw/papers/Y.md#^anchor](kb://raw/papers/Y.md#^anchor)
 *
 * 渲染端用 href 前缀 "kb://" 识别为 wiki 内部链接；?rel= query 由 WikiLink 解析渲染徽章。
 */
// 用显式 .ts 后缀（tsconfig 已开 allowImportingTsExtensions + moduleResolution:bundler）：
// 让 markdown.ts 这层依赖能被 Node 内置 node:test runner 解析，从而 parseKbLink 可单测
// （markdown-render.test.ts）。webpack / Next 构建对显式 .ts 后缀解析无碍。
import { WIKILINK_RE, RELATION_TYPES, normalizeLinkTarget, splitAliasOrRelation, type RelationType } from "./markdown.ts";

export const KB_LINK_PREFIX = "kb://";

// 单个块锚点 token：^{kind}-{seq}[-{level}]-{hash}（兼容 md5 hash6 + 手写 fallback）
const ANCHOR_TOKEN = String.raw`\^[hpcft]-\d+(?:-\d+)?-[a-z0-9](?:[a-z0-9-]*[a-z0-9])?`;
// 整行只有锚点 token 的「悬空锚点行」——锚点本是块内容的尾巴，独占一行属数据瑕疵
// （锚点被加到表格/列表后的空行上 + 历史手写占位未清）。这类行无正文，应整行不渲染，
// 否则行首那个锚点（无前导空格，TRAILING_ANCHOR_RE 剥不掉）会以 "^p-2-…" 噪音显示。
const DANGLING_ANCHOR_LINE_RE = new RegExp(
  String.raw`^[ \t]*(?:${ANCHOR_TOKEN}[ \t]*)+$`,
  "gm",
);

/** 删掉「整行只有块锚点」的悬空行（保留正文行末的锚点尾巴，那些由组件层抽成 HTML id）。 */
export function stripDanglingAnchorLines(content: string): string {
  return content.replace(DANGLING_ANCHOR_LINE_RE, "");
}

// 表格行末尾、跟在「最后一个 `|` 之后」的块锚点。convert.py 把 ` ^{anchor}` 一律追加到
// 块的行尾；对表格行而言行尾本是闭合 `|`，于是锚点落到了最后一个竖线之外。
//   group1 = `| c1 | c2 | c3 `（贪婪吃到最后一个 `|` 之前），group2 = 锚点（含 `^`）
// 末尾 \r? 兼容 CRLF：JS 多行 `$` 匹配 \n 前的位置，`.`/`[ \t]` 都不含 \r，
// 不显式吃掉 \r 则 CRLF 文档里整行匹配失败（锚点修复对 Windows 行尾的文件失效）。
const TABLE_ROW_TRAILING_ANCHOR_RE = new RegExp(
  String.raw`^([ \t]*\|.*)\|[ \t]*(${ANCHOR_TOKEN})[ \t]*\r?$`,
  "gm",
);

/**
 * 把「跟在表格行最后一个 `|` 之后」的块锚点搬进最后一个真实单元格内。
 *
 * 为什么必须搬：GFM 规范规定「行内单元格数超过表头列数时，多余单元格被丢弃」。
 * convert.py 产出的表格行形如 `| c1 | c2 | c3 | ^t-19-ecbd68`——锚点成了第 4 个
 * （多余）单元格，被 remark-gfm 直接丢掉，于是这张表的任何元素都拿不到 `id`，
 * `[[raw/...#^t-19-...]]` 引用点过去时 HashScroller 的 getElementById 永远 miss、不滚动。
 *
 * 搬进最后一个单元格后变成 `| c1 | c2 | c3 ^t-19-ecbd68 |`：锚点成为最后一格文本的
 * 尾巴，由 AnchoredTableCell 经 extractTrailingAnchor 抽成 `<td id="t-19-ecbd68">`、
 * 并从可见文本里剥掉。纯显示层修复，不动 raw/wiki 数据，覆盖所有已转换文件、无需重转。
 *
 * 只匹配以 `|` 起头的行（表格行），普通段落 / 标题的行末锚点（不在 `|` 之后）不受影响；
 * 已正确落在单元格内的锚点（行以 `|` 收尾）因尾部不是行末锚点也不会被改写。
 */
export function relocateTableRowAnchors(content: string): string {
  return content.replace(TABLE_ROW_TRAILING_ANCHOR_RE, "$1$2 |");
}

// 代码块锚点 token（仅 ^c-）——只有围栏代码块的锚点会落到闭合栅栏行上。
const CODE_ANCHOR_TOKEN = String.raw`\^c-\d+(?:-\d+)?-[a-z0-9](?:[a-z0-9-]*[a-z0-9])?`;
// 闭合围栏行尾、跟在 ``` / ~~~ 之后的代码块锚点。`\x60` = 反引号（在 String.raw 模板里
// 直接写反引号会终止模板，故用 \x60）。group1 = 缩进，group2 = 围栏，group3 = 锚点。
const CODE_FENCE_TRAILING_ANCHOR_RE = new RegExp(
  String.raw`^([ \t]*)(\x60{3,}|~{3,})[ \t]+(${CODE_ANCHOR_TOKEN})[ \t]*\r?$`,
  "gm",
);

/**
 * 把「跟在闭合代码栅栏之后」的锚点下沉为代码块的最后一行内容。
 *
 * 为什么必须搬：CommonMark 规定闭合栅栏 ``` 之后只能跟空白。convert.py 产出的
 * ` ``` ^c-14-03a7d0` 让闭合栅栏后带了非空白 → 这行不再是合法闭合栅栏 → 代码块不闭合，
 * 把锚点行连同后续正文一起吞进代码块（实测会吞掉紧随的段落）。
 *
 * 下沉成「锚点独占一行 + 干净闭合栅栏」后：栅栏正常闭合、后续正文幸存；锚点成为代码块
 * 最后一行文本，由 PageRenderer 的 code 组件经 extractCodeBlockAnchor 抽成 `<code id=...>`
 * 并从可见代码里剥掉。纯显示层修复，覆盖所有已转换文件、并对未来新转换的文件同样生效。
 */
export function relocateCodeFenceAnchors(content: string): string {
  return content.replace(CODE_FENCE_TRAILING_ANCHOR_RE, "$1$3\n$1$2");
}

// 代码块最后一行的下沉锚点（relocateCodeFenceAnchors 产物）。匹配末行 ^c- 锚点。
const CODE_BLOCK_TRAILING_ANCHOR_RE = new RegExp(
  String.raw`(?:^|\r?\n)[ \t]*(${CODE_ANCHOR_TOKEN})[ \t]*\r?\n?$`,
);

/**
 * 从代码块文本里抽出末行的下沉锚点：返回剥掉锚点后的可见代码 + 锚点 id（不带 ^）。
 * 无锚点时原样返回。供 PageRenderer 的 code 组件给 `<code>` 赋 id（HashScroller 跳转用）。
 */
export function extractCodeBlockAnchor(text: string): { display: string; id?: string } {
  const m = text.match(CODE_BLOCK_TRAILING_ANCHOR_RE);
  if (!m || m.index === undefined) return { display: text };
  return { display: text.slice(0, m.index), id: m[1].replace(/^\^/, "") };
}

/**
 * 块级锚点归一化：把表格 / 代码块那些「落在结构分隔符之外、会被 GFM 丢弃或吞内容」的锚点
 * 搬回能被组件层抽成 HTML id 的位置。渲染边界统一调用（PageRenderer 经 preprocessWikiLinks、
 * MiniMarkdown 直接调），对已有与未来新建知识库一致生效，不改 raw/wiki 数据本身。
 */
export function normalizeBlockAnchors(content: string): string {
  return relocateCodeFenceAnchors(relocateTableRowAnchors(stripDanglingAnchorLines(content)));
}

export function preprocessWikiLinks(content: string): string {
  return normalizeBlockAnchors(content).replace(
    WIKILINK_RE,
    (_match: string, target: string, anchor?: string, third?: string) => {
      const normalized = normalizeLinkTarget(target);
      const { alias, relation } = splitAliasOrRelation(third);
      const fragment = anchor ? `#${anchor}` : "";
      const query = relation ? `?rel=${relation}` : "";
      const href = `${KB_LINK_PREFIX}${normalized}${query}${fragment}`;
      const display = alias || normalized;
      return `[${display}](${href})`;
    },
  );
}

export function isKbLink(href?: string): boolean {
  return typeof href === "string" && href.startsWith(KB_LINK_PREFIX);
}

/**
 * 去掉正文最前面的 H1 标题（如果有）。
 *
 * 详情页 / 首页都已经在框架层用 frontmatter.title 渲染了 H1，
 * 正文 markdown 通常自带一个一模一样的 `# 标题`，渲染会出现重复 H1。
 * 只剥掉"第一个非空块就是 # 开头"的情况，对正文中间的 ## 子标题不动。
 */
export function stripLeadingH1(content: string): string {
  // 跳过开头的空行后，看第一行是否是 # 标题
  const m = content.match(/^\s*#\s+[^\n]+\n+/);
  if (!m) return content;
  return content.slice(m[0].length);
}

/** 解析 kb:// 链接为 (target, anchor, relation)。
 *  注意：react-markdown 渲染 `[text](href)` 时会按 RFC 3986 归一化 href——
 *  把非 ASCII 字符（如中文文件名 `前6期选题`）percent-encode，`^` 也编码成 `%5E`。
 *  所以 target 与 anchor 拿到时都可能是 encoded 形式，**两者都必须 decodeURIComponent
 *  还原**：
 *    - anchor 不还原 → `replace(/^\^/, "")` 不匹配 `%5E` 开头，API 把 anchor 当无效
 *      退回整篇 readFile，hover 预览显示全文。
 *    - target 不还原 → WikiLink 把 `raw/notes/%E5%89%8D...` 原样显示在 popover 头部
 *      （中文变乱码），且 refNum 注册表用干净中文建键、查表用 encoded 形式 → 必然 miss，
 *      中文名 raw 文件的论文式 [n] 上标全部失效。
 *
 *  query 段 `?rel=SUPPORTS` 由 preprocessWikiLinks 写入；这里取出还原为
 *  RelationType，由 WikiLink 组件渲染徽章。
 */
export function parseKbLink(href: string): {
  target: string;
  anchor: string | null;
  relation: RelationType | null;
} | null {
  if (!isKbLink(href)) return null;
  const stripped = href.slice(KB_LINK_PREFIX.length);
  // 解析顺序：hash 永远在 query 之后（preprocessWikiLinks 也是这么写入的），
  // 所以先按 # 切，再在前半段按 ? 切
  const hashIdx = stripped.indexOf("#");
  const beforeHash = hashIdx === -1 ? stripped : stripped.slice(0, hashIdx);
  let anchor: string | null = null;
  if (hashIdx !== -1) {
    const rawAnchor = stripped.slice(hashIdx + 1);
    try {
      anchor = decodeURIComponent(rawAnchor);
    } catch {
      anchor = rawAnchor;
    }
  }
  const queryIdx = beforeHash.indexOf("?");
  const rawTarget = queryIdx === -1 ? beforeHash : beforeHash.slice(0, queryIdx);
  let target: string;
  try {
    target = decodeURIComponent(rawTarget);
  } catch {
    target = rawTarget;
  }
  let relation: RelationType | null = null;
  if (queryIdx !== -1) {
    const queryStr = beforeHash.slice(queryIdx + 1);
    const params = new URLSearchParams(queryStr);
    const rel = params.get("rel");
    // 只认白名单内的关系类型，与 splitAliasOrRelation 口径一致——
    // 防止伪造 / 拼错的 ?rel= 值被当成合法 RelationType 透传给徽章渲染。
    if (rel && RELATION_TYPES.has(rel)) relation = rel as RelationType;
  }
  return { target, anchor, relation };
}

/**
 * 识别 convert.py 自动加在 heading / paragraph / table / code / figure 末尾的锚点：
 *   "## 实验结果 ^h-2-3-a3f2c1"  →  text: "实验结果", anchor: "h-2-3-a3f2c1"
 *   "数据 95.3%。 ^p-12-7d8e9a" →  text: "数据 95.3%。", anchor: "p-12-7d8e9a"
 *
 * 用于在 React 组件渲染时把锚点抽取为 HTML id（让 [[...#^anchor]] 链接跳转有效），
 * 同时把锚点文本从可见 children 中剥离（避免页面上出现 "^h-..." 噪音）。
 */
// 兼容规范 hash6 + 手写 fallback(含 - 的语义化命名)。
// 前导空白用 [ \t]*（零或多个）：canonical 锚点本带前导空格，但损坏数据里存在
// 紧贴正文无空格的锚点（如标题 "…（已 ingest）^h-2-3-ri01"），也要能剥掉。
const TRAILING_ANCHOR_RE = /^(.*?)[ \t]*\^([hpcft]-\d+(?:-\d+)?-[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)\s*$/;

import type { ReactNode, ReactElement } from "react";
import { isValidElement, cloneElement, Children } from "react";

/**
 * 递归把末尾叶子里的锚点抽出来。
 *
 * 用例：用户写 `## **加粗标题 ^h-2-3-abc**`，react-markdown 把整个 strong
 * 当一个 element，里面才有 string —— 旧实现只看顶层数组的最后一个元素，
 * 看到 element 就返回，heading 拿不到 id，HashScroller 跳不过去。
 *
 * 算法：找到末尾的字符串叶子（穿过任意层 element / array），尝试匹配锚点；
 * 命中则替换该叶子内容（去掉锚点尾巴）+ 上抛 id。
 */
export function extractTrailingAnchor(children: ReactNode): {
  displayChildren: ReactNode;
  id?: string;
} {
  if (children == null) return { displayChildren: children };

  // 字符串叶子：循环剥掉末尾的锚点（兼容一行多个锚点，如标题被叠加了
  // ^h-2-3-ri01 ^h-2-3-971342 两个；只剥一个会留下前一个当噪音显示）。
  // 末尾第一个（最靠后的）锚点作为该块的 HTML id——canonical 锚点通常在最后。
  if (typeof children === "string") {
    let s = children;
    let id: string | undefined;
    let m: RegExpMatchArray | null;
    while ((m = s.match(TRAILING_ANCHOR_RE)) !== null) {
      if (id === undefined) id = m[2];
      s = m[1];
    }
    return id !== undefined ? { displayChildren: s, id } : { displayChildren: children };
  }

  // 数组：递归到最后一个非空叶子
  if (Array.isArray(children)) {
    if (children.length === 0) return { displayChildren: children };
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      if (child == null || child === false || child === "") continue;
      const result = extractTrailingAnchor(child);
      if (result.id != null) {
        const newChildren = [...children];
        newChildren[i] = result.displayChildren;
        return { displayChildren: newChildren, id: result.id };
      }
      // 这个叶子里没锚点 → 整体未命中，返回原样（不再向更早元素回溯：anchor
      // 约定永远在末尾，要么命中末尾叶子要么没有）
      return { displayChildren: children };
    }
    return { displayChildren: children };
  }

  // React element：递归处理它的 children，命中后 cloneElement 替换
  if (isValidElement(children)) {
    const el = children as ReactElement<{ children?: ReactNode }>;
    const inner = el.props?.children;
    if (inner == null) return { displayChildren: children };
    // Children.toArray 把 React.Fragment / 单孩子 / 数组都规范化为数组
    const innerArray = Children.toArray(inner);
    const result = extractTrailingAnchor(innerArray);
    if (result.id == null) return { displayChildren: children };
    return {
      displayChildren: cloneElement(el, undefined, result.displayChildren),
      id: result.id,
    };
  }

  return { displayChildren: children };
}
