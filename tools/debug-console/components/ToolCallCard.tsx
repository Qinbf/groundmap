"use client";
/**
 * 工具调用卡片 — Editorial Terminal 风格
 *
 * 折叠态：印章 chip 行（状态 · 工具名 · 关键参数 · 耗时 · 展开符）
 * 展开态：参数表（key/value 双列）+ 结果（按数据形态：字符串预览 / 表格 / json 折叠）
 */
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useT } from "@/lib/i18n-client";

export interface ToolCallVizData {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: {
    ok: boolean;
    data?: unknown;
    error?: string;
    duration_ms: number;
  };
  synthetic?: boolean;
}

function kbApiBase(): string {
  if (typeof window !== "undefined") {
    return (
      (window as { KB_API_BASE?: string }).KB_API_BASE ||
      "http://localhost:3006"
    );
  }
  return "http://localhost:3006";
}

function summaryForArgs(args: Record<string, unknown>): string {
  if (typeof args.path === "string") {
    const anchor = typeof args.anchor === "string" ? `#${args.anchor}` : "";
    return `${args.path}${anchor}`;
  }
  if (typeof args.query === "string") return `"${args.query}"`;
  if (typeof args.snippet === "string")
    return `"${args.snippet.slice(0, 40)}..."`;
  return JSON.stringify(args).slice(0, 60);
}

function openInAdmin(args: Record<string, unknown>): string | null {
  const p = typeof args.path === "string" ? args.path : null;
  if (!p) return null;
  const cleanPath = p.replace(/\.md$/, "");
  return `${kbApiBase()}/page/${cleanPath}`;
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function formatResult(
  result: ToolCallVizData["result"],
  failLabel: string,
  emptyLabel: string,
): string {
  if (!result) return "";
  if (!result.ok) return result.error || failLabel;
  if (result.data === undefined || result.data === null) return emptyLabel;
  if (typeof result.data === "string") return result.data;
  try {
    return JSON.stringify(result.data, null, 2);
  } catch {
    return String(result.data);
  }
}

export function ToolCallCard({ call }: { call: ToolCallVizData }) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const [rawView, setRawView] = useState(false);
  const summary = summaryForArgs(call.args);
  const adminLink = openInAdmin(call.args);
  const result = call.result;
  const pending = !result;
  const ok = result?.ok ?? null;

  // read_page / read_section / read_block 的返回里带 markdown 正文（content 字段）——
  // 渲染成 markdown 效果，而不是把整坨 JSON 塞进 <pre>。结构化工具（search / outline /
  // backlinks…）没有 content、继续看原始 JSON。可用 raw/rendered 开关切回 JSON 调试。
  const mdContent =
    result?.ok &&
    result.data &&
    typeof result.data === "object" &&
    typeof (result.data as { content?: unknown }).content === "string"
      ? (result.data as { content: string }).content
      : null;

  const status = pending
    ? { label: t("tool.pending"), color: "var(--amber)" }
    : ok
      ? { label: t("tool.ok"), color: "var(--emerald)" }
      : { label: t("tool.fail"), color: "var(--vermilion)" };

  const argEntries = Object.entries(call.args);

  return (
    <div
      className={`relative my-3 max-w-[68ch] border bg-[var(--ink-2)]/60 ${
        pending
          ? "border-[var(--amber)] shadow-[0_0_0_1px_rgba(255,179,71,0.15)]"
          : ok
            ? "border-[var(--line)]"
            : "border-[var(--vermilion)]"
      } ${call.synthetic ? "border-dashed" : ""}`}
    >
      <span className="k-corner-tl" />
      <span className="k-corner-br" />

      {/* 折叠态 chip 行 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="group flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[var(--ink-3)]/60"
      >
        {/* 状态印章 */}
        <span
          className="k-stamp-solid shrink-0"
          style={{
            background: status.color,
            color: "var(--ink)",
          }}
        >
          {pending && (
            <span className="mr-0.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--ink)]" />
          )}
          {status.label}
        </span>

        {/* synthetic 标识 */}
        {call.synthetic && (
          <span
            className="k-stamp shrink-0 text-[var(--vermilion)]"
            title={t("tool.synthetic_tip")}
          >
            {t("tool.forced")}
          </span>
        )}

        {/* tool name */}
        <span className="shrink-0 font-mono text-[12px] font-semibold text-[var(--paper)]">
          {call.name}
        </span>

        {/* 关键参数 */}
        <span className="truncate font-mono text-[11.5px] text-[var(--paper-dim)]">
          {summary}
        </span>

        {/* 耗时 + 展开符 */}
        <span className="ml-auto flex shrink-0 items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--paper-mute)]">
          {result && <span>{result.duration_ms}ms</span>}
          <span className="text-[var(--amber)] transition-transform group-hover:translate-x-0.5">
            {expanded ? "▼" : "▸"}
          </span>
        </span>
      </button>

      {/* 展开态 */}
      {expanded && (
        <div className="border-t border-[var(--line)] px-4 py-3">
          {/* 参数表 */}
          <div className="mb-4">
            <div className="k-eyebrow mb-2 flex items-center justify-between">
              <span>{t("tool.args", { n: argEntries.length })}</span>
              {adminLink && (
                <a
                  href={adminLink}
                  target="_blank"
                  rel="noreferrer"
                  className="normal-case tracking-normal text-[var(--amber)] hover:underline"
                >
                  {t("tool.open_admin")}
                </a>
              )}
            </div>
            {argEntries.length === 0 ? (
              <div className="font-mono text-[11px] text-[var(--paper-mute)]">
                {t("tool.no_args")}
              </div>
            ) : (
              <dl className="k-kv">
                {argEntries.map(([k, v]) => (
                  <ArgRow key={k} k={k} v={v} />
                ))}
              </dl>
            )}
          </div>

          {/* 结果 */}
          <div>
            <div className="k-eyebrow mb-2 flex items-center gap-2">
              <span>{t("tool.result")}</span>
              <span
                className="k-stamp text-[var(--paper-mute)]"
                style={{ color: status.color, borderColor: status.color }}
              >
                {pending
                  ? t("tool.calling")
                  : ok
                    ? t("tool.result_ok")
                    : t("tool.failed")}
              </span>
              {mdContent && !pending && (
                <button
                  onClick={() => setRawView((v) => !v)}
                  className="ml-auto normal-case tracking-normal text-[var(--amber)] hover:underline"
                  title={t("tool.raw_toggle_tip")}
                >
                  {rawView ? t("tool.rendered") : t("tool.raw_json")}
                </button>
              )}
            </div>
            {mdContent && !rawView && !pending ? (
              <div className="markdown-body max-h-[400px] overflow-auto border border-[var(--line)] bg-[var(--ink)] p-3 text-[12.5px] leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{mdContent}</ReactMarkdown>
              </div>
            ) : (
              <pre className="max-h-[400px] overflow-auto whitespace-pre-wrap break-words border border-[var(--line)] bg-[var(--ink)] p-3 font-mono text-[11.5px] leading-relaxed text-[var(--paper)]">
                {pending
                  ? "…"
                  : formatResult(result, t("tool.call_failed"), t("tool.empty"))}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ArgRow({ k, v }: { k: string; v: unknown }) {
  const str = formatValue(v);
  const isMultiline = str.includes("\n") || str.length > 70;
  return (
    <>
      <dt>{k}</dt>
      <dd>
        {isMultiline ? (
          <pre className="overflow-x-auto whitespace-pre-wrap border border-[var(--line)] bg-[var(--ink)] p-2 text-[11px] leading-relaxed">
            {str}
          </pre>
        ) : (
          <span className="font-mono">{str}</span>
        )}
      </dd>
    </>
  );
}
