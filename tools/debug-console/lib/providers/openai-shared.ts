/**
 * OpenAI 兼容协议的共享工具 —— DeepSeek / OpenAI / Moonshot / Qwen 等都用这套
 *
 * 关键：把统一的 ChatMessage[] 转成 OpenAI ChatCompletionMessageParam[]，
 * 然后用 streaming + function calling 流式拉事件。
 */
import type OpenAI from "openai";
import type {
  ChatMessage,
  AgentEvent,
  TurnInput,
} from "./types";

type OpenAIMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;
type OpenAITool = OpenAI.Chat.Completions.ChatCompletionTool;

/**
 * 把 ChatMessage[] 转 OpenAI 格式。
 * assistant 的 tool_calls 用 OpenAI tool_calls 数组；
 * user 的 tool_results 拆成多条 role=tool 的消息（OpenAI 风格）。
 */
export function toOpenAIMessages(system: string, messages: ChatMessage[]): OpenAIMessage[] {
  const out: OpenAIMessage[] = [];
  if (system) out.push({ role: "system", content: system });

  for (const m of messages) {
    if (m.role === "user") {
      // user 消息要么是普通文本，要么是上一轮 tool_calls 的结果
      if (m.tool_results && m.tool_results.length > 0) {
        for (const tr of m.tool_results) {
          out.push({
            role: "tool",
            tool_call_id: tr.id,
            content: JSON.stringify(tr.ok ? { ok: true, data: tr.data } : { ok: false, error: tr.error }),
          });
        }
      }
      if (m.text) {
        out.push({ role: "user", content: m.text });
      }
    } else {
      // assistant
      const msg: OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam = {
        role: "assistant",
      };
      if (m.text) msg.content = m.text;
      if (m.tool_calls && m.tool_calls.length > 0) {
        msg.tool_calls = m.tool_calls.map((tc) => ({
          id: tc.id,
          type: "function" as const,
          function: { name: tc.name, arguments: JSON.stringify(tc.args) },
        }));
      }
      out.push(msg);
    }
  }
  return out;
}

/**
 * 流式调用 OpenAI 兼容 chat.completions，把 delta 翻成 AgentEvent。
 *
 * OpenAI 流式 tool_calls 比较复杂：name / arguments 在 delta 中是「分片拼接」的，
 * 需要按 tool_call.index 累积，到 finish_reason 时才完成。
 */
export async function* streamOpenAI(
  client: OpenAI,
  input: TurnInput,
  tools: OpenAITool[],
  /** provider 专有的额外 body 字段（如 DeepSeek 的 thinking 开关）。
   *  只由对应 provider 传入，避免污染走同一函数的其他 provider。 */
  extra?: Record<string, unknown>,
): AsyncIterable<AgentEvent> {
  const messages = toOpenAIMessages(input.system, input.messages);

  let stream;
  try {
    stream = await client.chat.completions.create({
      model: input.model,
      messages,
      tools,
      tool_choice: "auto",
      stream: true,
      ...(extra ?? {}),
    } as OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming &
      Record<string, unknown>);
  } catch (e) {
    yield {
      kind: "turn-end",
      reason: "error",
      error_message: e instanceof Error ? e.message : String(e),
    };
    return;
  }

  // index → 累积中的 tool_call
  const toolCalls = new Map<
    number,
    { id?: string; name?: string; argsText: string }
  >();
  let finishReason: string | undefined;
  let usage: { input_tokens?: number; output_tokens?: number } | undefined;

  try {
    for await (const chunk of stream) {
      const choice = chunk.choices?.[0];
      if (!choice) continue;
      const delta = choice.delta;
      // 推理模型（DeepSeek deepseek-v4 / OpenAI o 系等）把思维链放在 reasoning_content，
      // 它先于 content 流式到达。单独 emit 为 reasoning-delta，让前端实时展示「思考过程」，
      // 不混进正文 text-delta（也就不会进 agent-loop 的 ANSWER 累积与回传历史）。
      const reasoning = (delta as { reasoning_content?: string } | undefined)
        ?.reasoning_content;
      if (reasoning) {
        yield { kind: "reasoning-delta", text: reasoning };
      }
      if (delta?.content) {
        yield { kind: "text-delta", text: delta.content };
      }
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index;
          if (typeof idx !== "number") continue;
          let acc = toolCalls.get(idx);
          if (!acc) {
            acc = { argsText: "" };
            toolCalls.set(idx, acc);
          }
          if (tc.id) acc.id = tc.id;
          if (tc.function?.name) acc.name = tc.function.name;
          if (tc.function?.arguments) acc.argsText += tc.function.arguments;
        }
      }
      if (choice.finish_reason) {
        finishReason = choice.finish_reason;
      }
      if (chunk.usage) {
        usage = {
          input_tokens: chunk.usage.prompt_tokens,
          output_tokens: chunk.usage.completion_tokens,
        };
        // DeepSeek（及兼容实现）会在 usage 里回 prompt_cache_hit_tokens /
        // prompt_cache_miss_tokens —— 服务端自动前缀缓存的命中情况。
        // 系统 prompt + 工具 schema + 预热的 root_index 构成稳定前缀，agent-loop 只
        // **追加** messages（turn N 是 N+1 的严格前缀），故第 2 轮起应大比例命中、prefill 几乎免费。
        // 这里只做一行诊断日志（零质量影响），便于确认「prefill 是否还有提速空间」。
        const cu = chunk.usage as unknown as {
          prompt_cache_hit_tokens?: number;
          prompt_cache_miss_tokens?: number;
        };
        if (
          typeof cu.prompt_cache_hit_tokens === "number" ||
          typeof cu.prompt_cache_miss_tokens === "number"
        ) {
          // eslint-disable-next-line no-console
          console.log(
            `[prefix-cache] model=${input.model} hit=${cu.prompt_cache_hit_tokens ?? 0} miss=${cu.prompt_cache_miss_tokens ?? 0} in=${chunk.usage.prompt_tokens ?? 0} out=${chunk.usage.completion_tokens ?? 0}`,
          );
        }
      }
    }
  } catch (e) {
    yield {
      kind: "turn-end",
      reason: "error",
      error_message: e instanceof Error ? e.message : String(e),
    };
    return;
  }

  // 流结束 → 把累积的 tool_calls emit 出去
  for (const [idx, acc] of [...toolCalls.entries()].sort((a, b) => a[0] - b[0])) {
    if (!acc.id || !acc.name) continue;
    let args: Record<string, unknown> = {};
    try {
      args = acc.argsText ? JSON.parse(acc.argsText) : {};
    } catch {
      // 模型给的 args 可能不是有效 JSON——保留 raw 字符串供 trace 看到
      args = { __raw: acc.argsText };
    }
    yield { kind: "tool-call", id: acc.id, name: acc.name, args };
  }

  const reason: "tool_use" | "length" | "stop" =
    finishReason === "tool_calls"
      ? "tool_use"
      : finishReason === "length"
        ? "length"
        : "stop";
  yield { kind: "turn-end", reason, usage };
}
