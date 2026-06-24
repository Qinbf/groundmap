/**
 * GET /api/backlinks?path=wiki/concepts/X.md
 * 返回所有链接到该页面的位置 + 上下文
 *
 * 实现细节由 lib/kb-service 封装；本路由只做参数解析与响应。
 */
import { NextRequest, NextResponse } from "next/server";
import { getBacklinks } from "@/lib/kb-service";
import { isSafeRelPath } from "@/lib/kb";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const targetPath = req.nextUrl.searchParams.get("path");
  if (!targetPath) {
    return NextResponse.json({ error: "缺少 path 参数" }, { status: 400 });
  }

  const normalizedTarget = targetPath.replace(/\\/g, "/").replace(/^\.?\/+/, "");
  if (!isSafeRelPath(normalizedTarget)) {
    return NextResponse.json({ error: "invalid_path" }, { status: 400 });
  }
  const hits = await getBacklinks(normalizedTarget);
  return NextResponse.json({ target: normalizedTarget, count: hits.length, hits });
}
