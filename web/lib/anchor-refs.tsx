"use client";
/**
 * 论文样式段落引用：把 markdown 里的 trailing anchor (`^h-/^p-/^t-/^c-/^f-`)
 * 与跨文档 raw wikilink (`[[raw/.../foo#^p-1-abc]]`) 按出现顺序统一编号，
 * 渲染时把它们变成 [n] 上标，文末渲染 References 区。
 *
 * 这是**显示层**抽象 —— 数据层 anchor / wikilink 完全不变，工具链照旧。
 *
 * 模块边界：
 * - `markdown-render.ts` 保持纯 markdown 工具（与 React Context 无关）
 * - 本文件集中 anchor 编号系统的 Context / 组件 / 扫描，需要 "use client"
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import type { Components } from "react-markdown";
import { extractTrailingAnchor, extractCodeBlockAnchor } from "./markdown-render";
import { useT, useSelfRefs } from "./i18n-client";

/**
 * 每行末尾的 trailing anchor —— 与 markdown-render.ts 的 TRAILING_ANCHOR_RE
 * 同语义但 multiline 全文迭代版本（用于一次性建立 anchor → 编号映射）。
 */
const LINE_ANCHOR_RE =
  /^(.*?)[ \t]+\^([hpcft]-\d+(?:-\d+)?-[a-z0-9]+(?:-\d+)?)[ \t]*$/gm;

/**
 * Raw wikilink 引用扫描。匹配 `[[raw/...]]` / `[[raw/...#^anchor]]` / `[[raw/...|alias]]`。
 * 只扫 raw 引用 —— wiki 内部链接不纳入 References（语义上不是论文引用）。
 *
 * 与 markdown.ts 的 WIKILINK_RE 不同：这里只关心 raw 目标，且需要 anchor 的原始字符串
 * （保留 `^` 前缀方便规范化）。
 */
const RAW_WIKILINK_RE =
  /\[\[(raw\/[^\]|#]+?)(?:#(\^?[^\]|]+))?(?:\|[^\]]+)?\]\]/g;

export type RefKind = "h" | "p" | "t" | "c" | "f" | "raw";

export interface AnchorRef {
  num: number;
  /** 在 registry 里的唯一 key（`self:^anchor` 或 `raw:target#anchor`） */
  key: string;
  kind: RefKind;
  /** 内部 anchor id（不带 ^ 前缀） */
  anchor: string;
  /** raw 引用时的目标路径（如 `raw/papers/foo`） */
  target?: string;
  /** 同文档段落的预览文字（前 ~80 字符） */
  preview?: string;
}

/** 把 raw 文件名去 .md 后缀 + 不带路径前缀，方便 References 区展示 */
function rawTargetLabel(target: string): string {
  return target.replace(/\.md$/, "");
}

function cleanPreviewText(raw: string): string {
  return raw
    .replace(/^#{1,6}\s+/, "")
    .replace(/^[>\-*]\s+/, "")
    .replace(/\*{1,3}/g, "")
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .trim();
}

/**
 * 用空白字符替换 markdown 代码块（fenced + inline），让里面的 anchor / wikilink
 * 不被扫描注册到 registry（避免 ReactMarkdown 不渲染时产生 ghost references）。
 *
 * 用空白替换而非删除：保持原 content 的字符偏移不变，让 sort by index 仍然按
 * 原文出现顺序编号。
 */
function maskCodeBlocks(content: string): string {
  const replaceWithBlanks = (match: string) => " ".repeat(match.length);
  return content
    .replace(/```[\s\S]*?```/g, replaceWithBlanks) // fenced ```
    .replace(/~~~[\s\S]*?~~~/g, replaceWithBlanks) // fenced ~~~
    .replace(/`[^`\n]+`/g, replaceWithBlanks);     // inline `...`（单行内）
}

/**
 * 扫描 markdown 内容，按出现顺序统一编号 trailing anchor + raw wikilink 引用。
 *
 * @param content markdown 源
 * @param opts.scanWikilinks 是否把 raw wikilink 也纳入编号（PageRenderer = true; MiniMarkdown = false）
 */
export function buildAnchorRegistry(
  content: string,
  opts?: { scanWikilinks?: boolean },
): { registry: Map<string, number>; refs: AnchorRef[] } {
  const scanWikilinks = opts?.scanWikilinks !== false;
  const registry = new Map<string, number>();
  const refs: AnchorRef[] = [];
  // 把代码块里的内容 mask 掉再扫，避免代码块里的 anchor / wikilink 被纳入编号
  // 而 ReactMarkdown 不会渲染它们 → 形成 References 区里找不到的 ghost 编号
  const scanSource = maskCodeBlocks(content);

  type Match = {
    index: number;
    key: string;
    kind: RefKind;
    anchor: string;
    target?: string;
    preview?: string;
  };
  const matches: Match[] = [];

  // 1) trailing anchor
  const trailingRe = new RegExp(LINE_ANCHOR_RE.source, LINE_ANCHOR_RE.flags);
  let m: RegExpExecArray | null;
  while ((m = trailingRe.exec(scanSource)) !== null) {
    const anchor = m[2];
    const kindChar = anchor[0] as RefKind;
    matches.push({
      index: m.index,
      key: `self:${anchor}`,
      kind: kindChar,
      anchor,
      preview: cleanPreviewText(m[1]),
    });
  }

  // 2) raw wikilink
  if (scanWikilinks) {
    const linkRe = new RegExp(RAW_WIKILINK_RE.source, RAW_WIKILINK_RE.flags);
    while ((m = linkRe.exec(scanSource)) !== null) {
      // 标准化：去掉 .md 后缀 —— WikiLink 查表时也会去 .md，两边必须一致
      const target = m[1].trim().replace(/\.md$/, "");
      const anchorRaw = (m[2] || "").trim();
      const anchor = anchorRaw.replace(/^\^/, "");
      matches.push({
        index: m.index,
        key: `raw:${target}#${anchor}`,
        kind: "raw",
        anchor,
        target,
      });
    }
  }

  // 按出现位置排序后编号 + 去重
  // self anchor 与 raw 引用各自独立计数(§N 与 [N] 不混编号 — 视觉与语义都分离)
  matches.sort((a, b) => a.index - b.index);
  let selfCount = 0;
  let rawCount = 0;
  for (const match of matches) {
    if (registry.has(match.key)) continue;
    const num = match.kind === "raw" ? ++rawCount : ++selfCount;
    registry.set(match.key, num);
    refs.push({
      num,
      key: match.key,
      kind: match.kind,
      anchor: match.anchor,
      target: match.target,
      preview: match.preview,
    });
  }

  return { registry, refs };
}

export const AnchorRegistryContext = createContext<Map<string, number>>(new Map());

/** 同文档 trailing anchor 的上标：从 context 拿编号，渲染 [n] + 点击复制 anchor ID */
export function AnchorSup({ id }: { id?: string }) {
  const registry = useContext(AnchorRegistryContext);
  const t = useT();
  const { show: showSelfRefs } = useSelfRefs();
  const [copied, setCopied] = useState(false);
  if (!id) return null;
  if (!showSelfRefs) return null;
  const num = registry.get(`self:${id}`);
  if (num == null) return null;

  const handleClick = (e: ReactMouseEvent) => {
    e.preventDefault();
    const clipboard =
      typeof navigator !== "undefined" ? navigator.clipboard : undefined;
    if (!clipboard) {
      // 无 clipboard API（HTTP / 旧浏览器）→ 退回跳转到 References 区
      window.location.hash = `ref-${num}`;
      return;
    }
    clipboard.writeText(`^${id}`).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      },
      () => {
        window.location.hash = `ref-${num}`;
      },
    );
  };

  // self anchor 用 §N(段落标记惯例),与 raw 引用 [N](论文引文惯例)视觉区分
  return (
    <sup className="ml-0.5 text-[0.7em] font-normal">
      <a
        href={`#ref-${num}`}
        onClick={handleClick}
        className="text-muted-foreground/70 hover:text-primary no-underline cursor-pointer select-none"
        title={copied ? t("references.copied") : `^${id} · ${t("references.copy_hint")}`}
      >
        §{num}
      </a>
    </sup>
  );
}

const ANCHORED_HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;

function makeAnchoredHeading(level: 1 | 2 | 3 | 4 | 5 | 6) {
  const Tag = (`h${level}`) as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  return function AnchoredHeading({ children }: { children?: ReactNode }) {
    const { displayChildren, id } = extractTrailingAnchor(children);
    return (
      <Tag id={id}>
        {displayChildren}
        <AnchorSup id={id} />
      </Tag>
    );
  };
}

function AnchoredParagraph({ children }: { children?: ReactNode }) {
  const { displayChildren, id } = extractTrailingAnchor(children);
  return (
    <p id={id}>
      {displayChildren}
      <AnchorSup id={id} />
    </p>
  );
}

function AnchoredListItem({ children }: { children?: ReactNode }) {
  const { displayChildren, id } = extractTrailingAnchor(children);
  return (
    <li id={id}>
      {displayChildren}
      <AnchorSup id={id} />
    </li>
  );
}

function AnchoredTableCell({ children }: { children?: ReactNode }) {
  const { displayChildren, id } = extractTrailingAnchor(children);
  return (
    <td id={id}>
      {displayChildren}
      <AnchorSup id={id} />
    </td>
  );
}

/**
 * 标准的 anchor 抽取 + 上标渲染组件集合。
 * 上层 ReactMarkdown 调用方可以与自己的 components 合并使用（自己的覆盖即可）。
 */
export const ANCHOR_COMPONENTS: Components = (() => {
  const map: Components = {
    p: AnchoredParagraph,
    li: AnchoredListItem,
    td: AnchoredTableCell,
  };
  for (const lv of ANCHORED_HEADING_LEVELS) {
    (map as Record<string, unknown>)[`h${lv}`] = makeAnchoredHeading(lv);
  }
  return map;
})();

/**
 * "裸"版本：通过 extractTrailingAnchor 剥离 anchor 文本（避免视觉污染），
 * 但**不**输出 HTML id、**不**渲染 [n] 上标。
 *
 * 适用场景：MiniMarkdown / BlocksTable / learn 等局部预览渲染。
 * 这些场景下：
 * - 加 id 会与外层主页面的 PageRenderer 渲染的同 anchor 元素冲突（同 DOM 树重复 id）
 * - 加 [n] 上标需要 registry 兜底；局部 registry 与主页面 registry 不一致会混淆
 * 因此只保留"隐藏锚点文本"这一基础需求，不引入完整的论文样式机制。
 */
function makeBareHeading(level: 1 | 2 | 3 | 4 | 5 | 6) {
  const Tag = (`h${level}`) as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  return function BareHeading({ children }: { children?: ReactNode }) {
    const { displayChildren } = extractTrailingAnchor(children);
    return <Tag>{displayChildren}</Tag>;
  };
}

function BareParagraph({ children }: { children?: ReactNode }) {
  const { displayChildren } = extractTrailingAnchor(children);
  return <p>{displayChildren}</p>;
}

function BareListItem({ children }: { children?: ReactNode }) {
  const { displayChildren } = extractTrailingAnchor(children);
  return <li>{displayChildren}</li>;
}

function BareTableCell({ children }: { children?: ReactNode }) {
  const { displayChildren } = extractTrailingAnchor(children);
  return <td>{displayChildren}</td>;
}

// 围栏代码块：剥掉末行下沉的 ^c- 锚点（relocateCodeFenceAnchors 产物），只保留可见代码。
// 不赋 id（bare 场景同主页面共存会重复 id）。inline code 原样透传。
function BareCode({ children, className }: { children?: ReactNode; className?: string }) {
  const text =
    typeof children === "string"
      ? children
      : Array.isArray(children)
      ? children.join("")
      : "";
  const isBlock = (!!className && /\blanguage-/.test(className)) || text.includes("\n");
  if (!isBlock) return <code className={className}>{children}</code>;
  const { display } = extractCodeBlockAnchor(text);
  return <code className={className}>{display}</code>;
}

export const ANCHOR_COMPONENTS_BARE: Components = (() => {
  const map: Components = {
    p: BareParagraph,
    li: BareListItem,
    td: BareTableCell,
    code: BareCode,
  };
  for (const lv of ANCHORED_HEADING_LEVELS) {
    (map as Record<string, unknown>)[`h${lv}`] = makeBareHeading(lv);
  }
  return map;
})();

/** References 区:分两个子区段
 *  - 段落引用 (§N):同文档 trailing anchor 列表
 *  - 跨文档引用 ([N]):raw 论文 wikilink 列表
 *  两者独立编号,视觉与语义分离
 */
export function References({ refs }: { refs: AnchorRef[] }) {
  const t = useT();
  const { show: showSelfRefs } = useSelfRefs();
  // 关闭开关时,selfRefs 视为空(不渲染 § 子区);跨文档引用 [N] 始终保留
  const selfRefs = showSelfRefs ? refs.filter((r) => r.kind !== "raw") : [];
  const rawRefs = refs.filter((r) => r.kind === "raw");
  // 任一组超过 30 项即默认折叠该组
  const [selfCollapsed, setSelfCollapsed] = useState(selfRefs.length > 30);
  const [rawCollapsed, setRawCollapsed] = useState(rawRefs.length > 30);

  // 用户点上标 → hash 变 #ref-... → 如果折叠则自动展开
  useEffect(() => {
    if (typeof window === "undefined") return;
    const maybeExpand = () => {
      if (window.location.hash.startsWith("#ref-")) {
        setSelfCollapsed(false);
        setRawCollapsed(false);
      }
    };
    maybeExpand();
    window.addEventListener("hashchange", maybeExpand);
    return () => window.removeEventListener("hashchange", maybeExpand);
  }, []);

  if (refs.length === 0) return null;

  return (
    <section className="mt-12 pt-6 border-t border-border not-prose space-y-6">
      {selfRefs.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setSelfCollapsed((c) => !c)}
            className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground hover:text-primary mb-3"
            aria-expanded={!selfCollapsed}
          >
            <span className="text-muted-foreground text-xs leading-none">
              {selfCollapsed ? "▶" : "▼"}
            </span>
            <span>{t("references.self_section")}</span>
            <span className="text-muted-foreground text-xs font-normal">
              ({selfRefs.length})
            </span>
          </button>
          {!selfCollapsed && (
            <ol className="space-y-1.5 text-sm">
              {selfRefs.map((r) => (
                <ReferenceItem key={r.key} item={r} />
              ))}
            </ol>
          )}
        </div>
      )}
      {rawRefs.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setRawCollapsed((c) => !c)}
            className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground hover:text-primary mb-3"
            aria-expanded={!rawCollapsed}
          >
            <span className="text-muted-foreground text-xs leading-none">
              {rawCollapsed ? "▶" : "▼"}
            </span>
            <span>{t("references.cross_doc")}</span>
            <span className="text-muted-foreground text-xs font-normal">
              ({rawRefs.length})
            </span>
          </button>
          {!rawCollapsed && (
            <ol className="space-y-1.5 text-sm">
              {rawRefs.map((r) => (
                <ReferenceItem key={r.key} item={r} />
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}

function ReferenceItem({ item }: { item: AnchorRef }) {
  const t = useT();
  // self anchor 用 §N(段落标记惯例),raw 用 [N](论文引文惯例),与正文上标一致
  const labelText = item.kind === "raw" ? `[${item.num}]` : `§${item.num}`;
  return (
    <li
      id={`ref-${item.num}`}
      className="flex gap-2 items-baseline scroll-mt-20"
    >
      <span className="text-muted-foreground font-mono text-xs shrink-0 w-8 text-right">
        {labelText}
      </span>
      <KindBadge kind={item.kind} />
      {item.kind === "raw" ? (
        <a
          href={`/page/${item.target}.md${item.anchor ? `#${encodeURIComponent(item.anchor)}` : ""}`}
          className="font-mono text-xs text-amber-600 dark:text-amber-400 hover:underline shrink-0 truncate"
          title={t("references.jump_to_section")}
        >
          {rawTargetLabel(item.target!)}{item.anchor ? `#^${item.anchor}` : ""}
        </a>
      ) : (
        <a
          href={`#${item.anchor}`}
          className="font-mono text-xs text-muted-foreground hover:text-primary shrink-0"
          title={t("references.jump_to_section")}
        >
          ^{item.anchor}
        </a>
      )}
      {item.preview && (
        <span className="text-muted-foreground/80 truncate">
          — {item.preview.length > 80 ? item.preview.slice(0, 80) + "…" : item.preview}
        </span>
      )}
    </li>
  );
}

function KindBadge({ kind }: { kind: RefKind }) {
  const t = useT();
  return (
    <span className="text-[9px] uppercase tracking-wide bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono shrink-0">
      {t(`references.kind.${kind}` as const)}
    </span>
  );
}
