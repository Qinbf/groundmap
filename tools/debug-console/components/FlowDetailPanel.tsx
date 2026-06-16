"use client";
/**
 * 流程图右下角浮动详情面板
 * 悬浮节点 → 立刻显示完整 args / result preview / 思考全文
 */
import type { FlowNodeData } from "@/lib/build-flow-graph";

interface Props {
  node: FlowNodeData | null;
  locked?: boolean;
  nodeCount?: number;
  edgeCount?: number;
  onUnlock?: () => void;
}

export function FlowDetailPanel({ node, locked, nodeCount, edgeCount, onUnlock }: Props) {
  if (!node) {
    return (
      <div className="pointer-events-none absolute bottom-3 right-3 w-80 rounded-lg border border-slate-700 bg-slate-900/80 p-3 text-xs text-slate-500 shadow-xl backdrop-blur">
        <div className="mb-1 text-slate-400">📊 流程图就绪</div>
        {(nodeCount || edgeCount) && (
          <div className="text-slate-500">
            {nodeCount} 节点 · {edgeCount} 条边
          </div>
        )}
        <div className="mt-1 text-slate-600">悬浮节点查看详情 · 点击锁定</div>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto absolute bottom-3 right-3 max-h-[70%] w-[28rem] overflow-auto rounded-lg border border-cyan-700 bg-slate-900/95 p-3 text-xs shadow-2xl backdrop-blur">
      {/* 顶部：kind 标签 + title + 锁定指示 */}
      <div className="mb-2 flex items-center gap-2">
        <span className={kindBadgeClass(node.kind)}>{kindLabel(node)}</span>
        <span className="flex-1 truncate text-sm font-semibold text-slate-100">{node.title}</span>
        {locked && (
          <button
            onClick={onUnlock}
            className="rounded bg-cyan-700 px-1.5 py-0.5 text-[10px] text-cyan-100 hover:bg-cyan-600"
            title="点击节点切换锁定；锁定后悬浮其他节点不会改变内容"
          >
            🔒 已锁定 ✕
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
              工具：<span className="text-slate-300">{node.toolName}</span>
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
              <summary className="cursor-pointer text-slate-500">参数</summary>
              <pre className="mt-1 overflow-auto whitespace-pre-wrap break-words rounded bg-slate-950/70 p-1.5 text-[10px] text-slate-300">
                {JSON.stringify(node.toolArgs, null, 2)}
              </pre>
            </details>
          )}
          {node.resultPreview && (
            <>
              <div className="mb-1 text-slate-500">
                结果预览 ({node.status === "ok" ? "✓" : node.status === "error" ? "✗" : "…"})
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
          <div className="mb-1 text-slate-500">完整思考</div>
          <div className="whitespace-pre-wrap break-words text-slate-200">{node.body}</div>
        </>
      )}

      {/* query 节点：完整问题 */}
      {node.kind === "query" && node.body && (
        <>
          <div className="mb-1 text-slate-500">用户问题</div>
          <div className="whitespace-pre-wrap break-words text-slate-200">{node.body}</div>
        </>
      )}

      {/* ghost 节点：说明 */}
      {node.kind === "ghost" && (
        <>
          <div className="mb-1 italic text-amber-400">
            🫥 候选——AI 提到过但没真去读
          </div>
          {node.body && (
            <div className="whitespace-pre-wrap break-words text-slate-300">{node.body}</div>
          )}
          <div className="mt-2 text-cyan-400 hover:underline">
            点节点 → 右侧分屏打开内容
          </div>
        </>
      )}
    </div>
  );
}

function kindLabel(n: FlowNodeData): string {
  switch (n.kind) {
    case "query": return "💬 用户问题";
    case "thought": return `🧠 ${n.thoughtType || "思考"}`;
    case "file": return `📄 ${n.fileType}`;
    case "search": return "🔍 搜索";
    case "list": return "📋 列表";
    case "ghost": return "🫥 候选未读";
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
