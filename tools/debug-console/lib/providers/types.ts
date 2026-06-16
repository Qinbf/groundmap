/**
 * Provider 接口 — 所有 LLM / agent 实现都遵循这个契约
 *
 * 关键设计：
 *   - 不在 provider 里执行工具——provider 只发 tool-call 事件，让 agent-loop 决定怎么调
 *   - 同样不在 provider 里管多轮——agent-loop 负责喂回 tool-result 并继续下一轮
 *   - 这样 4 个 provider 都只关心「LLM 单次发声 → 解析事件流」，逻辑最薄
 *
 * Claude Code / Codex provider 例外：
 *   - 它们是 self-contained agent，自己跑多轮 + 自己调工具
 *   - 我们桥接它们的 tool_use 事件给 UI 看，但不会再把 tool-result 喂回去
 *   - tool 调用走 CC/Codex 自己的 Read/Grep，不走 /api/agent-tool
 */

export type ProviderId = "deepseek" | "anthropic" | "openai" | "claude-code" | "codex";

export interface ProviderInfo {
  id: ProviderId;
  name: string;
  available: boolean;
  models: string[];
  /** 是否是 self-contained agent（自己跑多轮，UI 只 trace 不参与）*/
  is_agent: boolean;
  /** 不可用原因，UI 灰显时给 tooltip */
  unavailable_reason?: string;
}

/** 单次 turn 的输入：history 消息 + 系统 prompt + 工具集 */
export interface TurnInput {
  model: string;
  system: string;
  messages: ChatMessage[];
  /** 工具调用预算上限（仅 agent loop 用；provider 自身不强制）*/
  tool_budget?: number;
  /** 客户端断开信号——provider 应监听并尽快清理（kill subprocess、abort fetch 等）*/
  signal?: AbortSignal;
}

/** 标准 message 结构，agent-loop 在不同 provider 之间转换 */
export interface ChatMessage {
  role: "user" | "assistant";
  /** 普通文本内容 */
  text?: string;
  /** assistant 这一轮的工具调用（如有） */
  tool_calls?: ToolCallRecord[];
  /** user 角色这条 message 携带的工具结果（接 assistant 上一轮的 tool_calls） */
  tool_results?: ToolResultRecord[];
}

export interface ToolCallRecord {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface ToolResultRecord {
  /** 对应 tool_calls[i].id */
  id: string;
  ok: boolean;
  data?: unknown;
  error?: string;
}

/** Provider 流出来的事件，agent-loop 转发给 SSE 客户端 */
export type AgentEvent =
  | { kind: "text-delta"; text: string }
  | {
      kind: "tool-call";
      id: string;
      name: string;
      args: Record<string, unknown>;
      /** mode 强制注入（audit anchor 反查 / explore BFS）；UI 加 "强制" 标识 */
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
  | {
      kind: "status";
      text: string;
      level?: "info" | "warn";
    }
  | {
      kind: "turn-end";
      reason: "stop" | "tool_use" | "length" | "error" | "budget_exceeded";
      usage?: { input_tokens?: number; output_tokens?: number };
      error_message?: string;
    }
  | {
      kind: "ref-validation";
      /** 不存在的路径（AI 幻觉） */
      broken: string[];
      /** 存在但本轮未读取的路径 */
      unread: string[];
      /** 块级引用 key（path#anchor）——锚点不存在或内容不支撑论断，已降级为整页链接 */
      downgraded?: string[];
    };

export interface Provider {
  readonly id: ProviderId;
  readonly name: string;
  readonly is_agent: boolean;
  /** env 是否配置好 */
  isAvailable(): boolean;
  unavailableReason(): string | undefined;
  /** 该 provider 支持的 model id 列表（写死，不去 API 拉） */
  listModels(): string[];
  /** 跑一个 turn，流式输出事件 */
  runTurn(input: TurnInput): AsyncIterable<AgentEvent>;
}
