"use client";
/**
 * 顶栏 workspace 切换器：列出当前数据根（KB_ROOT）下的所有 workspace，
 * 选择后写 cookie `kb_workspace` + reload，让服务端按新 workspace 重新渲染。
 * 与 LocaleSwitcher 的 cookie + reload 模式一致。只有 1 个 workspace 时不渲染。
 */
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n-client";

const WORKSPACE_COOKIE = "kb_workspace";

export function WorkspaceSwitcher() {
  const t = useT();
  const [workspaces, setWorkspaces] = useState<string[]>([]);
  const [current, setCurrent] = useState<string>("");

  useEffect(() => {
    let alive = true;
    fetch("/api/workspaces")
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setWorkspaces(Array.isArray(d.workspaces) ? d.workspaces : []);
        setCurrent(typeof d.current === "string" ? d.current : "");
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // 只有一个（或零个）workspace 时无需切换器
  if (workspaces.length <= 1) return null;

  const onChange = (ws: string) => {
    if (!ws || ws === current) return;
    document.cookie = `${WORKSPACE_COOKIE}=${ws}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    // 页面级路由（/page/、/blocks/）的具体页在新 workspace 里多半不存在 → 回首页避免 404；
    // 其余路由（/health、/graph、/learn… 按当前 workspace 渲染）原地刷新即可。
    const p = window.location.pathname;
    if (p.startsWith("/page/") || p.startsWith("/blocks/")) {
      window.location.assign("/");
    } else {
      window.location.reload();
    }
  };

  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      title={t("workspace.switch_title")}
      aria-label={t("workspace.aria")}
      className="h-8 rounded-md border border-input bg-background px-2 text-xs font-mono text-foreground hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-1 focus:ring-ring"
    >
      {workspaces.map((ws) => (
        <option key={ws} value={ws}>
          {ws}
        </option>
      ))}
    </select>
  );
}
