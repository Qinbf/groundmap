import { LearnApp } from "@/components/learn/LearnApp";
import { getResearchSteps, RESEARCH_META } from "./_data/research";
import { getWebdevSteps, WEBDEV_META } from "./_data/webdev";
import { getSourceMarkdown, SOURCE_FILES } from "./_data/sources";

/**
 * 教学演示页 - server component。
 *
 * 职责：在服务端取出 10 步数据 + 两份 raw md 文件内容（fs.readFileSync），
 * 序列化后传给客户端 LearnApp。LearnApp 接管交互：
 *   - 样例切换
 *   - 右栏 step scroll-spy
 *   - 左栏 raw 文档段落高亮（与右栏当前 step 的 focusAnchors 联动）
 */
export default function LearnPage() {
  const research = getResearchSteps();
  const webdev = getWebdevSteps();
  const rawTransformer = getSourceMarkdown(SOURCE_FILES.transformer);
  const rawRsc = getSourceMarkdown(SOURCE_FILES.rsc);

  return (
    <LearnApp
      samples={[RESEARCH_META, WEBDEV_META]}
      stepsBySample={{
        research,
        webdev,
      }}
      rawBySample={{
        research: rawTransformer,
        webdev: rawRsc,
      }}
    />
  );
}

export const metadata = {
  title: "教学演示 / Learn — GroundMap",
  description: "看一份原始文件如何在 10 步内变成知识库里的可引用知识",
};
