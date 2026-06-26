"use client";
import { useT, useLocale } from "@/lib/i18n-client";
import { PageRenderer } from "@/components/PageRenderer";
import { DiffView } from "./DiffView";
import { CommitCard } from "./CommitCard";
import { pickLocale, type Result } from "@/app/learn/_data/types";

/**
 * 按 Result.kind 派发到对应渲染器。
 *
 * 样例内容（markdown / outline / diff / commit / search 的自由文本）是 Localized——
 * 这里用当前 locale 解析为中文或英文，做到例子随界面语言切换，而非只有中文。
 */
export function ResultRenderer({ result }: { result: Result }) {
  const t = useT();
  const { locale } = useLocale();

  switch (result.kind) {
    case "markdown":
      return (
        <div className="rounded-lg border bg-card overflow-hidden">
          {result.pseudoPath && (
            <div className="px-3 py-1.5 bg-muted/40 border-b font-mono text-xs text-muted-foreground">
              {result.pseudoPath}
            </div>
          )}
          <div className="p-3">
            <PageRenderer content={pickLocale(result.content, locale)} />
          </div>
          {result.captionKey && (
            <div className="px-3 py-1.5 bg-muted/20 border-t text-xs text-muted-foreground italic">
              {t(result.captionKey)}
            </div>
          )}
        </div>
      );

    case "outline-cli":
      return (
        <pre className="rounded-lg border bg-zinc-950 text-zinc-100 dark:bg-zinc-900 p-3 overflow-x-auto text-xs leading-relaxed">
          <code>{pickLocale(result.content, locale)}</code>
        </pre>
      );

    case "diff":
      return (
        <DiffView
          before={pickLocale(result.before, locale)}
          after={pickLocale(result.after, locale)}
          pseudoPath={result.pseudoPath}
          captionKey={result.captionKey}
        />
      );

    case "commit":
      return (
        <CommitCard
          hash={result.hash}
          message={pickLocale(result.message, locale)}
          files={result.files}
          captionKey={result.captionKey}
        />
      );

    case "search-result":
      return (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-3 py-2 border-b bg-muted/40">
            <div className="flex items-baseline gap-2 text-sm">
              <span className="text-muted-foreground">{t("learn.search.query_label")}:</span>
              <code className="font-mono text-foreground">{pickLocale(result.query, locale)}</code>
            </div>
          </div>
          <div className="p-3">
            {result.hits.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                {t("learn.search.no_hits")}
              </p>
            ) : (
              <>
                <div className="text-xs text-muted-foreground mb-2">
                  {t("learn.search.hits_count", { n: result.hits.length })}
                </div>
                <ul className="space-y-2">
                  {result.hits.map((hit, i) => (
                    <li key={i} className="border-l-2 border-foreground/30 pl-3">
                      <div className="flex items-baseline gap-2 text-xs">
                        <code className="font-mono text-foreground">{hit.path}</code>
                        <span className="text-muted-foreground">
                          {t("learn.search.score")}={hit.score}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/80 mt-1">{pickLocale(hit.preview, locale)}</p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          {result.hits.length > 0 && (
            <div className="px-3 py-1.5 bg-muted/20 border-t text-[11px] text-muted-foreground italic leading-relaxed">
              {t("learn.search.score_formula")}
            </div>
          )}
        </div>
      );
  }
}
