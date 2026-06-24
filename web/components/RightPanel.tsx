"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import { cn } from "@/lib/utils";
import { RIGHT_PANEL } from "@/lib/panel-config";
import { usePanelResize } from "@/lib/use-panel-resize";

const COOKIE = "kb_right_panel_collapsed";
// 右栏在 tablet (1024-1279) 也自动收起：左栏 288 + 右栏 320 = 608，
// 中间留给正文 < 672，prose 几乎放不下。Tailwind xl 断点是 1280。
const AUTO_COLLAPSE_QUERY = "(max-width: 1279px)";

/**
 * 可折叠 + 可拖拽调宽的右侧侧栏。
 *
 * 视觉：浮动圆按钮贴在右栏左边缘的 *外侧*（按钮整体在主区，右边线对齐
 * 右栏边线）。展开/折叠都从同一位置触发，鼠标无需移动；折叠后右栏完全
 * 不渲染，主区独占。
 *
 * 宽度可拖拽：左边缘有一条 col-resize 把手（跨边线骑缝）；右栏内容滚动条
 * 在右侧，故左缘把手不与之冲突。宽度持久化到 cookie，server 第一帧即拿到。
 * 展开态折叠按钮跟随实时宽度（inline style）。
 *
 * 状态持久化：collapse 用 cookie kb_right_panel_collapsed，width 用
 * kb_right_panel_width，server 第一帧就拿到，避免首屏宽度 / 展开态闪烁。
 *
 * Auto-collapse 规则（关键）：
 *   - cookie 已显式存在 (initialCollapsed: true | false) → 完全尊重用户选择，
 *     哪怕跨页面导航重挂，也不强制按视口宽度 collapse
 *   - cookie 不存在 (initialCollapsed: null) → 首次进入：按视口宽度决定，
 *     窄屏自动收起，宽屏保持展开
 *
 * 这样修掉了 "在 tablet 下展开后切换页面又被打回 collapse" 的 bug：
 * 之前 useEffect 每次重挂都会重新检查视口，无视用户的选择。
 */
export function RightPanel({
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
  // 区分"cookie 已被用户显式设过"——一旦 true，永不 auto-collapse
  const userExplicitRef = useRef<boolean>(initialCollapsed !== null);
  const { width, dragging, handleProps } = usePanelResize({
    side: "right",
    config: RIGHT_PANEL,
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
    // 折叠态：完全不渲染 aside（连 1px border-l 也不留），按钮 fixed 在
    // 视口右边缘——主区独占完整宽度。
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={t("panel.expand")}
        title={t("panel.expand")}
        className={cn(
          baseButtonClass,
          "fixed right-3 top-1/2 z-30 -translate-y-1/2 bg-background/90 backdrop-blur-sm",
        )}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <>
      <aside
        style={{ width: `${width}px` }}
        className="relative shrink-0 border-l bg-muted/20 flex flex-col"
      >
        {/* 与中间列 EditorTabs 同高同色的 spacer，让右栏内容 baseline 与
            main 标题对齐，视觉上 EditorTabs 像横贯整条内容区 */}
        <div
          aria-hidden="true"
          className="h-10 shrink-0 border-b bg-muted/40"
        />
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4">
          {children}
        </div>
        {/* 拖拽把手：整条落在左边线*外侧*的主区留白带里（-translate-x-full），
            视觉竖线靠 justify-end 贴在边线上。右栏滚动条本就在右侧，零冲突。
            z-30 高于折叠按钮（z-20）→ 边线正中央仍可拖，无死区。 */}
        <div
          {...handleProps}
          aria-label={t("panel.resize")}
          title={t("panel.resize")}
          className={cn(
            "group absolute left-0 top-0 z-30 h-full w-2 -translate-x-full",
            "flex justify-end cursor-col-resize touch-none outline-none",
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
      {/* 按钮 fixed 在视口内（不属于 aside 的 scrollWidth，避免按钮突出
          导致页面级横滚）。right 跟随实时宽度 → 右边线紧贴右栏左边线。
          z-20 低于把手 → 把手在边线正中央优先于按钮，按钮其余部分仍可点。*/}
      <button
        type="button"
        onClick={toggle}
        aria-label={t("panel.collapse")}
        title={t("panel.collapse")}
        style={{ right: `${width}px` }}
        className={cn(
          baseButtonClass,
          "fixed top-1/2 z-20 -translate-y-1/2 bg-background/90 backdrop-blur-sm",
        )}
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </>
  );
}
