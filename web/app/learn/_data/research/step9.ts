import "server-only";
import type { StepData } from "../types";

const logEntry = `## [2026-05-08] ingest | Attention Is All You Need (Vaswani et al., 2017)

- 来源：\`raw/papers/_learn_demo/attention_is_all_you_need.md\`（约 8700 字符 / 40 段 / 6 个 H2）
- 分级：① 短文（教学演示节选；完整版属于 ② 中长文档，会按 H2 切块读）
- 阅读：① 档短文一次 Read 全文（\`annotate-section\` 为 ②③ 档分段阅读的必经步骤，① 档不强制）
- 新建：
  - [[wiki/sources/attention_is_all_you_need]]（含 1 处冲突标注：RNN-vs-Transformer 默认论断）
  - [[wiki/concepts/transformer]]（深度学习核心架构页，后续多数大模型论文的根节点）
  - [[wiki/concepts/positional_encoding]]（独立机制页，含正弦方案推导）
- 更新：
  - [[wiki/concepts/attention_mechanism]] 加 Scaled Dot-Product / Multi-Head 变体小节
  - [[wiki/concepts/sequence_modeling]] 改写「主流架构」节，加 RNN-vs-Transformer 三维对比表
- 标记待更新：
  - [[wiki/concepts/encoder_decoder]] 待补「实现演化」节（RNN 时代 → Transformer 时代）
  - [[wiki/concepts/lstm]] 待补「LSTM vs Transformer」节
- MOC：[[wiki/indexes/deep_learning_index]] 加「近期更新」一条 + 「核心概念」节加 transformer / positional_encoding
- 验证：\`k.py list-broken-refs\` 0 处失效；新冲突待 lint 流程处理
`;

export const step9: StepData = {
  id: 9,
  titleKey: "learn.step.9.title",
  whyKey: "learn.step.9.why",
  whatNoteKey: "learn.cmd.note.edit",
  focusAnchors: [],
  results: [
    {
      kind: "markdown",
      content: logEntry,
      pseudoPath: "log.md",
      captionKey: "learn.caption.log_prepend",
    },
  ],
};
