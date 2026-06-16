"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import { cn } from "@/lib/utils";

interface TabEntry {
  path: string; // "wiki/concepts/transformer.md"
  title: string;
}

interface TreeNode {
  path: string;
  title: string;
}
interface TreeData {
  flat?: TreeNode[];
}

const STORAGE_KEY = "kb_open_tabs";
const MAX_TABS = 12;

function loadTabs(): TabEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x: unknown): x is TabEntry =>
        !!x &&
        typeof x === "object" &&
        typeof (x as TabEntry).path === "string" &&
        typeof (x as TabEntry).title === "string",
    );
  } catch {
    return [];
  }
}

function saveTabs(tabs: TabEntry[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
  } catch {
    // quota / private mode — 忽略
  }
}

/** 从 pathname 解析 wiki 路径；不是 /page/... 则返回 null */
function pathnameToWikiPath(pathname: string): string | null {
  const m = pathname.match(/^\/page\/(.+)$/);
  if (!m) return null;
  return decodeURIComponent(m[1].replace(/\/$/, ""));
}

export function EditorTabs() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const [tabs, setTabs] = useState<TabEntry[]>([]);
  const [titleMap, setTitleMap] = useState<Map<string, string> | null>(null);
  // 标记是否已 hydrated（避免 SSR/CSR 不一致）
  const [hydrated, setHydrated] = useState(false);

  // 首次挂载：读 sessionStorage + fetch tree 拿 path→title 映射
  useEffect(() => {
    setTabs(loadTabs());
    setHydrated(true);
    let cancelled = false;
    fetch("/api/pages/tree")
      .then((r) => r.json())
      .then((data: TreeData) => {
        if (cancelled) return;
        const map = new Map<string, string>();
        for (const n of data.flat || []) {
          map.set(n.path, n.title || n.path);
        }
        setTitleMap(map);
      })
      .catch(() => {
        if (!cancelled) setTitleMap(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const currentPath = useMemo(
    () => (pathname ? pathnameToWikiPath(pathname) : null),
    [pathname],
  );

  // 防抖 ref：同一 path 只追加一次
  const lastTrackedRef = useRef<string | null>(null);

  // 当前 active tab 的 ref（仅 active 项 register；与 WikiTree 左栏对称）。
  // 左栏点页面 → URL 变 → tab 高亮，但如果该 tab 在横向溢出区外用户看不到聚焦——
  // 这里 scrollIntoView 把它带到中央。
  const activeTabRef = useRef<HTMLLIElement | null>(null);
  // 首次进入页面时立即滚（无动画），之后切 tab 时平滑滚动
  const firstScrollRef = useRef(true);

  // pathname 变化 → 若不在 tabs 中则追加（保持 VSCode 风格的稳定顺序，
  // 切回旧 tab 不重排）
  useEffect(() => {
    if (!hydrated || !currentPath) return;
    if (lastTrackedRef.current === currentPath) return;
    lastTrackedRef.current = currentPath;

    setTabs((prev) => {
      if (prev.some((tab) => tab.path === currentPath)) return prev;
      const fallbackTitle =
        currentPath.split("/").pop()?.replace(/\.md$/, "") || currentPath;
      const title = titleMap?.get(currentPath) || fallbackTitle;
      const next = [...prev, { path: currentPath, title }];
      // 超出上限：保留 active + 最近 MAX_TABS-1 个，从最早的非 active 淘汰
      while (next.length > MAX_TABS) {
        const dropIdx = next.findIndex((tab) => tab.path !== currentPath);
        if (dropIdx === -1) break;
        next.splice(dropIdx, 1);
      }
      saveTabs(next);
      return next;
    });
  }, [hydrated, currentPath, titleMap]);

  // 路由变化或 tabs 数据变更：把 active tab 水平滚入视野（横向 tab 条版的
  // 左栏 scrollIntoView 对称机制）。block: "nearest" 避免影响纵向滚动位置。
  useEffect(() => {
    if (!hydrated || !currentPath) return;
    const id = setTimeout(() => {
      const el = activeTabRef.current;
      if (!el) return;
      el.scrollIntoView({
        block: "nearest",
        inline: "center",
        behavior: firstScrollRef.current ? "auto" : "smooth",
      });
      firstScrollRef.current = false;
    }, 16);
    return () => clearTimeout(id);
  }, [hydrated, currentPath, tabs]);

  // titleMap 后到（fetch 慢于首次 append）时，把已有 tab 的 fallback 标题升级
  useEffect(() => {
    if (!titleMap || titleMap.size === 0) return;
    setTabs((prev) => {
      let changed = false;
      const next = prev.map((tab) => {
        const real = titleMap.get(tab.path);
        if (real && real !== tab.title) {
          changed = true;
          return { ...tab, title: real };
        }
        return tab;
      });
      if (changed) saveTabs(next);
      return changed ? next : prev;
    });
  }, [titleMap]);

  const closeTab = (path: string, e?: React.MouseEvent) => {
    // 兼容旧 caller（曾把 close 按钮嵌在 Link 内，需要 preventDefault 阻止跳转）；
    // 重构后按钮已是 Link 的兄弟节点，e 仍传入但不再必须。
    e?.preventDefault();
    e?.stopPropagation();
    setTabs((prev) => {
      const idx = prev.findIndex((tab) => tab.path === path);
      if (idx === -1) return prev;
      const next = prev.filter((tab) => tab.path !== path);
      saveTabs(next);
      // 关闭的是当前 active：跳到右邻 → 左邻 → 首页
      if (path === currentPath) {
        const fallback = next[idx] ?? next[idx - 1];
        // 防抖 ref 也要 reset，避免新路由不被追加
        lastTrackedRef.current = fallback ? fallback.path : null;
        router.push(fallback ? `/page/${fallback.path}` : "/");
      }
      return next;
    });
  };

  // 未 hydrated 或没 tab：保留同高 banner（保持与右栏 spacer 对齐，
  // 也让 main 顶部位置不随是否有 tab 而跳动）
  if (!hydrated || tabs.length === 0) {
    return (
      <div
        aria-hidden="true"
        className="h-10 shrink-0 border-b bg-muted/40"
      />
    );
  }

  return (
    // 容器横向溢出时出滚动条。overflow-x: scroll 比 auto 更显眼——auto
    // 在 Windows overlay scrollbar 模式下默认隐藏，用户根本不知道还能滚。
    // 每个 tab 自然宽度（带 min/max 约束），不再均分共享宽度。
    // h-10（40px）= tab 内容 30 + 横滚条 ~6 + border-b 1，刚好不压扁内容。
    <div className="h-10 shrink-0 border-b bg-muted/40 flex items-stretch overflow-x-scroll overflow-y-hidden scrollbar-thin">
      <ul className="flex items-stretch">
        {tabs.map((tab) => {
          const active = tab.path === currentPath;
          return (
            <li
              key={tab.path}
              ref={active ? activeTabRef : undefined}
              // 把 group 提到 li，让 close 按钮作为 Link 兄弟节点也能用 group-hover；
              // close 按钮**不能**嵌在 Link 内（HTML 禁止 a 内含 button）。
              className="relative group shrink-0 min-w-[7rem] max-w-[14rem]"
            >
              <Link
                href={`/page/${tab.path}`}
                title={tab.path}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center w-full h-full pl-3 pr-7 py-1.5 text-xs",
                  "border-r border-border/60 transition-colors",
                  active
                    ? "bg-background text-foreground"
                    : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                )}
              >
                <span className="flex-1 min-w-0 truncate">{tab.title}</span>
              </Link>
              <button
                type="button"
                onClick={(e) => closeTab(tab.path, e)}
                aria-label={t("tab.close")}
                className={cn(
                  "absolute right-1.5 top-1/2 -translate-y-1/2",
                  "inline-flex items-center justify-center rounded p-0.5 transition-opacity",
                  "hover:bg-muted hover:text-foreground",
                  active
                    ? "opacity-60 hover:opacity-100"
                    : "opacity-0 group-hover:opacity-70 hover:!opacity-100",
                )}
              >
                <X className="h-3 w-3" />
              </button>
              {active && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-primary"
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
