/**
 * Codex CLI 桥接 provider
 *
 * 同 claude-code.ts 思路：spawn `codex exec --json "<prompt>"`，
 * parse 它的 JSON 事件流翻成 AgentEvent。
 *
 * Codex CLI 的 JSON 事件 schema 比 Claude Code 更新得快，且各版本格式不一定一致。
 * 这里做最大努力解析，未识别的事件忽略——保证 trace 不崩溃即可。
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

    let proc;
    try {
      proc = spawn(bin, ["exec", "--json", prompt], {
        cwd,
        env: { ...process.env },
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

    let stderr = "";
    proc.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
      if (stderr.length > 16 * 1024) stderr = stderr.slice(-8 * 1024);
    });

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
        error_message: `codex exit ${exitCode}: ${stderr.slice(-500)}`,
      };
    } else {
      yield { kind: "turn-end", reason: "stop" };
    }
  }
}

export function makeCodexProvider(): Provider {
  return new CodexProvider();
}

function* translateCodexEvent(evt: unknown): Generator<AgentEvent> {
  if (!evt || typeof evt !== "object") return;
  const e = evt as Record<string, unknown>;

  // 兼容多种字段命名风格
  const type = (e.type || e.kind || e.event) as string | undefined;
  if (!type) return;

  if (type === "message" || type === "text" || type === "assistant_message") {
    const text =
      (typeof e.text === "string" ? e.text : undefined) ||
      (typeof e.content === "string" ? e.content : undefined) ||
      (typeof e.delta === "string" ? e.delta : undefined);
    if (text) yield { kind: "text-delta", text };
    return;
  }

  if (
    type === "tool_call" ||
    type === "function_call" ||
    type === "tool_use"
  ) {
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

  if (
    type === "tool_result" ||
    type === "function_result" ||
    type === "tool_output"
  ) {
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

  if (type === "result" || type === "done" || type === "end") {
    yield { kind: "turn-end", reason: "stop" };
    return;
  }
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
