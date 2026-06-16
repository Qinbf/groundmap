/**
 * POST /api/resolve
 * Body: { path: string, action: ResolveAction, payload?: ResolvePayload }
 *
 * 健康度问题的一键处理入口。详细 action 列表见 lib/operations.ts。
 * 部分 action（adopt_new / merge）需要 payload 提供用户输入文本。
 */
import { NextRequest, NextResponse } from "next/server";
import {
  applyResolve,
  type ResolveAction,
  type ResolvePayload,
} from "@/lib/operations";
import { isSameOrigin } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const VALID_ACTIONS: ResolveAction[] = [
  "set_status_deprecated",
  "set_status_reviewed",
  "set_confidence_medium",
  "set_confidence_high",
  "remove_to_be_updated",
  "resolve_conflict_keep_old",
  "resolve_conflict_keep_watching",
  "resolve_conflict_adopt_new",
  "resolve_conflict_merge",
];

export async function POST(req: NextRequest) {
  // CSRF 兜底：拒绝跨站发起的写请求（本地工具语境，详见 lib/permissions.isSameOrigin）
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "csrf_blocked" }, { status: 403 });
  }

  let body: { path?: string; action?: string; payload?: ResolvePayload };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { path: relPath, action, payload } = body;
  if (!relPath) {
    return NextResponse.json({ error: "missing_path" }, { status: 400 });
  }
  if (!action || !VALID_ACTIONS.includes(action as ResolveAction)) {
    return NextResponse.json(
      { error: "invalid_action", valid: VALID_ACTIONS },
      { status: 400 },
    );
  }

  const result = await applyResolve(relPath, action as ResolveAction, payload);
  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }
  return NextResponse.json(result);
}
