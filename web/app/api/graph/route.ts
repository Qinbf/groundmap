/**
 * GET /api/graph?type=&tag=&include_archive=1
 * 返回 wiki 链接图谱：{ nodes: Node[], edges: Edge[] }
 *
 * Node = { path, title, type, status, tags, inbound_count, outbound_count }
 * Edge = { from, to, link_type, anchor? }
 *
 * 数据来自 scripts/k.py graph 子命令，markdown 仍是唯一真相源。
 */
import { NextRequest, NextResponse } from "next/server";
import { runKCli } from "@/lib/k-cli";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const args: string[] = ["graph"];
  const type = sp.get("type");
  const tag = sp.get("tag");
  const includeArchive = sp.get("include_archive");
  if (type) args.push("--type", type);
  if (tag) args.push("--tag", tag);
  if (includeArchive === "1" || includeArchive === "true") {
    args.push("--include-archive");
  }
  const result = await runKCli(args);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json(result.data);
}
