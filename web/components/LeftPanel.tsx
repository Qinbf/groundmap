"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import { cn } from "@/lib/utils";

const COOKIE = "kb_left_panel_collapsed";
const AUTO_COLLAPSE_QUERY = "(max-width: 1023px)";

/**
 * 可折叠的左侧侧栏（与 RightPanel 镜像）。
 *
 * 视觉：浮动圆按钮贴在左栏右边缘的 *外侧*（按钮整体在主区，左边线对齐
 * 左栏右边线）。折叠后整个 aside 不渲染，按钮 fixed 在视口左边缘。
 *
 * 状态持久化：cookie。Auto-collapse 规则与 RightPanel 一致——cookie 已
 * 显式存在则尊重用户选择，cookie 不存在才按视口宽度自动决定。
 */
export function LeftPanel({
  children,
  initialCollapsed,
}: {
  children: ReactNode;
  initialCollapsed: boolean | null;
}) {
  const t = useT();
  const [collapsed, setCollapsed] = useState<boolean>(initialCollapsed ?? false);
  const userExplicitRef = useRef<boolean>(initialCollapsed !== null);

  useEffect(() => {
    if (userExplicitRef.current) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia(AUTO_COLLAPSE_QUERY).matches) {
      setCollapsed(true);
    }
  }, []);

  const toggle = () => {
    userExplicitRef.current = true;
    setCollapsed((prev) => {
      const next = !prev;
      try {
        document.cookie = `${COOKIE}=${
          next ? "1" : "0"
        }; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
      } catch {
        // ignore
      }
      return next;
    });
  };

  const baseButtonClass = cn(
    "inline-flex h-6 w-6 items-center justify-center",
    "rounded-full border border-border bg-background text-muted-foreground shadow-sm",
    "hover:text-foreground hover:border-foreground/40 hover:scale-110",
    "transition-[transform,color,border-color] duration-150",
  );

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={t("panel.expand")}
        title={t("panel.expand")}
        className={cn(
          baseButtonClass,
          "fixed left-3 top-1/2 z-30 -translate-y-1/2 bg-background/90 backdrop-blur-sm",
        )}
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <>
      <aside className="w-72 shrink-0 border-r bg-muted/30 flex flex-col">
        <div className="flex-1 min-h-0">{children}</div>
      </aside>
      {/* 按钮 fixed 在视口内。位置：left-72 → 按钮左边线紧贴左栏右边线，
          按钮整体在主区一侧，避免"骑墙"漂移感 */}
      <button
        type="button"
        onClick={toggle}
        aria-label={t("panel.collapse")}
        title={t("panel.collapse")}
        className={cn(
          baseButtonClass,
          "fixed left-72 top-1/2 z-30 -translate-y-1/2 bg-background/90 backdrop-blur-sm",
        )}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
    </>
  );
}
