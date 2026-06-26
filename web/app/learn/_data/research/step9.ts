import "server-only";
import type { StepData } from "../types";

const logEntry = {
  zh: `## [2026-05-08] ingest | Retrieval-Augmented Generation (Lewis et al., 2020)

- 来源：\`raw/papers/_learn_demo/rag_lewis_2020.md\`（约 8900 字符 / 40 段 / 6 个 H2）
- 分级：① 短文（教学演示节选；完整版含 DPR/BART 配置 + 多任务实验，属于 ② 中长文档）
- 阅读：① 档短文一次 Read 全文（\`annotate-section\` 为 ②③ 档分段阅读的必经步骤，① 档不强制）
- 新建：
  - [[wiki/sources/rag_lewis_2020]]（含 1 处冲突标注：纯参数化-vs-检索增强 论断）
  - [[wiki/concepts/retrieval_augmented_generation]]（RAG 范式根节点，后续 GraphRAG / Self-RAG / HippoRAG 的根）
  - [[wiki/concepts/dense_passage_retrieval]]（DPR 检索基座页）
- 更新：
  - [[wiki/concepts/parametric_memory]] 重写「规模假说」，加参数化 vs 非参数化对比表
  - [[wiki/concepts/open_domain_qa]] 改写「主流路线」节，加抽取式→生成式反超
- 标记待更新：
  - [[wiki/concepts/seq2seq]] 待补「作为 RAG 生成器」一条
  - [[wiki/concepts/hallucination]] 待补「检索增强缓解」一条
- MOC：[[wiki/indexes/nlp_index]] 加「近期更新」一条 + 「核心概念」节加 retrieval_augmented_generation
- 验证：\`k.py list-broken-refs\` 0 处失效；新冲突待 lint 流程处理
`,
  en: `## [2026-05-08] ingest | Retrieval-Augmented Generation (Lewis et al., 2020)

- Source: \`raw/papers/_learn_demo/rag_lewis_2020.md\` (~8900 chars / 40 paragraphs / 6 H2s)
- Tier: ① short text (teaching excerpt; the full version with DPR/BART config + multi-task experiments would be a ② mid-length doc)
- Reading: tier-① short text, Read in full once (\`annotate-section\` is required for tier ②③ segmented reading, not for ①)
- Created:
  - [[wiki/sources/rag_lewis_2020]] (with one conflict marker: pure-parametric vs. retrieval-augmented claim)
  - [[wiki/concepts/retrieval_augmented_generation]] (root of the RAG paradigm; basis for later GraphRAG / Self-RAG / HippoRAG)
  - [[wiki/concepts/dense_passage_retrieval]] (DPR retrieval foundation page)
- Updated:
  - [[wiki/concepts/parametric_memory]] rewrote "the scaling hypothesis," added a parametric-vs-non-parametric comparison table
  - [[wiki/concepts/open_domain_qa]] rewrote "mainstream approach," added the extractive→generative overtaking
- Tagged to-be-updated:
  - [[wiki/concepts/seq2seq]] to add "as a RAG generator"
  - [[wiki/concepts/hallucination]] to add "retrieval-augmentation mitigation"
- MOC: [[wiki/indexes/nlp_index]] added one "Recent updates" entry + retrieval_augmented_generation under "Core concepts"
- Verify: \`k.py list-broken-refs\` 0 broken; new conflict left for the lint pass
`,
};

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
