import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { WalkthroughClient } from "@/components/walkthrough/WalkthroughClient";
import { getServerLocale } from "@/lib/server-locale";
import "./walkthrough.css";

// 不声明 force-static：根 layout 读 kb_locale cookie 做 i18n SSR，
// 静态化会把本页（含共享顶栏）锁死在默认中文，英文模式下整页失效。与 /learn 同口径。

async function loadFragments() {
  const root = path.join(process.cwd(), "components/walkthrough");
  const read = (f: string) => fs.readFile(path.join(root, f), "utf8");
  // 本页已砍到「机制骨架 + 1 个例子」：只需 header（4 设计原则）+ ex1（一次真实查询的
  // 钻取路径）。历史上的 ex2/ex3/ex4 + footer（含未实现的查询深度模式预览）已移除。
  // header / ex1 按 locale 选 .zh.html / .en.html，两侧 HTML 结构、类名、id、锚点 1:1 镜像。
  const locale = getServerLocale();
  const [header, ex1] = await Promise.all([
    read(`header.${locale}.html`),
    read(`ex1.${locale}.html`),
  ]);

  // 移除 header 自带的 <div class="container">（React 自己管 container）；
  // <div class="tabs">…</div> 已从 header.html 源文件删除（单例无需 tab），此处正则
  // 仅作兜底——命中则剥、不命中则 no-op。
  const headerNoContainer = header
    .replace(/^\s*<div class="container">\s*/, "")
    .replace(/<div class="tabs">[\s\S]*?<\/div>\s*/m, "");

  // ex1 拆三段：手画的静态 <div class="graph-section"> 已被 React 推理图（ReasoningGraph）
  // 取代，这里只取它两侧的内容——前段 = 问题横幅，后段 = 步骤工作流 + chunk-RAG 对照。
  const graphStart = ex1.indexOf('<div class="graph-section">');
  const workflowStart = ex1.indexOf('<div class="workflow">');
  const bannerHtml =
    graphStart >= 0 ? ex1.slice(0, graphStart).trim() : ex1.slice(0, workflowStart).trim();
  // 末尾遗留 1 个 </div>（example wrapper 被剥后未删尾）→ strip
  const workflowHtml =
    workflowStart >= 0 ? ex1.slice(workflowStart).replace(/<\/div>\s*$/, "").trim() : "";

  return { headerHtml: headerNoContainer, bannerHtml, workflowHtml };
}

export default async function WalkthroughPage() {
  const f = await loadFragments();
  return <WalkthroughClient {...f} />;
}
