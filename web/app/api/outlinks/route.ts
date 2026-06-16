/**
 * GET /api/outlinks?path=wiki/concepts/X.md
 * 返回该页面发出的所有 [[link]]
 */
import { NextRequest, NextResponse } from "next/server";
import { pageExists, getOutlinks } from "@/lib/kb-service";
import { isSafeRelPath } from "@/lib/kb";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sourcePath = req.nextUrl.searchParams.get("path");
  if (!sourcePath) {
    return NextResponse.json({ error: "缺少 path 参数" }, { status: 400 });
  }

  const normalized = sourcePath.replace(/\\/g, "/").replace(/^\.?\/+/, "");
  if (!isSafeRelPath(normalized)) {
    return NextResponse.json({ error: "invalid_path" }, { status: 400 });
  }
  if (!(await pageExists(normalized))) {
    return NextResponse.json({ error: "not_found", path: normalized }, { status: 404 });
  }

  const links = await getOutlinks(normalized);
  return NextResponse.json({ source: normalized, count: links.length, links });
}
