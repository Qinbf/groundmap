import { NextResponse } from "next/server";
import { runKCli } from "@/lib/k-cli";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await runKCli(["list-conflicts"]);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json(result.data);
}
