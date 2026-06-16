"use client";
import { FileText, Scissors, Network } from "lucide-react";
import { useT } from "@/lib/i18n-client";

/**
 * "30 秒看懂"——Hero 区下方的三拍叙事卡片：
 *   1. 出发：一份文件躺在硬盘里
 *   2. 拆解：被切成可引用的最小单位
 *   3. 连通：你的知识库长出新枝节
 *
 * 用极简的视觉对照（孤立文件 → 切片 + 标签 → 网状连接）让小白先建立直觉，
 * 然后再进入 10 步详解。
 */
export function ThirtySecondOverview() {
  const t = useT();

  const beats = [
    {
      Icon: FileText,
      titleKey: "learn.overview.beat1.title",
      bodyKey: "learn.overview.beat1.body",
      visual: (
        <div className="flex items-center justify-center h-20 mb-3">
          <div className="relative">
            <FileText className="h-12 w-12 text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} />
            <div className="absolute -bottom-2 -right-2 h-2 w-12 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
          </div>
        </div>
      ),
      accent: "from-zinc-50 to-zinc-100/50 dark:from-zinc-950/40 dark:to-zinc-900/30",
    },
    {
      Icon: Scissors,
      titleKey: "learn.overview.beat2.title",
      bodyKey: "learn.overview.beat2.body",
      visual: (
        <div className="flex items-center justify-center h-20 mb-3">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="h-10 w-8 rounded border-2 border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
                  <span className="text-[9px] font-mono text-blue-600 dark:text-blue-400">^p-{i + 1}</span>
                </div>
              </div>
            ))}
            <Scissors className="h-4 w-4 text-blue-500 dark:text-blue-400 ml-1" />
          </div>
        </div>
      ),
      accent: "from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/30",
    },
    {
      Icon: Network,
      titleKey: "learn.overview.beat3.title",
      bodyKey: "learn.overview.beat3.body",
      visual: (
        <div className="flex items-center justify-center h-20 mb-3">
          <svg width="120" height="60" viewBox="0 0 120 60" className="text-emerald-500 dark:text-emerald-400">
            <line x1="20" y1="30" x2="60" y2="15" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
            <line x1="20" y1="30" x2="60" y2="45" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
            <line x1="60" y1="15" x2="100" y2="30" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
            <line x1="60" y1="45" x2="100" y2="30" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
            <line x1="60" y1="15" x2="60" y2="45" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
            <circle cx="20" cy="30" r="6" fill="currentColor" />
            <circle cx="60" cy="15" r="5" fill="currentColor" opacity="0.85" />
            <circle cx="60" cy="45" r="5" fill="currentColor" opacity="0.85" />
            <circle cx="100" cy="30" r="6" fill="currentColor" />
          </svg>
        </div>
      ),
      accent: "from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/30",
    },
  ] as const;

  return (
    <section aria-labelledby="learn-overview-heading" className="my-6">
      <div className="flex items-baseline gap-3 mb-3">
        <h2
          id="learn-overview-heading"
          className="text-xs uppercase tracking-widest text-muted-foreground font-medium"
        >
          {t("learn.overview.label")}
        </h2>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {beats.map((beat, i) => (
          <div
            key={i}
            className={
              "relative rounded-xl border p-5 bg-gradient-to-br " + beat.accent
            }
          >
            <div className="absolute top-3 right-3 inline-flex items-center justify-center h-6 w-6 rounded-full bg-foreground/10 text-foreground/60 font-mono text-xs">
              {i + 1}
            </div>
            {beat.visual}
            <h3 className="text-sm font-semibold leading-snug mb-1.5 text-foreground">
              {t(beat.titleKey)}
            </h3>
            <p className="text-xs leading-relaxed text-foreground/75">
              {t(beat.bodyKey)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
