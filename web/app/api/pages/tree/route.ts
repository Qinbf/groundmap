/**
 * GET /api/pages/tree
 * 列出 wiki/、raw/、my_thoughts/ 下所有 markdown 文件 + frontmatter（精简）
 *
 * 默认范围：wiki/
 * 用 ?include=raw,my_thoughts 扩展
 */
import { NextRequest, NextResponse } from "next/server";
import { getPageTree } from "@/lib/kb-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const include = (req.nextUrl.searchParams.get("include") || "wiki")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const tree = await getPageTree(include);
  return NextResponse.json(tree);
}
