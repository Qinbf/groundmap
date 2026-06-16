/**
 * POST /api/commit
 * Body: { files: string[], message: string }
 * 编辑保存后自动 commit。
 *
 * 安全：每个 file 必须通过 checkWritePermissionAsync。任何不通过即整体拒绝，
 * 防止 web 端把 raw/ 或 #human-only / locked 的文件偷偷 commit。
 */
import { NextRequest, NextResponse } from "next/server";
import { gitAddAndCommit } from "@/lib/git";
import { checkWritePermissionAsync, isSameOrigin } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // CSRF 兜底：拒绝跨站发起的写请求（本地工具语境，详见 lib/permissions.isSameOrigin）
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "csrf_blocked" }, { status: 403 });
  }

  let body: { files?: string[]; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { files, message } = body;
  if (!files || !Array.isArray(files) || files.length === 0) {
    return NextResponse.json({ error: "missing_files" }, { status: 400 });
  }
  if (!files.every((f) => typeof f === "string")) {
    return NextResponse.json({ error: "invalid_files" }, { status: 400 });
  }
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "missing_message" }, { status: 400 });
  }

  // 逐个文件校验权限：路径白名单 + 现有文件 frontmatter 锁
  for (const f of files) {
    const perm = await checkWritePermissionAsync(f);
    if (!perm.allowed) {
      return NextResponse.json(
        { error: "permission_denied", path: f, reason: perm.reason },
        { status: 403 },
      );
    }
  }

  const result = await gitAddAndCommit(files, message);
  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }
  return NextResponse.json(result);
}
