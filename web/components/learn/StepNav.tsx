"use client";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n-client";

interface StepNavProps {
  count: number;
  /** ID 前缀，用于查 DOM（如 "step-1", "step-2"...） */
  idPrefix?: string;
}

/**
 * 左侧 sticky 步骤导航。10 个圆圈，scroll-spy 高亮当前可见步骤。
 * 移动端隐藏（md: 起显示），由 page 顶部进度条作为窄屏降级。
 */
export function StepNav({ count, idPrefix = "step" }: StepNavProps) {
  const t = useT();
  const [activeId, setActiveId] = useState(1);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // 取最靠近视口顶部的可见步骤
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const target = visible[0]!;
          const id = parseInt(target.target.id.replace(`${idPrefix}-`, ""), 10);
          if (!isNaN(id)) setActiveId(id);
        }
      },
      // rootMargin: 顶部 -25% 让"当前步"出现得更准
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 },
    );

    for (let i = 1; i <= count; i++) {
      const el = document.getElementById(`${idPrefix}-${i}`);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [count, idPrefix]);

  const handleClick = (id: number) => {
    const el = document.getElementById(`${idPrefix}-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav
      aria-label={t("learn.scrollnav.label")}
      className="hidden md:flex flex-col gap-1.5"
    >
      {Array.from({ length: count }, (_, i) => i + 1).map((id) => {
        const isActive = id === activeId;
        return (
          <button
            key={id}
            type="button"
            onClick={() => handleClick(id)}
            aria-label={t("learn.scrollnav.aria", { n: id })}
            className={
              "h-8 w-8 rounded-full flex items-center justify-center text-xs font-mono border transition-all " +
              (isActive
                ? "bg-foreground text-background border-foreground scale-110"
                : "bg-card text-muted-foreground border-border hover:border-foreground/50 hover:text-foreground")
            }
          >
            {id}
          </button>
        );
      })}
    </nav>
  );
}
