import { NextRequest, NextResponse } from "next/server";
import { runKCli } from "@/lib/k-cli";
import { isSafeRelPath, isReadableDir } from "@/lib/kb";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const filePath = req.nextUrl.searchParams.get("path");
  if (!filePath) {
    return NextResponse.json({ error: "缺少 path 参数" }, { status: 400 });
  }
  if (!isSafeRelPath(filePath)) {
    return NextResponse.json({ error: "invalid_path" }, { status: 400 });
  }
  // 读侧白名单：非可读区（my_thoughts/ 等）按"不存在"处理，返回 404 不泄露路径
  if (!isReadableDir(filePath)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  // parseStdoutOnNonZero：k.py validate-frontmatter 把"校验不通过"用非零退出码表达时，
  // stdout 仍是 {valid:false, errors:[...]} 的合法 JSON——此时返回 200 + body，
  // 让前端拿到校验结果。只有命令真出错（traceback / 非 JSON stdout）才落 500。
  const result = await runKCli(["validate-frontmatter", filePath], {
    parseStdoutOnNonZero: true,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json(result.data);
}
