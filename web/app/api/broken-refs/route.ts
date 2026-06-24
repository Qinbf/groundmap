/**
 * GET /api/broken-refs
 * 列出 wiki/ 中失效的 [[raw/...#^anchor]] 引用
 */
import { NextResponse } from "next/server";
import { runKCli } from "@/lib/k-cli";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await runKCli(["list-broken-refs"]);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json(result.data);
}
