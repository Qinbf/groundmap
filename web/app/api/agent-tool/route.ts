/**
 * POST /api/agent-tool
 *
 * 通用 KB 工具调度端点，给外部 LLM agent（如 tools/debug-console/）用。
 * 白名单只读工具；写工具一律拒绝（即便前端被恶意改造也无法越权）。
 *
 * 请求体：{ tool: string, args: object }
 * 响应：{ ok: true, data: any } | { ok: false, error: string }
 *
 * 安全约束：
 *   - 工具名白名单（见 TOOL_HANDLERS）
 *   - 所有 path 参数走 isSafeRelPath 校验，限制在 wiki/ raw/ 下
 *   - 透传 runKCli 现有的 30s 超时 + 10MB stdout 上限
 *   - 不内嵌 LLM SDK；本路由是纯 HTTP 桥接
 */
import { NextRequest, NextResponse } from "next/server";
import { runKCli } from "@/lib/k-cli";
import { isSafeRelPath } from "@/lib/kb";
import { getPage } from "@/lib/kb-service";
import { isSameOrigin } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const MAX_QUERY_LEN = 200;
const MAX_SNIPPET_LEN = 500;
const MAX_LIMIT = 100;

type ToolHandler = (args: Record<string, unknown>) => Promise<
  { ok: true; data: unknown } | { ok: false; error: string; status?: number }
>;

function bad(error: string, status = 400) {
  return { ok: false as const, error, status };
}

function getStr(args: Record<string, unknown>, key: string): string | undefined {
  const v = args[key];
  return typeof v === "string" ? v : undefined;
}

function getInt(args: Record<string, unknown>, key: string): number | undefined {
  const v = args[key];
  if (typeof v === "number" && Number.isFinite(v)) return Math.floor(v);
  if (typeof v === "string") {
    const n = parseInt(v, 10);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function requirePath(args: Record<string, unknown>): string | { error: string } {
  const p = getStr(args, "path");
  if (!p) return { error: "missing args.path" };
  if (!isSafeRelPath(p)) return { error: "invalid_path" };
  if (!(p.startsWith("wiki/") || p.startsWith("raw/"))) {
    return { error: "path must be under wiki/ or raw/" };
  }
  return p;
}

async function callKCli(cliArgs: string[]) {
  const result = await runKCli(cliArgs);
  if (!result.ok) {
    return { ok: false as const, error: result.error || "kcli_failed", status: 500 };
  }
  return { ok: true as const, data: result.data };
}

/**
 * 锚点查找 fallback：AI 常把 [[raw/articles/X#^p-NN]] 误写成 [[wiki/sources/X#^p-NN]]
 * （摘要页 basename 通常等同 raw 文件 basename，AI 偷懒省了前缀）。
 *
 * 程序兜底：当 path 是 wiki/sources/X.md 且 anchor 在该路径未找到时，
 * 自动尝试 raw/articles/X.md 和 raw/papers/X.md。比改 system prompt 稳。
 *
 * 仅对 anchor-not-found 类错误兜底，其他错误（路径不存在 / 权限等）原样返回。
 */
async function readWithSourcesFallback(
  cmd: "read-block" | "read-section",
  originalPath: string,
  anchor: string,
) {
  const primary = await callKCli([cmd, originalPath, anchor]);
  if (primary.ok) return primary;
  if (!primary.error.includes("未找到 anchor")) return primary;
  const m = originalPath.match(/^wiki\/sources\/(.+\.md)$/);
  if (!m) return primary;
  const basename = m[1];
  for (const candidate of [`raw/articles/${basename}`, `raw/papers/${basename}`]) {
    const retry = await callKCli([cmd, candidate, anchor]);
    if (retry.ok) {
      // eslint-disable-next-line no-console
      console.log(
        `[anchor-fallback] ${cmd} ${originalPath}#${anchor} → ${candidate}`,
      );
      const augmented =
        retry.data && typeof retry.data === "object" && !Array.isArray(retry.data)
          ? {
              ...(retry.data as Record<string, unknown>),
              _fallback: {
                from: originalPath,
                to: candidate,
                reason: "anchor 未在 wiki/sources 找到，已回退到对应 raw 文件",
              },
            }
          : retry.data;
      return { ok: true as const, data: augmented };
    }
  }
  return primary;
}

// ============================================================
// 工具白名单
// ============================================================

const TOOL_HANDLERS: Record<string, ToolHandler> = {
  async search(args) {
    const q = getStr(args, "query");
    if (!q) return bad("missing args.query");
    if (q.length > MAX_QUERY_LEN) return bad("query_too_long");
    if (q.startsWith("-")) return bad("invalid_query (cannot start with -)");
    let limit = getInt(args, "limit") ?? 20;
    if (limit < 1) limit = 1;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;
    return callKCli(["search", q, "--limit", String(limit)]);
  },

  async outline(args) {
    const p = requirePath(args);
    if (typeof p !== "string") return bad(p.error);
    return callKCli(["outline", p]);
  },

  async read_section(args) {
    const p = requirePath(args);
    if (typeof p !== "string") return bad(p.error);
    const anchor = getStr(args, "anchor");
    if (!anchor) return bad("missing args.anchor");
    return readWithSourcesFallback("read-section", p, anchor);
  },

  async read_block(args) {
    const p = requirePath(args);
    if (typeof p !== "string") return bad(p.error);
    const anchor = getStr(args, "anchor");
    if (!anchor) return bad("missing args.anchor");
    return readWithSourcesFallback("read-block", p, anchor);
  },

  async blocks(args) {
    const p = requirePath(args);
    if (typeof p !== "string") return bad(p.error);
    return callKCli(["blocks", p]);
  },

  async find_anchor(args) {
    const p = requirePath(args);
    if (typeof p !== "string") return bad(p.error);
    const snippet = getStr(args, "snippet");
    if (!snippet) return bad("missing args.snippet");
    if (snippet.length > MAX_SNIPPET_LEN) return bad("snippet_too_long");
    let limit = getInt(args, "limit") ?? 10;
    if (limit < 1) limit = 1;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;
    return callKCli(["find-anchor", p, snippet, "--limit", String(limit)]);
  },

  async backlinks(args) {
    const p = requirePath(args);
    if (typeof p !== "string") return bad(p.error);
    return callKCli(["backlinks", p]);
  },

  async outlinks(args) {
    const p = requirePath(args);
    if (typeof p !== "string") return bad(p.error);
    return callKCli(["outlinks", p]);
  },

  async list_pages(args) {
    const flags: string[] = ["list-pages"];
    const filters: Array<[string, string]> = [
      ["type", "--type"],
      ["status", "--status"],
      ["confidence", "--confidence"],
      ["tag", "--tag"],
      ["modified_by", "--modified-by"],
    ];
    for (const [key, flag] of filters) {
      const v = getStr(args, key);
      if (v) flags.push(flag, v);
    }
    return callKCli(flags);
  },

  async list_orphans() {
    return callKCli(["list-orphans"]);
  },

  async list_conflicts() {
    return callKCli(["list-conflicts"]);
  },

  async list_to_update() {
    return callKCli(["list-to-update"]);
  },

  async list_broken_refs() {
    return callKCli(["list-broken-refs"]);
  },

  async list_source_issues() {
    return callKCli(["list-source-issues"]);
  },

  async list_unsummarized() {
    return callKCli(["list-unsummarized"]);
  },

  async list_bare_claims() {
    return callKCli(["list-bare-claims"]);
  },

  async list_index_mismatches() {
    return callKCli(["list-index-mismatches"]);
  },

  async health() {
    return callKCli(["health"]);
  },

  async read_page(args) {
    const p = requirePath(args);
    if (typeof p !== "string") return bad(p.error);
    const page = await getPage(p);
    if (!page) return bad("page_not_found", 404);
    return {
      ok: true as const,
      data: {
        path: page.path,
        meta: page.meta,
        frontmatter: page.frontmatter,
        content: page.content,
      },
    };
  },
};

function listTools(): string[] {
  return Object.keys(TOOL_HANDLERS);
}

export async function POST(req: NextRequest) {
  // CSRF 兜底：拒绝跨站发起的请求（本地工具语境）。debug-console 走 server 端 fetch
  // 不带 Origin/Referer → isSameOrigin 放行；浏览器跨站攻击一定带 Origin → 被挡。
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "csrf_blocked" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "body must be an object" },
      { status: 400 },
    );
  }
  const { tool, args } = body as { tool?: unknown; args?: unknown };
  if (typeof tool !== "string" || !tool) {
    return NextResponse.json(
      { ok: false, error: "missing tool" },
      { status: 400 },
    );
  }
  const handler = TOOL_HANDLERS[tool];
  if (!handler) {
    return NextResponse.json(
      { ok: false, error: `tool_not_allowed: ${tool}` },
      { status: 403 },
    );
  }
  const safeArgs: Record<string, unknown> =
    args && typeof args === "object" && !Array.isArray(args)
      ? (args as Record<string, unknown>)
      : {};

  const result = await handler(safeArgs);
  if (!result.ok) {
    const status = "status" in result && result.status ? result.status : 400;
    return NextResponse.json(
      { ok: false, error: result.error },
      { status },
    );
  }
  return NextResponse.json({ ok: true, data: result.data });
}

// GET /api/agent-tool → 返回工具白名单清单（给前端 picker 用，方便看支持哪些工具）
export async function GET() {
  return NextResponse.json({ tools: listTools() });
}
