"use client";
import { useLocale, useT } from "@/lib/i18n-client";
import { Button } from "@/components/ui/button";

export function LocaleSwitcher() {
  const { locale, setLocale } = useLocale();
  const t = useT();
  const next = locale === "zh" ? "en" : "zh";
  // 切到 EN 时按钮上写 "EN"；切到 中 时按钮上写 "中"
  const label = locale === "zh" ? t("locale.toggle_to_en") : t("locale.toggle_to_zh");
  // title 用对方语言来描述这个动作（用户看到当前语言时已经知道，只需要看目标语言的提示）
  const title = locale === "zh" ? t("locale.toggle_title.to_en") : t("locale.toggle_title.to_zh");

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLocale(next)}
      title={title}
      className="font-mono text-xs"
    >
      {label}
    </Button>
  );
}
