/**
 * Provider registry — 集中创建实例 + 查询接口
 */
import type { Provider, ProviderId, ProviderInfo } from "./types";
import { makeDeepSeekProvider } from "./deepseek";
import { makeAnthropicProvider } from "./anthropic";
import { makeOpenAIProvider } from "./openai";
import { makeClaudeCodeProvider } from "./claude-code";
import { makeCodexProvider } from "./codex";

let _registry: Map<ProviderId, Provider> | null = null;

function registry(): Map<ProviderId, Provider> {
  if (!_registry) {
    _registry = new Map<ProviderId, Provider>([
      ["deepseek", makeDeepSeekProvider()],
      ["anthropic", makeAnthropicProvider()],
      ["openai", makeOpenAIProvider()],
      ["claude-code", makeClaudeCodeProvider()],
      ["codex", makeCodexProvider()],
    ]);
  }
  return _registry;
}

export function getProvider(id: ProviderId): Provider | undefined {
  return registry().get(id);
}

export function listProviders(): ProviderInfo[] {
  return Array.from(registry().values()).map((p) => ({
    id: p.id,
    name: p.name,
    available: p.isAvailable(),
    unavailable_reason: p.unavailableReason(),
    models: p.listModels(),
    is_agent: p.is_agent,
  }));
}
