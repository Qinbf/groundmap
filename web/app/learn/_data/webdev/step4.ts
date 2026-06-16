import "server-only";
import type { StepData } from "../types";

const strategyMarkdown = `## 写作策略

基于第 3 步的综合判断，AI 自动决定本次 ingest 的写作产物：

| 操作 | 目标 | 触发原因 |
|---|---|---|
| ✏️ 新建摘要页 | \`wiki/sources/react_server_components_rfc.md\` | 历史级架构 RFC + 多个全新约束规则 |
| 📝 更新核心页 | \`wiki/concepts/server_component.md\` | 把"能在服务端运行"升级为完整的"两态组件模型"（含 use client 边界、不可 import 规则、ReactNode 传递） |
| 📝 更新核心页 | \`wiki/concepts/data_fetching.md\` | 本文范式改变：从「useEffect + fetch」到「async component + await」，主流方法节需要重写 |
| 📝 更新核心页 | \`wiki/concepts/rendering_strategies.md\` | 加入 RSC 行，区分 RSC 与 SSR（含冲突标注） |
| 🏷️ 标 #to-be-updated | \`wiki/concepts/component_model.md\` | 引入「两态模型」会改变组件模型演进史叙述，但不紧急 |
| 🏷️ 标 #to-be-updated | \`wiki/concepts/bundle_optimization.md\` | 加一条 "zero-bundle-size 服务端组件" 优化路径 |
| ⏸️ 暂不建独立页 | Suspense 边界 / Streaming HTML | 这两个是 RSC 的支撑机制但本文没展开，等专门来源再考虑 |

落地到第 5-7 步执行。
`;

export const step4: StepData = {
  id: 4,
  titleKey: "learn.step.4.title",
  whyKey: "learn.step.4.why",
  whatNoteKey: "learn.cmd.note.write",
  focusAnchors: ["h-3-4-aa3018", "h-2-5-c08a91"],
  results: [
    {
      kind: "markdown",
      content: strategyMarkdown,
      captionKey: "learn.caption.strategy_internal",
    },
  ],
};
