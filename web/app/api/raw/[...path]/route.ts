/**
 * GET /api/raw/<path>[?anchor=h-2-3-abc]
 * 读 raw/ 下的原始资料（用于悬浮预览）。严格只读。
 *
 * - 无 anchor：返回整篇内容（fallback / 短文档）
 * - anchor 以 h- 开头：调 k.py read-section 返回完整 H 段
 * - anchor 以 p-/t-/c-/f- 开头：调 k.py read-block 返回单段原文
 */
import { NextRequest, NextResponse } from "next/server";
import { fileExists, readFile, isSafeRelPath } from "@/lib/kb";
import { runKCli } from "@/lib/k-cli";

export const dynamic = "force-dynamic";

interface SectionResult {
  path: string;
  anchor: string;
  title: string;
  level: number;
  content: string;
  agent_summary?: string | null;
  preview?: string;
}

interface BlockResult {
  path: string;
  anchor: string;
  kind: string;
  content: string;
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const relPath = params.path.map((s) => decodeURIComponent(s)).join("/");

  // 必须在 raw/ 下；同时挡 raw/../wiki/x.md 这种 startsWith 匹配但 .. 把
  // 实际目标推到 raw/ 之外的形式（用 normalize 后再次校验）
  const normalized = relPath.replace(/\\/g, "/").replace(/\/+\.\/+/g, "/");
  if (
    !relPath.startsWith("raw/") ||
    !isSafeRelPath(relPath) ||
    !normalized.startsWith("raw/") ||
    normalized.includes("/../") ||
    normalized.startsWith("../")
  ) {
    return NextResponse.json(
      { error: "invalid_path" },
      { status: 400 },
    );
  }

  if (!(await fileExists(relPath))) {
    return NextResponse.json({ error: "not_found", path: relPath }, { status: 404 });
  }

  // 提取 anchor 参数（去掉可能的 ^ 前缀）
  const rawAnchor = req.nextUrl.searchParams.get("anchor");
  const anchor = rawAnchor ? rawAnchor.replace(/^\^/, "") : null;

  if (anchor) {
    if (/^h-/.test(anchor)) {
      const result = await runKCli<SectionResult>(["read-section", relPath, anchor]);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      const sec = result.data!;
      return NextResponse.json({
        path: relPath,
        kind: "section",
        anchor: sec.anchor,
        title: sec.title,
        agent_summary: sec.agent_summary,
        preview: sec.preview,
        content: sec.content,
      });
    }
    if (/^[pcft]-/.test(anchor)) {
      const result = await runKCli<BlockResult>(["read-block", relPath, anchor]);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      const blk = result.data!;
      return NextResponse.json({
        path: relPath,
        kind: "block",
        anchor: blk.anchor,
        block_kind: blk.kind,
        content: blk.content,
      });
    }
    // anchor 拼写错（不是 ^h-/^p-/^t-/^c-/^f-）→ 显式报错，不要静默退回整篇
    // ——退回整篇会让用户的 hover 预览看到"前 600 字"，掩盖锚点失效问题
    return NextResponse.json(
      {
        error: "unknown_anchor_format",
        anchor,
        hint: "anchor 必须以 h-/p-/t-/c-/f- 起头（来自 convert.py 自动生成）",
      },
      { status: 400 },
    );
  }

  // 整篇 fallback：限制最多 50KB 截断，避免论文级 raw 文件压垮 hover preview
  const MAX_FULL_BYTES = 50 * 1024;
  try {
    const full = await readFile(relPath);
    const truncated = full.length > MAX_FULL_BYTES;
    const content = truncated
      ? full.slice(0, MAX_FULL_BYTES) + "\n\n…(truncated)"
      : full;
    return NextResponse.json({ path: relPath, kind: "full", content, truncated });
  } catch (err) {
    return NextResponse.json(
      { error: "read_failed", message: String(err) },
      { status: 500 },
    );
  }
}
