/**
 * GET  /api/pages/<path>     读单个 markdown 文件
 * PUT  /api/pages/<path>     写单个 markdown 文件（受路径白名单保护）
 *
 * <path> 是 URL 段拼接的相对路径，例如：
 *   /api/pages/wiki/concepts/transformer.md
 *   /api/pages/wiki/sources/smith2026.md
 *
 * PUT body 可选 `commit_message`：传入即把"写文件 + commit"做成原子操作——
 *   commit 失败时自动回滚文件到原始内容（避免 PUT 成功但 commit 失败留下脏的工作树）。
 */
import { NextRequest, NextResponse } from "next/server";
import { writeFile, fileExists, readFile, isSafeRelPath } from "@/lib/kb";
import { getPage } from "@/lib/kb-service";
import { parseMarkdown, serializeMarkdown } from "@/lib/markdown";
import { checkWritePermissionAsync, isSameOrigin } from "@/lib/permissions";
import { gitAddAndCommit } from "@/lib/git";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: { path: string[] };
}

function joinPath(segments: string[]): string {
  return segments.map((s) => decodeURIComponent(s)).join("/");
}

/** 浅层比较两个 frontmatter 是否同 keyset + 同字段值（忽略顺序）。
 *
 *  比较策略：
 *    - typeof 必须相同——避免 `null` vs `"null"` / `1` vs `"1"` / `true` vs `"true"`
 *      这种跨类型被 String() 兜底假等（会导致 noop 误退出，吞掉用户实际改动）
 *    - 对象 / 数组用 JSON.stringify 字面量比对（数组顺序敏感符合 YAML list 语义；
 *      对象 stringify 在 Node 是按插入顺序，同 keyset+同 value 会 stringify 相等）
 *    - 原始类型直接 === 比对
 */
function shallowFrontmatterEqual(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const k of aKeys) {
    if (!(k in b)) return false;
    const av = a[k];
    const bv = b[k];
    if (typeof av !== typeof bv) return false;
    if (av === bv) continue;
    // null === null 已在上面命中；此处 null vs object 必然 typeof 不同
    if (av === null || bv === null) return false;
    if (typeof av === "object") {
      // 数组 / 嵌套对象走结构化比对
      if (JSON.stringify(av) !== JSON.stringify(bv)) return false;
    } else {
      // 原始类型 === 已比过且不等 → 真不等
      return false;
    }
  }
  return true;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const relPath = joinPath(params.path);

  // 与 PUT 对称：路径越界要返 400 invalid_path 而不是让 safeResolve 抛 500
  if (!isSafeRelPath(relPath)) {
    return NextResponse.json({ error: "invalid_path" }, { status: 400 });
  }

  try {
    const page = await getPage(relPath);
    if (!page) {
      return NextResponse.json(
        { error: "not_found", path: relPath },
        { status: 404 },
      );
    }
    return NextResponse.json({
      path: page.path,
      frontmatter: page.frontmatter,
      content: page.content,
      raw: page.raw,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "read_failed", message: String(err) },
      { status: 500 },
    );
  }
}

// 单个 markdown 文件的合理上限：5 MB（远超任何实际 wiki 页面，但能挡 abuse）
const MAX_RAW_BYTES = 5 * 1024 * 1024;
// frontmatter 顶层 key 数量上限——防止深层嵌套对象触发序列化栈溢出
const MAX_FRONTMATTER_KEYS = 100;

function validateBody(body: {
  frontmatter?: unknown;
  content?: unknown;
  raw?: unknown;
}): { ok: true; raw: string } | { ok: false; status: number; error: string; hint?: string } {
  if (typeof body.raw === "string") {
    if (Buffer.byteLength(body.raw, "utf8") > MAX_RAW_BYTES) {
      return { ok: false, status: 413, error: "raw_too_large", hint: `> ${MAX_RAW_BYTES} bytes` };
    }
    return { ok: true, raw: body.raw };
  }
  if (
    body.frontmatter &&
    typeof body.frontmatter === "object" &&
    !Array.isArray(body.frontmatter) &&
    typeof body.content === "string"
  ) {
    const fm = body.frontmatter as Record<string, unknown>;
    if (Object.keys(fm).length > MAX_FRONTMATTER_KEYS) {
      return { ok: false, status: 413, error: "frontmatter_too_many_keys" };
    }
    if (Buffer.byteLength(body.content, "utf8") > MAX_RAW_BYTES) {
      return { ok: false, status: 413, error: "content_too_large" };
    }
    return { ok: true, raw: serializeMarkdown(fm, body.content) };
  }
  return { ok: false, status: 400, error: "missing_body", hint: "需要 raw 或 frontmatter+content" };
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  // CSRF 兜底：拒绝跨站发起的写请求（本地工具语境，详见 lib/permissions.isSameOrigin）
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "csrf_blocked" }, { status: 403 });
  }

  const relPath = joinPath(params.path);

  // 与 GET 对称：路径越界 400，不要让下游 safeResolve 抛 500
  if (!isSafeRelPath(relPath)) {
    return NextResponse.json({ error: "invalid_path" }, { status: 400 });
  }

  let body: {
    frontmatter?: Record<string, unknown>;
    content?: string;
    raw?: string;
    commit_message?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const validated = validateBody(body);
  if (!validated.ok) {
    return NextResponse.json(
      { error: validated.error, ...(validated.hint && { hint: validated.hint }) },
      { status: validated.status },
    );
  }
  const newRaw = validated.raw;

  // 路径白名单 + frontmatter locked 检查（同时校验现有磁盘文件，防止用户摘掉 lock 再写回）
  const perm = await checkWritePermissionAsync(relPath, newRaw);
  if (!perm.allowed) {
    return NextResponse.json(
      { error: "permission_denied", reason: perm.reason },
      { status: 403 },
    );
  }

  // 保留原始内容供 rollback：只在文件存在时
  const exists = await fileExists(relPath);
  const original = exists ? await readFile(relPath).catch(() => null) : null;

  // 防伪 diff：如果新旧的 frontmatter 字段集 + 字段值完全相同、content 也相同，
  // 唯一差异是 frontmatter key 输出顺序（被 reorderFrontmatter 重排），
  // 跳过 write + commit，回 noop。这样用户打开旧页不改任何东西按保存
  // 不会产生 "仅 fm 重排" 的伪 commit。
  if (original !== null && original !== newRaw) {
    try {
      const oldParsed = parseMarkdown(original);
      const newParsed = parseMarkdown(newRaw);
      if (
        oldParsed.content === newParsed.content &&
        shallowFrontmatterEqual(
          oldParsed.frontmatter as Record<string, unknown>,
          newParsed.frontmatter as Record<string, unknown>,
        )
      ) {
        return NextResponse.json({ ok: true, path: relPath, noop: true });
      }
    } catch {
      /* 解析失败就照常写入 */
    }
  }

  try {
    await writeFile(relPath, newRaw);
  } catch (err) {
    return NextResponse.json(
      { error: "write_failed", message: String(err) },
      { status: 500 },
    );
  }

  // 没要求 commit → 仅写文件
  if (!body.commit_message || typeof body.commit_message !== "string") {
    return NextResponse.json({ ok: true, path: relPath });
  }

  // 原子化：写 + commit；commit 失败回滚到原始内容
  const commit = await gitAddAndCommit([relPath], body.commit_message);
  if (!commit.ok) {
    // rollback 防 race：commit 失败到 rollback 之间如果有别的 PUT/外部进程
    // 改写了同一文件，就**不要**用 original 覆盖——会抹掉别人新写入的内容。
    // 策略：rollback 前先读一次磁盘，与刚才写入的 newRaw 不一致 → 跳过 rollback。
    let rolledBack = false;
    try {
      if (original !== null) {
        const current = await readFile(relPath).catch(() => null);
        if (current === newRaw) {
          // 仍是我们刚写入的内容，没人改 → 安全 rollback
          await writeFile(relPath, original);
          rolledBack = true;
        }
        // current !== newRaw：别人改过了，保留别人写的内容；不 rollback
      }
      // original=null 表示原本不存在：不真删（"删除即标记"），保留新文件让用户手动决定
    } catch {
      /* 回滚失败也只能尽力；返回明确错误让用户知道 */
    }
    return NextResponse.json(
      {
        ok: false,
        error: "commit_failed",
        message: commit.error,
        rolled_back: rolledBack,
      },
      { status: 500 },
    );
  }
  return NextResponse.json({
    ok: true,
    path: relPath,
    commit: commit.commit,
    noop: commit.noop,
    warning: (commit as { warning?: string }).warning,
  });
}
