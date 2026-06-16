"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-client";

interface PageNode {
  path: string;
  title: string;
  type: string;
  status: string;
  confidence: string;
  last_modified: string;
  tags: string[];
}

interface TreeData {
  total: number;
  groups: Record<string, PageNode[]>;
  flat: PageNode[];
}

const TYPE_ORDER = ["index", "entity", "concept", "source_summary", "analysis", "comparison", "raw_source", "unknown"];

function statusVariant(status: string): "default" | "secondary" | "warning" | "success" | "destructive" {
  switch (status) {
    case "reviewed":
      return "success";
    case "draft":
      return "warning";
    case "deprecated":
      return "destructive";
    default:
      return "secondary";
  }
}

export function WikiTree() {
  const t = useT();
  const [data, setData] = useState<TreeData | null>(null);
  const [filter, setFilter] = useState("");
  const pathname = usePathname();

  // 当前选中项的 ref（callback ref，仅 active 项把自己 register 进来）
  const activeItemRef = useRef<HTMLAnchorElement | null>(null);
  // 首次进入页面时立即滚（无动画），之后路由切换时平滑滚动
  const firstScrollRef = useRef(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/pages/tree?include=wiki,raw")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData({ total: 0, groups: {}, flat: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 路由变化或数据加载完毕：把 active 项滚入视野
  useEffect(() => {
    if (!data) return;
    const id = setTimeout(() => {
      const el = activeItemRef.current;
      if (!el) return;
      el.scrollIntoView({
        block: "center",
        behavior: firstScrollRef.current ? "auto" : "smooth",
      });
      firstScrollRef.current = false;
    }, 16);
    return () => clearTimeout(id);
  }, [pathname, data]);

  const filteredGroups = useMemo(() => {
    if (!data) return null;
    const f = filter.trim().toLowerCase();
    if (!f) return data.groups;
    const out: Record<string, PageNode[]> = {};
    for (const [tp, pages] of Object.entries(data.groups)) {
      const matched = pages.filter(
        (p) =>
          p.title.toLowerCase().includes(f) ||
          p.path.toLowerCase().includes(f) ||
          p.tags.some((tag) => tag.toLowerCase().includes(f)),
      );
      if (matched.length > 0) out[tp] = matched;
    }
    return out;
  }, [data, filter]);

  if (!data) {
    return <div className="p-4 text-sm text-muted-foreground">{t("common.loading")}</div>;
  }

  if (data.total === 0) {
    return <div className="p-4 text-sm text-muted-foreground">{t("tree.empty")}</div>;
  }

  const shown = Object.values(filteredGroups || {}).reduce((s, ps) => s + ps.length, 0);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t("tree.filter_placeholder")}
          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="mt-2 text-xs text-muted-foreground">
          {t("tree.summary", { total: data.total, shown })}
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4 text-sm">
        {TYPE_ORDER.filter((tp) => filteredGroups?.[tp]?.length).map((type) => (
          <div key={type}>
            <div className="px-1 mb-1 flex items-baseline gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80 font-mono">
              <span className="w-3 border-t border-muted-foreground/30" aria-hidden="true" />
              <span>{t(`type.${type}` as never)}</span>
              <span className="text-muted-foreground/50 normal-case tracking-normal">
                {filteredGroups![type].length}
              </span>
              <span className="flex-1 border-t border-muted-foreground/30" aria-hidden="true" />
            </div>
            <ul className="space-y-px">
              {filteredGroups![type].map((p) => {
                const active = pathname === `/page/${p.path}`;
                return (
                  <li key={p.path}>
                    <Link
                      ref={active ? activeItemRef : undefined}
                      href={`/page/${p.path}`}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-2 py-1.5 pl-2 pr-1 transition-[transform,color] duration-200 border-b",
                        active
                          ? "font-bold text-foreground translate-x-1 border-amber-600/70 border-dashed dark:border-amber-400/70"
                          : "text-muted-foreground border-transparent hover:text-foreground hover:translate-x-0.5",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "shrink-0 font-mono text-[12px] leading-none transition-opacity duration-200",
                          active
                            ? "opacity-100 text-amber-600 dark:text-amber-400"
                            : "opacity-0 group-hover:opacity-30",
                        )}
                      >
                        ▸
                      </span>
                      <span className="flex-1 truncate" title={p.path}>
                        {p.title}
                      </span>
                      <Badge
                        variant={statusVariant(p.status)}
                        className="shrink-0 text-[10px]"
                      >
                        {t(`status.${p.status}` as never) || p.status}
                      </Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}
