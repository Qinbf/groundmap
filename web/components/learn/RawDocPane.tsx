"use client";
import { useEffect, useMemo, useRef } from "react";
import { useT } from "@/lib/i18n-client";
import { MiniMarkdown } from "@/components/MiniMarkdown";

/**
 * 双栏对照布局的左栏：渲染整篇 raw markdown，按段落锚点切块。
 *
 * - 接收 raw md 字符串 + activeAnchors（从右栏当前可见 step 透传）
 * - 解析后每个 block 一个 div（data-anchor）；activeAnchors 命中的 block 高亮 + 滚到视区中心
 * - frontmatter 单独成块（kind="frontmatter"），用 <pre> 展示 YAML 原文
 * - block 顶部显示锚点 chip（如 ^p-1-3e8c92）让用户直观看到「锚点」概念
 *
 * 数据流：page.tsx → LearnApp → RawDocPane（rawMd 字符串）；
 *         StepCard observer → LearnApp setActiveStep → RawDocPane（activeAnchors）。
 */

type Block =
  | { kind: "frontmatter"; text: string }
  | { kind: "body"; text: string; anchor: string | null };

const ANCHOR_TAIL_RE = /[ \t]+\^([hpcft]-\d+(?:-\d+)?-[a-z0-9]+)\s*$/;

/**
 * 解析 raw md 按锚点切块。简单状态机：
 *   - 首行 "---" 进入 frontmatter 模式，直到下一个 "---"
 *   - body 模式：扫描每一行，行末匹配锚点 → flush 当前 buf 为一个 body block
 */
function parseBlocks(md: string): Block[] {
  const lines = md.split("\n");
  const blocks: Block[] = [];
  let buf: string[] = [];
  let inFrontmatter = false;
  let frontmatterStarted = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    // 首行 "---" 开 frontmatter
    if (i === 0 && raw.trim() === "---") {
      inFrontmatter = true;
      frontmatterStarted = true;
      buf.push(raw);
      continue;
    }
    if (inFrontmatter) {
      buf.push(raw);
      if (raw.trim() === "---") {
        blocks.push({ kind: "frontmatter", text: buf.join("\n") });
        buf = [];
        inFrontmatter = false;
      }
      continue;
    }

    // body 模式
    const m = raw.match(ANCHOR_TAIL_RE);
    if (m) {
      const anchor = m[1]!;
      const cleanLine = raw.replace(ANCHOR_TAIL_RE, "");
      buf.push(cleanLine);
      // 去掉 buf 开头的空行
      while (buf.length > 0 && buf[0]!.trim() === "") buf.shift();
      blocks.push({ kind: "body", text: buf.join("\n"), anchor });
      buf = [];
    } else {
      buf.push(raw);
    }
  }

  // flush
  if (buf.length > 0) {
    while (buf.length > 0 && buf[0]!.trim() === "") buf.shift();
    if (buf.length > 0) {
      blocks.push({ kind: "body", text: buf.join("\n"), anchor: null });
    }
  }

  // 兜底：如果没解析到任何 block（极端 corruption），把整篇当一个 block
  if (blocks.length === 0 && md.trim().length > 0) {
    blocks.push({ kind: "body", text: md, anchor: null });
    if (frontmatterStarted) {
      // 防呆：上面状态机意外吞掉了 frontmatter
    }
  }

  return blocks;
}

interface RawDocPaneProps {
  rawMd: string;
  pseudoPath: string;
  /** 当前 step 关注的锚点列表（去掉 ^ 前缀，如 "p-1-3e8c92"） */
  activeAnchors: string[];
}

export function RawDocPane({ rawMd, pseudoPath, activeAnchors }: RawDocPaneProps) {
  const t = useT();
  const blocks = useMemo(() => parseBlocks(rawMd), [rawMd]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeSet = useMemo(() => new Set(activeAnchors), [activeAnchors]);

  // activeAnchors 变化 → 把第一个匹配块滚到视区中心
  useEffect(() => {
    if (activeAnchors.length === 0) return;
    const container = scrollRef.current;
    if (!container) return;
    // 找第一个匹配的 block
    const firstAnchor = activeAnchors[0];
    if (!firstAnchor) return;
    const el = container.querySelector<HTMLElement>(
      `[data-anchor="${firstAnchor}"]`,
    );
    if (!el) return;
    // 用 container 的内部滚动，而不是页面滚动
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const offset =
      elRect.top - containerRect.top - container.clientHeight / 3;
    container.scrollBy({ top: offset, behavior: "smooth" });
  }, [activeAnchors]);

  return (
    <div className="flex flex-col h-full border rounded-xl bg-card overflow-hidden">
      {/* 顶部 sticky bar：显示伪路径 */}
      <div className="shrink-0 px-4 py-2 border-b bg-muted/40 flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-muted-foreground truncate">
          {pseudoPath}
        </span>
        <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground/70">
          {t("learn.rawpane.label")}
        </span>
      </div>

      {/* intro */}
      <div className="shrink-0 px-4 py-2 border-b bg-blue-50/40 dark:bg-blue-950/15 text-[11px] leading-relaxed text-foreground/70">
        {t("learn.rawpane.intro")}
      </div>

      {/* 可滚动主体 */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-3"
      >
        {blocks.map((block, i) => {
          if (block.kind === "frontmatter") {
            return (
              <div
                key={`fm-${i}`}
                className="rounded-md border bg-zinc-50 dark:bg-zinc-950/50 p-3"
              >
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-medium">
                  {t("learn.rawpane.frontmatter_label")}
                </div>
                <pre className="text-[11px] leading-snug font-mono text-foreground/80 whitespace-pre-wrap break-words">
                  <code>{block.text}</code>
                </pre>
              </div>
            );
          }
          // body block
          const isActive = block.anchor !== null && activeSet.has(block.anchor);
          return (
            <div
              key={`b-${i}-${block.anchor ?? "noanchor"}`}
              data-anchor={block.anchor ?? undefined}
              className={
                "rounded-md border transition-all duration-300 " +
                (isActive
                  ? "border-l-4 border-l-blue-500 border-y-blue-200/50 border-r-blue-200/50 dark:border-l-blue-400 dark:border-y-blue-900/50 dark:border-r-blue-900/50 bg-blue-50/60 dark:bg-blue-950/30 shadow-sm"
                  : "border-border bg-background hover:bg-muted/20")
              }
            >
              <div className="flex items-baseline justify-between gap-2 px-3 pt-2">
                {block.anchor ? (
                  <code
                    className={
                      "text-[10px] font-mono px-1.5 py-0.5 rounded " +
                      (isActive
                        ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                        : "bg-muted text-muted-foreground")
                    }
                  >
                    ^{block.anchor}
                  </code>
                ) : (
                  <span className="text-[10px] font-mono text-muted-foreground/50 italic">
                    {t("learn.rawpane.no_anchor")}
                  </span>
                )}
                {isActive && (
                  <span className="text-[10px] uppercase tracking-wide text-blue-600 dark:text-blue-400 font-medium">
                    {t("learn.rawpane.active")}
                  </span>
                )}
              </div>
              <div className="px-3 pb-2">
                <MiniMarkdown content={block.text} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
