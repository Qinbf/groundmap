"use client";
import { useT } from "@/lib/i18n-client";

interface Props {
  value: string | null;
}

/**
 * 控制台顶栏 workspace 指示器——**只读**显示「当前查的是哪个知识库」。
 *
 * 控制台是 web 的外部客户端，查哪个库由 web 主页决定：web 顶栏「查询控制台」入口会把当前所在库
 * （`kb_workspace` cookie）作为 `?ws=` 拼进控制台链接。这里只展示、不提供切换——避免控制台查的库
 * 与你在 web 浏览的库不一致。要换库，请回 web 顶栏切换后重新进入控制台。
 */
export function WorkspaceIndicator({ value }: Props) {
  const t = useT();
  if (!value) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="k-eyebrow">{t("picker.workspace")}</span>
      <span
        className="k-input inline-flex cursor-default items-center select-none text-[var(--paper-dim)]"
        title={t("picker.workspace_tip")}
        aria-label={t("picker.workspace")}
      >
        {value}
      </span>
    </div>
  );
}
