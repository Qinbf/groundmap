/**
 * Provider-agnostic agent 主循环
 *
 * 流程（非 agent provider）：while turn → tool-use → 执行 → 喂回 → 下一轮 → stop
 * 流程（agent provider，CC/Codex）：一次性 runTurn 跑完，我们透传事件
 *
 * Mode 自动增强（v5）：
 *   audit  → 每次 read 后强制 read_block 反查锚点（synthetic）
 *   explore → 第一次 read 后强制 backlinks/outlinks + 邻居 BFS（synthetic）
 *   synthetic 事件 emit 给前端可视化，但**不喂回 LLM 上下文**（避免 tool_call_id 不匹配）
 *
 * ANSWER 自动续写（v6）：stream 自然结束（reason=stop）但累积文本没出现【ANSWER】段时，
 *   自动 inject 一条 user 追问让 AI 补 ANSWER 段。两条路径都做，限 1 次防死循环。
 */
import type {
  Provider,
  AgentEvent,
  ChatMessage,
  ToolCallRecord,
  ToolResultRecord,
} from "./providers/types";
import { executeTool, validatePaths } from "./kb-http-client";
import type { QueryMode } from "./default-system-prompt";
import {
  auditAugment,
  exploreAugment,
  createExploreState,
  type ExploreState,
} from "./mode-augment";
import { collectRefs } from "./wiki-ref";
import { verifyBlockCitations } from "./verify-citations";

export interface AgentRunInput {
  provider: Provider;
  model: string;
  system: string;
  messages: ChatMessage[];
  toolBudget?: number;
  signal?: AbortSignal;
  mode?: QueryMode;
}

const DEFAULT_TOOL_BUDGET = 10;
const MAX_TURNS = 12;

const FOLLOW_UP_PROMPT =
  "你刚才漏了【ANSWER】段收尾。请立即基于已读到的内容输出 **【ANSWER】xxx** 段做收尾总结。不要再调工具，直接给文本答案。";

/** 文本里是否出现了 ANSWER 段标记（容忍各种间隔与加粗包裹） */
function hasAnswerSection(text: string): boolean {
  // 匹配 【ANSWER】 / 【 ANSWER 】 / **【ANSWER】** 等
  return /【\s*ANSWER\s*】/i.test(text);
}

function gatherAssistantText(msgs: ChatMessage[]): string {
  return msgs
    .filter((m) => m.role === "assistant" && m.text)
    .map((m) => m.text || "")
    .join("\n");
}

export async function* runAgent(
  input: AgentRunInput,
): AsyncGenerator<AgentEvent> {
  const { provider, model, system, mode } = input;
  const toolBudget = input.toolBudget ?? DEFAULT_TOOL_BUDGET;
  let messages = [...input.messages];

  // mode 共享状态
  const exploreState: ExploreState = createExploreState();
  // 跟踪 tool-call 与其 args（CC 路径用——tool-result 事件需要查 trigger call）
  const callsById = new Map<
    string,
    { name: string; args: Record<string, unknown> }
  >();

  // ANSWER 续写状态：累积所有 assistant 文本 + 是否已经续写过
  let totalAssistantText = "";
  let forcedAnswerOnce = false;

  // 来源注册表：本轮对话中所有成功读取过的文件路径（防幻觉白名单）
  const availableSources = new Set<string>();

  /** 从 tool result 提取路径加入注册表 */
  function recordSource(toolName: string, args: Record<string, unknown>, data?: unknown) {
    const p =
      typeof args.path === "string"
        ? args.path
        : typeof args.file_path === "string"
          ? args.file_path
          : null;
    if (p) availableSources.add(p);
    // backlinks / outlinks 的结果里也包含有效路径
    if ((toolName === "backlinks" || toolName === "outlinks") && data) {
      const field = toolName === "backlinks" ? "from_path" : "target";
      let arr: unknown = data;
      if (!Array.isArray(arr) && typeof arr === "object") {
        const obj = arr as Record<string, unknown>;
        if (Array.isArray(obj.hits)) arr = obj.hits;
        else if (Array.isArray(obj.results)) arr = obj.results;
      }
      if (Array.isArray(arr)) {
        for (const item of arr) {
          if (item && typeof item === "object") {
            const path = (item as Record<string, unknown>)[field];
            if (typeof path === "string") availableSources.add(path);
          }
        }
      }
    }
  }

  /** ANSWER 后验：扫描所有引用，验证是否有效 */
  async function* validateAnswerRefs(text: string): AsyncGenerator<AgentEvent> {
    const refs = collectRefs([text]);
    if (refs.length === 0) return;
    // 先把已读过的标为 valid，未读过的批量调 HTTP 验证
    const toCheck: string[] = [];
    const resultMap = new Map<string, { ok: boolean; read: boolean }>();
    for (const r of refs) {
      if (availableSources.has(r.ref.path)) {
        resultMap.set(r.ref.path, { ok: true, read: true });
      } else {
        toCheck.push(r.ref.path);
      }
    }
    if (toCheck.length > 0) {
      const exists = await validatePaths(toCheck);
      for (const [p, ok] of exists) {
        resultMap.set(p, { ok, read: false });
      }
    }
    const broken = refs
      .filter((r) => {
        const res = resultMap.get(r.ref.path);
        return !res || !res.ok;
      })
      .map((r) => r.ref.path);
    const unread = refs
      .filter((r) => {
        const res = resultMap.get(r.ref.path);
        return res && res.ok && !res.read;
      })
      .map((r) => r.ref.path);

    // 块级 + 语义核对（基线，与 mode 无关）：对每条块级引用 read_block 验锚点存在性，
    // 再用 启发式→LLM判官 两级判断块内容是否支撑论断；不支撑的 key 进 downgraded，
    // 由 UI（downgradeRefAnchors）去掉假精度、改成整页链接。
    // 只挑**块级**锚点（p/t/c/f-seq-hash）：按锚点形态判别，兼容模型漏写 ^ 的 [[x#p-3-abc]]
    // （isBlock 标志只看 ^，会漏）；排除 h-（heading 指向整节，read_block 只回标题行，不宜按数字降级）。
    const BLOCK_ANCHOR_RE = /^[ptcf]-\d+(?:-\d+)?-[a-z0-9]/;
    const blockRefs = refs
      .filter((r) => !!r.ref.anchor && BLOCK_ANCHOR_RE.test(r.ref.anchor as string))
      .map((r) => ({ key: r.key, path: r.ref.path, anchor: r.ref.anchor as string }));
    let downgraded: string[] = [];
    if (blockRefs.length > 0) {
      try {
        ({ downgraded } = await verifyBlockCitations(text, blockRefs));
      } catch {
        downgraded = [];
      }
    }

    if (broken.length > 0 || unread.length > 0 || downgraded.length > 0) {
      const segs: string[] = [];
      if (broken.length) segs.push(`${broken.length} 条文件失效`);
      if (unread.length) segs.push(`${unread.length} 条未读`);
      if (downgraded.length) segs.push(`${downgraded.length} 条锚点不支撑论断→已降级`);
      yield {
        kind: "status",
        text: `引用验证：${segs.join(" / ")}`,
        level: "warn",
      } as AgentEvent;
      yield {
        kind: "ref-validation",
        broken,
        unread,
        downgraded,
      } as AgentEvent;
    }
  }

  /** 给一对 trigger call+result 跑 mode augment（emit synthetic 事件） */
  async function* runAugment(
    triggerCall: { name: string; args: Record<string, unknown> },
    triggerResult: { ok: boolean; data?: unknown },
  ): AsyncGenerator<AgentEvent> {
    if (!mode) return;
    if (mode === "audit") {
      yield* auditAugment(triggerCall, triggerResult);
    } else if (mode === "explore") {
      yield* exploreAugment(triggerCall, triggerResult, exploreState);
    }
  }

  // ──────────────────────────────────────────────
  // Agent provider (CC/Codex)：透传事件 + 拦截 tool-result 跑 augment
  // ──────────────────────────────────────────────
  if (provider.is_agent) {
    async function* runOneAgentSession(
      msgs: ChatMessage[],
    ): AsyncGenerator<AgentEvent> {
      for await (const evt of provider.runTurn({
        model,
        system,
        messages: msgs,
        signal: input.signal,
      })) {
        if (evt.kind === "text-delta") {
          totalAssistantText += evt.text;
        }
        if (evt.kind === "tool-call") {
          callsById.set(evt.id, { name: evt.name, args: evt.args });
        }
        yield evt;
        if (evt.kind === "tool-result") {
          const triggerCall = callsById.get(evt.id);
          if (triggerCall) {
            for await (const synEvt of runAugment(triggerCall, {
              ok: evt.ok,
              data: evt.data,
            })) {
              yield synEvt;
            }
          }
        }
      }
    }

    for await (const evt of runOneAgentSession(messages)) {
      yield evt;
    }

    // ANSWER 后验：验证所有引用
    if (totalAssistantText) {
      yield* validateAnswerRefs(totalAssistantText);
    }

    // 自动续写检查
    if (!forcedAnswerOnce && !hasAnswerSection(totalAssistantText)) {
      forcedAnswerOnce = true;
      yield {
        kind: "status",
        text: "AI 没给【ANSWER】段，自动续写收尾…",
        level: "info",
      };
      const followUpMsgs: ChatMessage[] = [
        ...messages,
        { role: "assistant", text: totalAssistantText || "(已完成工具调用)" },
        { role: "user", text: FOLLOW_UP_PROMPT },
      ];
      for await (const evt of runOneAgentSession(followUpMsgs)) {
        yield evt;
      }
      // 续写后的 ANSWER 也要验证
      if (totalAssistantText) {
        yield* validateAnswerRefs(totalAssistantText);
      }
    }
    return;
  }

  // ──────────────────────────────────────────────
  // Non-agent provider：循环 turn，执行 tool，augment，喂回
  // ──────────────────────────────────────────────
  let toolsUsed = 0;
  let turnIdx = 0;

  while (turnIdx < MAX_TURNS) {
    if (input.signal?.aborted) {
      yield { kind: "turn-end", reason: "error", error_message: "客户端已断开" };
      return;
    }
    turnIdx += 1;

    let turnText = "";
    const turnToolCalls: ToolCallRecord[] = [];
    let turnEndEvent: AgentEvent | null = null;

    for await (const evt of provider.runTurn({
      model,
      system,
      messages,
      tool_budget: toolBudget - toolsUsed,
      signal: input.signal,
    })) {
      if (evt.kind === "text-delta") {
        turnText += evt.text;
        totalAssistantText += evt.text;
        yield evt;
      } else if (evt.kind === "tool-call") {
        turnToolCalls.push({ id: evt.id, name: evt.name, args: evt.args });
        yield evt;
      } else if (evt.kind === "turn-end") {
        turnEndEvent = evt;
      } else {
        yield evt;
      }
    }

    if (!turnEndEvent) {
      yield { kind: "turn-end", reason: "error", error_message: "provider 未发送 turn-end" };
      return;
    }

    const reason = (turnEndEvent as { reason: string }).reason;

    if (turnText || turnToolCalls.length > 0) {
      messages = [
        ...messages,
        {
          role: "assistant",
          text: turnText || undefined,
          tool_calls: turnToolCalls.length > 0 ? turnToolCalls : undefined,
        },
      ];
    }

    if (reason === "tool_use" && turnToolCalls.length > 0) {
      if (toolsUsed + turnToolCalls.length > toolBudget) {
        yield turnEndEvent;
        yield {
          kind: "turn-end",
          reason: "budget_exceeded",
          error_message: `已达工具预算上限 (${toolBudget})`,
        };
        return;
      }

      // 并行执行所有 tool（同 turn 多 tool_call 时 50%+ 提速）；事件按 turnToolCalls 原顺序 emit
      const executed = await Promise.all(
        turnToolCalls.map(async (tc) => ({
          tc,
          result: await executeTool(tc.name, tc.args),
        })),
      );

      const toolResults: ToolResultRecord[] = [];
      for (const { tc, result } of executed) {
        toolResults.push({
          id: tc.id,
          ok: result.ok,
          data: result.data,
          error: result.error,
        });
        yield {
          kind: "tool-result",
          id: tc.id,
          name: tc.name,
          ok: result.ok,
          data: result.data,
          error: result.error,
          duration_ms: result.duration_ms,
        };
        toolsUsed += 1;

        // 记录来源路径（防幻觉白名单）
        if (result.ok) recordSource(tc.name, tc.args, result.data);

        // mode augment：synthetic 事件只 emit 给前端，不进 messages
        for await (const synEvt of runAugment(
          { name: tc.name, args: tc.args },
          { ok: result.ok, data: result.data },
        )) {
          yield synEvt;
        }
      }

      messages = [...messages, { role: "user", tool_results: toolResults }];
      continue;
    }

    // reason === "stop"（或其他非 tool_use 的自然结束）
    // 检查是否漏了 ANSWER 段，漏了就 inject 一条追问继续跑
    const fullText = gatherAssistantText(messages);
    if (
      reason === "stop" &&
      !forcedAnswerOnce &&
      !hasAnswerSection(fullText)
    ) {
      forcedAnswerOnce = true;
      yield {
        kind: "status",
        text: "AI 没给【ANSWER】段，自动续写收尾…",
        level: "info",
      };
      messages = [
        ...messages,
        { role: "user", text: FOLLOW_UP_PROMPT },
      ];
      continue;
    }

    // ANSWER 后验：验证所有引用是否有效（在 stream-end 前做，让用户立即看到）
    if (reason === "stop") {
      // 验**全部** assistant 文本（与 agent 路 totalAssistantText 及 UI 渲染并集对齐），
      // 而非只 .pop() 最后一轮——否则模型在中间轮贴的坏块锚点会漏验漏降级。
      const allAssistantText = gatherAssistantText(messages);
      if (allAssistantText) {
        yield* validateAnswerRefs(allAssistantText);
      }
    }

    yield turnEndEvent;
    return;
  }

  yield {
    kind: "turn-end",
    reason: "budget_exceeded",
    error_message: `达到最大轮数 ${MAX_TURNS}`,
  };
}
