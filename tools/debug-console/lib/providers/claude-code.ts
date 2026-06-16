/**
 * Claude Code CLI 桥接 provider
 *
 * 关键设计：
 *   - Claude Code 是 self-contained agent，自己跑多轮 + 自己用 Read/Grep 等
 *   - 我们不喂工具给它，而是 spawn `claude -p ... --output-format=stream-json`
 *     然后 parse 它的 stream-json 事件，翻成 AgentEvent 给 UI 看
 *   - 它会自己读 wiki/ 文件（CC 进程的 cwd 设为 KB_ROOT，让它能 Read 到 wiki/）
 *   - 所以 trace 里看到的是 CC 自己的 Read/Grep 调用，不是我们的 read_page/search
 *
 * Stream-JSON 事件类型（CC 1.x 已知）：
 *   - system / init                      → 忽略
 *   - assistant.message.content[]:
 *       - text                            → text-delta
 *       - tool_use (id, name, input)      → tool-call (CC 自己后面会执行)
 *   - user.message.content[]:
 *       - tool_result (tool_use_id, ...)  → tool-result（我们只反映 CC 看到了什么）
 *   - result (subtype=success/error)      → turn-end
 */
import { spawn } from "node:child_process";
import path from "node:path";
import type { Provider, TurnInput, AgentEvent, ChatMessage } from "./types";

function projectRoot(): string {
  // debug-console 启动时 cwd = tools/debug-console/，KB 根 = ../../
  return process.env.KB_ROOT || path.resolve(process.cwd(), "..", "..");
}

/** 把对话历史拼成一个 prompt 串给 CC（CC 非交互模式只接受单 prompt）
 *  注：system 不在这里拼——通过 CLI 的 --append-system-prompt 单独传，让 CC 真当 system 处理
 */
function flattenMessages(messages: ChatMessage[]): string {
  const parts: string[] = [];
  for (const m of messages) {
    if (m.role === "user" && m.text) {
      parts.push(`<user>\n${m.text}\n</user>`);
    } else if (m.role === "assistant" && m.text) {
      parts.push(`<assistant>\n${m.text}\n</assistant>`);
    }
  }
  return parts.join("\n\n");
}

export class ClaudeCodeProvider implements Provider {
  readonly id = "claude-code" as const;
  readonly name = "Claude Code (CLI)";
  readonly is_agent = true;

  isAvailable(): boolean {
    // 简单检查：环境变量定义了 CLAUDE_CODE_BIN 或假定 PATH 里有 `claude`
    return true; // 无法静态检测；运行时若 spawn 失败再报错
  }

  unavailableReason() {
    return undefined;
  }

  listModels() {
    // CC 自己内部选模型；这里只列一个 placeholder（实际不用）
    return ["default"];
  }

  async *runTurn(input: TurnInput): AsyncIterable<AgentEvent> {
    const bin = process.env.CLAUDE_CODE_BIN || "claude";
    const prompt = flattenMessages(input.messages);
    const cwd = projectRoot();

    // 关键参数：
    //   -p                              非交互模式
    //   --output-format stream-json     行分隔 JSON 事件流（供我们 parse）
    //   --verbose                       stream-json 需要它来 emit 完整事件（CC 要求）
    //   --dangerously-skip-permissions  关闭工具权限询问。Node subprocess 无 TTY,
    //                                   一旦 CC 试图问 "允许 Read 该文件吗？" 就永远卡死。
    //                                   debug-console 用户已知会让 CC 自由用 Read/Grep。
    // prompt 走 stdin（"-" 占位）—— 比 CLI arg 稳，避免 OS arg 长度限制 / 转义错乱
    // 注：未加 --include-partial-messages —— 它会让 CC 多 emit 一类 partial 事件，
    // 与现有 assistant 事件叠加会导致 text-delta 双倍。CC 默认一次性返回完整文本，
    // 工具调用是独立事件——可视化没有损失。我们靠 status 事件给用户进度感。
    //
    // --append-system-prompt：让 system 真正作为 system 角色注入；用 --system-prompt
    //   会替换 CC 默认（包括 Read/Grep 工具知识），用 --append 是补充式。
    const args = [
      "-p",
      "--output-format",
      "stream-json",
      "--verbose",
      "--dangerously-skip-permissions",
    ];
    if (input.system) {
      args.push("--append-system-prompt", input.system);
    }

    let proc;
    try {
      proc = spawn(bin, args, {
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

    // 异步 spawn 错误（如 ENOENT 二进制不存在）通过 'error' 事件发；同步只能 catch 极少情况
    let spawnError: Error | null = null;
    proc.on("error", (err) => {
      spawnError = err;
    });

    // 客户端断开 → kill subprocess（避免 dangling claude 进程）
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

    // 把 prompt 写入 stdin（claude -p 在没有位置参数时从 stdin 读 prompt）
    try {
      proc.stdin?.write(prompt);
      proc.stdin?.end();
    } catch (e) {
      // EPIPE 等——通常是 spawn 已经失败，让下面的循环收尾报错
      // eslint-disable-next-line no-console
      console.warn("[claude-code] stdin write failed:", e);
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
          // 忽略非 JSON 行（CC 偶尔会输出诊断信息）
          continue;
        }
        for (const out of translateCCEvent(evt)) {
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

    // 进程退出 —— close 或 error 任一先触发都收尾
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
        error_message: `claude 启动失败：${closeInfo.spawnErr.message}（CLAUDE_CODE_BIN=${bin}）`,
      };
    } else if (closeInfo.code !== 0) {
      yield {
        kind: "turn-end",
        reason: "error",
        error_message: `claude exit ${closeInfo.code}: ${stderr.slice(-500) || "(no stderr)"}`,
      };
    }
    // 否则 translateCCEvent 已经在 result 事件里发了 turn-end
  }
}

export function makeClaudeCodeProvider(): Provider {
  return new ClaudeCodeProvider();
}

// ------------------------------------------------------------
// stream-json → AgentEvent 翻译
// ------------------------------------------------------------

function* translateCCEvent(evt: unknown): Generator<AgentEvent> {
  if (!evt || typeof evt !== "object") return;
  const e = evt as Record<string, unknown>;
  const type = e.type;
  const subtype = e.subtype;

  // 进度提示——让用户在长冷启动时看到"还在工作中"
  if (type === "system" && subtype === "init") {
    yield { kind: "status", text: "claude code 已启动，等待模型响应…" };
    return;
  }
  if (type === "system" && subtype === "api_retry") {
    const attempt = typeof e.attempt === "number" ? e.attempt : "?";
    const maxRetries = typeof e.max_retries === "number" ? e.max_retries : "?";
    const status = typeof e.error_status === "number" ? e.error_status : "?";
    yield {
      kind: "status",
      level: "warn",
      text: `API 重试中 (${attempt}/${maxRetries}, status=${status})…`,
    };
    return;
  }
  if (type === "rate_limit_event") {
    // 仅在 status != 'allowed' 时给提示，否则太吵
    const info = e.rate_limit_info as { status?: string } | undefined;
    if (info?.status && info.status !== "allowed") {
      yield { kind: "status", level: "warn", text: `速率限制：${info.status}` };
    }
    return;
  }

  if (type === "assistant" && e.message && typeof e.message === "object") {
    const msg = e.message as { content?: unknown[] };
    if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (!block || typeof block !== "object") continue;
        const b = block as Record<string, unknown>;
        if (b.type === "text" && typeof b.text === "string") {
          yield { kind: "text-delta", text: b.text };
        } else if (
          b.type === "tool_use" &&
          typeof b.id === "string" &&
          typeof b.name === "string"
        ) {
          const args = (b.input && typeof b.input === "object" ? b.input : {}) as Record<
            string,
            unknown
          >;
          yield { kind: "tool-call", id: b.id, name: b.name, args };
        }
      }
    }
    return;
  }

  if (type === "user" && e.message && typeof e.message === "object") {
    const msg = e.message as { content?: unknown[] };
    if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (!block || typeof block !== "object") continue;
        const b = block as Record<string, unknown>;
        if (b.type === "tool_result" && typeof b.tool_use_id === "string") {
          const isErr = b.is_error === true;
          // content 可能是 string 或 array of {type:'text', text:...}
          let content: unknown = b.content;
          if (Array.isArray(content)) {
            content = content
              .map((c) =>
                c && typeof c === "object" && (c as { text?: unknown }).text
                  ? String((c as { text: unknown }).text)
                  : JSON.stringify(c),
              )
              .join("\n");
          }
          yield {
            kind: "tool-result",
            id: b.tool_use_id,
            name: "(cc-tool)", // CC 不在 tool_result 里带 name；UI 会从 tool-call 表里查
            ok: !isErr,
            data: isErr ? undefined : content,
            error: isErr ? String(content) : undefined,
            duration_ms: 0,
          };
        }
      }
    }
    return;
  }

  if (type === "result") {
    const subtype = e.subtype;
    if (subtype === "success") {
      yield { kind: "turn-end", reason: "stop" };
    } else {
      yield {
        kind: "turn-end",
        reason: "error",
        error_message: typeof e.error === "string" ? e.error : "claude error",
      };
    }
    return;
  }

  // system / init / 其他事件忽略
}

/** 把 ReadableStream<Buffer> 转成行迭代器 */
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
