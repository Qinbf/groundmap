"use client";
/**
 * 推理图卡片讲解面板 —— 点一张卡片，这里讲清楚「它是什么卡片 + 这一步具体在做什么 + 对应哪一步」。
 * 这是「推理图的卡片也要一起讲解」的落点：
 *   ① 通用讲解（按 kind / fileType / thoughtType，walkthrough.card.* / walkthrough.thought.*）
 *   ② 针对本次查询的具体讲解（EX1_NOTES[stepRef]）
 *   ③ 真实工具参数 / 返回 / 完整思考，以及「跳到下方对应讲解步骤」的入口。
 */
import type { FlowNodeData } from "@/lib/flow/build-flow-graph";
import { useT } from "@/lib/i18n-client";
import type { TranslationKey } from "@/lib/i18n";
import { EX1_STEPS, EX1_NOTES } from "./ex1-trace";

type TFn = (key: TranslationKey, vars?: Record<string, string | number>) => string;

// thoughtType → 专门说明 key（不在表里回退 generic）
const THOUGHT_EXPLAIN: Record<string, TranslationKey> = {
  INTENT: "walkthrough.thought.intent",
  STRATEGY: "walkthrough.thought.strategy",
  EVAL: "walkthrough.thought.eval",
  EXTRACT: "walkthrough.thought.extract",
  CONFLICT: "walkthrough.thought.conflict",
  DECIDE: "walkthrough.thought.decide",
};

// fileType → 专门说明 key
const FILE_EXPLAIN: Record<string, TranslationKey> = {
  concept: "walkthrough.card.file_concept",
  analysis: "walkthrough.card.file_analysis",
  source: "walkthrough.card.file_source",
  index: "walkthrough.card.file_index",
};

/** 这张卡片是什么——返回通用讲解文案 */
function explainCard(node: FlowNodeData, t: TFn): string {
  switch (node.kind) {
    case "query":
      return t("walkthrough.card.query");
    case "search":
      return t("walkthrough.card.search");
    case "list":
      return t("walkthrough.card.list");
    case "result":
      return t("walkthrough.card.result");
    case "thought":
      return t(THOUGHT_EXPLAIN[node.thoughtType || ""] || "walkthrough.thought.generic");
    case "file":
      return t(FILE_EXPLAIN[node.fileType] || "walkthrough.card.file_other");
    default:
      return t("walkthrough.card.file_other");
  }
}

function kindBadge(node: FlowNodeData, t: TFn): { label: string; cls: string } {
  switch (node.kind) {
    case "query": return { label: t("flow.query_label"), cls: "bg-indigo-700 text-indigo-100" };
    case "thought": return { label: `🧠 ${node.thoughtType || t("flow.thought_fallback")}`, cls: "bg-purple-700 text-purple-100" };
    case "file": return { label: `📄 ${node.fileType}`, cls: "bg-emerald-700 text-emerald-100" };
    case "search": return { label: `🔍 ${t("flow.type_search")}`, cls: "bg-blue-700 text-blue-100" };
    case "list": return { label: `📋 ${t("flow.type_list")}`, cls: "bg-slate-600 text-slate-100" };
    case "result": return { label: `✨ ${t("flow.answer")}`, cls: "bg-yellow-700 text-yellow-100" };
    default: return { label: node.kind, cls: "bg-slate-700 text-slate-200" };
  }
}

interface Props {
  node: FlowNodeData | null;
  nodeCount: number;
  edgeCount: number;
  onJumpStep: (ref: number) => void;
  onClose: () => void;
}

export function ReasoningDetailPanel({ node, nodeCount, edgeCount, onJumpStep, onClose }: Props) {
  const t = useT();

  if (!node) {
    return (
      <div className="flex h-full flex-col justify-center rounded-lg border border-[var(--rg-line)] bg-[var(--rg-ink-2)] p-4 text-xs text-[var(--rg-paper-mute)]">
        <div className="mb-1 text-sm font-semibold text-[var(--rg-paper-dim)]">
          {t("walkthrough.detail.ready")}
        </div>
        <div className="mb-3 leading-relaxed">{t("walkthrough.detail.ready_hint")}</div>
        <div className="font-mono text-[10px] text-[var(--rg-paper-mute)]">
          {t("walkthrough.graph.counts", { n: nodeCount, e: edgeCount })}
        </div>
      </div>
    );
  }

  const badge = kindBadge(node, t);
  const step = node.stepRef != null ? EX1_STEPS.find((s) => s.ref === node.stepRef) : undefined;
  const note = node.stepRef != null ? EX1_NOTES[node.stepRef] : undefined;
  const isTool = node.kind === "file" || node.kind === "search" || node.kind === "list" || node.kind === "other";

  return (
    <div className="flex h-full flex-col overflow-auto rounded-lg border border-cyan-700/70 bg-[var(--rg-ink-2)] p-4 text-xs text-[var(--rg-paper-dim)]">
      {/* 顶部：kind + title + 关闭 */}
      <div className="mb-2 flex items-center gap-2">
        <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] uppercase ${badge.cls}`}>
          {badge.label}
        </span>
        <span className="flex-1 truncate text-sm font-semibold text-[var(--rg-paper)]">{node.title}</span>
        <button
          onClick={onClose}
          aria-label={t("walkthrough.detail.close")}
          className="rounded px-1.5 py-0.5 text-[10px] text-[var(--rg-paper-mute)] hover:text-[var(--rg-amber)]"
          title={t("walkthrough.detail.close")}
        >
          ✕
        </button>
      </div>

      {/* ① 这是什么卡片 —— 通用讲解 */}
      <div className="mb-3 rounded border border-cyan-700/40 bg-cyan-950/30 p-2.5 leading-relaxed text-[var(--rg-paper)]">
        <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-cyan-400">
          {t("walkthrough.detail.what")}
        </div>
        {explainCard(node, t)}
      </div>

      {/* ② 这一步在做什么 —— 针对本次查询的具体讲解 */}
      {note && (
        <div className="mb-3 rounded border border-[var(--rg-amber)]/35 bg-[var(--rg-amber)]/10 p-2.5 leading-relaxed text-[var(--rg-paper)]">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-[var(--rg-amber)]">
            {t("walkthrough.detail.step_note")}
          </div>
          {note}
        </div>
      )}

      {/* path / anchor */}
      {node.path && (
        <div className="mb-2 break-all rounded bg-[var(--rg-ink)]/60 p-1.5 font-mono text-[10px] text-cyan-300">
          {node.path}
          {node.anchor && (
            <span className="text-[var(--rg-paper-mute)]">
              {node.isBlock ? "#^" : "#"}
              <span className="text-emerald-400">{node.anchor}</span>
            </span>
          )}
        </div>
      )}

      {/* tool 节点：工具 + 参数 + 返回 */}
      {isTool && (
        <>
          {node.toolName && (
            <div className="mb-1 text-[var(--rg-paper-mute)]">
              {t("walkthrough.detail.tool")}
              <span className="ml-1 font-mono text-[var(--rg-paper-dim)]">{node.toolName}</span>
              {node.hitCount > 1 && <span className="ml-2 text-[var(--rg-amber)]">×{node.hitCount}</span>}
              {node.durationMs !== undefined && (
                <span className="ml-2 text-[var(--rg-paper-mute)]">{node.durationMs}ms</span>
              )}
            </div>
          )}
          {node.toolArgs && (
            <pre className="mb-2 overflow-auto whitespace-pre-wrap break-words rounded bg-[var(--rg-ink)]/70 p-1.5 font-mono text-[10px] text-[var(--rg-paper-dim)]">
              {JSON.stringify(node.toolArgs, null, 2)}
            </pre>
          )}
          {node.resultPreview && (
            <>
              <div className="mb-1 text-[var(--rg-paper-mute)]">{t("walkthrough.detail.result")}</div>
              <pre className="mb-2 max-h-[300px] min-h-[180px] overflow-auto whitespace-pre-wrap break-words rounded bg-[var(--rg-ink)]/70 p-2 font-mono text-[11px] leading-relaxed text-[var(--rg-paper-dim)]">
                {node.resultPreview}
              </pre>
            </>
          )}
        </>
      )}

      {/* thought / query / result：完整正文 */}
      {(node.kind === "thought" || node.kind === "query" || node.kind === "result") && node.body && (
        <>
          <div className="mb-1 text-[var(--rg-paper-mute)]">{t("walkthrough.detail.thought_full")}</div>
          <div className="mb-2 whitespace-pre-wrap break-words leading-relaxed text-[var(--rg-paper)]">
            {node.body}
          </div>
        </>
      )}

      {/* 对应讲解步骤 */}
      {step && step.ref > 0 && (
        <div className="mt-auto border-t border-[var(--rg-line)] pt-2.5">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-[var(--rg-paper-mute)]">
            {t("walkthrough.detail.corresponds")}
          </div>
          <button
            onClick={() => onJumpStep(step.ref)}
            className="w-full rounded bg-[var(--rg-amber)]/15 px-2 py-1.5 text-left text-[11px] text-[var(--rg-amber)] transition-colors hover:bg-[var(--rg-amber)]/25"
          >
            <span className="font-mono font-bold">
              {String(step.ref).padStart(2, "0")} · {step.badge}
            </span>
            <span className="ml-1.5 text-[var(--rg-paper-dim)]">{step.title}</span>
            <span className="ml-1 text-[var(--rg-amber)]">{t("walkthrough.detail.jump")}</span>
          </button>
        </div>
      )}
    </div>
  );
}
