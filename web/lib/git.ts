/**
 * Git 操作封装 — 用于编辑保存后自动 commit
 */
import { spawn } from "node:child_process";
import { workspaceRoot } from "./kb";

function runGit(args: string[]): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    // cwd 必须是 workspaceRoot()：调用方传的是 workspace 相对路径（wiki/...），
    // 文件实际写在 workspaces/<ws>/ 下；以引擎根为 cwd 时 pathspec 解析不到文件。
    // 以 workspace 为 cwd 还兼容 KB_ROOT 指向独立数据仓库的布局（git 自行向上找仓库根）。
    const proc = spawn("git", args, { cwd: workspaceRoot() });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const finalize = (result: { ok: boolean; stdout: string; stderr: string }) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    proc.stdout.on("data", (b: Buffer) => (stdout += b.toString("utf8")));
    proc.stderr.on("data", (b: Buffer) => (stderr += b.toString("utf8")));
    // spawn 自身失败（如 cwd 不存在 → ENOENT，KB_WORKSPACE/KB_ROOT 误配时可触发）：
    // 不监听 'error' 会变成未捕获异常崩进程；监听后 'close' 可能不再触发，须在此 resolve。
    proc.on("error", (err: Error) => {
      finalize({ ok: false, stdout, stderr: stderr || String(err) });
    });
    proc.on("close", (code) => {
      finalize({ ok: code === 0, stdout, stderr });
    });
  });
}

/** Commit message 安全清洗：限长 + 折叠连续空行 + 去控制字符。
 *
 * 过滤范围：
 *   - C0 控制字符（\x00-\x1F），保留 \n \t
 *   - DEL（\x7F）
 *   - C1 控制字符（\x80-\x9F）—— Unicode legacy，部分会让 git log 显示异常
 *   - U+2028 LINE SEPARATOR / U+2029 PARAGRAPH SEPARATOR —— JS 字符串能塞，
 *     git log 解析时会被当真换行
 */
export function sanitizeCommitMessage(raw: string, maxLen = 500): string {
  if (typeof raw !== "string") return "";
  let s = raw.replace(/[\x00-\x08\x0B-\x1F\x7F-\x9F\u2028\u2029]/g, "");
  // 折叠 3+ 个连续换行为 2 个（保留段落分隔）
  s = s.replace(/\n{3,}/g, "\n\n");
  s = s.trim();
  if (s.length > maxLen) s = s.slice(0, maxLen).trimEnd() + "…";
  return s;
}

/** 统一的 commit 返回类型——避免下游解构时 TS 推断成歧义 union 而拿不到字段。 */
export interface CommitResult {
  ok: boolean;
  error?: string;
  message?: string;
  commit?: string;
  noop?: boolean;
  warning?: string;
}

/**
 * 把指定 files 加入暂存并 commit。
 *
 * 关键约束：
 *   - `git commit -- ...files` 限定**只**提交这些文件——避免把别处预先 stage 的
 *     无关改动一起带走（数据完整性问题）。
 *   - rev-parse 失败时仍返回 ok，但 commit 字段填 "?" + warning。
 */
export async function gitAddAndCommit(files: string[], message: string): Promise<CommitResult> {
  if (files.length === 0) return { ok: false, error: "没有要提交的文件" };

  const safeMsg = sanitizeCommitMessage(message);
  if (!safeMsg) return { ok: false, error: "commit message 为空" };

  const addResult = await runGit(["add", "--", ...files]);
  if (!addResult.ok) return { ok: false, error: `git add 失败: ${addResult.stderr}` };

  // 用 git diff --cached -- ...files 限定到本批文件，避免别处 staged 改动干扰判断
  const diffResult = await runGit(["diff", "--cached", "--quiet", "--", ...files]);
  if (diffResult.ok) {
    // exit 0 表示这批文件无变更
    return { ok: true, noop: true, message: "无实际变更，跳过 commit" };
  }

  // -- ...files 限定本次 commit 仅这些文件，不带走预先 staged 的别的内容
  const commitResult = await runGit(["commit", "-m", safeMsg, "--", ...files]);
  if (!commitResult.ok) {
    return { ok: false, error: `git commit 失败: ${commitResult.stderr}` };
  }

  // 取最新 commit hash；rev-parse 失败时降级为 "?" + warning，仍视为 ok
  const revResult = await runGit(["rev-parse", "HEAD"]);
  const commit = revResult.ok ? revResult.stdout.trim().slice(0, 7) : "?";
  const out: CommitResult = {
    ok: true,
    commit,
    message: safeMsg,
  };
  if (!revResult.ok) {
    out.warning = `rev-parse HEAD 失败: ${revResult.stderr.trim() || "unknown"}`;
  }
  return out;
}
