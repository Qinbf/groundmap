/**
 * GET /api/providers — 列出所有 provider + 是否可用 + 支持的 model
 */
import { NextResponse } from "next/server";
import { listProviders } from "@/lib/providers";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ providers: listProviders() });
}
