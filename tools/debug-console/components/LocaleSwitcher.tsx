"use client";
/**
 * 顶栏语言切换 —— 中 / EN 分段控件，风格对齐控制台其他顶栏控件（k-eyebrow + k-btn）。
 *
 * 写 cookie `kb_locale` + reload（见 useLocale）。该 cookie 与主管理台同名同域共享，
 * 故此处切换会「跟随」到主台、主台切换也会反映到这里。
 */
import { useLocale, useT } from "@/lib/i18n-client";
import type { Locale } from "@/lib/i18n";

export function LocaleSwitcher() {
  const t = useT();
  const { locale, setLocale } = useLocale();

  const seg = (l: Locale, labelKey: "locale.zh" | "locale.en", titleKey: "locale.switch_to_zh" | "locale.switch_to_en") => (
    <button
      type="button"
      onClick={() => locale !== l && setLocale(l)}
      title={t(titleKey)}
      aria-pressed={locale === l}
      className={`px-2 py-0.5 text-[11px] font-mono uppercase tracking-[0.12em] transition-colors ${
        locale === l
          ? "bg-[var(--amber)] text-[var(--ink)]"
          : "text-[var(--paper-mute)] hover:text-[var(--paper)]"
      }`}
    >
      {t(labelKey)}
    </button>
  );

  return (
    <div className="flex flex-col gap-1">
      <span className="k-eyebrow">{t("locale.label")}</span>
      <div className="flex items-center border border-[var(--line)]">
        {seg("zh", "locale.zh", "locale.switch_to_zh")}
        <span className="text-[var(--line-2)]">·</span>
        {seg("en", "locale.en", "locale.switch_to_en")}
      </div>
    </div>
  );
}
