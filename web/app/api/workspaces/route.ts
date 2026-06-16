import { NextResponse } from "next/server";
import { listWorkspaces, resolveWorkspace } from "@/lib/kb";

export const dynamic = "force-dynamic";

/** 列出当前数据根（KB_ROOT）下的所有 workspace 与当前所选，供顶栏 WorkspaceSwitcher 用。 */
export async function GET() {
  return NextResponse.json({
    workspaces: listWorkspaces(),
    current: resolveWorkspace(),
  });
}
