import { NextRequest, NextResponse } from "next/server";
import { runKCli } from "@/lib/k-cli";

export const dynamic = "force-dynamic";

const MAX_Q_LEN = 200;
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

export async function GET(req: NextRequest) {
  const qRaw = req.nextUrl.searchParams.get("q");
  const limitRaw = req.nextUrl.searchParams.get("limit") || String(DEFAULT_LIMIT);

  if (!qRaw) {
    return NextResponse.json({ error: "缺少 q 参数" }, { status: 400 });
  }
  if (qRaw.length > MAX_Q_LEN) {
    return NextResponse.json(
      { error: "q_too_long", hint: `> ${MAX_Q_LEN} chars` },
      { status: 400 },
    );
  }
  // q 起头是 `-` 会被 argparse 当 flag——拒绝。这是搜索关键词场景，不应该
  // 真的需要以 `-` 起头的查询；用户想搜含 `-` 的词只需把 `-` 放中间。
  if (qRaw.startsWith("-")) {
    return NextResponse.json({ error: "invalid_q" }, { status: 400 });
  }

  // limit clamp 到 [1, MAX_LIMIT]
  let limit = parseInt(limitRaw, 10);
  if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  const result = await runKCli(["search", qRaw, "--limit", String(limit)]);
  if (!result.ok) {
    return NextResponse.json({ error: "kcli_failed" }, { status: 500 });
  }
  return NextResponse.json(result.data);
}
