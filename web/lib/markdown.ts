/**
 * Markdown / frontmatter 解析与序列化
 * 与 Python 端 (scripts/k.py) 行为对齐
 */
import matter from "gray-matter";

/**
 * Wiki 双链正则。
 *
 * **同步约束**：必须与 scripts/k.py 的 WIKILINK_RE 字面一致
 * （仅差 JS 端的 `g` flag 与 Python r-string 包装）。
 * 修改时两处同步更新，并跑 `python -m pytest scripts/tests/test_k_helpers.py
 * -k TestWikilinkRegexSync` 守住 drift。
 */
export const WIKILINK_RE = /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;
export const TO_BE_UPDATED_RE = /(?<!\w)#to-be-updated(?!\w)/;

/**
 * 类型化关系图谱（v0.4b）：[[target|RELATION_TYPE]] 的标准关系白名单。
 *
 * 判别规则：[[X|Y]] 第三组 Y 完整匹配白名单中某条 → 关系类型；其他
 * （含中文、空格、小写、未知大写词如 "RFC"）→ 显示别名。白名单外的全大写词
 * **不**视为关系，避免把任意全大写词误判。
 *
 * **同步约束**：必须与 scripts/k.py 的 RELATION_TYPES 字面一致；
 * TestRelationTypesSync 守住 drift。
 */
export const RELATION_TYPES = new Set<string>([
  "SUPPORTS",        // A 支持 B 的论断
  "REFUTES",         // A 反驳 B 的论断
  "EXTENDS",         // A 在 B 的基础上延伸
  "IS_A",            // A 是 B 的一种
  "PART_OF",         // A 是 B 的组成部分
  "ALTERNATIVE_TO",  // A 是 B 的替代方案
  "CITES",           // A 引用 B（一般文献引用）
]);

export type RelationType =
  | "SUPPORTS"
  | "REFUTES"
  | "EXTENDS"
  | "IS_A"
  | "PART_OF"
  | "ALTERNATIVE_TO"
  | "CITES";

/**
 * 把 [[X|Y]] 第三组 Y 判别为 {alias, relation}。
 * 二者互斥；纯 [[X]] 两者都为 null。
 */
export function splitAliasOrRelation(thirdGroup: string | undefined | null): {
  alias: string | null;
  relation: RelationType | null;
} {
  if (thirdGroup == null) return { alias: null, relation: null };
  const stripped = thirdGroup.trim();
  if (RELATION_TYPES.has(stripped)) {
    return { alias: null, relation: stripped as RelationType };
  }
  return { alias: thirdGroup, relation: null };
}

/**
 * 剥离 convert.py 添加的内联锚点字符串（` ^h-2-3-abc123` / ` ^p-12-7d8e9a` 等）。
 * 用于 snippet / preview 展示——锚点是机器导航坐标，不该出现在用户视觉中。
 *
 * 注意：与 markdown-render.ts 的 TRAILING_ANCHOR_RE 不同——那个仅匹配行末，
 * 这里匹配字符串中**任意位置**的锚点（snippet 是从原文中间截取的）。
 */
// 兼容两种 anchor 末段:
//  - 规范 hash6: ^h-2-3-a3f2c1
//  - 手写 fallback: ^h-2-3-ri-domains (含 -;不建议但需能 strip)
const INLINE_ANCHOR_RE = /\s+\^[hpcft]-\d+(?:-\d+)?-[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?=\s|$)/g;

export function stripAnchors(text: string): string {
  return text.replace(INLINE_ANCHOR_RE, "");
}

export interface PageFrontmatter {
  title?: string;
  type?: string;
  status?: string;
  confidence?: string;
  created_date?: string;
  last_modified?: string;
  last_modified_by?: string;
  source_count?: number;
  sources?: string[];
  tags?: string[];
  scope?: string;        // type=index 才有
  page_count?: number;   // type=index 才有
  locked?: boolean;
  [key: string]: unknown;
}

export interface ParsedPage {
  frontmatter: PageFrontmatter;
  content: string;       // 不含 frontmatter
  raw: string;           // 完整原始字符串
}

/** 把 Date 对象规范化为 YYYY-MM-DD 字符串（UTC）；保持其他类型不变。
 *  用 UTC 与 operations.ts 的 todayISO()（new Date().toISOString().slice(0,10)）对齐——
 *  两边混用时区会导致跨时区下日期来回切换，产生大量伪 diff。
 */
function normalizeDateValue(v: unknown): unknown {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  return v;
}

const DATE_FIELDS = ["created_date", "last_modified"] as const;

function normalizeFrontmatterDates(fm: Record<string, unknown>): PageFrontmatter {
  const out = { ...fm };
  for (const field of DATE_FIELDS) {
    if (field in out) out[field] = normalizeDateValue(out[field]);
  }
  return out as PageFrontmatter;
}

export function parseMarkdown(raw: string): ParsedPage {
  const parsed = matter(raw);
  return {
    frontmatter: normalizeFrontmatterDates(parsed.data as Record<string, unknown>),
    content: parsed.content,
    raw,
  };
}

/**
 * 标准 frontmatter key 顺序——序列化时按这个顺序输出。
 * 与 wiki/_templates/ 模板对齐；其他自定义 key 追加在后面。
 *
 * 不强制顺序的话，gray-matter.stringify 会按 JS 对象插入序输出，
 * 编辑保存往往会让 key 顺序变动 → 大量伪 diff 噪音。
 */
const FRONTMATTER_KEY_ORDER = [
  "title",
  "type",
  "scope",       // index
  "page_count",  // index
  "created_date",
  "last_modified",
  "last_modified_by",
  "status",
  "confidence",
  "source_count",
  "sources",
  "tags",
  "locked",
] as const;

function reorderFrontmatter(fm: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  // 先按标准顺序放入存在的 key
  for (const k of FRONTMATTER_KEY_ORDER) {
    if (k in fm) out[k] = fm[k];
  }
  // 其余自定义 key 按出现顺序追加
  for (const k of Object.keys(fm)) {
    if (!(k in out)) out[k] = fm[k];
  }
  return out;
}

export function serializeMarkdown(frontmatter: PageFrontmatter, content: string): string {
  // 重排 key 顺序减少伪 diff
  const ordered = reorderFrontmatter(frontmatter as Record<string, unknown>);
  return matter.stringify(content, ordered);
}

export interface WikiLink {
  target: string;
  anchor: string | null;
  alias: string | null;
  relation: RelationType | null;
  raw: string;       // 原始 [[...]] 字符串
  start: number;     // 字符位置
  end: number;
}

export function parseWikilinks(content: string): WikiLink[] {
  // 用 matchAll 而非 exec 循环：
  // - matchAll 内部独立维护 iterator state，**不依赖共享 regex 的 lastIndex**
  // - 高并发场景下两个请求同时进入此函数也不会互相覆盖匹配位置
  const out: WikiLink[] = [];
  for (const m of content.matchAll(WIKILINK_RE)) {
    if (m.index === undefined) continue;
    const { alias, relation } = splitAliasOrRelation(m[3]);
    out.push({
      target: m[1],
      anchor: m[2] || null,
      alias,
      relation,
      raw: m[0],
      start: m.index,
      end: m.index + m[0].length,
    });
  }
  return out;
}

/** 标准化链接目标：补 .md 后缀 */
export function normalizeLinkTarget(target: string): string {
  const trimmed = target.trim();
  if (!trimmed.endsWith(".md")) return trimmed + ".md";
  return trimmed;
}

/** 字边界判定：空白、标点、CJK 与 ASCII 切换处都算边界 */
function isWordBoundary(ch: string | undefined): boolean {
  if (ch === undefined) return true;
  return /[\s\p{P}]/u.test(ch);
}

/**
 * 截取上下文片段（前后各 N 字符），附带：
 *   - 边界感知：尽量从词边界（空白/标点）开始与结束，避免把 "architecture" 切成 "itecture"
 *   - 省略号标记：如果不是从原文 0 / 末尾起，前后补 "…"
 *   - 多行折叠为单行
 *   - 移除最常见的 markdown 噪声（连续 # / **）让纯文本更顺眼
 *     注：保留 [[link]] 因为读者通常想知道上下文里链了什么
 */
export function snippet(content: string, start: number, end: number, padding = 60): string {
  // 初步窗口
  let a = Math.max(0, start - padding);
  let b = Math.min(content.length, end + padding);
  // 向左扩到词边界（最多再扩 20 字符）
  for (let i = 0; i < 20 && a > 0 && !isWordBoundary(content[a - 1]); i++) a--;
  // 向右扩到词边界
  for (let i = 0; i < 20 && b < content.length && !isWordBoundary(content[b]); i++) b++;

  let s = content.slice(a, b).replace(/\n+/g, " ").trim();
  // 去掉行首遗留的 markdown 噪声（# 标题前缀、列表 - / *、引用 >）
  s = s.replace(/^[#>\-*\s]+/, "");
  // 把多个连续标记符压成单个空格，避免 "**xxx**" 之类的强调污染
  s = s.replace(/\*{1,3}/g, "").replace(/\s{2,}/g, " ");
  // 剥离 convert.py 加的 ^h-/^p-/... 锚点尾巴（机器坐标不该出现在用户视觉中）
  s = stripAnchors(s);

  if (a > 0) s = "…" + s;
  if (b < content.length) s = s + "…";
  return s;
}
