"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/**
 * 全局单实例 popover 管理器：
 * - 同一时刻只有一个 popover 可见（hover 不同 trigger 自动切换）
 * - 鼠标移开 trigger / popover 后保持打开（"粘性"）
 * - 关闭路径：点击 popover 与 trigger 之外的位置、按 ESC、hover 切换到别的 trigger
 *
 * 触发器需要标记 [data-popover-trigger] 属性，popover 内容根标记 [data-popover]，
 * 以便 outside-click 监听判断点击位置。
 */

interface PopoverCtxValue {
  openId: string | null;
  setOpenId: (id: string | null) => void;
}

const PopoverCtx = createContext<PopoverCtxValue>({
  openId: null,
  setOpenId: () => {},
});

export function PopoverProvider({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!openId) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-popover]")) return; // 点 popover 内不关
      if (target.closest("[data-popover-trigger]")) return; // 点 trigger 不关
      setOpenId(null);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openId]);

  return <PopoverCtx.Provider value={{ openId, setOpenId }}>{children}</PopoverCtx.Provider>;
}

export function usePopoverState(id: string) {
  const { openId, setOpenId } = useContext(PopoverCtx);
  const isOpen = openId === id;
  const open = useCallback(() => setOpenId(id), [id, setOpenId]);
  const close = useCallback(() => setOpenId(null), [setOpenId]);
  return { isOpen, open, close };
}
