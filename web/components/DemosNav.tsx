"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { usePopover } from "@/lib/use-popover";
import { useT } from "@/lib/i18n-client";

/**
 * 顶栏「演示」下拉——把原先并列的「教学」(/learn) 与「查询讲解」(/walkthrough) 两个
 * 区分度不高的入口合并成一个导航项，点开下拉里各带一句说明，降低混淆。
 * 当前在任一子页时父项高亮。复用 usePopover（点击外部 / Esc 关闭）。
 */

type NavKey = Parameters<ReturnType<typeof useT>>[0];

const SUB_ITEMS: { href: string; labelKey: NavKey; descKey: NavKey }[] = [
  { href: "/learn", labelKey: "nav.learn", descKey: "nav.learn.desc" },
  { href: "/walkthrough", labelKey: "nav.walkthrough", descKey: "nav.walkthrough.desc" },
];

export function DemosNav() {
  const t = useT();
  const pathname = usePathname();
  const { open, toggle, setOpen, ref } = usePopover();

  const inSection = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const active = SUB_ITEMS.some((s) => inSection(s.href));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className={
          "flex items-center gap-0.5 " +
          (active
            ? "font-semibold text-foreground border-b-2 border-amber-600/70 dark:border-amber-400/70 -mb-[2px] pb-[2px]"
            : "text-muted-foreground hover:text-foreground")
        }
      >
        {t("nav.demos")}
        <ChevronDown className="h-3.5 w-3.5" aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-1.5 w-60 rounded-lg border bg-popover text-popover-foreground shadow-lg p-1.5 z-50"
        >
          {SUB_ITEMS.map(({ href, labelKey, descKey }) => {
            const isActive = inSection(href);
            return (
              <Link
                key={href}
                href={href}
                role="menuitem"
                onClick={() => setOpen(false)}
                aria-current={isActive ? "page" : undefined}
                className={"block rounded-md px-2.5 py-2 " + (isActive ? "bg-accent" : "hover:bg-accent")}
              >
                <div className="text-sm font-medium text-foreground">{t(labelKey)}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{t(descKey)}</div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
