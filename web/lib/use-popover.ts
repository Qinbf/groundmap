"use client";
import { useEffect, useRef, useState } from "react";

/**
 * 轻量 popover 状态 hook——封装「点击外部 / Esc 关闭」，给顶栏的设置菜单、演示下拉等共用。
 * 不引入 radix/headless 等依赖。把返回的 ref 挂到 popover 容器最外层即可。
 */
export function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return { open, setOpen, toggle: () => setOpen((v) => !v), ref };
}
