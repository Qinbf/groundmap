"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import { GlobalDiagram } from "./GlobalDiagram";
import { ThirtySecondOverview } from "./ThirtySecondOverview";
import { SampleSwitcher } from "./SampleSwitcher";
import { StepNav } from "./StepNav";
import { StepCard } from "./StepCard";
import { RawDocPane } from "./RawDocPane";
import type { StepData, SampleId, SampleMeta } from "@/app/learn/_data/types";

/** 完整搭建教程的文件路径（数据，不翻译——同 pseudoPath 口径） */
const TUTORIAL_DOC_PATH = "docs/新手教程-手把手搭建知识库.md";

interface LearnAppProps {
  samples: SampleMeta[];
  /** 按 sample id 索引到对应 10 步数据 */
  stepsBySample: Record<SampleId, StepData[]>;
  /** 按 sample id 索引到对应 raw md 文件内容（server 端 fs.readFileSync 后传下来） */
  rawBySample: Record<SampleId, string>;
  defaultSample?: SampleId;
}

export function LearnApp({
  samples,
  stepsBySample,
  rawBySample,
  defaultSample = "research",
}: LearnAppProps) {
  const t = useT();
  const [active, setActive] = useState<SampleId>(defaultSample);
  const [activeStepId, setActiveStepId] = useState<number>(1);
  const steps = stepsBySample[active];
  const rawMd = rawBySample[active];
  const sampleMeta = samples.find((s) => s.id === active);

  // sample 切换 → 重置 activeStepId 到 1
  useEffect(() => {
    setActiveStepId(1);
  }, [active]);

  // 观察右栏当前可见 step（rootMargin 让"主体在视口中段"的卡片成为 active）
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const target = visible[0]!;
          const id = parseInt(target.target.id.replace("step-", ""), 10);
          if (!isNaN(id)) setActiveStepId(id);
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 },
    );

    for (let i = 1; i <= steps.length; i++) {
      const el = document.getElementById(`step-${i}`);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [steps.length, active]);

  // 由 activeStepId 反查 focusAnchors
  const activeAnchors = useMemo(() => {
    const step = steps.find((s) => s.id === activeStepId);
    return step?.focusAnchors ?? [];
  }, [activeStepId, steps]);

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-8">
      {/* Hero */}
      <header className="mb-8 space-y-4">
        {/* 演示 fixture（样例文档与各步产物）是固化的中文内容，不随语言切换。
            与 /walkthrough 的 chinese_only_notice 同模式：仅提示性横幅。 */}
        <div
          role="note"
          className="rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200"
        >
          {t("learn.chinese_only_notice")}
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("learn.title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("learn.subtitle")}</p>
        </div>
        <p className="text-sm leading-relaxed text-foreground/80 max-w-3xl">
          {t("learn.intro.lead")}
        </p>
        <GlobalDiagram />
        <ThirtySecondOverview />
        <SampleSwitcher samples={samples} active={active} onChange={setActive} />
      </header>

      {/* 窄屏 (< lg) 的 raw doc：顶部 details 折叠，默认收起；点开看完整 raw */}
      <details className="lg:hidden mb-6 rounded-xl border bg-card overflow-hidden">
        <summary className="cursor-pointer px-4 py-3 bg-muted/40 text-sm font-medium select-none flex items-center justify-between">
          <span>{t("learn.rawpane.label")}</span>
          <code className="font-mono text-xs text-muted-foreground">
            {sampleMeta?.pseudoRawPath}
          </code>
        </summary>
        <div className="h-[60vh]">
          <RawDocPane
            rawMd={rawMd}
            pseudoPath={sampleMeta?.pseudoRawPath ?? ""}
            activeAnchors={activeAnchors}
          />
        </div>
      </details>

      {/* Body 主体：lg+ 三列 grid（StepNav | RawDoc | Steps），lg- 单列（仅 Steps） */}
      <div className="lg:grid lg:grid-cols-[auto_minmax(360px,1fr)_minmax(0,1.2fr)] lg:gap-5">
        {/* 左：步骤导航圆点（lg+） */}
        <aside className="hidden lg:block lg:sticky lg:top-4 lg:self-start lg:h-fit">
          <StepNav count={steps.length} />
        </aside>

        {/* 中：raw 原文 sticky 双栏（lg+） */}
        <aside className="hidden lg:block lg:sticky lg:top-4 lg:self-start">
          <div className="h-[calc(100vh-4rem)]">
            <RawDocPane
              rawMd={rawMd}
              pseudoPath={sampleMeta?.pseudoRawPath ?? ""}
              activeAnchors={activeAnchors}
            />
          </div>
        </aside>

        {/* 右：10 个 step card */}
        <div className="min-w-0 space-y-6">
          {steps.map((s) => (
            <StepCard key={s.id} step={s} />
          ))}

          {/* 第 10 步之后：下一步指引 */}
          <section className="border rounded-xl bg-card overflow-hidden">
            <header className="px-5 py-4 border-b bg-muted/30">
              <h2 className="text-lg font-semibold leading-tight">
                {t("learn.next.title")}
              </h2>
            </header>
            <ul className="p-5 space-y-3">
              <li className="flex items-start gap-2 text-sm">
                <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <Link
                  href="/walkthrough"
                  className="text-foreground/90 underline underline-offset-4 hover:text-foreground"
                >
                  {t("learn.next.walkthrough")}
                </Link>
              </li>
              <li className="flex items-start gap-2 text-sm text-foreground/90">
                <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <span>
                  {t("learn.next.tutorial")}{" "}
                  <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                    {TUTORIAL_DOC_PATH}
                  </code>
                </span>
              </li>
              <li className="flex items-start gap-2 text-sm text-foreground/90">
                <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <span>{t("learn.next.try")}</span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
