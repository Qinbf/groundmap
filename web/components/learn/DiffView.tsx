"use client";
import { ArrowRight } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import { MiniMarkdown } from "@/components/MiniMarkdown";
import type { TranslationKey } from "@/lib/i18n";

interface DiffViewProps {
  before: string;
  after: string;
  pseudoPath?: string;
  captionKey?: TranslationKey;
}

export function DiffView({ before, after, pseudoPath, captionKey }: DiffViewProps) {
  const t = useT();
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {pseudoPath && (
        <div className="px-3 py-1.5 bg-muted/40 border-b font-mono text-xs text-muted-foreground">
          {pseudoPath}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-0">
        <div className="p-3 md:border-r">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
            {t("learn.diff.before")}
          </div>
          <div className="rounded bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/40 dark:border-rose-900/40 p-3">
            <MiniMarkdown content={before} />
          </div>
        </div>
        <div className="hidden md:flex items-center justify-center px-2">
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
            {t("learn.diff.after")}
          </div>
          <div className="rounded bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/40 dark:border-emerald-900/40 p-3">
            <MiniMarkdown content={after} />
          </div>
        </div>
      </div>
      {captionKey && (
        <div className="px-3 py-1.5 bg-muted/20 border-t text-xs text-muted-foreground italic">
          {t(captionKey)}
        </div>
      )}
    </div>
  );
}
