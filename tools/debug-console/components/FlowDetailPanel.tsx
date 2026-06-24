"use client";
/**
 * 流程图右下角浮动详情面板
 * 悬浮节点 → 立刻显示完整 args / result preview / 思考全文
 */
import type { FlowNodeData } from "@/lib/build-flow-graph";
import { useT } from "@/lib/i18n-client";
import type { TranslationKey } from "@/lib/i18n";

type TFn = (key: TranslationKey, vars?: Record<string, string | number>) => string;

interface Props {
  node: FlowNodeData | null;
  locked?: boolean;
  nodeCount?: number;
  edgeCount?: number;
  onUnlock?: () => void;
}

export function FlowDetailPanel({ node, locked, nodeCount, edgeCount, onUnlock }: Props) {
  const t = useT();
  if (!node) {
    return (
      <div className="pointer-events-none absolute bottom-3 right-3 w-80 rounded-lg border border-slate-700 bg-slate-900/80 p-3 text-xs text-slate-500 shadow-xl backdrop-blur">
        <div className="mb-1 text-slate-400">{t("flow.detail_ready")}</div>
        {(nodeCount || edgeCount) && (
          <div className="text-slate-500">
            {t("flow.detail_counts", { n: nodeCount ?? 0, edge: edgeCount ?? 0 })}
          </div>
        )}
        <div className="mt-1 text-slate-600">{t("flow.detail_hint")}</div>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto absolute bottom-3 right-3 max-h-[70%] w-[28rem] overflow-auto rounded-lg border border-cyan-700 bg-slate-900/95 p-3 text-xs shadow-2xl backdrop-blur">
      {/* 顶部：kind 标签 + title + 锁定指示 */}
      <div className="mb-2 flex items-center gap-2">
        <span className={kindBadgeClass(node.kind)}>{kindLabel(node, t)}</span>
        <span className="flex-1 truncate text-sm font-semibold text-slate-100">{node.title}</span>
        {locked && (
          <button
            onClick={onUnlock}
            className="rounded bg-cyan-700 px-1.5 py-0.5 text-[10px] text-cyan-100 hover:bg-cyan-600"
            title={t("flow.detail_lock_tip")}
          >
            {t("flow.detail_locked")}
          </button>
        )}
      </div>

      {/* path / subtitle */}
      {node.path && (
        <div className="mb-2 break-all rounded bg-slate-950/50 p-1.5 font-mono text-[10px] text-cyan-300">
          {node.path}
          {node.anchor && (
            <span className="text-slate-500">
              {node.isBlock ? "#^" : "#"}
              <span className="text-emerald-400">{node.anchor}</span>
            </span>
          )}
        </div>
      )}
      {!node.path && node.subtitle && (
        <div className="mb-2 break-words text-slate-300">{node.subtitle}</div>
      )}

      {/* tool 节点：args + result */}
      {node.kind === "file" || node.kind === "search" || node.kind === "list" || node.kind === "other" ? (
        <>
          {node.toolName && (
            <div className="mb-1 text-slate-500">
              {t("flow.detail_tool")}<span className="text-slate-300">{node.toolName}</span>
              {node.hitCount > 1 && (
                <span className="ml-2 text-amber-400">×{node.hitCount}</span>
              )}
              {node.durationMs !== undefined && (
                <span className="ml-2 text-slate-500">{node.durationMs}ms</span>
              )}
            </div>
          )}
          {node.toolArgs && (
            <details className="mb-2">
              <summary className="cursor-pointer text-slate-500">{t("flow.detail_args")}</summary>
              <pre className="mt-1 overflow-auto whitespace-pre-wrap break-words rounded bg-slate-950/70 p-1.5 text-[10px] text-slate-300">
                {JSON.stringify(node.toolArgs, null, 2)}
              </pre>
            </details>
          )}
          {node.resultPreview && (
            <>
              <div className="mb-1 text-slate-500">
                {t("flow.detail_result_preview", {
                  status:
                    node.status === "ok" ? "✓" : node.status === "error" ? "✗" : "…",
                })}
              </div>
              <pre className="overflow-auto whitespace-pre-wrap break-words rounded bg-slate-950/70 p-1.5 text-[10px] leading-relaxed text-slate-300">
                {node.resultPreview}
              </pre>
            </>
          )}
        </>
      ) : null}

      {/* thought 节点：完整 body */}
      {node.kind === "thought" && node.body && (
        <>
          <div className="mb-1 text-slate-500">{t("flow.detail_full_thought")}</div>
          <div className="whitespace-pre-wrap break-words text-slate-200">{node.body}</div>
        </>
      )}

      {/* query 节点：完整问题 */}
      {node.kind === "query" && node.body && (
        <>
          <div className="mb-1 text-slate-500">{t("flow.detail_user_query")}</div>
          <div className="whitespace-pre-wrap break-words text-slate-200">{node.body}</div>
        </>
      )}

      {/* ghost 节点：说明 */}
      {node.kind === "ghost" && (
        <>
          <div className="mb-1 italic text-amber-400">
            {t("flow.detail_ghost_desc")}
          </div>
          {node.body && (
            <div className="whitespace-pre-wrap break-words text-slate-300">{node.body}</div>
          )}
          <div className="mt-2 text-cyan-400 hover:underline">
            {t("flow.detail_ghost_hint")}
          </div>
        </>
      )}
    </div>
  );
}

function kindLabel(n: FlowNodeData, t: TFn): string {
  switch (n.kind) {
    case "query": return t("flow.kind_query");
    case "thought": return `🧠 ${n.thoughtType || t("flow.kind_thought_fallback")}`;
    case "file": return `📄 ${n.fileType}`;
    case "search": return t("flow.kind_search");
    case "list": return t("flow.kind_list");
    case "ghost": return t("flow.kind_ghost");
    default: return n.kind;
  }
}

function kindBadgeClass(kind: string): string {
  const base = "rounded px-1.5 py-0.5 text-[10px] font-mono uppercase";
  switch (kind) {
    case "query": return `${base} bg-indigo-700 text-indigo-100`;
    case "thought": return `${base} bg-purple-700 text-purple-100`;
    case "file": return `${base} bg-emerald-700 text-emerald-100`;
    case "search": return `${base} bg-blue-700 text-blue-100`;
    case "list": return `${base} bg-slate-600 text-slate-100`;
    case "ghost": return `${base} bg-slate-700 text-slate-300`;
    default: return `${base} bg-slate-700 text-slate-200`;
  }
}
