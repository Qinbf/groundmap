"use client";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n-client";
import { MiniMarkdown } from "@/components/MiniMarkdown";

export interface Block {
  anchor: string | null;
  kind: string;
  level?: number;
  title?: string;
  line_start: number;
  line_end: number;
  char_start: number;
  char_end: number;
  char_count: number;
  owning_section_anchor: string | null;
  preview: string;
  text?: string;
  agent_summary?: string | null;
}

interface BlocksTableProps {
  docPath: string;
  blocks: Block[];
}

const KIND_BADGE: Record<string, string> = {
  heading: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  paragraph: "bg-muted text-muted-foreground border-muted-foreground/20",
  list: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
  blockquote:
    "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  table:
    "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
  code:
    "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-500/30",
  figure:
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
};

export function BlocksTable({ docPath, blocks }: BlocksTableProps) {
  const t = useT();

  return (
    <ol className="space-y-2">
      {blocks.map((b, idx) => {
        const isHeading = b.kind === "heading";
        const badgeClass = KIND_BADGE[b.kind] || KIND_BADGE.paragraph;
        const kindLabel = isHeading
          ? `H${b.level ?? "?"}`
          : t(`blocks.kind.${b.kind}` as Parameters<typeof t>[0]);

        // 完整原文（来自 k.py blocks 的 text 字段，已剥离行尾锚点尾巴）
        const fullText = b.text ?? b.preview ?? "";

        return (
          <li
            key={`${idx}-${b.anchor || "noanchor"}`}
            id={b.anchor || undefined}
            className={
              "rounded-md border px-3 py-2 transition-colors " +
              (isHeading ? "bg-card border-blue-500/30" : "bg-card/40 border-border")
            }
          >
            <div className="flex items-start gap-3">
              <span className="text-xs font-mono text-muted-foreground shrink-0 w-8 mt-0.5">
                #{idx + 1}
              </span>
              <Badge variant="outline" className={`${badgeClass} shrink-0 mt-0.5`}>
                {kindLabel}
              </Badge>
              <div className="min-w-0 flex-1">
                {isHeading ? (
                  <>
                    <div
                      className={
                        "font-semibold " +
                        (b.level === 1
                          ? "text-base"
                          : b.level === 2
                          ? "text-sm"
                          : "text-xs")
                      }
                    >
                      {b.title}
                    </div>
                    {b.agent_summary ? (
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        <span className="font-mono mr-1 text-[10px]">
                          [{t("outline.tag.summary")}]
                        </span>
                        {b.agent_summary}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <div className="mt-0.5 text-xs bg-muted/30 rounded px-2 py-1.5 overflow-x-auto">
                    <MiniMarkdown content={fullText} />
                  </div>
                )}
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground font-mono">
                  {b.anchor ? (
                    <span className="rounded bg-muted/60 px-1.5 py-0.5">
                      ^{b.anchor}
                    </span>
                  ) : (
                    <span className="opacity-50">{t("blocks.no_anchor")}</span>
                  )}
                  {!isHeading && b.owning_section_anchor ? (
                    <a
                      href={`/page/${docPath}#${b.owning_section_anchor}`}
                      className="hover:underline opacity-70"
                      title={t("blocks.jump_to_section")}
                    >
                      ↳ ^{b.owning_section_anchor}
                    </a>
                  ) : null}
                  <span className="opacity-60">
                    {t("blocks.line_range", {
                      start: String(b.line_start),
                      end: String(b.line_end),
                    })}
                  </span>
                  <span className="opacity-60">
                    {t("blocks.char_count", { n: String(b.char_count) })}
                  </span>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
