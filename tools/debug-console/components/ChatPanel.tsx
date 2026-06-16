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

interface Props {
  provider: string;
  model: string;
  system: string;
  toolBudget: number;
  mode: QueryMode;
  onOpenRef: (ref: WikiRef) => void;
  onOpenNode: (node: FlowNodeData) => void;
}

type IncomingEvent =
  | { kind: "text-delta"; text: string }
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

const BOOT_LINES = [
  "› init knowledge.console v0.3",
  "› mount markdown + git filesystem … ok",
  "› attach llm provider channel … ready",
  "› awaiting query.",
];

export function ChatPanel({
  provider,
  model,
  system,
  toolBudget,
  mode,
  onOpenRef,
  onOpenNode,
}: Props) {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"chat" | "flow">("chat");
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

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

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

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
          <span className="ml-2 font-semibold">transcript</span>
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
          <span className="ml-2 font-semibold">reasoning graph</span>
          {hasToolCalls && view !== "flow" && (
            <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-[var(--amber)] align-middle shadow-[0_0_6px_var(--amber)]" />
          )}
        </button>
        <div className="ml-auto flex items-center gap-4 px-5 text-[10.5px] uppercase tracking-[0.18em] text-[var(--paper-mute)]">
          {view === "flow" ? (
            <span>
              {latestAssistant
                ? `last turn · ${latestAssistant.parts.filter((p) => p.kind === "tool-call").length} tool calls`
                : "no turns yet"}
            </span>
          ) : (
            <span>turns · {userCount}</span>
          )}
        </div>
      </div>

      {/* ─── 主区 ─── */}
      {view === "chat" ? (
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-7 py-6"
          style={{ minHeight: 0 }}
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
            placeholder="ask the knowledge base anything…"
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
            {busy ? "▶ thinking" : "▶ dispatch"}
          </button>
          {busy && (
            <button onClick={abort} className="k-btn">
              ✕ abort
            </button>
          )}
          <span className="text-[10.5px] uppercase tracking-[0.18em] text-[var(--paper-mute)]">
            ⌘ + enter to send
          </span>
          <button
            onClick={() => setMessages([])}
            disabled={busy}
            className="ml-auto text-[10.5px] uppercase tracking-[0.18em] text-[var(--paper-mute)] hover:text-[var(--vermilion)] disabled:opacity-40"
          >
            clear log ⌫
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto mt-8 max-w-2xl">
      <div className="k-eyebrow mb-3">workbench · idle</div>
      <h2 className="k-display mb-8 text-5xl text-[var(--paper)]">
        ready to <span className="k-display-italic text-[var(--amber)]">interrogate</span>
        <br />
        the knowledge base.
      </h2>

      <div className="mb-8 border border-[var(--line)] bg-[var(--ink-2)]/40 p-5">
        <div className="k-eyebrow mb-3">boot sequence</div>
        <div className="space-y-1 font-mono text-[12px] leading-relaxed text-[var(--paper-dim)]">
          {BOOT_LINES.map((line, i) => (
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
          eyebrow="example"
          title="谁在做 TikTok Shop 跨境合规？"
          body="quick mode · 5–10 工具调用 · 单点事实查询"
        />
        <Hint
          eyebrow="example"
          title="对比 SHEIN 和 Temu 的获客策略"
          body="explore mode · BFS outlinks · 综合多个 source"
        />
        <Hint
          eyebrow="tip"
          title="点工具卡片 / 流程图节点"
          body="右侧分屏会展开该文件 / 段 / anchor 的实时内容"
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
