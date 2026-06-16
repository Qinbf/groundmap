"use client";
import { Lightbulb, Settings2, FileCheck2 } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import { ResultRenderer } from "./ResultRenderer";
import { ConceptHint } from "./ConceptHint";
import type { StepData } from "@/app/learn/_data/types";

/**
 * 一个 ingest 步骤的卡片：
 *   - 顶部：步骤号 + 标题
 *   - 上半部分：Why（左）+ What（右）并排（md+），单列堆叠（sm）
 *   - 下半部分：Result 跨满整行——给产物预览最大横向空间，避免 outline / 表格被挤
 *
 * 这种"上文 + 下产物"布局在双栏对照页面里特别重要——右栏宽度本来就有限，
 * 让 Result 跨满整行能保证 outline-cli、表格、commit 列表完整展示。
 */
export function StepCard({ step }: { step: StepData }) {
  const t = useT();
  return (
    <section
      id={`step-${step.id}`}
      className="scroll-mt-20 border rounded-xl bg-card overflow-hidden"
    >
      {/* Header */}
      <header className="px-5 py-4 border-b bg-muted/30 flex items-baseline gap-3">
        <span className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-full bg-foreground text-background font-mono text-sm">
          {step.id}
        </span>
        <h2 className="text-lg font-semibold leading-tight">{t(step.titleKey)}</h2>
      </header>

      {/* 上半部分：Why + What 并排（md+）/ 堆叠（sm） */}
      <div className="grid grid-cols-1 md:grid-cols-2 border-b">
        {/* Why */}
        <div className="p-5 bg-blue-50/30 dark:bg-blue-950/10 border-b md:border-b-0 md:border-r">
          <div className="flex items-center gap-2 mb-3 text-blue-700 dark:text-blue-300">
            <Lightbulb className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wide font-medium">
              {t("learn.col.why")}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">
            {t(step.whyKey)}
          </p>
          {step.concepts && step.concepts.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {step.concepts.map((c, i) => (
                <ConceptHint key={i} termKey={c.termKey} bodyKey={c.bodyKey} />
              ))}
            </div>
          )}
        </div>

        {/* What */}
        <div className="p-5 bg-zinc-50/50 dark:bg-zinc-950/30">
          <div className="flex items-center gap-2 mb-3 text-zinc-700 dark:text-zinc-300">
            <Settings2 className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wide font-medium">
              {t("learn.col.what")}
            </span>
          </div>
          {step.whatCommand ? (
            <pre className="rounded-md bg-zinc-950 text-zinc-100 dark:bg-zinc-900 p-3 overflow-x-auto text-xs leading-relaxed font-mono">
              <code>{step.whatCommand}</code>
            </pre>
          ) : (
            <div className="rounded-md border border-dashed bg-card/50 p-3 text-xs text-muted-foreground italic">
              {step.whatNoteKey ? t(step.whatNoteKey) : "—"}
            </div>
          )}
          {step.whatCommand && step.whatNoteKey && (
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              {t(step.whatNoteKey)}
            </p>
          )}
        </div>
      </div>

      {/* 下半部分：Result 跨满整行 */}
      <div className="p-5 bg-emerald-50/20 dark:bg-emerald-950/10">
        <div className="flex items-center gap-2 mb-3 text-emerald-700 dark:text-emerald-300">
          <FileCheck2 className="h-4 w-4" />
          <span className="text-xs uppercase tracking-wide font-medium">
            {t("learn.col.result")}
          </span>
        </div>
        {step.results.length === 0 ? (
          <div className="rounded-md border border-dashed bg-card/50 p-4 text-xs text-muted-foreground italic">
            {t("learn.result.empty")}
          </div>
        ) : (
          <div className="space-y-3">
            {step.results.map((r, i) => (
              <ResultRenderer key={i} result={r} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
