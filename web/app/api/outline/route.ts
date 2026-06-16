/**
 * GET /api/outline?path=<rel-path>
 * 返回文档的章节大纲（来自 .outline.json 或现场计算）
 */
import { NextRequest, NextResponse } from "next/server";
import { runKCli } from "@/lib/k-cli";
import { isSafeRelPath, isReadableDir } from "@/lib/kb";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "missing path" }, { status: 400 });
  }
  if (!isSafeRelPath(path)) {
    return NextResponse.json({ error: "invalid_path" }, { status: 400 });
  }
  // 读侧白名单：非可读区（my_thoughts/ 等）按"不存在"处理，返回 404 不泄露路径
  if (!isReadableDir(path)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const result = await runKCli(["outline", path]);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json(result.data);
}
