import "server-only";
import type { StepData, Localized } from "../types";

const strategyMarkdown: Localized = {
  zh: `## 写作策略

基于第 3 步的综合判断，AI 自动决定本次 ingest 的写作产物：

| 操作 | 目标 | 触发原因 |
|---|---|---|
| ✏️ 新建摘要页 | \`wiki/sources/rag_lewis_2020.md\` | 历史级新范式 + 全新核心组件（DPR 检索器、对检索文档边缘化的 RAG-Seq/Token） |
| ✏️ 新建概念页 | \`wiki/concepts/retrieval_augmented_generation.md\` | 之前 wiki 完全没有 RAG 这个范式条目，是后续大量论文（GraphRAG / Self-RAG / HippoRAG）的根节点 |
| ✏️ 新建概念页 | \`wiki/concepts/dense_passage_retrieval.md\` | DPR 是 RAG 的检索基座，独立机制，需要单独页 |
| 📝 更新核心页 | \`wiki/concepts/parametric_memory.md\` | 本文把"知识靠参数 + scale"升级到"参数 + 外部检索"，核心论断需要重写（含冲突标注） |
| 📝 更新核心页 | \`wiki/concepts/open_domain_qa.md\` | 本文表明生成式 RAG 反超抽取式，SOTA 论断需要修正 |
| 🏷️ 标 #to-be-updated | \`wiki/concepts/seq2seq.md\` | 本文用 BART 作生成器，需补「作为 RAG 生成器」一节，但 seq2seq 自身定义不需改 |
| 🏷️ 标 #to-be-updated | \`wiki/concepts/hallucination.md\` | 本文给出"检索增强降低幻觉"的新证据，需补一节，但不紧急 |
| ⏸️ 暂不建独立页 | MIPS / FAISS、BART 预训练 | 本文复用了它们但不是创新点，等积累更多来源再考虑 |

落地到第 5-7 步执行。
`,
  en: `## Writing strategy

Based on the step-3 synthesis, the AI automatically decides the deliverables for this ingest:

| Action | Target | Why |
|---|---|---|
| ✏️ New summary page | \`wiki/sources/rag_lewis_2020.md\` | A historic new paradigm + brand-new core components (the DPR retriever; RAG-Seq/Token marginalizing over retrieved docs) |
| ✏️ New concept page | \`wiki/concepts/retrieval_augmented_generation.md\` | The wiki had no entry for the RAG paradigm at all; it is the root node for many later papers (GraphRAG / Self-RAG / HippoRAG) |
| ✏️ New concept page | \`wiki/concepts/dense_passage_retrieval.md\` | DPR is RAG's retrieval substrate, a standalone mechanism that needs its own page |
| 📝 Update core page | \`wiki/concepts/parametric_memory.md\` | This paper upgrades "knowledge via parameters + scale" to "parameters + external retrieval"; the core claim must be rewritten (with a conflict marker) |
| 📝 Update core page | \`wiki/concepts/open_domain_qa.md\` | This paper shows generative RAG overtaking extractive methods, so the SOTA claim needs revising |
| 🏷️ Tag #to-be-updated | \`wiki/concepts/seq2seq.md\` | This paper uses BART as the generator, so add an "as a RAG generator" section — but seq2seq's own definition needs no change |
| 🏷️ Tag #to-be-updated | \`wiki/concepts/hallucination.md\` | This paper gives new evidence that "retrieval augmentation reduces hallucination"; add a section, but not urgent |
| ⏸️ No standalone page yet | MIPS / FAISS, BART pre-training | Reused here but not contributions of this paper; revisit once more sources accumulate |

Carried out in steps 5–7.
`,
};

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
