/**
 * OpenAI / 通用 OpenAI 兼容 provider
 * 支持自定义 baseURL（process.env.OPENAI_BASE_URL），可接 Moonshot / Qwen / 自建网关
 */
import OpenAI from "openai";
import type { Provider, TurnInput, AgentEvent } from "./types";
import { getOpenAITools } from "../kb-tools";
import { streamOpenAI } from "./openai-shared";

export class OpenAIProvider implements Provider {
  readonly id = "openai" as const;
  readonly name = "OpenAI";
  readonly is_agent = false;

  isAvailable(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  unavailableReason() {
    return this.isAvailable() ? undefined : "需在 .env 配置 OPENAI_API_KEY";
  }

  listModels() {
    const custom = process.env.OPENAI_BASE_URL;
    if (custom) {
      // 用了自定义 baseURL（Moonshot / Qwen 等），列一些常见 model；
      // 用户也可以在 UI 输入框自由填
      return ["moonshot-v1-32k", "qwen-max", "custom"];
    }
    return ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1-mini"];
  }

  async *runTurn(input: TurnInput): AsyncIterable<AgentEvent> {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
      baseURL: process.env.OPENAI_BASE_URL || undefined,
    });
    yield* streamOpenAI(client, input, getOpenAITools());
  }
}

export function makeOpenAIProvider(): Provider {
  return new OpenAIProvider();
}
