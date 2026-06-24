/**
 * POST /api/preview — 浏览器调本端点，server-side 转发到主 web/ 的 /api/agent-tool
 *
 * 为什么不让浏览器直接调 :3006？跨端口 CORS 麻烦；用 server proxy 一行解决。
 */
import { NextRequest, NextResponse } from "next/server";
import { executeTool, workspaceContext } from "@/lib/kb-http-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 只允许预览类（只读）工具，防止前端瞎调
const ALLOWED = new Set(["read_page", "read_section", "read_block"]);

const WS_NAME_RE = /^[A-Za-z0-9_-]+$/;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "bad body" }, { status: 400 });
  }
  const { tool, args, workspace } = body as {
    tool?: unknown;
    args?: unknown;
    workspace?: unknown;
  };
  if (typeof tool !== "string" || !ALLOWED.has(tool)) {
    return NextResponse.json({ ok: false, error: "tool not allowed" }, { status: 403 });
  }
  const safeArgs: Record<string, unknown> =
    args && typeof args === "object" && !Array.isArray(args)
      ? (args as Record<string, unknown>)
      : {};
  // 预览必须与答案查同一个 workspace，否则锚点对不上 → 报错。
  const ws = typeof workspace === "string" && WS_NAME_RE.test(workspace) ? workspace : undefined;
  const result = await workspaceContext.run(ws, () => executeTool(tool, safeArgs));
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, data: result.data });
}
