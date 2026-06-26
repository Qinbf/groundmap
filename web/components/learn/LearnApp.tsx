"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import { GlobalDiagram } from "./GlobalDiagram";
import { ThirtySecondOverview } from "./ThirtySecondOverview";
import { StepNav } from "./StepNav";
import { StepCard } from "./StepCard";
import { RawDocPane } from "./RawDocPane";
import type { StepData, SampleMeta } from "@/app/learn/_data/types";

/** 完整搭建教程的文件路径（数据，不翻译——同 pseudoPath 口径） */
const TUTORIAL_DOC_PATH = "docs/新手教程-手把手搭建知识库.md";

interface LearnAppProps {
  /** 单样例（一份 RAG 奠基论文做载体）——样例切换器已移除，教学只用一个最普适的例子 */
  sample: SampleMeta;
  /** 该样例的 10 步数据 */
  steps: StepData[];
  /** 该样例对应 raw md 文件内容（server 端 fs.readFileSync 后传下来） */
  rawMd: string;
}

export function LearnApp({ sample, steps, rawMd }: LearnAppProps) {
  const t = useT();
  const [activeStepId, setActiveStepId] = useState<number>(1);

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
  }, [steps.length]);

  // 由 activeStepId 反查 focusAnchors
  const activeAnchors = useMemo(() => {
    const step = steps.find((s) => s.id === activeStepId);
    return step?.focusAnchors ?? [];
  }, [activeStepId, steps]);

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-8">
      {/* Hero */}
      <header className="mb-8 space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("learn.title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("learn.subtitle")}</p>
        </div>
        <p className="text-sm leading-relaxed text-foreground/80 max-w-3xl">
          {t("learn.intro.lead")}
        </p>
        <GlobalDiagram />
        <ThirtySecondOverview />
        {/* 单样例标识（替代原样例切换器）：告诉用户当前在看哪份载体文档 */}
        <div className="inline-flex flex-col rounded-lg border bg-card px-4 py-2">
          <span className="text-sm font-medium text-foreground">{t(sample.labelKey)}</span>
          <span className="text-[11px] text-muted-foreground">{t(sample.subtitleKey)}</span>
        </div>
      </header>

      {/* 窄屏 (< lg) 的 raw doc：顶部 details 折叠，默认收起；点开看完整 raw */}
      <details className="lg:hidden mb-6 rounded-xl border bg-card overflow-hidden">
        <summary className="cursor-pointer px-4 py-3 bg-muted/40 text-sm font-medium select-none flex items-center justify-between">
          <span>{t("learn.rawpane.label")}</span>
          <code className="font-mono text-xs text-muted-foreground">
            {sample.pseudoRawPath}
          </code>
        </summary>
        <div className="h-[60vh]">
          <RawDocPane
            rawMd={rawMd}
            pseudoPath={sample.pseudoRawPath}
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
              pseudoPath={sample.pseudoRawPath}
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
