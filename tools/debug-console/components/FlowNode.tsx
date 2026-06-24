"use client";
/**
 * 流程图节点卡片 — react-flow 的自定义 node
 *
 * 6 种 kind 渲染：
 *   query    紫色大卡片 + ▶ 标
 *   thought  紫粉小卡片 + 🧠 + TYPE/title（subtitle 截短）
 *   ghost    虚框灰色 + 🫥 候选未读
 *   file/search/list/other  按 type 着色的标准卡片
 */
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { FileType, FlowNodeData } from "@/lib/build-flow-graph";
import type { WikiRef } from "@/lib/wiki-ref";
import { parseWikiRef } from "@/lib/wiki-ref";
import { useT } from "@/lib/i18n-client";
import type { TranslationKey } from "@/lib/i18n";

/** 译函数类型（useT() 的返回） —— 透传给本文件的纯函数 render 辅助 */
type TFn = (key: TranslationKey, vars?: Record<string, string | number>) => string;

/** 文件类型 → 译表 key；unknown 无对应展示词，回退到 flow.type_file */
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

// 统一 handle 策略：完全不可见（透明 + 无 border + 无 shadow），位置精确贴在节点 box 边缘。
// react-flow 的 edge path 用 handle 中心点作为端点，handle 中心在 box 边缘上 →
// path 终点 = 卡片边缘，看起来就是"直接连接到卡片"。
// Handle 视觉点不存在了，也就不存在"dot 飘在错位的地方"的问题。
const HANDLE_CLS =
  "!h-3 !w-3 !rounded-none !border-0 !bg-transparent !shadow-none !opacity-0";
const HANDLE_CLS_AMBER = HANDLE_CLS;
const HANDLE_CLS_VERMILION = HANDLE_CLS;
const LEFT_STYLE = { left: 0 } as const;
const RIGHT_STYLE = { right: 0 } as const;

// 所有节点背景完全不透明 —— 否则 react-flow 的 edge path 会透过节点显示，
// 看起来像虚线"穿进卡片"。颜色用 -950 深一档保持暗色质感。
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

const QUERY_STYLE = {
  bg: "bg-indigo-950",
  border: "border-indigo-300",
  text: "text-indigo-100",
};

/* ─── 左上角类型标识映射 ─── */
function badgeGlyph(data: FlowNodeData): string {
  if (data.kind === "file") {
    const map: Record<FileType, string> = {
      concept: "C",
      analysis: "A",
      source: "S",
      entity: "E",
      index: "I",
      raw: "R",
      thoughts: "T",
      unknown: "?",
    };
    return map[data.fileType] || "?";
  }
  if (data.kind === "search") return "F";
  if (data.kind === "list") return "L";
  if (data.kind === "query") return "Q";
  if (data.kind === "thought") return data.thoughtType?.charAt(0).toUpperCase() || "?";
  if (data.kind === "ghost") return "G";
  if (data.kind === "result") return "A";
  if (data.kind === "warning") return "W";
  // other / 兜底：用 toolName 首字母（backlinks→B, outlinks→O, bash→B...）
  if (data.toolName) {
    const first = data.toolName.charAt(0).toUpperCase();
    if (/[A-Z]/.test(first)) return first;
  }
  // 再尝试 title 首字母
  const t = data.title?.charAt(0).toUpperCase();
  if (/[A-Z]/.test(t)) return t;
  return "?";
}

/** 卡片内部的类型标签（取代 FILE_COLOR.unknown 的 "?"） */
function typeLabel(data: FlowNodeData, t: TFn): string {
  if (data.kind === "file") {
    const key = FILE_TYPE_KEY[data.fileType];
    return key ? t(key) : t("flow.type_file");
  }
  if (data.kind === "search") return t("flow.type_search");
  if (data.kind === "list") return t("flow.type_list");
  if (data.kind === "other" && data.toolName) {
    // 工具名是机器标识符（snake_case），不翻译；只做可读化
    const name = data.toolName;
    if (name.startsWith("list_")) return name.replace("list_", "");
    return name;
  }
  return data.kind;
}

function badgeTooltip(data: FlowNodeData): string {
  if (data.kind === "file") return `file type: ${data.fileType}`;
  if (data.kind === "search") return "search";
  if (data.kind === "list") return "list";
  if (data.toolName) return `tool: ${data.toolName}`;
  return data.kind;
}

interface FlowNodeProps extends NodeProps {
  data: FlowNodeData & {
    onOpenRef?: (ref: WikiRef) => void;
    isLatestActive?: boolean;
  };
}

export function FlowNode({ data }: FlowNodeProps) {
  const t = useT();
  // hover / click 由 ReactFlow 顶层的 onNodeMouseEnter / onNodeClick 统一处理（更可靠）
  const clickable = !!data.path && data.kind !== "query" && data.kind !== "thought";

  if (data.kind === "query") return renderQuery(data, t);
  if (data.kind === "thought") return renderThought(data, t);
  if (data.kind === "ghost") return renderGhost(data, clickable, t);
  if (data.kind === "result") return renderResult(data, t);
  if (data.kind === "warning") return renderWarning(data, t);
  return renderTool(data, clickable, t);
}

// ─── Warning 节点（AI 提前结束 / 流中断）───
function renderWarning(data: FlowNodeData, t: TFn) {
  return (
    <div
      className="node-enter relative w-[260px] cursor-pointer rounded-lg border-2 border-dashed border-red-500 bg-red-950 px-3 py-2 transition-all hover:brightness-125"
      title={t("flow.warn_tip")}
      style={{ minHeight: 80 }}
    >
      <Handle type="target" position={Position.Left} className={HANDLE_CLS_VERMILION} style={LEFT_STYLE} />
      <div className="absolute -left-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-900 text-sm ring-2 ring-red-400/70">
        ⚠
      </div>
      <div className="mb-1 flex items-center gap-2">
        <span className="rounded bg-red-700 px-1.5 py-0.5 text-[10px] font-mono uppercase text-red-100">
          {t("flow.incomplete")}
        </span>
        <span className="text-sm font-bold text-red-100">{data.title}</span>
      </div>
      <div className="text-[11px] text-red-200">{data.subtitle}</div>
      <div className="mt-1 text-[10px] italic text-red-300/70">{t("flow.warn_hint")}</div>
    </div>
  );
}

// ─── Result 节点（最终输出，金黄大卡片）───
function renderResult(data: FlowNodeData, t: TFn) {
  return (
    <div
      className="node-enter relative w-[360px] cursor-pointer rounded-xl border-2 border-yellow-400 bg-gradient-to-br from-yellow-950 to-amber-950 px-4 py-3 transition-all hover:brightness-125"
      title={t("flow.answer_tip")}
      style={{ minHeight: 150 }}
    >
      <Handle type="target" position={Position.Left} className={HANDLE_CLS_AMBER} style={LEFT_STYLE} />
      {/* 左上勋章 */}
      <div className="absolute -left-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-yellow-900 text-base ring-2 ring-yellow-400/60">
        ✨
      </div>
      <div className="mb-1 flex items-center gap-2">
        <span className="rounded bg-yellow-700 px-2 py-0.5 text-[10px] font-mono uppercase text-yellow-100">
          {t("flow.answer")}
        </span>
        <span className="text-sm font-bold text-yellow-100">{data.title}</span>
      </div>
      {data.subtitle && (
        <div className="mb-1 text-xs text-yellow-200/80">{data.subtitle}</div>
      )}
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
function renderQuery(data: FlowNodeData, t: TFn) {
  return (
    <div
      className={`node-enter relative w-72 rounded-xl border-2 px-4 py-3 ${QUERY_STYLE.bg} ${QUERY_STYLE.border} ${QUERY_STYLE.text}`}
    >
      <Handle type="source" position={Position.Right} className={HANDLE_CLS_AMBER} style={RIGHT_STYLE} />
      <div className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-900 text-xs font-bold text-indigo-200 ring-2 ring-indigo-400/60">
        ▶
      </div>
      <div className="mb-1 text-[10px] uppercase tracking-wider opacity-70">{t("flow.query_label")}</div>
      <div className="line-clamp-3 text-sm leading-snug">{data.subtitle || data.title}</div>
    </div>
  );
}

// ─── Thought 小节点（思考步骤）───
function renderThought(data: FlowNodeData, t: TFn) {
  const palette = THOUGHT_COLOR[data.thoughtType || ""] || { bg: "bg-purple-950", border: "border-purple-400" };
  return (
    <div
      className={`node-enter relative w-52 rounded-md border px-2.5 py-1.5 ${palette.bg} ${palette.border} cursor-pointer transition-all hover:brightness-125`}
      title={data.subtitle}
    >
      <Handle type="target" position={Position.Left} className={HANDLE_CLS} style={LEFT_STYLE} />
      <Handle type="source" position={Position.Right} className={HANDLE_CLS} style={RIGHT_STYLE} />
      <div className="flex items-center gap-1.5">
        <span className="text-[10px]">🧠</span>
        <span className="font-mono text-[10px] font-bold uppercase text-slate-100">
          {data.thoughtType || t("flow.thought_fallback")}
        </span>
      </div>
      <div className="mt-0.5 line-clamp-2 text-[11px] leading-tight text-slate-200">
        {data.subtitle}
      </div>
    </div>
  );
}

// ─── Ghost 节点（候选未读）───
function renderGhost(data: FlowNodeData, clickable: boolean, t: TFn) {
  const palette = FILE_COLOR[data.fileType] || FILE_COLOR.unknown;
  const typeKey = FILE_TYPE_KEY[data.fileType];
  // ghost 节点："AI 提到但没读"——用 ink-2 不透明底 + 灰色边表达淡感（不再用 opacity-60，
  // 否则 path 会透过节点显示）
  return (
    <div
      title={data.path}
      className={`node-enter relative w-56 rounded-lg border border-dashed border-slate-600 bg-[var(--ink-2)] px-3 py-2 ${clickable ? "cursor-pointer hover:border-slate-400 hover:brightness-125" : "cursor-default"}`}
    >
      <Handle type="target" position={Position.Left} className={HANDLE_CLS} style={LEFT_STYLE} />
      <div className="absolute -right-2 -top-2 flex h-5 items-center rounded-full bg-slate-700 px-1.5 text-[9px] text-slate-300 ring-1 ring-slate-500">
        {t("flow.ghost_unread")}
      </div>
      <div className="flex items-center gap-1">
        <span className={`rounded px-1 py-0.5 text-[9px] font-mono uppercase ${palette.text}`}>
          {typeKey ? t(typeKey) : palette.label}
        </span>
      </div>
      <div className="mt-0.5 truncate text-xs font-medium text-slate-200">{data.title}</div>
      {data.subtitle && (
        <div className="truncate font-mono text-[9px] text-slate-500">{data.subtitle}</div>
      )}
    </div>
  );
}

// ─── 标准 file/search/list/other 节点 ───
function renderTool(data: FlowNodeData, clickable: boolean, t: TFn) {
  const palette = FILE_COLOR[data.fileType] || FILE_COLOR.unknown;
  const pending = data.status === "pending";
  const statusClass = pending
    ? "ring-2 ring-yellow-400/70 animate-pulse-ring node-shimmer"
    : data.status === "error"
      ? "border-dashed !border-red-500"
      : "";
  const activeGlow = (data as FlowNodeData & { isLatestActive?: boolean }).isLatestActive
    ? "node-active-glow ring-2 ring-cyan-400/60"
    : "";
  // synthetic 节点（mode 自动增强）—— 橙色虚线边 + 紧凑尺寸
  const syntheticClass = data.synthetic
    ? "!border-orange-500 border-dashed"
    : "";
  const compact = !!data.synthetic;
  const sizeClass = compact ? "w-[168px] px-2 py-1" : "w-60 px-3 py-2";

  return (
    <div
      title={data.path || data.title}
      className={`node-enter relative rounded-lg border-2 ${sizeClass} ${palette.bg} ${palette.border} ${statusClass} ${activeGlow} ${syntheticClass} ${clickable ? "cursor-pointer hover:brightness-125" : "cursor-default"} transition-all`}
      style={{ minHeight: compact ? 56 : 88 }}
    >
      {/* 正在工作的 spinner 角标 */}
      {pending && (
        <div
          className="absolute right-1.5 top-1.5 z-10"
          title={t("flow.running")}
        >
          <div className="spinner-ring" />
        </div>
      )}
      {/* synthetic "强制" badge：右上角橙色小标 */}
      {data.synthetic && !pending && (
        <div
          className="absolute -right-1 -top-2 rounded-full bg-orange-600 px-1.5 py-0.5 text-[9px] font-bold text-orange-100 ring-1 ring-orange-400"
          title={t("flow.synthetic_tip")}
        >
          {t("flow.forced")}
        </div>
      )}
      <Handle type="target" position={Position.Left} className={HANDLE_CLS} style={LEFT_STYLE} />
      <Handle type="source" position={Position.Right} className={HANDLE_CLS} style={RIGHT_STYLE} />

      {/* 左上角：步骤编号 */}
      <div
        className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--ink)] text-[10px] font-bold text-[var(--paper)] ring-2 ring-[var(--line-2)]"
      >
        {data.order}
      </div>
      {data.hitCount > 1 && (
        <div
          className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--amber)] px-1 text-[10px] font-bold text-[var(--ink)]"
          title={t("flow.visited", { n: data.hitCount })}
        >
          ×{data.hitCount}
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-mono uppercase ${palette.text} bg-black/30`}>
          {typeLabel(data, t)}
        </span>
      </div>

      <div className={`mt-1 truncate font-semibold text-slate-100 ${compact ? "text-xs" : "text-sm"}`}>{data.title}</div>
      {!compact && (data.subtitle || data.anchor) && (
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
      {!compact && data.resultPreview && data.status === "ok" && (
        <div className="mt-1 line-clamp-2 text-[10px] italic leading-tight text-slate-400">
          {data.resultPreview.slice(0, 80)}
        </div>
      )}
    </div>
  );
}
