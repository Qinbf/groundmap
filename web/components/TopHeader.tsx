"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { SelfRefsSwitcher } from "@/components/SelfRefsSwitcher";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { useT } from "@/lib/i18n-client";

/**
 * 顶部全局 header（GroundMap 标题 + 主导航 + 语言切换）。
 *
 * 同时被 (shell)/layout.tsx 与 health/layout.tsx 使用，确保 wiki 浏览页与
 * 健康度仪表板共享同一条顶栏，避免子路由"凭空消失顶栏"导致用户找不到回路。
 *
 * client 组件：用 usePathname() 计算当前所在导航项，加 active 高亮 + aria-current="page"，
 * 与 WikiTree 的 aria-current 语义对齐。
 *
 * "查询控制台"链接指向可选的 debug-console 子工具（`tools/debug-console`，端口 3100，
 * 在线测试 agent⟷KB 对话）。默认指向 http://localhost:3100（恢复本地入口）；用
 * NEXT_PUBLIC_CONSOLE_URL 可覆盖地址，或设为空字符串 "" 隐藏该入口（开源部署不带
 * debug-console 时）。链接需先 `cd tools/debug-console && npm run dev` 启动才有内容。
 */

const NAV_ITEMS: { href: string; labelKey: Parameters<ReturnType<typeof useT>>[0] }[] = [
  { href: "/", labelKey: "nav.browse" },
  { href: "/health", labelKey: "nav.health" },
  { href: "/graph", labelKey: "nav.graph" },
  { href: "/learn", labelKey: "nav.learn" },
  { href: "/walkthrough", labelKey: "nav.walkthrough" },
];

const CONSOLE_URL = process.env.NEXT_PUBLIC_CONSOLE_URL ?? "http://localhost:3100";

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
          {CONSOLE_URL && (
            <a
              href={CONSOLE_URL}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground hover:text-foreground"
              title={t("nav.console")}
            >
              {t("nav.console")}
            </a>
          )}
        </nav>
        <WorkspaceSwitcher />
        <SelfRefsSwitcher />
        <LocaleSwitcher />
      </div>
    </header>
  );
}
