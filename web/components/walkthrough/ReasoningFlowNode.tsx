"use client";
/**
 * 推理图节点卡片 —— react-flow 自定义 node。
 * 移植自查询控制台 components/FlowNode.tsx；讲解页版本额外：
 *   - 左上角角标显示**讲解步骤号**（01..13），把卡片和下方步骤一一对应起来
 *   - 选中节点时 cyan 高亮环（点击后由父组件回填 isSelected）
 *   - 键盘可达：每张卡片 tabIndex/role=button/aria-label + Enter/Space 触发选中（data.onActivate）
 *
 * 卡片种类：query 紫 / thought 按 TYPE 染色 / file 按 type 染色 / search 蓝 / list 灰 / result 金。
 */
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { FileType, FlowNodeData } from "@/lib/flow/build-flow-graph";
import { useT } from "@/lib/i18n-client";
import type { TranslationKey } from "@/lib/i18n";

type TFn = (key: TranslationKey, vars?: Record<string, string | number>) => string;

/** 卡片数据 + 父组件注入的运行期回调 */
type CardData = FlowNodeData & { isSelected?: boolean; onActivate?: (node: FlowNodeData) => void };

const FILE_TYPE_KEY: Record<FileType, TranslationKey | null> = {
  concept: "flow.type_concept",
  analysis: "flow.type_analysis",
  source: "flow.type_source",
  entity: "flow.type_entity",
  index: "flow.type_index",
  raw: "flow.type_raw",
  thoughts: "flow.type_thoughts",
  unknown: null,
};

// handle 全透明、贴边缘——edge path 端点 = 卡片边缘
const HANDLE_CLS = "!h-3 !w-3 !rounded-none !border-0 !bg-transparent !shadow-none !opacity-0";
const LEFT_STYLE = { left: 0 } as const;
const RIGHT_STYLE = { right: 0 } as const;

const FILE_COLOR: Record<FileType, { bg: string; border: string; text: string; label: string }> = {
  concept: { bg: "bg-emerald-950", border: "border-emerald-500", text: "text-emerald-200", label: "concept" },
  analysis: { bg: "bg-rose-950", border: "border-rose-500", text: "text-rose-200", label: "analysis" },
  source: { bg: "bg-violet-950", border: "border-violet-500", text: "text-violet-200", label: "source" },
  entity: { bg: "bg-sky-950", border: "border-sky-500", text: "text-sky-200", label: "entity" },
  index: { bg: "bg-amber-950", border: "border-amber-500", text: "text-amber-200", label: "index" },
  raw: { bg: "bg-slate-900", border: "border-slate-500", text: "text-slate-200", label: "raw" },
  thoughts: { bg: "bg-pink-950", border: "border-pink-500", text: "text-pink-200", label: "thoughts" },
  unknown: { bg: "bg-slate-900", border: "border-slate-600", text: "text-slate-300", label: "?" },
};

// search / list 不是「文件」（无 path → fileType=unknown），单独给色：search 蓝、list 灰（与图例一致）
const SEARCH_COLOR = { bg: "bg-blue-950", border: "border-blue-500", text: "text-blue-200" };
const LIST_COLOR = { bg: "bg-slate-900", border: "border-slate-500", text: "text-slate-300" };

const THOUGHT_COLOR: Record<string, { bg: string; border: string }> = {
  INTENT: { bg: "bg-indigo-950", border: "border-indigo-400" },
  STRATEGY: { bg: "bg-purple-950", border: "border-purple-400" },
  SEARCH: { bg: "bg-blue-950", border: "border-blue-400" },
  EVAL: { bg: "bg-cyan-950", border: "border-cyan-400" },
  READ: { bg: "bg-emerald-950", border: "border-emerald-400" },
  EXTRACT: { bg: "bg-lime-950", border: "border-lime-400" },
  LINK: { bg: "bg-teal-950", border: "border-teal-400" },
  DECIDE: { bg: "bg-orange-950", border: "border-orange-400" },
  CONFLICT: { bg: "bg-amber-950", border: "border-amber-400" },
  ANSWER: { bg: "bg-yellow-950", border: "border-yellow-400" },
};

const QUERY_STYLE = { bg: "bg-indigo-950", border: "border-indigo-300", text: "text-indigo-100" };

/** 卡片内部的类型标签 */
function typeLabel(data: FlowNodeData, t: TFn): string {
  if (data.kind === "file") {
    const key = FILE_TYPE_KEY[data.fileType];
    return key ? t(key) : t("flow.type_file");
  }
  if (data.kind === "search") return t("flow.type_search");
  if (data.kind === "list") return t("flow.type_list");
  if (data.kind === "other" && data.toolName) return data.toolName;
  return data.kind;
}

/** 键盘可达性：tabIndex + role=button + aria-label + Enter/Space 触发选中 */
function a11y(data: CardData) {
  const name = data.subtitle && data.subtitle !== data.title ? `${data.title} — ${data.subtitle}` : data.title;
  return {
    tabIndex: 0,
    role: "button",
    "aria-label": name,
    "aria-pressed": data.isSelected ? true : undefined,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        data.onActivate?.(data);
      }
    },
  } as const;
}

/** 步骤号角标（左上角圆点） */
function StepBadge({ data }: { data: FlowNodeData }) {
  const label = data.kind === "query" ? "▶" : data.stepRef != null ? String(data.stepRef).padStart(2, "0") : "";
  if (!label) return null;
  return (
    <div className="absolute -left-2 -top-2 z-10 flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--rg-ink)] px-1 text-[10px] font-bold text-[var(--rg-paper)] ring-2 ring-[var(--rg-line-2)]">
      {label}
    </div>
  );
}

export function ReasoningFlowNode({ data }: NodeProps & { data: CardData }) {
  const t = useT();
  if (data.kind === "query") return renderQuery(data, t);
  if (data.kind === "thought") return renderThought(data, t);
  if (data.kind === "result") return renderResult(data, t);
  return renderTool(data, t);
}

const selRing = (sel?: boolean) => (sel ? "ring-2 ring-cyan-400/80 node-rg-glow" : "");

// ─── Result 节点（金黄大卡片）───
function renderResult(data: CardData, t: TFn) {
  return (
    <div
      {...a11y(data)}
      className={`node-rg-enter relative w-[360px] cursor-pointer rounded-xl border-2 border-yellow-400 bg-gradient-to-br from-yellow-950 to-amber-950 px-4 py-3 transition-all hover:brightness-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${selRing(data.isSelected)}`}
      title={t("flow.answer_tip")}
      style={{ minHeight: 150 }}
    >
      <Handle type="target" position={Position.Left} className={HANDLE_CLS} style={LEFT_STYLE} />
      <StepBadge data={data} />
      <div className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-yellow-900 text-base ring-2 ring-yellow-400/60" aria-hidden="true">
        ✨
      </div>
      <div className="mb-1 flex items-center gap-2">
        <span className="rounded bg-yellow-700 px-2 py-0.5 text-[10px] font-mono uppercase text-yellow-100">
          {t("flow.answer")}
        </span>
        <span className="text-sm font-bold text-yellow-100">{data.title}</span>
      </div>
      {data.subtitle && <div className="mb-1 text-xs text-yellow-200/80">{data.subtitle}</div>}
      {data.body && (
        <div className="line-clamp-5 whitespace-pre-wrap text-xs leading-relaxed text-slate-100">
          {data.body}
        </div>
      )}
      <div className="mt-2 text-[10px] italic text-yellow-300/70">{t("flow.answer_hint")}</div>
    </div>
  );
}

// ─── Query 节点（起始）───
function renderQuery(data: CardData, t: TFn) {
  return (
    <div
      {...a11y(data)}
      className={`node-rg-enter relative w-72 cursor-pointer rounded-xl border-2 px-4 py-3 transition-all hover:brightness-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${QUERY_STYLE.bg} ${QUERY_STYLE.border} ${QUERY_STYLE.text} ${selRing(data.isSelected)}`}
      title={data.body}
    >
      <Handle type="source" position={Position.Right} className={HANDLE_CLS} style={RIGHT_STYLE} />
      <StepBadge data={data} />
      <div className="mb-1 text-[10px] uppercase tracking-wider opacity-70">{t("flow.query_label")}</div>
      <div className="line-clamp-3 text-sm leading-snug">{data.subtitle || data.title}</div>
    </div>
  );
}

// ─── Thought 小节点（思考步骤）───
function renderThought(data: CardData, t: TFn) {
  const palette = THOUGHT_COLOR[data.thoughtType || ""] || { bg: "bg-purple-950", border: "border-purple-400" };
  return (
    <div
      {...a11y(data)}
      className={`node-rg-enter relative w-52 cursor-pointer rounded-md border px-2.5 py-1.5 transition-all hover:brightness-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${palette.bg} ${palette.border} ${selRing(data.isSelected)}`}
      title={data.subtitle}
    >
      <Handle type="target" position={Position.Left} className={HANDLE_CLS} style={LEFT_STYLE} />
      <Handle type="source" position={Position.Right} className={HANDLE_CLS} style={RIGHT_STYLE} />
      <StepBadge data={data} />
      <div className="flex items-center gap-1.5">
        <span className="text-[10px]" aria-hidden="true">🧠</span>
        <span className="font-mono text-[10px] font-bold uppercase text-slate-100">
          {data.thoughtType || t("flow.thought_fallback")}
        </span>
      </div>
      <div className="mt-0.5 line-clamp-2 text-[11px] leading-tight text-slate-200">{data.subtitle}</div>
    </div>
  );
}

// ─── 标准 file/search/list/other 节点 ───
function renderTool(data: CardData, t: TFn) {
  const palette =
    data.kind === "search" ? SEARCH_COLOR : data.kind === "list" ? LIST_COLOR : FILE_COLOR[data.fileType] || FILE_COLOR.unknown;
  return (
    <div
      {...a11y(data)}
      title={data.path || data.title}
      className={`node-rg-enter relative w-60 cursor-pointer rounded-lg border-2 px-3 py-2 transition-all hover:brightness-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${palette.bg} ${palette.border} ${selRing(data.isSelected)}`}
      style={{ minHeight: 88 }}
    >
      <Handle type="target" position={Position.Left} className={HANDLE_CLS} style={LEFT_STYLE} />
      <Handle type="source" position={Position.Right} className={HANDLE_CLS} style={RIGHT_STYLE} />
      <StepBadge data={data} />
      {data.hitCount > 1 && (
        <div
          className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--rg-amber)] px-1 text-[10px] font-bold text-[var(--rg-ink)]"
          title={t("flow.visited", { n: data.hitCount })}
        >
          ×{data.hitCount}
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className={`rounded bg-black/30 px-1.5 py-0.5 text-[10px] font-mono uppercase ${palette.text}`}>
          {typeLabel(data, t)}
        </span>
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-slate-100">{data.title}</div>
      {(data.subtitle || data.anchor) && (
        <div className="mt-0.5 truncate font-mono text-[10px] text-slate-400">
          {data.subtitle}
          {data.anchor && (
            <span className="ml-1 text-emerald-400">
              {data.isBlock ? "#^" : "#"}
              {data.anchor}
            </span>
          )}
        </div>
      )}
      {data.resultPreview && data.status === "ok" && (
        <div className="mt-1 line-clamp-2 text-[10px] italic leading-tight text-slate-400">
          {data.resultPreview.slice(0, 80)}
        </div>
      )}
    </div>
  );
}
