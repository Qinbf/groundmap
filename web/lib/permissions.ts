/**
 * 写权限检查 — 与 AGENTS.md 的写权限硬约束对齐
 * 这是 Next.js API Route 内的第一道防线；Git pre-commit hook 是第二道兜底。
 */
import { parseMarkdown } from "./markdown";
import { fileExists, readFile, isSafeRelPath } from "./kb";

const DENIED_PATH_PATTERNS: RegExp[] = [
  /^raw\//,
  /^my_thoughts\//,
];

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
}

/** YAML tags 字段可能是数组或字符串；都规范化为字符串数组。 */
function normalizeTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((t) => String(t));
  if (typeof raw === "string") return [raw];
  return [];
}

/** 检查 frontmatter 是否含 locked / human-only 锁。 */
function isFrontmatterLocked(text: string): { locked: true; reason: string } | { locked: false } {
  try {
    const { frontmatter } = parseMarkdown(text);
    if (frontmatter.locked === true) {
      return { locked: true, reason: "frontmatter.locked=true，禁止修改" };
    }
    const tags = normalizeTags(frontmatter.tags);
    if (tags.includes("human-only") || tags.includes("#human-only")) {
      return { locked: true, reason: "标签 #human-only，禁止修改" };
    }
    return { locked: false };
  } catch {
    return { locked: false };
  }
}

/**
 * 同源校验（低成本 CSRF 兜底）。
 *
 * 本地知识库工具语境：dev server 监听 127.0.0.1，没有真正的鉴权层。所有
 * state-changing 请求（POST /api/commit、/resolve、/agent-tool；PUT /api/pages）
 * 在执行前应过这道校验——拒绝跨站发起的请求（恶意网页用 `fetch` / `<form>`
 * 打到 localhost），避免被 CSRF 误触发写操作 / commit。
 *
 * 判定逻辑（保守、宁可放行同源也不误杀本地工具）：
 *   - 有 Origin 头：其 origin 必须等于本请求的 Host（同源）才放行；不等 → 拒绝。
 *   - 无 Origin 头但有 Referer：取 Referer 的 origin 同样比对 Host。
 *   - Origin / Referer 都没有（典型为非浏览器客户端：curl / 服务端脚本 /
 *     debug-console 的 server 端 fetch）→ 放行。浏览器跨站请求一定带 Origin，
 *     所以"无 Origin"不是浏览器 CSRF 向量。
 *
 * @param req 任何带 `headers.get(name)` 的请求对象（NextRequest / Request 兼容）
 */
export function isSameOrigin(req: { headers: { get(name: string): string | null } }): boolean {
  const host = req.headers.get("host");
  if (!host) {
    // 没有 Host 头是异常情况（HTTP/1.1 必带）；保守放行——本地工具优先可用性
    return true;
  }
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const source = origin || referer;
  if (!source) {
    // 非浏览器客户端（curl / server-side fetch）不带 Origin/Referer → 放行
    return true;
  }
  try {
    const url = new URL(source);
    // 只比对 host（含端口）——协议在本地 http/https 混用下不可靠，host 一致已足够挡跨站
    return url.host === host;
  } catch {
    // Origin/Referer 不是合法 URL（被篡改）→ 拒绝
    return false;
  }
}

/**
 * 检查路径是否允许写入。
 * @param relPath 相对项目根的 POSIX 路径（如 "wiki/concepts/X.md"）
 * @param newContent 待写入的内容（用于检查 frontmatter 的 locked 与 #human-only）
 */
export function checkWritePermission(
  relPath: string,
  newContent?: string,
): PermissionResult {
  // 0. 路径安全（防遍历）
  if (!isSafeRelPath(relPath)) {
    return { allowed: false, reason: `路径不合法：${relPath}` };
  }
  // 1. 路径白名单
  for (const pattern of DENIED_PATH_PATTERNS) {
    if (pattern.test(relPath)) {
      return {
        allowed: false,
        reason: `${relPath} 位于只读区（raw/ 或 my_thoughts/）`,
      };
    }
  }
  // 2. frontmatter 的 locked 与 #human-only（待写入内容）
  if (newContent) {
    const r = isFrontmatterLocked(newContent);
    if (r.locked) return { allowed: false, reason: r.reason };
  }
  return { allowed: true };
}

/**
 * 异步版：除了基础检查，还会读取**当前磁盘上**的文件检查 locked 标记——
 * 防止 PUT 时用户把 `locked: true` 删掉再写回去。
 *
 * 调用约定：所有写入路径都应该走这个版本（同步版 checkWritePermission 仅用于
 * 一次性检查"待写入内容"是否合规的场景）。
 */
export async function checkWritePermissionAsync(
  relPath: string,
  newContent?: string,
): Promise<PermissionResult> {
  const base = checkWritePermission(relPath, newContent);
  if (!base.allowed) return base;
  // 检查现有文件是否锁定（即使新内容把 lock 摘了，也不放过）
  if (await fileExists(relPath)) {
    try {
      const existing = await readFile(relPath);
      const r = isFrontmatterLocked(existing);
      if (r.locked) return { allowed: false, reason: r.reason };
    } catch {
      // 读不出来就当现有文件无锁——后续写入可能仍会失败，由调用方处理
    }
  }
  return { allowed: true };
}
