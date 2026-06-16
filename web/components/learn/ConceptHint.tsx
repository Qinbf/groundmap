"use client";
import { HelpCircle } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import type { TranslationKey } from "@/lib/i18n";

/**
 * 概念提示：一个圆圆的「？」按钮，点击展开 30 字小白解释。
 * 用原生 <details> 实现——零 JS、零依赖、零滚动陷阱、移动端原生支持。
 */
export function ConceptHint({
  termKey,
  bodyKey,
}: {
  termKey: TranslationKey;
  bodyKey: TranslationKey;
}) {
  const t = useT();
  return (
    <details className="group inline-block align-baseline">
      <summary className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 cursor-pointer select-none hover:underline list-none [&::-webkit-details-marker]:hidden">
        <HelpCircle className="h-3.5 w-3.5" />
        <span>{t(termKey)}</span>
      </summary>
      <div className="mt-2 ml-5 p-3 rounded-md border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 text-sm text-foreground/90 leading-relaxed">
        {t(bodyKey)}
      </div>
    </details>
  );
}
