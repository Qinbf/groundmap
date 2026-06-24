/**
 * GET /api/workspaces — 代理主 web/ 的 /api/workspaces
 *
 * 给控制台解析活动 workspace 用：校验 ?ws 是否真实存在 + 取 web 当前默认库做兜底。
 * 走 server proxy（同 /api/preview）避免浏览器跨端口 CORS。
 */
import { NextResponse } from "next/server";
import { kbApiBase } from "@/lib/kb-http-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const res = await fetch(`${kbApiBase()}/api/workspaces`, { cache: "no-store" });
    if (!res.ok) return NextResponse.json({ workspaces: [], current: null });
    const data = (await res.json()) as { workspaces?: unknown; current?: unknown };
    return NextResponse.json({
      workspaces: Array.isArray(data.workspaces) ? data.workspaces : [],
      current: typeof data.current === "string" ? data.current : null,
    });
  } catch {
    // web 没起 / 不可达：返回空列表，选择器自然隐藏，控制台仍可用（落到默认库）
    return NextResponse.json({ workspaces: [], current: null });
  }
}
