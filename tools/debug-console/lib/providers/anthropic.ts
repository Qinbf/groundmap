/**
 * Anthropic Claude provider — native tool use 流式 API
 */
import Anthropic from "@anthropic-ai/sdk";
import type { Provider, TurnInput, AgentEvent, ChatMessage } from "./types";
import { getAnthropicTools } from "../kb-tools";

type AnthropicMessage = Anthropic.MessageParam;

function toAnthropicMessages(messages: ChatMessage[]): AnthropicMessage[] {
  const out: AnthropicMessage[] = [];
  for (const m of messages) {
    if (m.role === "user") {
      const content: Array<
        Anthropic.TextBlockParam | Anthropic.ToolUseBlockParam | Anthropic.ToolResultBlockParam
      > = [];
      if (m.tool_results && m.tool_results.length > 0) {
        for (const tr of m.tool_results) {
          content.push({
            type: "tool_result",
            tool_use_id: tr.id,
            content: JSON.stringify(
              tr.ok ? { ok: true, data: tr.data } : { ok: false, error: tr.error },
            ),
            is_error: !tr.ok,
          });
        }
      }
      if (m.text) {
        content.push({ type: "text", text: m.text });
      }
      if (content.length === 0) continue;
      out.push({ role: "user", content });
    } else {
      const content: Array<
        Anthropic.TextBlockParam | Anthropic.ToolUseBlockParam | Anthropic.ToolResultBlockParam
      > = [];
      if (m.text) content.push({ type: "text", text: m.text });
      if (m.tool_calls) {
        for (const tc of m.tool_calls) {
          content.push({ type: "tool_use", id: tc.id, name: tc.name, input: tc.args });
        }
      }
      if (content.length === 0) continue;
      out.push({ role: "assistant", content });
    }
  }
  return out;
}

export class AnthropicProvider implements Provider {
  readonly id = "anthropic" as const;
  readonly name = "Anthropic Claude";
  readonly is_agent = false;

  isAvailable(): boolean {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  unavailableReason() {
    return this.isAvailable() ? undefined : "需在 .env 配置 ANTHROPIC_API_KEY";
  }

  listModels() {
    return [
      "claude-opus-4-7",
      "claude-sonnet-4-6",
      "claude-haiku-4-5-20251001",
    ];
  }

  async *runTurn(input: TurnInput): AsyncIterable<AgentEvent> {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const tools = getAnthropicTools();
    const messages = toAnthropicMessages(input.messages);

    let stream;
    try {
      stream = client.messages.stream({
        model: input.model,
        max_tokens: 8192,
        system: input.system,
        messages,
        tools: tools as Anthropic.Tool[],
      });
    } catch (e) {
      yield {
        kind: "turn-end",
        reason: "error",
        error_message: e instanceof Error ? e.message : String(e),
      };
      return;
    }

    // Anthropic 流式有 content_block_start/delta/stop + message_stop
    // 我们关注：text_delta（拼接 text-delta 事件）+ input_json_delta（拼接 tool_use input）
    // tool_use 的最终 input 在 content_block_stop 时已完整
    const toolUses = new Map<number, { id: string; name: string; inputText: string }>();
    let stopReason: string | undefined;
    let usage: { input_tokens?: number; output_tokens?: number } | undefined;

    try {
      for await (const event of stream) {
        if (event.type === "content_block_start") {
          const block = event.content_block;
          if (block.type === "tool_use") {
            toolUses.set(event.index, {
              id: block.id,
              name: block.name,
              inputText: "",
            });
          }
        } else if (event.type === "content_block_delta") {
          const delta = event.delta;
          if (delta.type === "text_delta") {
            yield { kind: "text-delta", text: delta.text };
          } else if (delta.type === "input_json_delta") {
            const acc = toolUses.get(event.index);
            if (acc) acc.inputText += delta.partial_json;
          }
        } else if (event.type === "message_delta") {
          if (event.delta.stop_reason) {
            stopReason = event.delta.stop_reason;
          }
          if (event.usage) {
            usage = {
              output_tokens: event.usage.output_tokens,
            };
          }
        } else if (event.type === "message_start" && event.message?.usage) {
          usage = {
            input_tokens: event.message.usage.input_tokens,
            output_tokens: event.message.usage.output_tokens,
          };
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

    for (const [, tu] of [...toolUses.entries()].sort((a, b) => a[0] - b[0])) {
      let args: Record<string, unknown> = {};
      try {
        args = tu.inputText ? JSON.parse(tu.inputText) : {};
      } catch {
        args = { __raw: tu.inputText };
      }
      yield { kind: "tool-call", id: tu.id, name: tu.name, args };
    }

    const reason =
      stopReason === "tool_use"
        ? "tool_use"
        : stopReason === "max_tokens"
          ? "length"
          : "stop";
    yield { kind: "turn-end", reason: reason as "tool_use" | "length" | "stop", usage };
  }
}

export function makeAnthropicProvider(): Provider {
  return new AnthropicProvider();
}
