"use client";
import { type ReactNode } from "react";
import { Settings } from "lucide-react";
import { useLocale, useSelfRefs, useT } from "@/lib/i18n-client";
import { usePopover } from "@/lib/use-popover";
import { Button } from "@/components/ui/button";

/**
 * 顶栏「设置」菜单——收纳显示偏好（界面语言、§ 段落引用）。
 *
 * 轻量自实现 popover（不引入 radix/headless 等新依赖）：受控 open + 点击外部 / Esc 关闭。
 * 偏好的持久化沿用既有机制：
 *   - 语言：cookie kb_locale + reload（server component 需重渲染）—— 见 useLocale
 *   - § 段落引用：cookie kb_show_self_refs + setState（即时，无 reload）—— 见 useSelfRefs
 *
 * 「查询控制台」入口已移出本菜单、直接放到顶栏右上角（见 ConsoleLink）——藏在这里不易被发现。
 */

function Segment({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        "px-3 py-1 rounded text-xs font-medium transition-colors " +
        (active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
      {children}
    </div>
  );
}

export function SettingsMenu() {
  const t = useT();
  const { locale, setLocale } = useLocale();
  const { show, setShow } = useSelfRefs();
  const { open, toggle, ref } = usePopover();

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="sm"
        onClick={toggle}
        title={t("settings.title")}
        aria-label={t("settings.title")}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="px-2"
      >
        <Settings className="h-4 w-4" />
      </Button>

      {open && (
        <div
          role="dialog"
          aria-label={t("settings.title")}
          className="absolute right-0 top-full mt-1.5 w-64 rounded-lg border bg-popover text-popover-foreground shadow-lg p-3 z-50"
        >
          <SectionLabel>{t("settings.section.display")}</SectionLabel>

          {/* 界面语言 */}
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-sm">{t("settings.language")}</span>
            <div className="flex gap-0.5 rounded-md bg-muted p-0.5">
              <Segment active={locale === "zh"} onClick={() => locale !== "zh" && setLocale("zh")}>
                {t("locale.toggle_to_zh")}
              </Segment>
              <Segment active={locale === "en"} onClick={() => locale !== "en" && setLocale("en")}>
                {t("locale.toggle_to_en")}
              </Segment>
            </div>
          </div>

          {/* § 段落引用 */}
          <div className="flex items-center justify-between">
            <span className="text-sm">{t("settings.self_refs")}</span>
            <div className="flex gap-0.5 rounded-md bg-muted p-0.5">
              <Segment active={show} onClick={() => !show && setShow(true)}>
                {t("common.on")}
              </Segment>
              <Segment active={!show} onClick={() => show && setShow(false)}>
                {t("common.off")}
              </Segment>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
