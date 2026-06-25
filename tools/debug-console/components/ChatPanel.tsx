"use client";
/**
 * 聊天面板主组件 — Editorial Terminal 风格
 * 处理：消息状态、SSE 流接收、tool-call 卡片状态机
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createParser, type EventSourceMessage } from "eventsource-parser";
import { MessageBubble, type UIMessage } from "./MessageBubble";
import type { ToolCallVizData } from "./ToolCallCard";
import type { WikiRef } from "@/lib/wiki-ref";
import type { FlowNodeData } from "@/lib/build-flow-graph";
import type { QueryMode } from "@/lib/default-system-prompt";
import { FlowGraph } from "./FlowGraph";
import { useT } from "@/lib/i18n-client";

interface Props {
  provider: string;
  model: string;
  system: string;
  toolBudget: number;
  mode: QueryMode;
  /** 要查询的 workspace（自动识别得来）；null = 让 web 用默认库 */
  workspace: string | null;
  onOpenRef: (ref: WikiRef) => void;
  onOpenNode: (node: FlowNodeData) => void;
}

type IncomingEvent =
  | { kind: "text-delta"; text: string }
  | { kind: "reasoning-delta"; text: string }
  | {
      kind: "tool-call";
      id: string;
      name: string;
      args: Record<string, unknown>;
      synthetic?: boolean;
    }
  | {
      kind: "tool-result";
      id: string;
      name: string;
      ok: boolean;
      data?: unknown;
      error?: string;
      duration_ms: number;
      synthetic?: boolean;
    }
  | { kind: "status"; text: string; level?: "info" | "warn" }
  | {
      kind: "turn-end";
      reason: string;
      usage?: { input_tokens?: number; output_tokens?: number };
      error_message?: string;
    }
  | { kind: "stream-end" }
  | { kind: "ref-validation"; broken: string[]; unread: string[]; downgraded?: string[] };

export function ChatPanel({
  provider,
  model,
  system,
  toolBudget,
  mode,
  workspace,
  onOpenRef,
  onOpenNode,
}: Props) {
  const t = useT();
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"chat" | "flow">("chat");
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  // 「黏底」状态：仅当用户已经在底部时，流式增量才自动滚到底；
  // 一旦用户往上滚查看历史，就停止自动滚动，避免被流式输出一直往下拽。
  const stickToBottomRef = useRef(true);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);

  const latestAssistant =
    [...messages].reverse().find((m) => m.role === "assistant") || null;
  const hasToolCalls =
    !!latestAssistant?.parts.some((p) => p.kind === "tool-call");
  const latestUser =
    [...messages].reverse().find((m) => m.role === "user") || null;
  const latestUserText =
    latestUser?.parts
      .filter((p) => p.kind === "text")
      .map((p) => (p as { text: string }).text)
      .join("") || null;

  // 流式增量到来时：只有「黏底」时才自动滚到底，否则保持用户当前阅读位置不动。
  useEffect(() => {
    if (!stickToBottomRef.current) return;
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight });
  }, [messages]);

  // 监听用户滚动：距底 < 80px 视为「在底部」→ 继续黏底；往上滚则脱离黏底并显示「回到最新」。
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom < 80;
    stickToBottomRef.current = atBottom;
    setShowJumpToBottom(!atBottom);
  }, []);

  const jumpToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // 瞬时滚到底（非 smooth）——避免滚动动画途中 onScroll 把按钮短暂闪回。
    el.scrollTo({ top: el.scrollHeight });
    stickToBottomRef.current = true;
    setShowJumpToBottom(false);
  }, []);

  const applyEvent = useCallback((assistantId: string, evt: IncomingEvent) => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === assistantId);
      if (idx < 0) return prev;
      const msg = { ...prev[idx], parts: [...prev[idx].parts] };

      if (evt.kind === "text-delta") {
        const last = msg.parts[msg.parts.length - 1];
        if (last && last.kind === "text") {
          msg.parts[msg.parts.length - 1] = { kind: "text", text: last.text + evt.text };
        } else {
          msg.parts.push({ kind: "text", text: evt.text });
        }
      } else if (evt.kind === "reasoning-delta") {
        // 推理增量：累积进同一个 reasoning part（与 text-delta 同构），
        // 渲染为可折叠的「思考过程」区块，与正文分开。
        const last = msg.parts[msg.parts.length - 1];
        if (last && last.kind === "reasoning") {
          msg.parts[msg.parts.length - 1] = { kind: "reasoning", text: last.text + evt.text };
        } else {
          msg.parts.push({ kind: "reasoning", text: evt.text });
        }
      } else if (evt.kind === "tool-call") {
        const call: ToolCallVizData = {
          id: evt.id,
          name: evt.name,
          args: evt.args,
          synthetic: evt.synthetic,
        };
        msg.parts.push({ kind: "tool-call", call });
      } else if (evt.kind === "tool-result") {
        for (let i = msg.parts.length - 1; i >= 0; i--) {
          const p = msg.parts[i];
          if (p.kind === "tool-call" && p.call.id === evt.id) {
            const newCall: ToolCallVizData = {
              ...p.call,
              name:
                p.call.name === "(cc-tool)" || p.call.name === "(codex-tool)"
                  ? evt.name || p.call.name
                  : p.call.name,
              result: {
                ok: evt.ok,
                data: evt.data,
                error: evt.error,
                duration_ms: evt.duration_ms,
              },
            };
            msg.parts[i] = { kind: "tool-call", call: newCall };
            break;
          }
        }
        if (!msg.parts.some((p) => p.kind === "tool-call" && p.call.id === evt.id)) {
          msg.parts.push({
            kind: "tool-call",
            call: {
              id: evt.id,
              name: evt.name,
              args: {},
              result: {
                ok: evt.ok,
                data: evt.data,
                error: evt.error,
                duration_ms: evt.duration_ms,
              },
            },
          });
        }
      } else if (evt.kind === "status") {
        msg.status = { text: evt.text, level: evt.level };
      } else if (evt.kind === "turn-end") {
        msg.end_reason = evt.reason;
        msg.end_error = evt.error_message;
        if (evt.reason === "stop") msg.status = undefined;
      } else if (evt.kind === "stream-end") {
        msg.streaming = false;
        msg.status = undefined;
      } else if (evt.kind === "ref-validation") {
        msg.refValidation = {
          broken: evt.broken,
          unread: evt.unread,
          downgraded: evt.downgraded ?? [],
        };
      }

      const next = [...prev];
      next[idx] = msg;
      return next;
    });
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;

    const userMsg: UIMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      parts: [{ kind: "text", text }],
    };
    const assistantId = `a-${Date.now()}`;
    const assistantMsg: UIMessage = {
      id: assistantId,
      role: "assistant",
      parts: [],
      streaming: true,
    };

    // 新一轮开始：用户主动发送，重新黏底，让本轮内容滚入视野。
    stickToBottomRef.current = true;
    setShowJumpToBottom(false);
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setBusy(true);

    const apiMessages = [
      ...messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role,
          text: m.parts
            .filter((p) => p.kind === "text")
            .map((p) => (p as { text: string }).text)
            .join(""),
        }))
        .filter((m) => m.text),
      { role: "user" as const, text },
    ];

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          model,
          system,
          messages: apiMessages,
          tool_budget: toolBudget,
          mode,
          workspace: workspace || undefined,
        }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "");
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: "error",
            parts: [
              {
                kind: "text",
                text: `HTTP ${res.status}: ${errText.slice(0, 300)}`,
              },
            ],
          },
        ]);
        return;
      }

      const parser = createParser({
        onEvent: (event: EventSourceMessage) => {
          if (!event.data) return;
          let parsed: IncomingEvent;
          try {
            parsed = JSON.parse(event.data) as IncomingEvent;
          } catch {
            return;
          }
          applyEvent(assistantId, parsed);
        },
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        parser.feed(decoder.decode(value, { stream: true }));
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "error",
          parts: [
            { kind: "text", text: e instanceof Error ? e.message : String(e) },
          ],
        },
      ]);
    } finally {
      setBusy(false);
      abortRef.current = null;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId && m.streaming ? { ...m, streaming: false } : m,
        ),
      );
    }
  }, [
    applyEvent,
    busy,
    input,
    messages,
    model,
    provider,
    system,
    toolBudget,
    mode,
    workspace,
  ]);

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      send();
    }
  };

  const abort = () => {
    abortRef.current?.abort();
    setBusy(false);
  };

  const userCount = messages.filter((m) => m.role === "user").length;

  return (
    <div className="flex h-full flex-col">
      {/* ─── 视图切换 tab：印刷感方块 ─── */}
      <div className="flex items-stretch border-b border-[var(--line)]">
        <button
          onClick={() => setView("chat")}
          className={`relative px-5 py-2.5 text-[11px] uppercase tracking-[0.16em] transition-colors ${
            view === "chat"
              ? "bg-[var(--paper)] text-[var(--ink)]"
              : "text-[var(--paper-dim)] hover:text-[var(--paper)]"
          }`}
        >
          <span className="font-mono">[01]</span>
          <span className="ml-2 font-semibold">{t("chat.tab_transcript")}</span>
        </button>
        <button
          onClick={() => setView("flow")}
          className={`relative px-5 py-2.5 text-[11px] uppercase tracking-[0.16em] transition-colors ${
            view === "flow"
              ? "bg-[var(--paper)] text-[var(--ink)]"
              : "text-[var(--paper-dim)] hover:text-[var(--paper)]"
          }`}
        >
          <span className="font-mono">[02]</span>
          <span className="ml-2 font-semibold">{t("chat.tab_graph")}</span>
          {hasToolCalls && view !== "flow" && (
            <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-[var(--amber)] align-middle shadow-[0_0_6px_var(--amber)]" />
          )}
        </button>
        <div className="ml-auto flex items-center gap-4 px-5 text-[10.5px] uppercase tracking-[0.18em] text-[var(--paper-mute)]">
          {view === "flow" ? (
            <span>
              {latestAssistant
                ? t("chat.lastturn", {
                    n: latestAssistant.parts.filter(
                      (p) => p.kind === "tool-call",
                    ).length,
                  })
                : t("chat.noturns")}
            </span>
          ) : (
            <span>{t("chat.turns", { n: userCount })}</span>
          )}
        </div>
      </div>

      {/* ─── 主区 ─── */}
      {view === "chat" ? (
        <div className="relative flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="h-full overflow-y-auto px-7 py-6"
          >
            {messages.length === 0 && <EmptyState />}
            {messages.map((m, idx) => (
              <MessageBubble
                key={m.id}
                msg={m}
                index={
                  m.role === "user"
                    ? messages
                        .slice(0, idx + 1)
                        .filter((x) => x.role === "user").length
                    : m.role === "assistant"
                      ? messages
                          .slice(0, idx + 1)
                          .filter((x) => x.role === "assistant").length
                      : 0
                }
                onOpenRef={onOpenRef}
              />
            ))}
          </div>
          {showJumpToBottom && (
            <button
              onClick={jumpToBottom}
              className="absolute bottom-4 right-6 z-10 border border-[var(--amber)]/60 bg-[var(--ink-2)]/90 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--amber)] shadow-lg backdrop-blur transition-colors hover:bg-[var(--amber)] hover:text-[var(--ink)]"
            >
              {t("chat.jump_to_latest")}
            </button>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          <FlowGraph
            message={latestAssistant}
            userQuery={latestUserText}
            onOpenRef={onOpenRef}
            onOpenNode={onOpenNode}
            streaming={!!latestAssistant?.streaming}
          />
        </div>
      )}

      {/* ─── 输入区 ─── */}
      <div className="border-t border-[var(--line)] bg-[var(--ink-2)]/40 px-7 py-4">
        <div className="flex items-start gap-3">
          <span className="mt-2 select-none font-mono text-[var(--amber)]">
            ›
          </span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder={t("chat.placeholder")}
            rows={3}
            className="k-input flex-1 resize-none border-none bg-transparent text-[13px] leading-relaxed text-[var(--paper)] placeholder-[var(--paper-mute)] focus:bg-transparent focus:ring-0"
            style={{ borderColor: "transparent" }}
            disabled={busy}
          />
        </div>
        <div className="mt-3 flex items-center gap-3 border-t border-dashed border-[var(--line)] pt-3">
          <button
            onClick={send}
            disabled={busy || !input.trim()}
            className="k-btn k-btn-primary"
          >
            {busy ? t("chat.thinking") : t("chat.dispatch")}
          </button>
          {busy && (
            <button onClick={abort} className="k-btn">
              {t("chat.abort")}
            </button>
          )}
          <span className="text-[10.5px] uppercase tracking-[0.18em] text-[var(--paper-mute)]">
            {t("chat.send_hint")}
          </span>
          <button
            onClick={() => setMessages([])}
            disabled={busy}
            className="ml-auto text-[10.5px] uppercase tracking-[0.18em] text-[var(--paper-mute)] hover:text-[var(--vermilion)] disabled:opacity-40"
          >
            {t("chat.clear")}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  const t = useT();
  const bootLines = [
    t("chat.boot1"),
    t("chat.boot2"),
    t("chat.boot3"),
    t("chat.boot4"),
  ];
  return (
    <div className="mx-auto mt-8 max-w-2xl">
      <div className="k-eyebrow mb-3">{t("chat.idle")}</div>
      <h2 className="k-display mb-8 text-5xl text-[var(--paper)]">
        {t("chat.empty_pre")}{" "}
        <span className="k-display-italic text-[var(--amber)]">
          {t("chat.empty_em")}
        </span>
        <br />
        {t("chat.empty_post")}
      </h2>

      <div className="mb-8 border border-[var(--line)] bg-[var(--ink-2)]/40 p-5">
        <div className="k-eyebrow mb-3">{t("chat.boot")}</div>
        <div className="space-y-1 font-mono text-[12px] leading-relaxed text-[var(--paper-dim)]">
          {bootLines.map((line, i) => (
            <div
              key={i}
              className="k-boot-line"
              style={{ animationDelay: `${0.15 + i * 0.35}s` }}
            >
              {line}
            </div>
          ))}
          <div>
            <span className="k-caret" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-[11px]">
        <Hint
          eyebrow={t("chat.hint_example")}
          title={t("chat.hint1_title")}
          body={t("chat.hint1_body")}
        />
        <Hint
          eyebrow={t("chat.hint_example")}
          title={t("chat.hint2_title")}
          body={t("chat.hint2_body")}
        />
        <Hint
          eyebrow={t("chat.hint_tip")}
          title={t("chat.hint3_title")}
          body={t("chat.hint3_body")}
        />
      </div>
    </div>
  );
}

function Hint({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="relative border border-[var(--line)] p-3">
      <span className="k-corner-tl" />
      <span className="k-corner-br" />
      <div className="k-eyebrow mb-1.5 text-[var(--amber)]">{eyebrow}</div>
      <div className="mb-2 font-mono text-[12px] text-[var(--paper)]">
        {title}
      </div>
      <div className="text-[10.5px] uppercase tracking-[0.12em] text-[var(--paper-mute)]">
        {body}
      </div>
    </div>
  );
}
