/**
 * POST /api/chat — SSE 流式对话端点
 *
 * 请求体：
 *   {
 *     provider: 'deepseek' | 'anthropic' | 'openai' | 'claude-code' | 'codex',
 *     model: string,
 *     system?: string,
 *     messages: ChatMessage[],   // 完整历史，包括最新的 user 消息
 *     tool_budget?: number,
 *   }
 *
 * 响应：text/event-stream，每行 `data: <AgentEvent json>\n\n`
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getProvider } from "@/lib/providers";
import type { ProviderId } from "@/lib/providers/types";
import { runAgent } from "@/lib/agent-loop";
import { sseLine } from "@/lib/sse";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/default-system-prompt";
import { executeTool } from "@/lib/kb-http-client";

/**
 * 预热：root_index 内存缓存（5 分钟 TTL）。
 * 每次 chat 都拉 KB HTTP 太费，但 5 分钟内反复问问题就能复用。
 * 用户改了 root_index 后最迟 5 分钟生效——可接受（root_index 改动很少）。
 */
const ROOT_INDEX_TTL_MS = 5 * 60 * 1000;
let rootIndexCache: { content: string; expiresAt: number } | null = null;

async function getRootIndexContent(): Promise<string> {
  const now = Date.now();
  if (rootIndexCache && rootIndexCache.expiresAt > now) {
    return rootIndexCache.content;
  }
  try {
    const r = await executeTool("read_page", { path: "wiki/root_index.md" });
    if (!r.ok || !r.data) return "";
    const d = r.data as { content?: string };
    const content = d.content || "";
    rootIndexCache = { content, expiresAt: now + ROOT_INDEX_TTL_MS };
    return content;
  } catch {
    return "";
  }
}

/** 在 system prompt 末尾 append root_index 全文，让 AI 不需要花一轮调 read_page 读它 */
function appendPrewarmedIndex(baseSystem: string, indexContent: string): string {
  if (!indexContent) return baseSystem;
  return (
    baseSystem +
    "\n\n---\n\n## 📚 已预加载：wiki/root_index.md 全文\n\n" +
    "下面是知识库一级领域索引的完整内容。**不要再调 `read_page` 读它**——直接基于这份索引决定下一步钻取哪个子 MOC / 具体页面。\n\n" +
    "```markdown\n" +
    indexContent +
    "\n```\n"
  );
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().optional(),
  tool_calls: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        args: z.record(z.unknown()),
      }),
    )
    .optional(),
  tool_results: z
    .array(
      z.object({
        id: z.string(),
        ok: z.boolean(),
        data: z.unknown().optional(),
        error: z.string().optional(),
      }),
    )
    .optional(),
});

const RequestSchema = z.object({
  provider: z.enum(["deepseek", "anthropic", "openai", "claude-code", "codex"]),
  model: z.string().min(1),
  system: z.string().optional(),
  messages: z.array(ChatMessageSchema).min(1).max(50),
  tool_budget: z.number().int().min(1).max(50).optional(),
  mode: z.enum(["quick", "audit", "explore", "devil"]).optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { provider: providerId, model, system, messages, tool_budget, mode } = parsed.data;
  const provider = getProvider(providerId as ProviderId);
  if (!provider) {
    return NextResponse.json({ error: "unknown_provider" }, { status: 400 });
  }
  if (!provider.isAvailable()) {
    return NextResponse.json(
      { error: "provider_unavailable", reason: provider.unavailableReason() },
      { status: 400 },
    );
  }

  // 客户端断开（关浏览器 / abort()）→ 触发 AbortController，
  // agent-loop / providers 监听后 kill subprocess、停止 fetch 流
  const abortController = new AbortController();
  // Next.js Route Handler 的 req.signal 在客户端断连时 fire abort
  req.signal.addEventListener("abort", () => abortController.abort(), { once: true });

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const safeEnqueue = (chunk: Uint8Array) => {
        if (closed) return;
        try {
          controller.enqueue(chunk);
        } catch {
          // controller 已关闭——忽略
          closed = true;
        }
      };
      try {
        const baseSystem = system || DEFAULT_SYSTEM_PROMPT;
        const indexContent = await getRootIndexContent();
        const augmentedSystem = appendPrewarmedIndex(baseSystem, indexContent);

        for await (const evt of runAgent({
          provider,
          model,
          system: augmentedSystem,
          messages,
          toolBudget: tool_budget,
          mode,
          signal: abortController.signal,
        })) {
          if (abortController.signal.aborted) break;
          safeEnqueue(sseLine(evt));
        }
        safeEnqueue(sseLine({ kind: "stream-end" }));
      } catch (e) {
        safeEnqueue(
          sseLine({
            kind: "turn-end",
            reason: "error",
            error_message: e instanceof Error ? e.message : String(e),
          }),
        );
      } finally {
        closed = true;
        try {
          controller.close();
        } catch {
          /* 已关闭 */
        }
      }
    },
    cancel() {
      // 客户端拉断 stream（fetch abort）→ 转发到 agent-loop
      abortController.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
