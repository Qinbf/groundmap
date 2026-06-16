import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { WalkthroughClient } from "@/components/walkthrough/WalkthroughClient";
import "./walkthrough.css";

// 不声明 force-static：根 layout 读 kb_locale cookie 做 i18n SSR，
// 静态化会把本页（含共享顶栏）锁死在默认中文，英文模式下整页失效。与 /learn 同口径。

async function loadFragments() {
  const root = path.join(process.cwd(), "components/walkthrough");
  const read = (f: string) => fs.readFile(path.join(root, f), "utf8");
  const [header, ex1, ex2, ex3, ex4, footer] = await Promise.all([
    read("header.html"),
    read("ex1.html"),
    read("ex2.html"),
    read("ex3.html"),
    read("ex4.html"),
    read("footer.html"),
  ]);

  // ex1/2/3 inner HTML 末尾遗留 1 个 </div>（example wrapper 被剥后未删尾）→ strip
  const stripTrailing = (s: string) => s.replace(/<\/div>\s*$/, "");

  // footer.html 行 1-10 = ex4 的 rag-compare + ex4 wrapper 的 </div>；
  // 行 11+ = summary / mode comparison / footer / inline <script>
  const fLines = footer.split("\n");
  const ex4Tail = fLines.slice(0, 10).join("\n");
  const footerExtras = fLines
    .slice(10)
    .join("\n")
    // 移除 inline <script>（client 组件接管 tab 切换）
    .replace(/<script>[\s\S]*?<\/script>/g, "")
    // 移除原 container 的尾部 </div>（React 自己管 container）
    .replace(/<\/div>\s*$/, "");

  // 移除 header 自带的 <div class="container"> 与 <div class="tabs">…</div>
  // —— 这两块都由 WalkthroughClient JSX 重新渲染
  const headerNoContainer = header
    .replace(/^\s*<div class="container">\s*/, "")
    .replace(/<div class="tabs">[\s\S]*?<\/div>\s*/m, "");

  return {
    headerHtml: headerNoContainer,
    ex1Html: stripTrailing(ex1),
    ex2Html: stripTrailing(ex2),
    ex3Html: stripTrailing(ex3),
    // ex4 inner 自身 depth=1（<div class="workflow"> 没闭合，工作区切片时被截）；
    // footer 行 1-10 包含 rag-compare（平衡）+ 末尾那个 </div> 实际是 workflow 的闭合，
    // 而非 ex4 wrapper 闭合（wrapper 的 </div> 已在原 sed 抽 footer 时一并归到 ex4 之外）。
    // 合并后字符串平衡，不应再 strip。
    ex4Html: ex4 + "\n" + ex4Tail,
    footerHtml: footerExtras,
  };
}

export default async function WalkthroughPage() {
  const f = await loadFragments();
  return <WalkthroughClient {...f} />;
}
