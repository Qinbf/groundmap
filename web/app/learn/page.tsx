import { LearnApp } from "@/components/learn/LearnApp";
import { getResearchSteps, RESEARCH_META } from "./_data/research";
import { getLocalizedSourceMarkdown, SOURCE_FILES } from "./_data/sources";
import { getServerLocale } from "@/lib/server-locale";

/**
 * 教学演示页 - server component。
 *
 * 职责：在服务端取出 10 步数据 + 样例 raw md 文件内容（fs.readFileSync），
 * 序列化后传给客户端 LearnApp。LearnApp 接管交互：
 *   - 右栏 step scroll-spy
 *   - 左栏 raw 文档段落高亮（与右栏当前 step 的 focusAnchors 联动）
 *
 * 单样例：用一份 RAG 奠基论文（Lewis et al. 2020）做载体演示 ingest 全流程。
 * 样例只是载体——这 10 步对任何领域的资料都一样（见 learn.intro.lead 文案）。
 */
export default function LearnPage() {
  const locale = getServerLocale();
  const steps = getResearchSteps();
  // 左栏原文按 locale 选中/英版（en 版缺失时自动回退中文）
  const rawMd = getLocalizedSourceMarkdown(SOURCE_FILES.research, locale);

  return <LearnApp sample={RESEARCH_META} steps={steps} rawMd={rawMd} />;
}

export const metadata = {
  title: "教学演示 / Learn — GroundMap",
  description: "看一份原始文件如何在 10 步内变成知识库里的可引用知识",
};
