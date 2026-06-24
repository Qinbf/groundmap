"use client";
import { useEffect, useState } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { ProviderPicker } from "@/components/ProviderPicker";
import { ModePicker } from "@/components/ModePicker";
import { WorkspaceIndicator } from "@/components/WorkspaceIndicator";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { PreviewPanel } from "@/components/PreviewPanel";
import { useT } from "@/lib/i18n-client";
import type { WikiRef } from "@/lib/wiki-ref";
import type { FlowNodeData } from "@/lib/build-flow-graph";
import {
  buildSystemPrompt,
  QUERY_MODES,
  type QueryMode,
} from "@/lib/default-system-prompt";

export default function Page() {
  const t = useT();
  const [provider, setProvider] = useState("claude-code");
  const [model, setModel] = useState("default");
  const [mode, setMode] = useState<QueryMode>("quick");
  const [system, setSystem] = useState(buildSystemPrompt("quick"));
  const [systemDirty, setSystemDirty] = useState(false);
  const [toolBudget, setToolBudget] = useState(
    QUERY_MODES.find((m) => m.id === "quick")!.default_budget,
  );
  const [budgetDirty, setBudgetDirty] = useState(false);
  const [showSystem, setShowSystem] = useState(false);
  const [previewRef, setPreviewRef] = useState<WikiRef | null>(null);
  const [previewNode, setPreviewNode] = useState<FlowNodeData | null>(null);
  const hasPreview = !!previewRef || !!previewNode;

  // 要查的库：?ws 参数（web 顶栏点进来时带，反映 web 当前所在库）> web 当前默认库。
  // 控制台是 web 的外部客户端，**不**提供独立切换——避免控制台查的库与 web 浏览的库不一致。
  const [workspace, setWorkspace] = useState<string | null>(null);

  const openRef = (r: WikiRef) => {
    setPreviewNode(null);
    setPreviewRef(r);
  };
  const openNode = (n: FlowNodeData) => {
    setPreviewRef(null);
    setPreviewNode(n);
  };
  const closePreview = () => {
    setPreviewRef(null);
    setPreviewNode(null);
  };

  useEffect(() => {
    if (!systemDirty) setSystem(buildSystemPrompt(mode));
    if (!budgetDirty) {
      const meta = QUERY_MODES.find((m) => m.id === mode);
      if (meta) setToolBudget(meta.default_budget);
    }
  }, [mode, systemDirty, budgetDirty]);

  // 进页面时解析活动 workspace：?ws 参数（web 传入）> web 当前库。不读写 localStorage、不可切换。
  useEffect(() => {
    const WS_RE = /^[A-Za-z0-9_-]+$/;
    const fromUrl = new URLSearchParams(window.location.search).get("ws");
    fetch("/api/workspaces")
      .then((r) => r.json())
      .then((d: { workspaces?: unknown; current?: unknown }) => {
        const list = Array.isArray(d.workspaces) ? (d.workspaces as string[]) : [];
        const valid = (w: string | null): w is string =>
          !!w && WS_RE.test(w) && list.includes(w);
        const chosen = valid(fromUrl)
          ? fromUrl
          : typeof d.current === "string"
            ? d.current
            : null;
        setWorkspace(chosen);
      })
      .catch(() => {
        // 库列表取不到（web 没起）：用 ?ws 兜底，web 端会再校验一次 cookie
        setWorkspace(fromUrl && WS_RE.test(fromUrl) ? fromUrl : null);
      });
  }, []);

  return (
    <main className="kc-stage flex h-screen flex-col">
      {/* ─── 顶栏 chrome ─── */}
      <header className="relative border-b border-[var(--line)]">
        {/* 主行：左 logo + 右控件 */}
        <div className="flex flex-wrap items-end justify-between gap-6 px-6 pt-5 pb-3">
          <div className="flex items-end gap-3">
            <div className="leading-none">
              <div className="k-eyebrow mb-1.5">{t("header.eyebrow")}</div>
              <h1 className="k-display text-[2.4rem] text-[var(--paper)]">
                Knowledge<span className="text-[var(--amber)]">.</span>
                <span className="k-display-italic font-light text-[var(--paper-dim)]">Console</span>
              </h1>
            </div>
            <span
              className="mb-2 inline-block"
              aria-label={t("header.live")}
              title={t("header.live_workbench")}
            >
              <span className="k-tick" />
            </span>
          </div>

          <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
            <WorkspaceIndicator value={workspace} />
            <ProviderPicker
              provider={provider}
              model={model}
              onChange={(p, m) => {
                setProvider(p);
                setModel(m);
              }}
            />
            <ModePicker mode={mode} onChange={setMode} />
            <div className="flex flex-col gap-1">
              <span className="k-eyebrow">{t("header.budget")}</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={toolBudget}
                  onChange={(e) => {
                    setToolBudget(Number(e.target.value) || 10);
                    setBudgetDirty(true);
                  }}
                  className="k-input w-14 text-center"
                />
                {budgetDirty && (
                  <button
                    onClick={() => setBudgetDirty(false)}
                    className="text-xs text-[var(--paper-mute)] hover:text-[var(--amber)]"
                    title={t("header.budget_reset")}
                  >
                    ↺
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowSystem(!showSystem)}
              className="k-btn"
              title={t("header.edit_prompt")}
            >
              {showSystem ? "▼ prompt" : "▸ prompt"}
            </button>
            <LocaleSwitcher />
          </div>
        </div>

        {/* 副行：ruled 信息条 */}
        <div className="flex items-center gap-4 border-t border-[var(--line)]/60 px-6 py-2 text-[10.5px] uppercase tracking-[0.18em] text-[var(--paper-mute)]">
          <span>{t("header.bar_kb")}</span>
          <span className="text-[var(--line-2)]">/</span>
          <span>{t("header.bar_llm")}</span>
          <span className="ml-auto flex items-center gap-2">
            <span>{t("header.bar_opensource")}</span>
            <span className="text-[var(--line-2)]">·</span>
            <span className="text-[var(--paper-dim)]">groundmap</span>
          </span>
        </div>
      </header>

      {/* ─── 可选 system prompt 编辑区 ─── */}
      {showSystem && (
        <div className="border-b border-[var(--line)] bg-[var(--ink-2)]/60 px-6 py-3">
          <div className="mb-2 flex items-center gap-3">
            <span className="k-eyebrow">system prompt</span>
            <span className="text-[var(--line-2)]">—</span>
            {systemDirty ? (
              <button
                onClick={() => {
                  setSystem(buildSystemPrompt(mode));
                  setSystemDirty(false);
                }}
                className="text-[11px] text-[var(--amber)] hover:underline"
              >
                {t("header.prompt_reset", { mode })}
              </button>
            ) : (
              <span className="text-[11px] text-[var(--paper-mute)]">
                {t("header.prompt_following", { mode })}
              </span>
            )}
          </div>
          <textarea
            value={system}
            onChange={(e) => {
              setSystem(e.target.value);
              setSystemDirty(true);
            }}
            rows={10}
            className="k-input w-full resize-y font-mono text-[12px] leading-relaxed"
          />
        </div>
      )}

      {/* ─── 聊天主区 + 可选右侧分屏 ─── */}
      <div className="flex flex-1 overflow-hidden">
        <div
          className={`overflow-hidden ${
            hasPreview ? "w-3/5 border-r border-[var(--line)]" : "w-full"
          }`}
        >
          <ChatPanel
            provider={provider}
            model={model}
            system={system}
            toolBudget={toolBudget}
            mode={mode}
            workspace={workspace}
            onOpenRef={openRef}
            onOpenNode={openNode}
          />
        </div>
        {hasPreview && (
          <div className="w-2/5 overflow-hidden">
            <PreviewPanel
              refData={previewRef}
              nodeData={previewNode}
              workspace={workspace}
              onClose={closePreview}
              onOpenRef={openRef}
            />
          </div>
        )}
      </div>
    </main>
  );
}
