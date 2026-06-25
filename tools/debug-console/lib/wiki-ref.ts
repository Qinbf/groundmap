/**
 * Wiki 引用解析 — [[path#anchor|alias]] 语法
 *
 * 支持形态：
 *   [[wiki/concepts/transformer]]                    → 整页
 *   [[wiki/concepts/transformer#注意力机制]]           → 页面 + 标题段
 *   [[wiki/concepts/transformer#h-2-3-a3f2c1]]       → 页面 + heading anchor
 *   [[raw/papers/smith2026#^p-12-7d8e9a]]            → 页面 + block anchor
 *   [[wiki/concepts/X|定义]]                         → 整页 + 显示别名
 *
 * 解析后由 PreviewPanel 决定调哪个工具：
 *   - 无 anchor → read_page
 *   - anchor 以 ^ 开头（去掉 ^ 后形如 p-/t-/c-/f-）→ read_block
 *   - 其他 anchor → read_section（k.py 同时支持 anchor 和 heading 标题）
 */
import { t, DEFAULT_LOCALE, type Locale } from "./i18n";

export interface WikiRef {
  path: string;
  /** 已去掉前导 ^（如有），统一以 token 形式存 */
  anchor: string | null;
  /** 是否原本带 ^ 前缀（决定调 read_block 还是 read_section）*/
  isBlock: boolean;
  alias: string | null;
}

/**
 * Match `[[...]]` —— 内部不允许 `[`/`]`，允许中文。
 * 分组：1=target  2=anchor (可选)  3=alias (可选)
 */
export const WIKI_REF_RE = /\[\[([^\[\]|#]+?)(?:#([^\[\]|]+?))?(?:\|([^\[\]]+?))?\]\]/g;

/**
 * 裸 slug 引用兜底正则 —— 模型偶尔不规范输出 `sources/X#p-1-abc` / `raw:articles/Y#h-2-3-def`
 * 这种缺 `[[ ]]` 包裹 + 可能缺 `^` 前缀的形式。这里识别它们并补全为标准 `[[wiki/...#^...]]`。
 *
 * 匹配条件（很严格，避免误伤普通文本）：
 *   - 前导：行首 或 非字母数字/斜杠/左方括号字符（含中文、空白、标点）
 *   - 路径：可选 `wiki/` / `raw/` / `raw:` 前缀 + 已知顶级目录 + slug
 *   - 锚点：必须紧跟 `#` + 可选 `^` + KB 标准 anchor 格式（h/p/t/c/f - digits - hash）
 */
const KB_WIKI_DIRS = ["sources", "concepts", "analyses", "entities", "indexes"] as const;
const KB_RAW_DIRS = ["articles", "papers"] as const;
const BARE_SLUG_REF_RE = new RegExp(
  // 前导（零宽 lookbehind）：前一个字符不能是字母/数字/_/斜杠/左方括号
  // 用 lookbehind 而非 capturing group——否则 lead 字符被消费，紧贴的下个引用就无 lead 可用
  "(?<![\\w/\\[])" +
    // 路径前缀 + 目录 + slug（slug 不含 #/空白/方括号/括号）
    "((?:wiki/|raw/|raw:)?(" +
    [...KB_WIKI_DIRS, ...KB_RAW_DIRS].join("|") +
    ")/[\\w\\-]+)" +
    // anchor：# + 可选 ^ + KB 标准格式（hash 固定 6 位）
    "#\\^?([hptcf]-\\d+(?:-\\d+)?-[a-z0-9]{6})",
  "g",
);

const WIKI_DIR_SET = new Set<string>(KB_WIKI_DIRS);
const RAW_DIR_SET = new Set<string>(KB_RAW_DIRS);

/**
 * 把裸 slug 引用转回标准 `[[wiki/.../X#^anchor]]` 形式。
 * 这是渲染层兜底——保证即使模型违规也能正确编号 + 显示 + 点击。
 *
 * 不处理代码块/行内 code（先 maskCode 再调本函数；上游 ReactMarkdown 是块级解析，
 * 这里我们只对纯 markdown 文本兜底，代码块由 markdown 解析器隔离）。
 */
function normalizeOnce(text: string): string {
  return text.replace(
    BARE_SLUG_REF_RE,
    (_full, slug: string, topdir: string, anchor: string) => {
      let path: string;
      if (slug.startsWith("wiki/") || slug.startsWith("raw/")) {
        path = slug;
      } else if (slug.startsWith("raw:")) {
        path = "raw/" + slug.slice(4);
      } else if (WIKI_DIR_SET.has(topdir)) {
        path = "wiki/" + slug;
      } else if (RAW_DIR_SET.has(topdir)) {
        path = "raw/" + slug;
      } else {
        return _full;
      }
      // 强制补 ^ 前缀（KB 块锚点规范）
      return `[[${path}#^${anchor}]]`;
    },
  );
}

export function normalizeBareSlugRefs(text: string): string {
  // 循环跑到收敛——处理"两个引用直接相连"的情况：
  // 第一轮转完后，相邻引用前面会变成 `]]`，第二轮能命中（`]` 不在 lookbehind 排除集合里）
  let prev = "";
  let cur = text;
  for (let i = 0; prev !== cur && i < 8; i++) {
    prev = cur;
    cur = normalizeOnce(cur);
  }
  return cur;
}

/** 规范化路径——补 .md 后缀（如果没有），统一斜杠 */
export function normalizeRefPath(raw: string): string {
  const p = raw.trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (/\.(md|html|pdf|txt|outline\.json)$/i.test(p)) return p;
  return `${p}.md`;
}

export function parseWikiRef(target: string, anchor?: string, alias?: string): WikiRef {
  let normAnchor: string | null = null;
  let isBlock = false;
  if (anchor) {
    if (anchor.startsWith("^")) {
      normAnchor = anchor.slice(1);
      isBlock = true;
    } else {
      normAnchor = anchor;
    }
  }
  return {
    path: normalizeRefPath(target),
    anchor: normAnchor,
    isBlock,
    alias: alias?.trim() || null,
  };
}

/** 默认显示文本：alias 优先；没有时用 path#anchor 的精简形 */
export function refDisplayText(ref: WikiRef): string {
  if (ref.alias) return ref.alias;
  const slug = ref.path.replace(/^wiki\//, "").replace(/^raw\//, "raw:").replace(/\.md$/, "");
  return ref.anchor ? `${slug}#${ref.anchor}` : slug;
}

/** 把 ref 编进自定义 href，方便 ReactMarkdown 的 a 组件解析回 ref 对象 */
export function refToHref(ref: WikiRef): string {
  const payload = encodeURIComponent(JSON.stringify(ref));
  return `#kbref:${payload}`;
}

export function hrefToRef(href: string): WikiRef | null {
  if (!href.startsWith("#kbref:")) return null;
  try {
    const json = decodeURIComponent(href.slice("#kbref:".length));
    const obj = JSON.parse(json);
    if (typeof obj !== "object" || !obj || typeof obj.path !== "string") return null;
    return {
      path: obj.path,
      anchor: typeof obj.anchor === "string" ? obj.anchor : null,
      isBlock: obj.isBlock === true,
      alias: typeof obj.alias === "string" ? obj.alias : null,
    };
  } catch {
    return null;
  }
}

/**
 * 把 markdown 文本里的 [[wiki/...]] 替换成标准 markdown 链接 `[text](#kbref:...)`，
 * 让 ReactMarkdown 能渲染为 <a>，再由 a 组件拦截点击。
 */
export function inlineWikiRefs(text: string): string {
  return normalizeBareSlugRefs(text).replace(WIKI_REF_RE, (full, target, anchor, alias) => {
    const ref = parseWikiRef(target, anchor, alias);
    const display = refDisplayText(ref);
    const href = refToHref(ref);
    // 把 display 里的 ] 转义掉，避免破坏 markdown 链接语法
    const safeDisplay = display.replace(/\]/g, "\\]");
    return `[${safeDisplay}](${href})`;
  });
}

/**
 * 编号引用：扫描文本数组（一条消息的所有 text parts），按首次出现顺序
 * 去重编号。同一 path#anchor 共享一个编号。
 */
export interface NumberedRef {
  n: number;
  key: string;
  ref: WikiRef;
}

export function collectRefs(texts: string[]): NumberedRef[] {
  const seen = new Map<string, NumberedRef>();
  const list: NumberedRef[] = [];
  for (const rawText of texts) {
    const text = normalizeBareSlugRefs(rawText);
    // 重新 new RegExp 避免共享 lastIndex 的副作用
    const re = new RegExp(WIKI_REF_RE.source, WIKI_REF_RE.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const ref = parseWikiRef(m[1], m[2], m[3]);
      const key = `${ref.path}#${ref.anchor || ""}`;
      if (!seen.has(key)) {
        const entry: NumberedRef = { n: list.length + 1, key, ref };
        seen.set(key, entry);
        list.push(entry);
      }
    }
  }
  return list;
}

/**
 * 把指定 key（`path#anchor`，anchor 不含 ^）的**块级**引用"降级"为整页链接：
 * 去掉 `#^anchor` 只留 `[[path|alias]]`。用于答案后验判定某引用锚点的内容不支撑论断时，
 * 去掉假精度（仍指向正确的源页面，只是不再声称精确到那个错块）。
 */
export function downgradeRefAnchors(text: string, downgradedKeys: Set<string>): string {
  if (downgradedKeys.size === 0) return text;
  const norm = normalizeBareSlugRefs(text);
  const re = new RegExp(WIKI_REF_RE.source, "g");
  return norm.replace(re, (full, target: string, anchor?: string, alias?: string) => {
    const ref = parseWikiRef(target, anchor, alias);
    const key = `${ref.path}#${ref.anchor || ""}`;
    if (ref.anchor && downgradedKeys.has(key)) {
      return alias ? `[[${target}|${alias}]]` : `[[${target}]]`;
    }
    return full;
  });
}

/**
 * 把「在当前库根本不存在」的引用（后验 broken 列表）**去链接化**：替换成带标记的纯文本，
 * 不再渲染为可点链接，也不进编号 / references 列表。
 *
 * 为什么需要：system prompt 已禁止编造来源，但模型（尤其 agent 类）仍可能违规凭空写出
 * `[[wiki/sources/xxx]]`——或问题主题压根不在当前 workspace。validateAnswerRefs 已能检出这些
 * 路径（broken），但检出只是「软提示」；这里在**渲染层硬执行**：假来源一律不可点，杜绝点开即 404。
 *
 * @param brokenPaths 归一化后的路径集合（与 parseWikiRef().path 同口径，含 .md）
 */
export function neutralizeBrokenRefs(
  text: string,
  brokenPaths: Set<string>,
  locale: Locale = DEFAULT_LOCALE,
): string {
  if (brokenPaths.size === 0) return text;
  const norm = normalizeBareSlugRefs(text);
  const re = new RegExp(WIKI_REF_RE.source, "g");
  const marker = t("ref.no_source", locale);
  return norm.replace(re, (full, target: string, anchor?: string, alias?: string) => {
    const ref = parseWikiRef(target, anchor, alias);
    if (brokenPaths.has(ref.path)) {
      // 去掉 [ ] 防破坏 markdown；不输出链接语法 → ReactMarkdown 渲染为纯文本
      const display = refDisplayText(ref).replace(/[[\]]/g, "");
      return `${display}〔⚠ ${marker}〕`;
    }
    return full;
  });
}

/**
 * 把 [[ref]] 替换成 [N] 编号链接（需要先 collectRefs 拿到映射）。
 * 转义 [ ] 让 markdown 把 [N] 当字面字符而不是脚注语法。
 */
export function inlineWikiRefsNumbered(
  text: string,
  refMap: Map<string, number>,
): string {
  return normalizeBareSlugRefs(text).replace(WIKI_REF_RE, (full, target, anchor, alias) => {
    const ref = parseWikiRef(target, anchor, alias);
    const key = `${ref.path}#${ref.anchor || ""}`;
    const n = refMap.get(key);
    if (n === undefined) return full;
    const href = refToHref(ref);
    return `[\\[${n}\\]](${href})`;
  });
}

/** 根据 ref 决定调哪个 KB 工具 + 工具参数 */
export function refToToolCall(ref: WikiRef): { tool: string; args: Record<string, unknown> } {
  if (ref.anchor && ref.isBlock) {
    return { tool: "read_block", args: { path: ref.path, anchor: ref.anchor } };
  }
  if (ref.anchor) {
    return { tool: "read_section", args: { path: ref.path, anchor: ref.anchor } };
  }
  return { tool: "read_page", args: { path: ref.path } };
}

/** 主管理台 web/ 的页面深链 */
export function refToAdminUrl(ref: WikiRef, kbBase = "http://localhost:3006"): string {
  // 主管理台路由 /page/<path>：**必须带 .md** —— 该路由的 getPage 按完整相对路径查文件，
  // 去掉 .md 会 404（实测：/page/wiki/sources/X 404、/page/wiki/sources/X.md 200）。不带 anchor，仅整页。
  const p = ref.path.endsWith(".md") ? ref.path : `${ref.path}.md`;
  return `${kbBase}/page/${p}`;
}
