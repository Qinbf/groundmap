import "server-only";
import type { StepData, Localized } from "../types";

const sourceSummaryContent: Localized = {
  zh: `---
title: "Retrieval-Augmented Generation（论文摘要）"
type: source_summary
created_date: 2026-05-08
last_modified: 2026-05-08
last_modified_by: LLM
status: draft
confidence: high
source_count: 1
sources:
  - "[[raw/papers/_learn_demo/rag_lewis_2020]]"
tags:
  - rag
  - retrieval
  - dpr
  - knowledge-intensive-nlp
---

# Retrieval-Augmented Generation（论文摘要）

> **来源**：[[raw/papers/_learn_demo/rag_lewis_2020]] —— Lewis et al., NeurIPS 2020（教学演示节选）

## 核心论点

1. **参数化 + 非参数化混合记忆**：RAG 把预训练 seq2seq（BART，参数化）与维基百科稠密向量索引（DPR 访问，非参数化）结合，在开放域 QA 上刷新 SOTA [[raw/papers/_learn_demo/rag_lewis_2020#^p-1-3e8c92]]。

2. **纯参数化记忆是根本瓶颈**：知识隐式压进参数后无法被检视、无法被定点更新，且长尾事实上倾向幻觉——这是"把模型做大就够了"路线的根本约束 [[raw/papers/_learn_demo/rag_lewis_2020#^p-5-c891ef]]。

3. **把检索当隐变量、对它边缘化**：不要求"先检索对再生成"的硬流水线，而是对 top-K 文档按检索分加权求和，使检索器与生成器**联合训练、无检索监督** [[raw/papers/_learn_demo/rag_lewis_2020#^c-14-7d2e8c]][[raw/papers/_learn_demo/rag_lewis_2020#^p-15-bc92a1]]。

4. **RAG-Token 能融合多段证据**：RAG-Sequence 用同一文档生成整句；RAG-Token 每个 token 可用不同文档，适合"答案需拼接多段事实"的情形——单一文档会限制这一点 [[raw/papers/_learn_demo/rag_lewis_2020#^p-19-8b4f2a]]。

5. **非参数化记忆可热插拔更新**：因为知识在索引里而非参数里，测试时直接换索引（如换一个时间快照的维基百科）即可更新世界知识，**完全不需要重训模型** [[raw/papers/_learn_demo/rag_lewis_2020#^c-26-9bc481]][[raw/papers/_learn_demo/rag_lewis_2020#^p-28-7a2e1f]]。

## 关键数据

**参数化 vs 检索增强对比表**：

| 维度 | 纯参数化（BART/T5） | 检索增强（RAG） |
|---|---|---|
| 知识更新 | 需重训 | **换索引即可（热插拔）** |
| 可溯源 | ✗ 黑盒 | **✓ 能指向 passage** |
| 幻觉倾向 | 高 | **低** |

数据来自原文 [[raw/papers/_learn_demo/rag_lewis_2020#^t-33-cf4a82]]。三维对比清晰显示：**检索增强在知识可维护性与可信度上同时占优**，代价是引入检索器 + 索引这套基础设施。

**实验结果**：开放域 QA 上 RAG 在 NaturalQuestions 达到 **44.5 EM**，并在 TriviaQA / WebQuestions 上超过抽取式（REALM、DPR）与纯参数化 seq2seq（T5）——一个**生成式**模型在抽取式擅长的 benchmark 上反超 [[raw/papers/_learn_demo/rag_lewis_2020#^p-1-3e8c92]][[raw/papers/_learn_demo/rag_lewis_2020#^p-35-bf1c08]]。

## 方法学要点

- **检索器 = DPR bi-encoder**：BERT_d 编码文档、BERT_q 编码 query，top-K 用 MIPS（FAISS）；索引 = 维基百科切成 2100 万段落 [[raw/papers/_learn_demo/rag_lewis_2020#^p-10-26b7f8]]
- **生成器 = BART-large**：把检索文档 z 与输入 x 拼接，decoder 自回归生成 [[raw/papers/_learn_demo/rag_lewis_2020#^p-11-9af3b8]]
- **训练取舍：固定文档编码器与索引**，只微调 query 编码器 + 生成器——避免对 2100 万段落反复重建索引，几乎不损失性能 [[raw/papers/_learn_demo/rag_lewis_2020#^p-28-7a2e1f]]

## 与已有知识的关系

> [!WARNING] 知识更新冲突 — 2026-05-08
> **旧观点**：[[wiki/concepts/parametric_memory]] 当前主张 "把模型做得足够大，参数化记忆就足以应对知识密集型任务"
> **新证据**：本文表明检索增强在知识更新（换索引即可）、可溯源（指向 passage）、抗幻觉三个维度全面优于纯参数化，且开放域 QA 上生成式 RAG 反超纯参数化 T5 [[raw/papers/_learn_demo/rag_lewis_2020#^t-33-cf4a82]]
> **LLM 判断**：旧论断应改为 "scale 提升参数化记忆覆盖，但无法廉价更新、无法溯源；检索是互补而非可被 scale 替代——尤其在长尾与时效性知识上"
> **状态**：⏳ 待人类判别

- 与 [[wiki/concepts/retrieval_augmented_generation]] 关联：本文即该范式的奠基论文，作为该页的来源 #1
- 与 [[wiki/concepts/dense_passage_retrieval]] 关联：本文使用 DPR 作为检索基座
- 与 [[wiki/concepts/open_domain_qa]] 关联：本文把该任务的 SOTA 从抽取式推进到生成式
`,
  en: `---
title: "Retrieval-Augmented Generation (paper summary)"
type: source_summary
created_date: 2026-05-08
last_modified: 2026-05-08
last_modified_by: LLM
status: draft
confidence: high
source_count: 1
sources:
  - "[[raw/papers/_learn_demo/rag_lewis_2020]]"
tags:
  - rag
  - retrieval
  - dpr
  - knowledge-intensive-nlp
---

# Retrieval-Augmented Generation (paper summary)

> **Source**: [[raw/papers/_learn_demo/rag_lewis_2020]] — Lewis et al., NeurIPS 2020 (teaching-demo excerpt)

## Core claims

1. **Parametric + non-parametric hybrid memory**: RAG combines a pre-trained seq2seq (BART, parametric) with a dense Wikipedia vector index (accessed via DPR, non-parametric), setting a new SOTA on open-domain QA [[raw/papers/_learn_demo/rag_lewis_2020#^p-1-3e8c92]].

2. **Pure parametric memory is the fundamental bottleneck**: once knowledge is implicitly compressed into parameters it cannot be inspected or surgically updated, and it tends to hallucinate on long-tail facts — the core constraint of the "just make the model bigger" route [[raw/papers/_learn_demo/rag_lewis_2020#^p-5-c891ef]].

3. **Treat retrieval as a latent variable and marginalize over it**: instead of a hard "retrieve-correctly-then-generate" pipeline, weight-sum the top-K documents by their retrieval scores, so the retriever and generator **train jointly, with no retrieval supervision** [[raw/papers/_learn_demo/rag_lewis_2020#^c-14-7d2e8c]][[raw/papers/_learn_demo/rag_lewis_2020#^p-15-bc92a1]].

4. **RAG-Token can fuse evidence across passages**: RAG-Sequence uses one document for the whole answer; RAG-Token may use a different document per token, suited to "answers that must stitch facts from multiple passages" — a single document would limit this [[raw/papers/_learn_demo/rag_lewis_2020#^p-19-8b4f2a]].

5. **Non-parametric memory is hot-swappable**: because knowledge lives in the index rather than the parameters, at test time you simply swap the index (e.g. a different time-snapshot of Wikipedia) to update world knowledge **with no model retraining at all** [[raw/papers/_learn_demo/rag_lewis_2020#^c-26-9bc481]][[raw/papers/_learn_demo/rag_lewis_2020#^p-28-7a2e1f]].

## Key data

**Parametric vs retrieval-augmented comparison**:

| Dimension | Pure parametric (BART/T5) | Retrieval-augmented (RAG) |
|---|---|---|
| Knowledge update | needs retraining | **swap the index (hot-swap)** |
| Traceable | ✗ black box | **✓ can point to a passage** |
| Hallucination | high | **low** |

Data from the paper [[raw/papers/_learn_demo/rag_lewis_2020#^t-33-cf4a82]]. The three-axis comparison clearly shows that **retrieval augmentation wins on both maintainability and trustworthiness**, at the cost of introducing a retriever + index infrastructure.

**Experimental results**: on open-domain QA, RAG reaches **44.5 EM** on NaturalQuestions and beats extractive methods (REALM, DPR) and pure-parametric seq2seq (T5) on TriviaQA / WebQuestions — a **generative** model overtaking on benchmarks where extractive methods excelled [[raw/papers/_learn_demo/rag_lewis_2020#^p-1-3e8c92]][[raw/papers/_learn_demo/rag_lewis_2020#^p-35-bf1c08]].

## Methodology notes

- **Retriever = DPR bi-encoder**: BERT_d encodes documents, BERT_q encodes the query, top-K via MIPS (FAISS); the index splits Wikipedia into 21M passages [[raw/papers/_learn_demo/rag_lewis_2020#^p-10-26b7f8]]
- **Generator = BART-large**: concatenate the retrieved document z with the input x, decoder generates autoregressively [[raw/papers/_learn_demo/rag_lewis_2020#^p-11-9af3b8]]
- **Training trade-off: freeze the document encoder and index**, fine-tuning only the query encoder + generator — avoiding repeated re-indexing of 21M passages, with almost no performance loss [[raw/papers/_learn_demo/rag_lewis_2020#^p-28-7a2e1f]]

## Relation to existing knowledge

> [!WARNING] Knowledge-update conflict — 2026-05-08
> **Old view**: [[wiki/concepts/parametric_memory]] currently argues that "making the model big enough makes parametric memory sufficient for knowledge-intensive tasks"
> **New evidence**: this paper shows retrieval augmentation beats pure parametric across all three axes — updatability (just swap the index), traceability (point to a passage), and anti-hallucination — and generative RAG overtakes pure-parametric T5 on open-domain QA [[raw/papers/_learn_demo/rag_lewis_2020#^t-33-cf4a82]]
> **LLM judgment**: the old claim should become "scale increases parametric-memory coverage but cannot update cheaply or trace sources; retrieval is complementary, not replaceable by scale — especially for long-tail and time-sensitive knowledge"
> **Status**: ⏳ awaiting human resolution

- Relates to [[wiki/concepts/retrieval_augmented_generation]]: this paper is the founding paper of the paradigm, serving as source #1 of that page
- Relates to [[wiki/concepts/dense_passage_retrieval]]: this paper uses DPR as its retrieval substrate
- Relates to [[wiki/concepts/open_domain_qa]]: this paper advances the task's SOTA from extractive to generative
`,
};

export const step5: StepData = {
  id: 5,
  titleKey: "learn.step.5.title",
  whyKey: "learn.step.5.why",
  whatNoteKey: "learn.cmd.note.write",
  focusAnchors: [
    "p-1-3e8c92",
    "p-5-c891ef",
    "c-14-7d2e8c",
    "p-19-8b4f2a",
    "t-33-cf4a82",
  ],
  results: [
    {
      kind: "markdown",
      content: sourceSummaryContent,
      pseudoPath: "wiki/sources/rag_lewis_2020.md",
    },
  ],
  concepts: [
    { termKey: "learn.concept.source_summary.title", bodyKey: "learn.concept.source_summary.body" },
    { termKey: "learn.concept.frontmatter.title", bodyKey: "learn.concept.frontmatter.body" },
    { termKey: "learn.concept.wikilink.title", bodyKey: "learn.concept.wikilink.body" },
  ],
};
