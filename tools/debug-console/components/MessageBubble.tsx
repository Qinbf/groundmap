"use client";
/**
 * 单条消息 — Editorial Terminal 卷帙轨道式（不用 bubble）
 *
 * - 左侧细 amber/paper 线 + 圆点 + 顶部编号标签 "// 01 · YOU" / "// 01 · KB"
 * - 流式时光标改 amber 方块
 * - 参考列表改印刷脚注 (numbered, mono, hairline rule)
 */
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ToolCallCard, type ToolCallVizData } from "./ToolCallCard";
import { useLocale, useT } from "@/lib/i18n-client";
import type { TranslationKey } from "@/lib/i18n";
import {
  collectRefs,
  downgradeRefAnchors,
  hrefToRef,
  inlineWikiRefsNumbered,
  neutralizeBrokenRefs,
  refDisplayText,
  refToHref,
  type WikiRef,
} from "@/lib/wiki-ref";

export type MessagePart =
  | { kind: "text"; text: string }
  | { kind: "reasoning"; text: string }
  | { kind: "tool-call"; call: ToolCallVizData };

export interface UIMessage {
  id: string;
  role: "user" | "assistant" | "system" | "error";
  parts: MessagePart[];
  streaming?: boolean;
  end_reason?: string;
  end_error?: string;
  status?: { text: string; level?: "info" | "warn" };
  /** ANSWER 后验验证结果 */
  refValidation?: {
    broken: string[];
    unread: string[];
    /** 锚点不支撑论断、已降级为整页链接的块级引用 key（path#anchor） */
    downgraded?: string[];
  };
}

const ROLE_LABEL_KEY: Record<UIMessage["role"], TranslationKey> = {
  user: "msg.role_user",
  assistant: "msg.role_assistant",
  system: "msg.role_system",
  error: "msg.role_error",
};

/**
 * 思考过程区块 — 推理模型（DeepSeek deepseek-v4 等）的 reasoning_content。
 * 默认展开（思考时让用户看到「在想」），可手动折叠；与正文 text 分开渲染。
 */
function ReasoningBlock({ text, live }: { text: string; live: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-3 max-w-[68ch] border-l-2 border-[var(--line)] pl-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.16em] text-[var(--paper-mute)] transition-colors hover:text-[var(--paper-dim)]"
      >
        {live ? (
          <span className="k-thinking">
            <span />
            <span />
            <span />
          </span>
        ) : (
          <span className="text-[var(--amber)]">💭</span>
        )}
        <span>{live ? t("msg.reasoning_live") : t("msg.reasoning_title")}</span>
        <span className="font-mono">{open ? "[−]" : "[+]"}</span>
      </button>
      {open && (
        <div className="mt-2 whitespace-pre-wrap text-[12px] italic leading-relaxed text-[var(--paper-mute)]">
          {text}
        </div>
      )}
    </div>
  );
}

export function MessageBubble({
  msg,
  index,
  onOpenRef,
}: {
  msg: UIMessage;
  index?: number;
  onOpenRef: (ref: WikiRef) => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const isUser = msg.role === "user";
  const isError = msg.role === "error";
  const isAssistant = msg.role === "assistant";

  // 后验判定"锚点不支撑论断"的块级引用 → 渲染前去掉假精度（剥成整页链接）
  const downgradedSet = useMemo(
    () => new Set(msg.refValidation?.downgraded ?? []),
    [msg.refValidation],
  );
  // 后验判定"当前库根本不存在"的引用 → 渲染前去链接化（杜绝点开即 404 的假来源）
  const brokenSet = useMemo(
    () => new Set(msg.refValidation?.broken ?? []),
    [msg.refValidation],
  );
  // 统一的渲染前清洗：先降级不支撑论断的锚点，再去链接化不存在的引用
  const cleanRefs = useMemo(
    () => (text: string) =>
      neutralizeBrokenRefs(
        downgradeRefAnchors(text, downgradedSet),
        brokenSet,
        locale,
      ),
    [downgradedSet, brokenSet, locale],
  );
  const numberedRefs = useMemo(() => {
    const texts = msg.parts
      .filter((p): p is { kind: "text"; text: string } => p.kind === "text")
      .map((p) => cleanRefs(p.text));
    return collectRefs(texts);
  }, [msg.parts, cleanRefs]);
  const refMap = useMemo(
    () => new Map(numberedRefs.map((r) => [r.key, r.n])),
    [numberedRefs],
  );

  const seq = String(index ?? 1).padStart(2, "0");

  return (
    <div className="k-spool" data-role={msg.role}>
      <span className="k-spool-dot" />

      {/* 角标 */}
      <div className="mb-2 flex items-baseline gap-3">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--paper-mute)]">
          //
        </span>
        <span
          className={`font-mono text-[10.5px] uppercase tracking-[0.2em] ${
            isUser
              ? "text-[var(--amber)]"
              : isError
                ? "text-[var(--vermilion)]"
                : "text-[var(--paper)]"
          }`}
        >
          {seq} · {t(ROLE_LABEL_KEY[msg.role])}
        </span>
        {msg.streaming && (
          <span className="ml-1 inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.16em] text-[var(--amber)]">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--amber)] shadow-[0_0_6px_var(--amber)]" />
            {t("msg.streaming")}
          </span>
        )}
      </div>

      {/* status 提示 */}
      {msg.status && msg.streaming && (
        <div
          className={`mb-3 flex items-center gap-2 border-l-2 pl-3 text-[11.5px] italic ${
            msg.status.level === "warn"
              ? "border-[var(--vermilion)] text-[var(--vermilion)]"
              : "border-[var(--amber)] text-[var(--paper-dim)]"
          }`}
        >
          <span className="k-thinking">
            <span />
            <span />
            <span />
          </span>
          <span>{msg.status.text}</span>
        </div>
      )}

      {/* 内容 */}
      {msg.parts.length === 0 && msg.streaming && !msg.status && (
        <span className="k-stream-caret" />
      )}

      {msg.parts.map((part, i) => {
        if (part.kind === "text") {
          return (
            <div
              key={i}
              className={`markdown-body mb-1 max-w-[68ch] whitespace-pre-wrap text-[13.5px] leading-relaxed ${
                isUser ? "text-[var(--paper)]" : isError ? "text-[var(--vermilion)]" : ""
              }`}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a({ href, children, ...rest }) {
                    const ref = href ? hrefToRef(href) : null;
                    if (ref) {
                      return (
                        <a
                          href={href}
                          onClick={(e) => {
                            e.preventDefault();
                            onOpenRef(ref);
                          }}
                          className="border border-[var(--line)] bg-[var(--amber-bg)] px-1 py-[1px] font-mono text-[11.5px] text-[var(--amber)] no-underline hover:bg-[var(--amber)] hover:text-[var(--ink)]"
                          title={`${ref.path}${ref.anchor ? (ref.isBlock ? "#^" : "#") + ref.anchor : ""}`}
                        >
                          {children}
                        </a>
                      );
                    }
                    return (
                      <a href={href} target="_blank" rel="noreferrer" {...rest}>
                        {children}
                      </a>
                    );
                  },
                }}
              >
                {inlineWikiRefsNumbered(cleanRefs(part.text), refMap)}
              </ReactMarkdown>
            </div>
          );
        }
        if (part.kind === "reasoning") {
          return (
            <ReasoningBlock
              key={i}
              text={part.text}
              live={!!msg.streaming && i === msg.parts.length - 1}
            />
          );
        }
        return <ToolCallCard key={part.call.id} call={part.call} />;
      })}

      {/* 流中尾随光标 */}
      {msg.streaming && msg.parts.length > 0 && (
        <span className="k-stream-caret" />
      )}

      {/* assistant 的参考列表（脚注样式） */}
      {isAssistant && numberedRefs.length > 0 && (
        <div className="mt-4 max-w-[68ch] border-t border-dashed border-[var(--line)] pt-3">
          <div className="k-eyebrow mb-2">{t("msg.refs", { n: numberedRefs.length })}</div>
          <ol className="space-y-1">
            {numberedRefs.map((r) => (
              <li
                key={r.key}
                className="flex items-baseline gap-2 font-mono text-[11px] text-[var(--paper-dim)]"
              >
                <span className="shrink-0 text-[var(--amber)]">
                  [{String(r.n).padStart(2, "0")}]
                </span>
                <a
                  href={refToHref(r.ref)}
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenRef(r.ref);
                  }}
                  className="truncate text-[var(--paper)] hover:text-[var(--amber)] hover:underline"
                  title={`${r.ref.path}${r.ref.anchor ? (r.ref.isBlock ? "#^" : "#") + r.ref.anchor : ""}`}
                >
                  {refDisplayText(r.ref)}
                </a>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ANSWER 后验：broken / unread 引用 */}
      {isAssistant && msg.refValidation && (
        <div className="mt-3 max-w-[68ch] space-y-2">
          {msg.refValidation.broken.length > 0 && (
            <div className="border border-[var(--vermilion)] bg-[var(--vermilion)]/10 p-2.5">
              <div className="k-eyebrow mb-1.5 text-[var(--vermilion)]">{t("msg.broken_refs", { n: msg.refValidation.broken.length })}</div>
              <div className="mb-1.5 text-[10.5px] text-[var(--paper-dim)]">
                {t("msg.broken_desc")}
              </div>
              <div className="space-y-1 font-mono text-[10.5px] text-[var(--paper-dim)]">
                {msg.refValidation.broken.map((p) => (
                  <div key={p} className="flex items-baseline gap-2">
                    <span className="text-[var(--vermilion)]">✗</span>
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {msg.refValidation.unread.length > 0 && (
            <div className="border border-[var(--amber)] bg-[var(--amber)]/10 p-2.5">
              <div className="k-eyebrow mb-1.5 text-[var(--amber)]">{t("msg.unverified_refs", { n: msg.refValidation.unread.length })}</div>
              <div className="space-y-1 font-mono text-[10.5px] text-[var(--paper-dim)]">
                {msg.refValidation.unread.map((p) => (
                  <div key={p} className="flex items-baseline gap-2">
                    <span className="text-[var(--amber)]">?</span>
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(msg.refValidation.downgraded?.length ?? 0) > 0 && (
            <div className="border border-[var(--amber)] bg-[var(--amber)]/10 p-2.5">
              <div className="k-eyebrow mb-1.5 text-[var(--amber)]">
                {t("msg.downgraded_refs", { n: msg.refValidation.downgraded!.length })}
              </div>
              <div className="mb-1.5 text-[10.5px] text-[var(--paper-dim)]">
                {t("msg.downgraded_desc")}
              </div>
              <div className="space-y-1 font-mono text-[10.5px] text-[var(--paper-dim)]">
                {msg.refValidation.downgraded!.map((k) => (
                  <div key={k} className="flex items-baseline gap-2">
                    <span className="text-[var(--amber)]">↓</span>
                    <span className="line-through">{k}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* turn 结束原因（非 stop）*/}
      {msg.end_reason && msg.end_reason !== "stop" && (
        <div className="mt-3 inline-flex items-center gap-2 border border-[var(--vermilion)] bg-[var(--vermilion)]/10 px-2.5 py-1 text-[10.5px] uppercase tracking-[0.16em] text-[var(--vermilion)]">
          <span>{t("msg.end", { reason: msg.end_reason })}</span>
          {msg.end_error && (
            <span className="normal-case tracking-normal text-[var(--paper-dim)]">
              — {msg.end_error}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
