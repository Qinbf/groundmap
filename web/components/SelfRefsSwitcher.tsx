"use client";
import { useSelfRefs, useT } from "@/lib/i18n-client";
import { Button } from "@/components/ui/button";

/**
 * § 段落引用显示开关。控制范围:
 * - 正文 AnchorSup 的 §N 上标
 * - References 区"段落引用 (§)"子节
 * **不**影响 [N] 跨文档引用。
 */
export function SelfRefsSwitcher() {
  const { show, setShow } = useSelfRefs();
  const t = useT();
  const label = show ? "§ on" : "§ off";
  const title = show ? t("self_refs.toggle_off") : t("self_refs.toggle_on");

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setShow(!show)}
      title={title}
      className="font-mono text-xs"
      aria-pressed={show}
    >
      {label}
    </Button>
  );
}
