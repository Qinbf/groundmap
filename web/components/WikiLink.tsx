"use client";
import Link from "next/link";
import { useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { normalizeLinkTarget, type RelationType } from "@/lib/markdown";
import { useT } from "@/lib/i18n-client";
import { usePopoverState } from "@/lib/popover-context";
import { MiniMarkdown } from "@/components/MiniMarkdown";
import { AnchorRegistryContext } from "@/lib/anchor-refs";

interface WikiLinkProps {
  target: string;
  anchor?: string | null;
  /** [[X|RELATION]] 第三组解析出的关系类型；非 null 时在链接旁渲染小徽章 */
  relation?: RelationType | null;
  children?: ReactNode;
}

/** 按关系类型选 Tailwind 颜色 class。
 *  与 GraphView 边色规则保持一致——读者在正文里看到的徽章颜色和图谱里看到的边颜色一致。
 */
function relationBadgeColor(rel: RelationType): string {
  switch (rel) {
    case "SUPPORTS":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
    case "REFUTES":
      return "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300";
    case "EXTENDS":
      return "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300";
    case "IS_A":
      return "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300";
    case "PART_OF":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    case "ALTERNATIVE_TO":
      return "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300";
    case "CITES":
      return "bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function RelationBadge({ relation }: { relation: RelationType }) {
  const t = useT();
  return (
    <sup
      className={`ml-0.5 px-1 py-px text-[9px] font-mono rounded ${relationBadgeColor(relation)}`}
      title={t("wiki_link.relation_tooltip", { relation })}
    >
      {relation}
    </sup>
  );
}

/**
 * 渲染 wiki 内部双链：
 * - 内部 wiki/ 跳转走 /page/...
 * - raw/ 链接：悬浮预览原文片段
 */
/**
 * 把 normalize 后的路径转成给读者看的友好标签：
 *   wiki/concepts/attention.md       → concepts/attention
 *   wiki/sources/vaswani2017_x.md    → sources/vaswani2017_x
 *   wiki/root_index.md               → root_index
 *   raw/papers/foo.md                → raw/papers/foo
 *
 * 规则：去 .md 扩展名 + 去 wiki/ 前缀（raw/ 保留以视觉提示来源）。
 * 没有 alias 的 wikilink 默认就用这个，避免正文里出现一长串 ".md" 噪音。
 */
function friendlyLabel(normalized: string): string {
  const noExt = normalized.replace(/\.md$/, "");
  return noExt.startsWith("wiki/") ? noExt.slice(5) : noExt;
}

export function WikiLink({ target, anchor, relation, children }: WikiLinkProps) {
  const registry = useContext(AnchorRegistryContext);
  const normalized = normalizeLinkTarget(target);
  const isRaw = normalized.startsWith("raw/");

  // 锚点形如 "^h-2-3-abc" 或 "section-text"。convert.py 生成的锚点带 ^ 前缀；
  // 浏览器 fragment 直接用 ID（不带 ^）才能命中 PageRenderer 写入的 <h2 id="h-2-3-abc">
  const cleanAnchor = anchor ? anchor.replace(/^\^/, "") : null;
  const href =
    `/page/${normalized}` + (cleanAnchor ? `#${encodeURIComponent(cleanAnchor)}` : "");

  // 论文样式：raw 引用如果在 registry 里有编号 → [n] 上标替代原文字（带 hover 预览）
  if (isRaw) {
    const refKey = `raw:${normalized.replace(/\.md$/, "")}#${cleanAnchor || ""}`;
    const refNum = registry.get(refKey);
    if (refNum != null) {
      return (
        <RawLinkWithPreview
          href={href}
          target={normalized}
          anchor={cleanAnchor}
          refNum={refNum}
        >
          {null}
        </RawLinkWithPreview>
      );
    }
  }

  // children 为空 / 是默认渲染出的原始路径文本时，都用 friendlyLabel 替换
  const childText = typeof children === "string" ? children : null;
  const isDefaultText =
    childText !== null && (childText === normalized || childText === target);
  const display: ReactNode =
    !children || isDefaultText ? friendlyLabel(normalized) : children;

  if (isRaw) {
    return (
      <>
        <RawLinkWithPreview href={href} target={normalized} anchor={cleanAnchor}>
          {display}
        </RawLinkWithPreview>
        {relation && <RelationBadge relation={relation} />}
      </>
    );
  }

  return (
    <>
      <Link
        href={href}
        scroll={false}
        className="text-primary underline decoration-dotted underline-offset-2 hover:decoration-solid"
      >
        {display}
      </Link>
      {relation && <RelationBadge relation={relation} />}
    </>
  );
}

interface RawPreviewData {
  kind?: "section" | "block" | "full";
  title?: string;
  agent_summary?: string | null;
  preview?: string;
  content?: string;
  block_kind?: string;
  error?: string;
}

/**
 * 从 H 段整章 markdown 中提取第一个 block（首段/首列表/首表格/首代码块），
 * 让 hover 预览保持"一段的尺度"而非整章全景。
 *
 * 启发式：
 * 1. 跳过开头的 H 标题行（## ...）与紧随的空行
 * 2. 第一个非空起始行决定 block 类型：
 *    - 围栏代码块（```...```）：取到下一行同 fence 闭合
 *    - 表格（| ... |）：取到下一空行
 *    - 普通段落 / 列表 / blockquote：取到下一空行
 * 3. 输出去除尾部空白
 */
function firstBlockOf(content: string): string {
  let stripped = content.replace(/^#{1,6}[^\n]*\n+/, ""); // 去 H 标题
  stripped = stripped.replace(/^\s+/, "");
  if (!stripped) return "";

  // 围栏代码块：``` 到下一个 ``` 之间
  const fenceMatch = stripped.match(/^(```|~~~)/);
  if (fenceMatch) {
    const fence = fenceMatch[1];
    const closeIdx = stripped.indexOf("\n" + fence, fence.length);
    if (closeIdx >= 0) {
      const endLineEnd = stripped.indexOf("\n", closeIdx + 1 + fence.length);
      return stripped.slice(0, endLineEnd >= 0 ? endLineEnd : stripped.length).trimEnd();
    }
    // 围栏未闭合（破损 markdown）：直接返回剩余整段，避免落到下面 "\n\n" 切分
    // 把围栏内的代码切碎成显示不完整的片段
    return stripped.trimEnd();
  }

  // 普通块：取到第一个空行（双换行）
  const blankIdx = stripped.indexOf("\n\n");
  return (blankIdx > 0 ? stripped.slice(0, blankIdx) : stripped).trimEnd();
}

function RawLinkWithPreview({
  href,
  target,
  anchor,
  children,
  refNum,
}: {
  href: string;
  target: string;
  anchor: string | null;
  children: ReactNode;
  /** 论文样式：传入此编号时整个 link 渲染为 [n] 上标 + 跳到文末 References */
  refNum?: number;
}) {
  const t = useT();
  // 全局单实例 popover:同一时刻只有一个 popover 可见,hover 不同 trigger 自动切换
  // 关键:用 useId() 保证每个组件实例 popoverId 唯一 — 否则同一 anchor 被引用多次时,
  // hover 一个会让所有同 anchor 的 popover 同时 open (bug fix)
  const reactId = useId();
  const popoverId = reactId;
  const { isOpen: open, open: openPopover, close: closePopover } = usePopoverState(popoverId);
  const [data, setData] = useState<RawPreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 200ms 防抖：用户从一个链接快速划过另一个，不会触发中间所有链接的 fetch。
  // 仅在鼠标停留超过 200ms 才真正打开 popover（开始 useEffect 内的 fetch）。
  const handleMouseEnter = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      openPopover();
      hoverTimerRef.current = null;
    }, 200);
  };
  const handleMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  // 卸载时清掉 pending timer
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open || data !== null) return;
    let cancelled = false;
    setLoading(true);
    const url =
      `/api/raw/${target}` + (anchor ? `?anchor=${encodeURIComponent(anchor)}` : "");
    fetch(url)
      .then((r) => r.json())
      .then((d: RawPreviewData) => {
        if (cancelled) return;
        if (d.error) {
          setData({ content: t("wiki_link.read_failed", { path: target }) });
          return;
        }
        setData(d);
      })
      .catch(() => {
        if (!cancelled) setData({ content: t("wiki_link.fetch_error", { path: target }) });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, data, target, anchor, t]);

  // 内容选择策略：
  // - heading section: API 返回整章节 markdown，但 hover 预览只显示首段 block
  //   （避免把整章渲染成"小型全文"，让预览保持一段的尺度）
  // - block: API 返回单段 markdown → 直接渲染
  // - full（无 anchor）: 截前 600 字
  const bodyMarkdown: string = (() => {
    if (!data) return "";
    if (data.kind === "section") {
      return firstBlockOf(data.content || "");
    }
    if (data.kind === "full") {
      const c = data.content || "";
      return c.length > 600 ? c.slice(0, 600) + "\n\n…" : c;
    }
    return data.content || data.preview || "";
  })();

  const labelKey: "wiki_link.preview_section_label" | "wiki_link.preview_block_label" | null =
    data?.kind === "section"
      ? "wiki_link.preview_section_label"
      : data?.kind === "block"
      ? "wiki_link.preview_block_label"
      : null;

  // 论文样式：refNum 模式下整个 link 渲染为 [n] 上标（仍保留 hover popover）。
  // 上标点击跳到文末 References 区，原 raw 页跳转改为 References 项里的 link。
  const linkClassName = refNum != null
    ? "text-primary no-underline hover:underline cursor-pointer"
    : "text-amber-600 dark:text-amber-400 underline decoration-dotted underline-offset-2 hover:decoration-solid";
  const linkHref = refNum != null ? `#ref-${refNum}` : href;
  const linkContent = refNum != null ? <>[{refNum}]</> : children;

  // 不用 title= 属性 — 避免浏览器原生 tooltip 与 React popover 同时弹出
  // (路径信息已经在 popover 顶部显示,无需重复)
  const linkEl = (
    <Link
      href={linkHref}
      scroll={false}
      data-popover-trigger
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={linkClassName}
      aria-label={refNum != null ? `${target}${anchor ? `#^${anchor}` : ""}` : undefined}
    >
      {linkContent}
    </Link>
  );

  return (
    <span className="relative inline-block">
      {refNum != null ? (
        <sup className="text-[0.7em] font-normal mx-0.5">{linkEl}</sup>
      ) : (
        linkEl
      )}
      {open && (
        <div
          data-popover
          className="absolute left-0 top-6 z-50 w-[28rem] max-w-[36rem] rounded-md border bg-popover p-3 text-xs text-popover-foreground shadow-lg"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] text-muted-foreground font-mono truncate flex-1 min-w-0">
              {target}{anchor ? `#^${anchor}` : ""}
            </span>
            {labelKey && (
              <span className="text-[9px] uppercase tracking-wide bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono shrink-0">
                {t(labelKey)}
              </span>
            )}
            <button
              type="button"
              onClick={closePopover}
              className="ml-auto text-muted-foreground hover:text-foreground text-base leading-none px-1 shrink-0"
              aria-label={t("common.close")}
              title={t("common.close")}
            >
              ×
            </button>
          </div>
          {data?.title && (
            <div className="font-semibold text-sm mb-1">{data.title}</div>
          )}
          {data?.agent_summary && (
            <div className="text-[11px] italic text-muted-foreground border-l-2 border-muted pl-2 mb-2">
              {data.agent_summary}
            </div>
          )}
          {loading ? (
            <div>{t("wiki_link.preview_loading")}</div>
          ) : bodyMarkdown ? (
            <div className="max-h-[24rem] overflow-y-auto">
              <MiniMarkdown content={bodyMarkdown} />
            </div>
          ) : null}
        </div>
      )}
    </span>
  );
}
