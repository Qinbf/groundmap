/**
 * DeepSeek provider — 走 OpenAI 兼容 API
 * baseURL: https://api.deepseek.com
 */
import OpenAI from "openai";
import type { Provider, TurnInput, AgentEvent, ChatMessage } from "./types";
import { getOpenAITools } from "../kb-tools";
import { toOpenAIMessages, streamOpenAI } from "./openai-shared";

export class DeepSeekProvider implements Provider {
  readonly id = "deepseek" as const;
  readonly name = "DeepSeek";
  readonly is_agent = false;

  isAvailable(): boolean {
    return !!process.env.DEEPSEEK_API_KEY;
  }

  unavailableReason() {
    return this.isAvailable() ? undefined : "需在 .env 配置 DEEPSEEK_API_KEY";
  }

  listModels() {
    // DeepSeek 最新模型（v4 系）：flash=轻量快速、pro=旗舰高性能。
    // flash 放前面作演示默认——更快更省，适合现场讲解。
    return ["deepseek-v4-flash", "deepseek-v4-pro"];
  }

  async *runTurn(input: TurnInput): AsyncIterable<AgentEvent> {
    const client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY!,
      baseURL: "https://api.deepseek.com",
    });
    yield* streamOpenAI(client, input, getOpenAITools());
  }
}

export function makeDeepSeekProvider(): Provider {
  return new DeepSeekProvider();
}

// re-export 给 openai.ts 用（避免循环 import）
export { toOpenAIMessages };
export type { ChatMessage };
