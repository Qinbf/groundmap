/**
 * Codex CLI 桥接 provider
 *
 * 同 claude-code.ts 思路：spawn codex exec，prompt 走 stdin，
 * parse 它的行分隔 JSON 事件流翻成 AgentEvent。
 *
 * codex 0.13+ 的事件 schema 是「thread / turn / item」三层（见 translateCodexEvent），
 * 与早期的 message/tool_call/result 扁平 schema 不同。这里以新 schema 为主、
 * 保留旧 schema 兼容分支；未识别的事件忽略——保证 trace 不崩溃即可。
 */
import { spawn } from "node:child_process";
import path from "node:path";
import type { Provider, TurnInput, AgentEvent, ChatMessage } from "./types";

function projectRoot(): string {
  return process.env.KB_ROOT || path.resolve(process.cwd(), "..", "..");
}

function flattenMessages(system: string, messages: ChatMessage[]): string {
  const parts: string[] = [];
  if (system) parts.push(`# System\n${system}`);
  for (const m of messages) {
    if (m.role === "user" && m.text) parts.push(`# User\n${m.text}`);
    else if (m.role === "assistant" && m.text) parts.push(`# Assistant\n${m.text}`);
  }
  return parts.join("\n\n");
}

export class CodexProvider implements Provider {
  readonly id = "codex" as const;
  readonly name = "Codex (CLI)";
  readonly is_agent = true;

  isAvailable(): boolean {
    return true; // 运行时校验
  }

  unavailableReason() {
    return undefined;
  }

  listModels() {
    return ["default"];
  }

  async *runTurn(input: TurnInput): AsyncIterable<AgentEvent> {
    const bin = process.env.CODEX_BIN || "codex";
    const prompt = flattenMessages(input.system, input.messages);
    const cwd = projectRoot();

    // prompt 走 stdin（"-" 占位），不走 argv —— 两个原因：
    //   1. codex exec 在 stdin 是管道时会「读 stdin 直到 EOF 才开工」。若把 prompt 当
    //      argv 传而 stdin 这个管道一直不关，子进程会永远阻塞等 stdin EOF（旧实现的死因：
    //      spawn 默认开着 stdin 管道却从不写/不关，codex 直接挂死）。
    //   2. 走 stdin 还能绕开 OS 的 argv 长度上限——system prompt 里塞了整份 root_index，可能很大。
    let proc;
    try {
      proc = spawn(bin, ["exec", "--json", "-"], {
        cwd,
        env: { ...process.env },
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (e) {
      yield {
        kind: "turn-end",
        reason: "error",
        error_message: `无法启动 ${bin}：${e instanceof Error ? e.message : String(e)}`,
      };
      return;
    }

    let spawnError: Error | null = null;
    proc.on("error", (err) => {
      spawnError = err;
    });

    const onAbort = () => {
      try {
        proc.kill("SIGTERM");
      } catch {
        /* 已退出 */
      }
    };
    if (input.signal) {
      if (input.signal.aborted) onAbort();
      else input.signal.addEventListener("abort", onAbort, { once: true });
    }

    // 把整段 prompt（含 system）写入 stdin 后立刻关闭——codex 读到 EOF 才开工。
    // 不关 = 永久挂死（见上面 spawn 处注释）。
    try {
      proc.stdin?.write(prompt);
      proc.stdin?.end();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[codex] stdin write failed:", e);
    }

    let stderr = "";
    proc.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
      if (stderr.length > 16 * 1024) stderr = stderr.slice(-8 * 1024);
    });

    // turn 级元信息：usage 与失败原因都在事件流里，但最终 turn-end 统一由进程退出码收尾，
    // 这里只把它们「捞出来」附到收尾事件上——避免 translateCodexEvent 再发一个重复的 turn-end。
    let usage: { input_tokens?: number; output_tokens?: number } | undefined;
    let turnError: string | undefined;

    const lines = readLines(proc.stdout!);
    try {
      for await (const line of lines) {
        if (!line.trim()) continue;
        let evt: unknown;
        try {
          evt = JSON.parse(line);
        } catch {
          continue;
        }
        if (evt && typeof evt === "object") {
          const ev = evt as Record<string, unknown>;
          if (ev.type === "turn.completed" && ev.usage && typeof ev.usage === "object") {
            const u = ev.usage as Record<string, unknown>;
            usage = {
              input_tokens: typeof u.input_tokens === "number" ? u.input_tokens : undefined,
              output_tokens: typeof u.output_tokens === "number" ? u.output_tokens : undefined,
            };
          } else if (ev.type === "turn.failed") {
            const err = ev.error;
            turnError =
              typeof err === "string"
                ? err
                : err &&
                    typeof err === "object" &&
                    typeof (err as Record<string, unknown>).message === "string"
                  ? String((err as Record<string, unknown>).message)
                  : "codex turn failed";
          }
        }
        for (const out of translateCodexEvent(evt)) {
          yield out;
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

    const closeInfo: { code: number | null; spawnErr: Error | null } = await new Promise(
      (resolve) => {
        if (proc.exitCode !== null) {
          resolve({ code: proc.exitCode, spawnErr: spawnError });
          return;
        }
        let settled = false;
        proc.once("close", (code) => {
          if (settled) return;
          settled = true;
          resolve({ code, spawnErr: spawnError });
        });
        proc.once("error", (err) => {
          if (settled) return;
          settled = true;
          resolve({ code: null, spawnErr: err });
        });
      },
    );

    if (closeInfo.spawnErr) {
      yield {
        kind: "turn-end",
        reason: "error",
        error_message: `codex 启动失败：${closeInfo.spawnErr.message}（CODEX_BIN=${bin}）`,
      };
      return;
    }
    const exitCode = closeInfo.code;
    if (exitCode !== 0) {
      yield {
        kind: "turn-end",
        reason: "error",
        error_message: turnError || `codex exit ${exitCode}: ${stderr.slice(-500)}`,
      };
    } else {
      yield { kind: "turn-end", reason: "stop", usage };
    }
  }
}

export function makeCodexProvider(): Provider {
  return new CodexProvider();
}

/**
 * codex 0.13+ 事件 schema（行分隔 JSON）：
 *   {type:"thread.started", thread_id}
 *   {type:"turn.started"}
 *   {type:"item.started"|"item.completed"|"item.updated", item:{id, type, ...}}
 *       item.type=="agent_message"     → text-delta（completed 时一次性给全文，codex 不分片流）
 *       item.type=="command_execution" → started=tool-call / completed=tool-result
 *       item.type=="mcp_tool_call"     → 同上（字段尽力解析）
 *   {type:"turn.completed", usage:{input_tokens, output_tokens, ...}}
 *   {type:"turn.failed", error}
 *
 * 关键：本函数**不发 turn-end**——收尾与 usage 由 runTurn 按进程退出码统一处理，
 * 避免「turn.completed 发一个 + 进程退出再发一个」的重复 turn-end。
 * 同时保留对旧扁平 schema（message/tool_call/result）的兼容分支。
 */
function* translateCodexEvent(evt: unknown): Generator<AgentEvent> {
  if (!evt || typeof evt !== "object") return;
  const e = evt as Record<string, unknown>;

  // 兼容多种字段命名风格
  const type = (e.type || e.kind || e.event) as string | undefined;
  if (!type) return;

  // ---- codex 0.13+ 新 schema：item.* ----
  if (type === "item.started" || type === "item.completed" || type === "item.updated") {
    const item = e.item;
    if (!item || typeof item !== "object") return;
    const it = item as Record<string, unknown>;
    const itemType = it.type as string | undefined;
    const itemId = String(it.id || Math.random().toString(36).slice(2));

    // 助手消息：只在 completed 时一次性发全文（started/updated 不带最终文本，发了会重复/截断）
    if (itemType === "agent_message") {
      if (type === "item.completed" && typeof it.text === "string" && it.text) {
        yield { kind: "text-delta", text: it.text };
      }
      return;
    }

    // 命令执行：started→tool-call，completed→tool-result（按 item.id 配对）
    if (itemType === "command_execution") {
      if (type === "item.started") {
        yield {
          kind: "tool-call",
          id: itemId,
          name: "shell",
          args: { command: typeof it.command === "string" ? it.command : "" },
        };
      } else if (type === "item.completed") {
        const exit = typeof it.exit_code === "number" ? it.exit_code : null;
        const ok = exit === 0 || exit === null;
        const out = typeof it.aggregated_output === "string" ? it.aggregated_output : "";
        yield {
          kind: "tool-result",
          id: itemId,
          name: "shell",
          ok,
          data: ok ? out : undefined,
          error: ok ? undefined : out || `exit ${exit ?? "?"}`,
          duration_ms: 0,
        };
      }
      return;
    }

    // MCP / 函数工具调用（字段名按尽力解析）
    if (itemType === "mcp_tool_call" || itemType === "tool_call" || itemType === "function_call") {
      const name = String(it.tool || it.name || it.server || "mcp");
      if (type === "item.started") {
        const rawArgs = it.arguments ?? it.args ?? it.input;
        let args: Record<string, unknown> = {};
        if (typeof rawArgs === "string") {
          try {
            args = JSON.parse(rawArgs);
          } catch {
            args = { __raw: rawArgs };
          }
        } else if (rawArgs && typeof rawArgs === "object") {
          args = rawArgs as Record<string, unknown>;
        }
        yield { kind: "tool-call", id: itemId, name, args };
      } else if (type === "item.completed") {
        const isErr = it.status === "failed" || it.error !== undefined;
        yield {
          kind: "tool-result",
          id: itemId,
          name,
          ok: !isErr,
          data: isErr ? undefined : it.result ?? it.output,
          error: isErr ? String(it.error ?? "failed") : undefined,
          duration_ms: 0,
        };
      }
      return;
    }

    // 推理摘要（若该版本单独发；多数版本只在 usage 里计 token、不发 reasoning item）
    if (itemType === "reasoning" && type === "item.completed") {
      const r =
        typeof it.text === "string"
          ? it.text
          : typeof it.summary === "string"
            ? it.summary
            : "";
      if (r) yield { kind: "status", text: `💭 ${r.slice(0, 200)}` };
      return;
    }

    // web 搜索等其他 item：给个轻量活动提示，让用户看到「在干活」
    if (itemType === "web_search" && type === "item.started") {
      yield { kind: "status", text: "🔍 web 搜索中…" };
      return;
    }
    return;
  }

  // thread/turn 级事件：收尾 + usage 都交给 runTurn（这里不发 turn-end，防重复）
  if (
    type === "thread.started" ||
    type === "turn.started" ||
    type === "turn.completed" ||
    type === "turn.failed"
  ) {
    return;
  }

  // ---- 兼容旧扁平 schema（codex <0.13）----
  if (type === "message" || type === "text" || type === "assistant_message") {
    const text =
      (typeof e.text === "string" ? e.text : undefined) ||
      (typeof e.content === "string" ? e.content : undefined) ||
      (typeof e.delta === "string" ? e.delta : undefined);
    if (text) yield { kind: "text-delta", text };
    return;
  }

  if (type === "tool_call" || type === "function_call" || type === "tool_use") {
    const id = String(e.id || e.call_id || e.tool_call_id || Math.random().toString(36).slice(2));
    const name = String(e.name || e.tool || "unknown");
    const argsRaw = e.args || e.arguments || e.input || {};
    let args: Record<string, unknown> = {};
    if (typeof argsRaw === "string") {
      try {
        args = JSON.parse(argsRaw);
      } catch {
        args = { __raw: argsRaw };
      }
    } else if (argsRaw && typeof argsRaw === "object") {
      args = argsRaw as Record<string, unknown>;
    }
    yield { kind: "tool-call", id, name, args };
    return;
  }

  if (type === "tool_result" || type === "function_result" || type === "tool_output") {
    const id = String(e.id || e.call_id || e.tool_call_id || "");
    const isErr = e.is_error === true || e.error !== undefined;
    yield {
      kind: "tool-result",
      id,
      name: String(e.name || "(codex-tool)"),
      ok: !isErr,
      data: isErr ? undefined : e.output ?? e.result ?? e.content,
      error: isErr ? String(e.error || e.output || "") : undefined,
      duration_ms: 0,
    };
    return;
  }
  // 旧 schema 的 result/done/end 不再发 turn-end —— 统一由 runTurn 按退出码收尾
}

async function* readLines(stream: NodeJS.ReadableStream): AsyncGenerator<string> {
  let buf = "";
  for await (const chunk of stream) {
    buf += typeof chunk === "string" ? chunk : (chunk as Buffer).toString("utf8");
    let idx: number;
    while ((idx = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      yield line;
    }
  }
  if (buf.length > 0) yield buf;
}
