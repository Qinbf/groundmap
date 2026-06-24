"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SettingsMenu } from "@/components/SettingsMenu";
import { ConsoleLink } from "@/components/ConsoleLink";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { useT } from "@/lib/i18n-client";

/**
 * 顶部全局 header（GroundMap 标题 + 主导航 + workspace 切换 + 设置菜单）。
 *
 * 同时被 (shell)/layout.tsx 与 health/layout.tsx 使用，确保 wiki 浏览页与
 * 健康度仪表板共享同一条顶栏，避免子路由"凭空消失顶栏"导致用户找不到回路。
 *
 * client 组件：用 usePathname() 计算当前所在导航项，加 active 高亮 + aria-current="page"，
 * 与 WikiTree 的 aria-current 语义对齐。
 *
 * 主导航只放 KB 自己的页面；显示偏好（语言、§ 段落引用）收进右侧的「设置」菜单
 * （SettingsMenu）。workspace 切换器保留在顶栏——它是「当前在看哪个库」的上下文切换，
 * 不是偏好，且高频。外部工具入口「查询控制台」（ConsoleLink）也直接放在右上角——
 * 它此前藏在设置菜单的「工具」节里不易被发现。
 */

const NAV_ITEMS: { href: string; labelKey: Parameters<ReturnType<typeof useT>>[0] }[] = [
  { href: "/", labelKey: "nav.browse" },
  { href: "/health", labelKey: "nav.health" },
  { href: "/graph", labelKey: "nav.graph" },
];

export function TopHeader() {
  const t = useT();
  const pathname = usePathname();

  // active 判定：首页严格相等（"/" 会前缀匹配所有路由，需特判）；其余按前缀匹配子路由
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="border-b px-4 py-2 flex items-center justify-between bg-background shrink-0">
      <Link href="/" className="text-lg font-semibold">
        {t("app.name")}
      </Link>
      <div className="flex items-center gap-4">
        <nav className="flex gap-4 text-sm">
          {NAV_ITEMS.map(({ href, labelKey }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "font-semibold text-foreground border-b-2 border-amber-600/70 dark:border-amber-400/70 -mb-[2px] pb-[2px]"
                    : "text-muted-foreground hover:text-foreground"
                }
              >
                {t(labelKey)}
              </Link>
            );
          })}
        </nav>
        <WorkspaceSwitcher />
        <ConsoleLink />
        <SettingsMenu />
      </div>
    </header>
  );
}
