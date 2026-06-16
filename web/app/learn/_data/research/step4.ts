import "server-only";
import type { StepData } from "../types";

const strategyMarkdown = `## 写作策略

基于第 3 步的综合判断，AI 自动决定本次 ingest 的写作产物：

| 操作 | 目标 | 触发原因 |
|---|---|---|
| ✏️ 新建摘要页 | \`wiki/sources/attention_is_all_you_need.md\` | 历史级新方法 + 全新核心组件（Scaled Dot-Product、Multi-Head、Positional Encoding） |
| ✏️ 新建概念页 | \`wiki/concepts/transformer.md\` | 之前 wiki 完全没有这个架构条目，是后续大量论文的根节点 |
| ✏️ 新建概念页 | \`wiki/concepts/positional_encoding.md\` | 全新独立机制，与 embedding / attention 并列，需要单独页 |
| 📝 更新核心页 | \`wiki/concepts/attention_mechanism.md\` | 本文把注意力从「辅助组件」升级到「主结构」，核心论断需要重写 |
| 📝 更新核心页 | \`wiki/concepts/sequence_modeling.md\` | 本文表明 self-attention 在所有维度优于 RNN，「LSTM 是最佳」论断需要修正（含冲突标注） |
| 🏷️ 标 #to-be-updated | \`wiki/concepts/encoder_decoder.md\` | 本文沿用骨架但替换内部层，描述需要补充但不紧急 |
| 🏷️ 标 #to-be-updated | \`wiki/concepts/lstm.md\` | 在「与 Transformer 的对比」上需要新增一节，但 lstm 自身定义不需改 |
| ⏸️ 暂不建独立页 | layer normalization、residual connection | 本文复用了它们但不是创新点，等积累更多来源再考虑 |

落地到第 5-7 步执行。
`;

export const step4: StepData = {
  id: 4,
  titleKey: "learn.step.4.title",
  whyKey: "learn.step.4.why",
  whatNoteKey: "learn.cmd.note.write",
  focusAnchors: ["h-3-2-3d6f0a", "h-3-3-72bef4", "h-3-5-8a2b59"],
  results: [
    {
      kind: "markdown",
      content: strategyMarkdown,
      captionKey: "learn.caption.strategy_internal",
    },
  ],
};
