/**
 * 知识库文件系统**原语层** — 项目根定位与受控 I/O
 *
 * ⚠️ 调用约定：
 *   - **wiki 内容读取**（页面元数据/正文/反链/出链/存在性检查）必须走
 *     `lib/kb-service.ts`，不要从这里直接 import。
 *   - 仅以下场景允许直接调用本模块：
 *     1. raw/ 资产读写（不是 markdown 页面）
 *     2. 写路径（writeFile / 待 service 抽象）
 *     3. lib/kb-service.ts 内部实现
 *
 * 这样未来把 service 内部换成 SQLite 索引读取时，所有 caller 0 改动。
 */
import path from "node:path";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { cookies } from "next/headers";

/**
 * 引擎根目录：web/ 的父目录（scripts/、CLAUDE.md 所在目录）。
 * Next.js 启动时 cwd 通常就是 web/，所以 ../ 即可。
 * 也支持 KB_ROOT 环境变量覆盖（便于测试）。
 */
export function projectRoot(): string {
  if (process.env.KB_ROOT) return process.env.KB_ROOT;
  return path.resolve(process.cwd(), "..");
}

export const WORKSPACE_COOKIE = "kb_workspace";
const DEFAULT_WORKSPACE = "smb-ecommerce";
// workspace 名只允许字母/数字/下划线/连字符——同时挡住 cookie/env 里的 ../ 路径穿越
const WS_NAME_RE = /^[A-Za-z0-9_-]+$/;

/** 列出当前数据根下所有 workspace 名（projectRoot()/workspaces/ 的子目录）。 */
export function listWorkspaces(): string[] {
  try {
    return fs
      .readdirSync(path.resolve(projectRoot(), "workspaces"), { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith("."))
      .map((d) => d.name)
      .sort();
  } catch {
    return [];
  }
}

/**
 * 解析当前 workspace：cookie `kb_workspace`（web 端切换器）优先 → `KB_WORKSPACE` 环境变量 → 默认。
 * cookie 用户可控，必须是**真实存在**的 workspace 目录才采纳（防 cookie 注入路径穿越 / 指向不存在的库）。
 */
export function resolveWorkspace(): string {
  let cookieWs: string | undefined;
  try {
    cookieWs = cookies().get(WORKSPACE_COOKIE)?.value;
  } catch {
    // 非请求上下文（如模块初始化）下 cookies() 会抛 —— 忽略，回退 env / 默认
  }
  if (cookieWs && WS_NAME_RE.test(cookieWs) && listWorkspaces().includes(cookieWs)) {
    return cookieWs;
  }
  const envWs = process.env.KB_WORKSPACE;
  if (envWs && WS_NAME_RE.test(envWs)) {
    // 与 cookie 分支同口径做存在性校验：env 拼错时若直接采纳，写路径的
    // mkdir recursive 会凭空建出错误 workspace 并静默写入，用户难以察觉
    if (listWorkspaces().includes(envWs)) return envWs;
    console.warn(`[kb] KB_WORKSPACE="${envWs}" 不是已存在的 workspace，回退默认 ${DEFAULT_WORKSPACE}`);
  }
  return DEFAULT_WORKSPACE;
}

/**
 * 工作区根目录：实际存放 wiki/、raw/、exports/ 的目录。
 * 当前 workspace 由 resolveWorkspace() 决定（web cookie > KB_WORKSPACE env > 默认）。
 */
export function workspaceRoot(): string {
  return path.resolve(projectRoot(), "workspaces", resolveWorkspace());
}

/** 把相对路径解析为绝对路径，并防止越界（path traversal）。 */
export function safeResolve(relPath: string): string {
  if (typeof relPath !== "string" || !relPath) {
    throw new Error(`路径不合法（空字符串）`);
  }
  const root = workspaceRoot();
  // 拒绝绝对路径——否则 `path.resolve(root, "/etc/passwd")` 会忽略 root 直出 "/etc/passwd"
  if (path.isAbsolute(relPath)) {
    throw new Error(`路径越界（不接受绝对路径）：${relPath}`);
  }
  // 标准化：去掉前导 ./、把反斜杠换为正斜杠
  const normalized = relPath.replace(/\\/g, "/").replace(/^\.?\/+/, "");
  if (!normalized) {
    // 仅由 "./" 之类构成 → 等同空相对路径，拒绝
    throw new Error(`路径不合法（解析后为空）：${relPath}`);
  }
  const abs = path.resolve(root, normalized);
  // path.relative：abs 在 root 内时返回相对路径；越界（含兄弟目录）时以 ".." 起头；
  // 等于 "" 表示指向 root 自身——也禁止（caller 不应该把 "" 当文件路径）
  const rel = path.relative(root, abs);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`路径越界：${relPath}`);
  }
  return abs;
}

/** 校验一个相对路径是否安全（不越界、不绝对）。不抛错，返回 boolean。 */
export function isSafeRelPath(relPath: string): boolean {
  if (typeof relPath !== "string" || !relPath) return false;
  if (path.isAbsolute(relPath)) return false;
  try {
    safeResolve(relPath);
    return true;
  } catch {
    return false;
  }
}

/** 读侧目录白名单：只有 wiki/ 与 raw/ 是 agent / web 可读区。 */
const READABLE_DIR_PREFIXES = ["wiki/", "raw/"] as const;

/**
 * 校验一个相对路径是否落在**可读区**（wiki/ 或 raw/）。
 *
 * `isSafeRelPath` 只防路径穿越（不出 PROJECT_ROOT），但 `my_thoughts/`、`exports/`、
 * `log.md` 等仍在工作区内、`isSafeRelPath` 会放行。读侧（GET /api/pages、/outline、
 * /blocks、/outlinks、/validate、详情页）必须再叠一层 `isReadableDir`，否则
 * `my_thoughts/` 人类专属区的内容会被读出（CLAUDE.md 硬约束：只读 + 路径名本身即隐私）。
 *
 * **不安全 / 越界路径直接判 false**（先过 isSafeRelPath）。命中可读区返回 true，
 * 否则 false——调用方收到 false 时应返回 404（不要 403，避免泄露路径是否存在）。
 */
export function isReadableDir(relPath: string): boolean {
  if (!isSafeRelPath(relPath)) return false;
  const normalized = relPath.replace(/\\/g, "/").replace(/^\.?\/+/, "");
  return READABLE_DIR_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

/** 把绝对路径转回 POSIX 风格的相对路径 */
export function toRelPosix(absPath: string): string {
  const root = workspaceRoot();
  return path.relative(root, absPath).replace(/\\/g, "/");
}

/** 列出目录下所有 .md 文件（递归） */
export async function listMarkdownFiles(relDir: string): Promise<string[]> {
  const absDir = safeResolve(relDir);
  if (!fs.existsSync(absDir)) return [];

  const out: string[] = [];

  async function walk(dir: string) {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      if (entry.name.startsWith(".")) continue;
      if (entry.name === "_templates") continue;
      if (entry.isDirectory()) {
        await walk(abs);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        out.push(toRelPosix(abs));
      }
    }
  }

  await walk(absDir);
  return out.sort();
}

/** Symlink 防护：解析后的真实路径必须仍在 PROJECT_ROOT 内。
 *  否则 `wiki/foo.md → /etc/passwd` 这种 symlink 会让 safeResolve 检查通过、
 *  realpath 把读取重定向到项目外。
 *
 *  仅当文件存在时检查（lstat 失败说明是新文件，写入路径自然不可能是 symlink）。
 *  失败时抛错——与 safeResolve 风格一致。
 */
function assertNotSymlinkEscape(abs: string): void {
  try {
    // realpathSync 跟随所有 symlink；不存在时抛 ENOENT，让 caller 决定
    const real = fs.realpathSync(abs);
    const root = fs.realpathSync(workspaceRoot());
    const rel = path.relative(root, real);
    if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) {
      throw new Error(`路径越界（symlink 指向 PROJECT_ROOT 外）：${abs}`);
    }
  } catch (e: unknown) {
    if (
      e &&
      typeof e === "object" &&
      "code" in e &&
      (e as { code: string }).code === "ENOENT"
    ) {
      // 路径不存在（新文件场景）→ 不可能是 symlink，放行
      return;
    }
    throw e;
  }
}

/** 读单个文件（UTF-8）。把 CRLF 规范化为 LF，避免 SSR/hydration 不一致 */
export async function readFile(relPath: string): Promise<string> {
  const abs = safeResolve(relPath);
  assertNotSymlinkEscape(abs);
  const raw = await fsp.readFile(abs, "utf8");
  return raw.replace(/\r\n/g, "\n");
}

/** 写单个文件（UTF-8）。调用者负责权限校验。 */
export async function writeFile(relPath: string, content: string): Promise<void> {
  const abs = safeResolve(relPath);
  // 写入前若文件已存在且是 symlink → 拒绝（避免覆盖项目外文件）
  assertNotSymlinkEscape(abs);
  await fsp.mkdir(path.dirname(abs), { recursive: true });
  await fsp.writeFile(abs, content, "utf8");
}

export async function fileExists(relPath: string): Promise<boolean> {
  try {
    const abs = safeResolve(relPath);
    const st = await fsp.stat(abs);
    if (!st.isFile()) return false;
    // 同时挡 symlink 越界，与 readFile/writeFile 行为对称
    assertNotSymlinkEscape(abs);
    return true;
  } catch {
    return false;
  }
}
