"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import { cn } from "@/lib/utils";
import { LEFT_PANEL } from "@/lib/panel-config";
import { usePanelResize } from "@/lib/use-panel-resize";

const COOKIE = "kb_left_panel_collapsed";
const AUTO_COLLAPSE_QUERY = "(max-width: 1023px)";

/**
 * 可折叠 + 可拖拽调宽的左侧侧栏（与 RightPanel 镜像）。
 *
 * 视觉：浮动圆按钮贴在左栏右边缘的 *外侧*（按钮整体在主区，左边线对齐
 * 左栏右边线）。折叠后整个 aside 不渲染，按钮 fixed 在视口左边缘。
 *
 * 宽度可拖拽：右边缘有一条 col-resize 把手（跨边线骑缝，避免压住 WikiTree
 * 的滚动条）。宽度持久化到 cookie，server 第一帧即拿到，避免 SSR→hydrate
 * 宽度跳变。展开态折叠按钮跟随实时宽度（inline style）。
 *
 * 状态持久化：collapse 用 cookie kb_left_panel_collapsed，width 用
 * kb_left_panel_width。Auto-collapse 规则与 RightPanel 一致——cookie 已
 * 显式存在则尊重用户选择，cookie 不存在才按视口宽度自动决定。
 */
export function LeftPanel({
  children,
  initialCollapsed,
  initialWidth,
}: {
  children: ReactNode;
  initialCollapsed: boolean | null;
  initialWidth: number | null;
}) {
  const t = useT();
  const [collapsed, setCollapsed] = useState<boolean>(initialCollapsed ?? false);
  const userExplicitRef = useRef<boolean>(initialCollapsed !== null);
  const { width, dragging, handleProps } = usePanelResize({
    side: "left",
    config: LEFT_PANEL,
    initialWidth,
  });

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
      <aside
        style={{ width: `${width}px` }}
        className="relative shrink-0 border-r bg-muted/30 flex flex-col"
      >
        <div className="flex-1 min-h-0">{children}</div>
        {/* 拖拽把手：整条落在右边线*外侧*的主区留白带里（translate-x-full），
            零覆盖 WikiTree 滚动条；视觉竖线靠 justify-start 贴在边线上。
            z-30 高于折叠按钮（z-20）→ 边线正中央仍可拖，无死区。 */}
        <div
          {...handleProps}
          aria-label={t("panel.resize")}
          title={t("panel.resize")}
          className={cn(
            "group absolute right-0 top-0 z-30 h-full w-2 translate-x-full",
            "flex justify-start cursor-col-resize touch-none outline-none",
            "focus-visible:bg-primary/10",
          )}
        >
          <span
            className={cn(
              "h-full transition-[width,background-color]",
              dragging
                ? "w-0.5 bg-primary"
                : "w-px bg-transparent group-hover:bg-primary/40 group-focus-visible:w-0.5 group-focus-visible:bg-primary",
            )}
          />
        </div>
      </aside>
      {/* 按钮 fixed 在视口内，left 跟随实时宽度 → 左边线紧贴左栏右边线。
          z-20 低于把手 → 把手在边线正中央优先于按钮，按钮其余部分仍可点。 */}
      <button
        type="button"
        onClick={toggle}
        aria-label={t("panel.collapse")}
        title={t("panel.collapse")}
        style={{ left: `${width}px` }}
        className={cn(
          baseButtonClass,
          "fixed top-1/2 z-20 -translate-y-1/2 bg-background/90 backdrop-blur-sm",
        )}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
    </>
  );
}
