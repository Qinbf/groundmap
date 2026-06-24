"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { RESIZE_STEP, type PanelConfig } from "@/lib/panel-config";

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * 可拖拽侧栏宽度 hook（LeftPanel / RightPanel 共用，左右镜像）。
 *
 * - 拖拽：`handleProps.onPointerDown` 用 **pointer capture**——把后续 pointer
 *   事件锁定到把手元素本身，故指针移出把手 / 移出浏览器窗口 / 窗外松手都仍能
 *   收到 pointerup 正常收尾，不会出现「松手在窗外 → dragging 卡死、body 光标
 *   冻结、鼠标一动栏就乱变」的回归。pointercancel 兜底 OS 级中断。
 * - 持久化：拖拽结束 / 键盘微调 / 双击重置时写 cookie（与折叠态同机制，
 *   server 第一帧即可拿到，避免 SSR→hydrate 宽度跳变）。拖拽中走 React state，
 *   不每帧写 cookie。
 * - 边界：所有宽度经 clamp 收敛到 [min, max]。
 * - 方向：`side` 决定 delta 符号——左栏向右拖变宽，右栏向左拖变宽。
 * - a11y：把手是 WAI-ARIA「window splitter」——返回的 `handleProps` 已带
 *   role=separator + aria-orientation + aria-valuenow/min/max + 键盘方向键，
 *   两个 Panel 直接 {...handleProps} 展开，保证左右镜像不会单侧漏改。
 */
export function usePanelResize({
  side,
  config,
  initialWidth,
}: {
  side: "left" | "right";
  config: PanelConfig;
  /** SSR 从 cookie 读到的宽度；null = cookie 不存在，用 default */
  initialWidth: number | null;
}) {
  const { cookie, default: defaultWidth, min, max } = config;

  const clamp = useCallback(
    (w: number) => Math.min(max, Math.max(min, w)),
    [min, max],
  );

  const [width, setWidthState] = useState<number>(
    initialWidth != null ? clamp(initialWidth) : defaultWidth,
  );
  const widthRef = useRef(width);
  const [dragging, setDragging] = useState(false);

  const persist = useCallback(
    (w: number) => {
      try {
        document.cookie = `${cookie}=${Math.round(
          w,
        )}; path=/; max-age=${ONE_YEAR}; SameSite=Lax`;
      } catch {
        // ignore（隐私模式等写 cookie 失败时不影响交互）
      }
    },
    [cookie],
  );

  // 单一写状态入口：clamp + 同步 ref（拖拽闭包里读 ref 拿最新值）
  const apply = useCallback(
    (w: number) => {
      const c = clamp(w);
      widthRef.current = c;
      setWidthState(c);
      return c;
    },
    [clamp],
  );

  const startDrag = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      // 只响应主键拖拽；忽略右键 / 中键
      if (e.button !== 0) return;
      e.preventDefault();
      const el = e.currentTarget;
      const { pointerId } = e;
      const startX = e.clientX;
      const startWidth = widthRef.current;
      setDragging(true);
      // preventDefault 抑制了默认聚焦——显式 focus，使「拖完即可直接方向键微调」
      // （鼠标聚焦不触发 :focus-visible，故不会在拖拽时闪出 focus ring）
      el.focus?.();
      // pointer capture：把后续事件锁到把手元素，松手即便在窗外也会回投 pointerup
      try {
        el.setPointerCapture(pointerId);
      } catch {
        // 个别环境不支持，退回普通监听（pointerup 在元素上仍可触发）
      }

      const onMove = (ev: PointerEvent) => {
        const delta = side === "left" ? ev.clientX - startX : startX - ev.clientX;
        apply(startWidth + delta);
      };
      const finish = () => {
        setDragging(false);
        persist(widthRef.current);
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", finish);
        el.removeEventListener("pointercancel", finish);
        try {
          el.releasePointerCapture(pointerId);
        } catch {
          // 已释放
        }
      };
      // 监听挂在把手元素上（非 window）：配合 capture，元素卸载即随之 GC，
      // 不会像挂 window 那样残留泄漏；pointercancel 兜底任何被打断的拖拽。
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", finish);
      el.addEventListener("pointercancel", finish);
    },
    [side, apply, persist],
  );

  // 拖拽期间：全局禁选 + col-resize 光标，避免拖出把手时选中文本 / 光标闪烁。
  // cleanup 在「拖拽结束」与「组件卸载」两种情形下都会跑，保证 body 样式一定恢复
  // （即使拖拽中组件被卸载，也不会把 user-select:none / col-resize 永久留在 body 上）。
  useEffect(() => {
    if (!dragging) return;
    const { style } = document.body;
    const prevSelect = style.userSelect;
    const prevCursor = style.cursor;
    style.userSelect = "none";
    style.cursor = "col-resize";
    return () => {
      style.userSelect = prevSelect;
      style.cursor = prevCursor;
    };
  }, [dragging]);

  /** 键盘微调：传入「视觉上变宽为正」的方向，内部按 side 已归一。 */
  const grow = useCallback(
    (steps: number) => persist(apply(widthRef.current + steps * RESIZE_STEP)),
    [apply, persist],
  );

  const reset = useCallback(
    () => persist(apply(defaultWidth)),
    [apply, persist, defaultWidth],
  );

  /** 方向键按 side 映射成变宽/变窄，Home/Enter 重置。 */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const widen = side === "left" ? "ArrowRight" : "ArrowLeft";
      const narrow = side === "left" ? "ArrowLeft" : "ArrowRight";
      if (e.key === widen) {
        e.preventDefault();
        grow(1);
      } else if (e.key === narrow) {
        e.preventDefault();
        grow(-1);
      } else if (e.key === "Home" || e.key === "Enter") {
        e.preventDefault();
        reset();
      }
    },
    [side, grow, reset],
  );

  /**
   * 把手交互 + a11y 属性打包，两个 Panel 直接 {...handleProps} 展开——
   * 镜像不会单侧漏改。组件侧再补 aria-label（i18n 需 t()）+ className + 视觉竖线。
   */
  const handleProps = {
    role: "separator" as const,
    "aria-orientation": "vertical" as const,
    "aria-valuenow": Math.round(width),
    "aria-valuemin": min,
    "aria-valuemax": max,
    tabIndex: 0,
    onPointerDown: startDrag,
    onDoubleClick: reset,
    onKeyDown,
  };

  return { width, dragging, handleProps };
}
