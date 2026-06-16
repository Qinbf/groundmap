/**
 * 调用 scripts/k.py 子进程的统一封装
 * 所有低频结构化查询都走这里。
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { projectRoot, resolveWorkspace } from "./kb";

const PY = process.env.KB_PY || "python";

/** 子进程 stdout 上限：超过 → kill 进程并返回错误。
 *  k.py 输出全是 JSON 结构化数据，10MB 已经远超任何合理 outline / blocks 列表；
 *  设这个上限是防御性的——避免恶意/异常情况下 100MB+ JSON 把 Node 内存爆掉。
 */
const MAX_STDOUT_BYTES = 10 * 1024 * 1024;

/** 子进程 stderr 上限：超过 → 截断保留尾部。8KB 容纳一个 Python traceback 已足。
 *  限制是为了防 k.py 异常打印巨量错误日志把 Node 堆撑爆。
 */
const MAX_STDERR_BYTES = 8 * 1024;

export interface KCliResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  exitCode?: number;
}

export interface RunKCliOptions {
  timeoutMs?: number;
  /**
   * 默认 false：子进程非零退出即 `{ ok: false }`，丢弃 stdout。
   *
   * 设为 true：非零退出时**仍尝试解析 stdout 的 JSON**——用于 k.py 把"业务校验
   * 不通过"用非零退出码表达、但 stdout 仍是合法结构化结果的命令（如
   * validate-frontmatter 在 `valid:false` 时可能 exit≠0）。这样能区分
   * "校验不通过但有结果"（返回 ok:true + data）与"命令真出错"（traceback /
   * 非 JSON stdout → 仍 ok:false）。stdout 不是合法 JSON 时退回正常的 ok:false 路径。
   */
  parseStdoutOnNonZero?: boolean;
}

export async function runKCli<T = unknown>(
  args: string[],
  options: RunKCliOptions = {},
): Promise<KCliResult<T>> {
  const timeoutMs = options.timeoutMs ?? 30000;
  const parseStdoutOnNonZero = options.parseStdoutOnNonZero ?? false;
  const root = projectRoot();
  const scriptPath = path.join(root, "scripts", "k.py");
  // 与 web 显示层一致：cookie kb_workspace > KB_WORKSPACE env > 默认（resolveWorkspace 解析）
  const workspace = resolveWorkspace();
  const kpyArgs = ["--workspace", workspace, ...args, "--json"];

  return new Promise((resolve) => {
    const proc = spawn(PY, [scriptPath, ...kpyArgs], {
      cwd: root,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let oversize = false;
    // 防双 resolve——timeout、'error'、'close' 三个事件路径任何一个先触发都终结 Promise
    let resolved = false;
    const finalize = (r: KCliResult<T>) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      resolve(r);
    };

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        proc.kill();
      } catch {
        /* 已退出 */
      }
    }, timeoutMs);

    proc.stdout.on("data", (chunk: Buffer) => {
      if (oversize) return;
      stdout += chunk.toString("utf8");
      if (stdout.length > MAX_STDOUT_BYTES) {
        oversize = true;
        try {
          proc.kill();
        } catch {
          /* 已退出 */
        }
      }
    });
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
      // 软上限：保留尾部，避免无限累积
      if (stderr.length > MAX_STDERR_BYTES * 2) {
        stderr = "…(truncated)…\n" + stderr.slice(-MAX_STDERR_BYTES);
      }
    });

    proc.on("error", (err) => {
      // eslint-disable-next-line no-console
      console.error(`[runKCli] spawn 失败 args=${JSON.stringify(args)}`, err);
      finalize({ ok: false, error: "spawn failed" });
    });

    proc.on("close", (code) => {
      if (oversize) {
        finalize({
          ok: false,
          error: `子进程输出超过 ${MAX_STDOUT_BYTES} bytes，已强制终止`,
          exitCode: code ?? -1,
        });
        return;
      }
      if (timedOut) {
        finalize({ ok: false, error: `超时 (${timeoutMs}ms)`, exitCode: code ?? -1 });
        return;
      }
      if (code !== 0) {
        // 业务约定：某些命令（如 validate-frontmatter）用非零退出码表达"校验不通过"，
        // 但 stdout 仍是合法的结构化 JSON 结果。caller 传 parseStdoutOnNonZero 时，
        // 先尝试解析 stdout——成功则当正常结果返回（区分"校验不通过"与"命令真出错"）。
        // 解析失败（traceback / 非 JSON）→ 退回下方常规的非零退出错误路径。
        if (parseStdoutOnNonZero && stdout.trim()) {
          try {
            const data = JSON.parse(stdout) as T;
            finalize({ ok: true, data, exitCode: code ?? -1 });
            return;
          } catch {
            /* stdout 不是合法 JSON → 当作真出错，落到下面 */
          }
        }
        // 完整 stderr（含 Python traceback、绝对路径）写服务端日志便于排错；
        // 回给 caller 的 error 字段只保留最末尾一行 + 把项目绝对路径替换为相对，
        // 不暴露内部 stack / 绝对项目结构给客户端
        const fullStderr = stderr.trim() || `非零退出 ${code}`;
        // eslint-disable-next-line no-console
        console.error(
          `[runKCli] k.py args=${JSON.stringify(args)} exit=${code}\n${fullStderr}`,
        );
        const lastLine = fullStderr.split("\n").filter((l) => l.trim()).pop() ?? "";
        // 把项目绝对路径替换为占位符——不暴露磁盘结构给客户端
        const rootStr = root.replace(/\\/g, "\\\\");
        const safeError = lastLine
          .replace(new RegExp(rootStr, "g"), "<project>")
          .replace(new RegExp(rootStr.replace(/\\\\/g, "/"), "g"), "<project>")
          .slice(0, 200) || `非零退出 ${code}`;
        finalize({
          ok: false,
          error: safeError,
          exitCode: code ?? -1,
        });
        return;
      }
      try {
        const data = JSON.parse(stdout) as T;
        finalize({ ok: true, data, exitCode: 0 });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(`[runKCli] JSON 解析失败 args=${JSON.stringify(args)}`, e);
        finalize({ ok: false, error: "JSON parse failed", exitCode: 0 });
      }
    });
  });
}
