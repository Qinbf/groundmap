"use client";
/**
 * 论文样式段落引用系统（移植自 web/lib/anchor-refs.tsx）
 *
 * 把 markdown 里的 trailing anchor (`^h-/^p-/^t-/^c-/^f-`) + raw wikilink (`[[raw/...]]`)
 * 按出现顺序**统一编号 [1][2][3]**，渲染时变成 [n] 上标，文末出 References 区。
 *
 * 与主 web/ 端的视觉风格 100% 一致。
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
import { extractTrailingAnchor } from "./anchor-extract";
import { useT } from "./i18n-client";
import type { TranslationKey } from "./i18n";

const LINE_ANCHOR_RE =
  /^(.*?)[ \t]+\^([hpcft]-\d+(?:-\d+)?-[a-z0-9]+(?:-\d+)?)[ \t]*$/gm;

const RAW_WIKILINK_RE =
  /\[\[(raw\/[^\]|#]+?)(?:#(\^?[^\]|]+))?(?:\|[^\]]+)?\]\]/g;

export type RefKind = "h" | "p" | "t" | "c" | "f" | "raw";

export interface AnchorRef {
  num: number;
  key: string;
  kind: RefKind;
  anchor: string;
  target?: string;
  preview?: string;
}

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

function maskCodeBlocks(content: string): string {
  const repl = (m: string) => " ".repeat(m.length);
  return content
    .replace(/```[\s\S]*?```/g, repl)
    .replace(/~~~[\s\S]*?~~~/g, repl)
    .replace(/`[^`\n]+`/g, repl);
}

export function buildAnchorRegistry(
  content: string,
  opts?: { scanWikilinks?: boolean },
): { registry: Map<string, number>; refs: AnchorRef[] } {
  const scanWikilinks = opts?.scanWikilinks !== false;
  const registry = new Map<string, number>();
  const refs: AnchorRef[] = [];
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

  if (scanWikilinks) {
    const linkRe = new RegExp(RAW_WIKILINK_RE.source, RAW_WIKILINK_RE.flags);
    while ((m = linkRe.exec(scanSource)) !== null) {
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

  matches.sort((a, b) => a.index - b.index);
  for (const match of matches) {
    if (registry.has(match.key)) continue;
    const num = refs.length + 1;
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

/** 同文档 trailing anchor 的上标：从 context 拿编号，渲染 [n] + 点击复制 */
function AnchorSup({ id }: { id?: string }) {
  const registry = useContext(AnchorRegistryContext);
  const t = useT();
  const [copied, setCopied] = useState(false);
  if (!id) return null;
  const num = registry.get(`self:${id}`);
  if (num == null) return null;

  const handleClick = (e: ReactMouseEvent) => {
    e.preventDefault();
    const clipboard = typeof navigator !== "undefined" ? navigator.clipboard : undefined;
    if (!clipboard) {
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

  return (
    <sup className="ml-0.5 text-[0.7em] font-normal">
      <a
        href={`#ref-${num}`}
        onClick={handleClick}
        className="cursor-pointer select-none text-slate-500 no-underline hover:text-cyan-400"
        title={copied ? t("refs.copied") : t("refs.copy_tip", { id })}
      >
        [{num}]
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

/** References 区：列出 [n] → anchor / wikilink 目标 + 预览 */
export function References({ refs }: { refs: AnchorRef[] }) {
  const t = useT();
  const [collapsed, setCollapsed] = useState(refs.length > 30);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const maybeExpand = () => {
      if (window.location.hash.startsWith("#ref-")) setCollapsed(false);
    };
    maybeExpand();
    window.addEventListener("hashchange", maybeExpand);
    return () => window.removeEventListener("hashchange", maybeExpand);
  }, []);

  if (refs.length === 0) return null;

  return (
    <section className="not-prose mt-10 border-t border-slate-700 pt-5">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="mb-3 flex items-center gap-2 text-base font-semibold tracking-tight text-slate-200 hover:text-cyan-400"
        aria-expanded={!collapsed}
      >
        <span className="text-xs leading-none text-slate-500">
          {collapsed ? "▶" : "▼"}
        </span>
        <span>{t("refs.list")}</span>
        <span className="text-xs font-normal text-slate-500">({refs.length})</span>
      </button>
      {!collapsed && (
        <ol className="space-y-1.5 text-sm">
          {refs.map((r) => (
            <ReferenceItem key={r.key} item={r} />
          ))}
        </ol>
      )}
    </section>
  );
}

function ReferenceItem({ item }: { item: AnchorRef }) {
  const t = useT();
  return (
    <li
      id={`ref-${item.num}`}
      className="flex scroll-mt-20 items-baseline gap-2"
    >
      <span className="w-8 shrink-0 text-right font-mono text-xs text-slate-500">
        [{item.num}]
      </span>
      <KindBadge kind={item.kind} />
      {item.kind === "raw" ? (
        <a
          href={`http://localhost:3006/page/${item.target}.md${item.anchor ? `#${encodeURIComponent(item.anchor)}` : ""}`}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 truncate font-mono text-xs text-amber-400 hover:underline"
          title={t("refs.open_admin_tip")}
        >
          {rawTargetLabel(item.target!)}
          {item.anchor ? `#^${item.anchor}` : ""}
        </a>
      ) : (
        <a
          href={`#${item.anchor}`}
          className="shrink-0 font-mono text-xs text-slate-400 hover:text-cyan-400"
          title={t("refs.jump_tip")}
        >
          ^{item.anchor}
        </a>
      )}
      {item.preview && (
        <span className="truncate text-slate-400/80">
          — {item.preview.length > 80 ? item.preview.slice(0, 80) + "…" : item.preview}
        </span>
      )}
    </li>
  );
}

const KIND_LABEL_KEY: Record<RefKind, TranslationKey> = {
  h: "refs.kind_h",
  p: "refs.kind_p",
  t: "refs.kind_t",
  c: "refs.kind_c",
  f: "refs.kind_f",
  raw: "refs.kind_raw",
};

function KindBadge({ kind }: { kind: RefKind }) {
  const t = useT();
  return (
    <span className="shrink-0 rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-slate-400">
      {t(KIND_LABEL_KEY[kind])}
    </span>
  );
}
