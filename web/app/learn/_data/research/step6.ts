import "server-only";
import type { StepData } from "../types";

const pmBefore = {
  zh: `---
title: "参数化记忆 Parametric Memory"
type: concept
created_date: 2025-09-04
last_modified: 2026-02-18
last_modified_by: LLM
confidence: high
source_count: 3
---

# 参数化记忆

大型语言模型把事实知识隐式地存进权重参数里。给一个 prompt，模型直接从参数中"回忆"答案，不查任何外部资料。

## 规模假说

随着模型参数量增大，参数化记忆覆盖的事实越来越多。**一种主流观点认为：把模型做得足够大，参数化记忆就足以应对知识密集型任务**——无需外部检索。

## 局限

- 知识更新需要继续预训练
- 无法指出某个答案的依据`,
  en: `---
title: "Parametric Memory"
type: concept
created_date: 2025-09-04
last_modified: 2026-02-18
last_modified_by: LLM
confidence: high
source_count: 3
---

# Parametric Memory

Large language models store factual knowledge implicitly in their weights. Given a prompt, the model "recalls" the answer straight from its parameters, without consulting any external source.

## The scaling hypothesis

As the parameter count grows, parametric memory covers more and more facts. **A mainstream view holds that if you make the model large enough, parametric memory alone suffices for knowledge-intensive tasks** — no external retrieval needed.

## Limitations

- Updating knowledge requires further pre-training
- Cannot point to the evidence behind any given answer`,
};

const pmAfter = {
  zh: `---
title: "参数化记忆 Parametric Memory"
type: concept
created_date: 2025-09-04
last_modified: 2026-05-08
last_modified_by: LLM
confidence: high
source_count: 4
---

# 参数化记忆

大型语言模型把事实知识隐式地存进权重参数里。给一个 prompt，模型直接从参数中"回忆"答案，不查任何外部资料。

## 规模假说（已被检索增强挑战）

随着模型参数量增大，参数化记忆覆盖的事实越来越多。但 **2020 年 [[wiki/sources/rag_lewis_2020]] 表明：检索增强（参数 + 外部非参数化记忆）在知识更新 / 可溯源 / 抗幻觉三个维度全面优于纯参数化**，且开放域 QA 上生成式 RAG 反超纯参数化 T5 [[wiki/sources/rag_lewis_2020#^t-33-cf4a82]]。

## 参数化 vs 非参数化记忆

| 维度 | 参数化（藏在权重里） | 非参数化（外部可检索） |
|---|---|---|
| 知识更新 | 需重训 / 继续预训练 | **换索引即可** [[wiki/sources/rag_lewis_2020#^p-28-7a2e1f]] |
| 可溯源 | ✗ 黑盒 | **✓ 指向 passage** |
| 幻觉倾向 | 高（长尾尤甚） | **低（有外部证据约束）** [[wiki/sources/rag_lewis_2020#^p-5-c891ef]] |

## 局限（重新评估）

- 知识更新需要继续预训练——**这正是非参数化检索的动机**
- 无法指出某个答案的依据——检索增强让答案**可溯源到具体段落**`,
  en: `---
title: "Parametric Memory"
type: concept
created_date: 2025-09-04
last_modified: 2026-05-08
last_modified_by: LLM
confidence: high
source_count: 4
---

# Parametric Memory

Large language models store factual knowledge implicitly in their weights. Given a prompt, the model "recalls" the answer straight from its parameters, without consulting any external source.

## The scaling hypothesis (challenged by retrieval augmentation)

As the parameter count grows, parametric memory covers more and more facts. But **in 2020 [[wiki/sources/rag_lewis_2020]] showed that retrieval augmentation (parametric + external non-parametric memory) beats pure parametric memory on all three of knowledge updating, attributability, and hallucination resistance**, and that on open-domain QA generative RAG overtakes a purely parametric T5 [[wiki/sources/rag_lewis_2020#^t-33-cf4a82]].

## Parametric vs. non-parametric memory

| Dimension | Parametric (hidden in weights) | Non-parametric (external, retrievable) |
|---|---|---|
| Knowledge update | retrain / further pre-train | **just swap the index** [[wiki/sources/rag_lewis_2020#^p-28-7a2e1f]] |
| Attributable | ✗ black box | **✓ points to a passage** |
| Hallucination | high (esp. long-tail) | **low (constrained by external evidence)** [[wiki/sources/rag_lewis_2020#^p-5-c891ef]] |

## Limitations (re-assessed)

- Updating knowledge requires further pre-training — **which is exactly the motivation for non-parametric retrieval**
- Cannot point to the evidence — retrieval augmentation makes answers **traceable to a specific passage**`,
};

const qaBefore = {
  zh: `---
title: "开放域问答 Open-Domain QA"
type: concept
created_date: 2025-08-15
last_modified: 2026-01-22
last_modified_by: LLM
confidence: high
source_count: 3
---

# 开放域问答

在没有给定上下文的情况下回答事实问题。

## 主流路线

**「检索 + 抽取」是当前 SOTA**：先用 DPR / BM25 检索候选段落，再用阅读器（reader）从段落里抽取答案 span。代表方法：REALM、DPR。抽取式方法在 NaturalQuestions 等 benchmark 上领先。

## 关键挑战

- 检索召回率：答案段落没召回就无解
- 抽取边界：答案 span 的起止预测`,
  en: `---
title: "Open-Domain QA"
type: concept
created_date: 2025-08-15
last_modified: 2026-01-22
last_modified_by: LLM
confidence: high
source_count: 3
---

# Open-Domain QA

Answering factual questions without any given context.

## Mainstream approach

**"Retrieve + extract" is the current SOTA**: first retrieve candidate passages with DPR / BM25, then have a reader extract an answer span from those passages. Representative methods: REALM, DPR. Extractive methods lead on benchmarks like NaturalQuestions.

## Key challenges

- Retrieval recall: if the answer passage isn't retrieved, there's no answer
- Extraction boundaries: predicting the start/end of the answer span`,
};

const qaAfter = {
  zh: `---
title: "开放域问答 Open-Domain QA"
type: concept
created_date: 2025-08-15
last_modified: 2026-05-08
last_modified_by: LLM
confidence: high
source_count: 4
---

# 开放域问答

在没有给定上下文的情况下回答事实问题。

## 主流路线（按时代演进）

**2019-2020：抽取式时代**——「检索 + 抽取」：先用 DPR / BM25 检索候选段落，再用阅读器从段落里抽取答案 span（REALM、DPR）。

**2020：生成式反超**——[[wiki/sources/rag_lewis_2020]] 表明**生成式 RAG 在 NaturalQuestions 达到 44.5 EM，反超抽取式方法**：把检索文档作为隐变量边缘化、由 BART 生成答案，而非抠 span [[wiki/sources/rag_lewis_2020#^p-35-bf1c08]]。

| 路线 | 答案来源 | NQ 表现 |
|---|---|---|
| 抽取式（DPR/REALM） | 从段落抠 span | 强 baseline |
| **生成式（RAG）** | 边缘化检索文档后生成 | **44.5 EM（反超）** |

## 关键挑战

- 检索召回率：答案段落没召回就无解（top-K 是召回与成本的旋钮 [[wiki/sources/rag_lewis_2020#^p-16-5f3047]]）
- 多段证据综合：RAG-Token 可在生成时融合多个文档的事实 [[wiki/sources/rag_lewis_2020#^p-19-8b4f2a]]`,
  en: `---
title: "Open-Domain QA"
type: concept
created_date: 2025-08-15
last_modified: 2026-05-08
last_modified_by: LLM
confidence: high
source_count: 4
---

# Open-Domain QA

Answering factual questions without any given context.

## Mainstream approach (an evolution over time)

**2019-2020: the extractive era** — "retrieve + extract": first retrieve candidate passages with DPR / BM25, then have a reader extract an answer span from them (REALM, DPR).

**2020: generation overtakes** — [[wiki/sources/rag_lewis_2020]] showed that **generative RAG reaches 44.5 EM on NaturalQuestions, overtaking extractive methods**: it marginalizes over retrieved documents as a latent variable and has BART *generate* the answer, rather than extracting a span [[wiki/sources/rag_lewis_2020#^p-35-bf1c08]].

| Approach | Answer source | NQ result |
|---|---|---|
| Extractive (DPR/REALM) | span pulled from a passage | strong baseline |
| **Generative (RAG)** | generated after marginalizing over retrieved docs | **44.5 EM (overtakes)** |

## Key challenges

- Retrieval recall: no answer if the passage isn't retrieved (top-K is the recall-vs-cost knob [[wiki/sources/rag_lewis_2020#^p-16-5f3047]])
- Synthesizing multi-passage evidence: RAG-Token can fuse facts from several documents at generation time [[wiki/sources/rag_lewis_2020#^p-19-8b4f2a]]`,
};

const ragBefore = { zh: `（页面不存在）`, en: `(page does not exist)` };

const ragAfter = {
  zh: `---
title: "Retrieval-Augmented Generation (RAG)"
type: concept
created_date: 2026-05-08
last_modified: 2026-05-08
last_modified_by: LLM
status: draft
confidence: high
source_count: 1
sources:
  - "[[wiki/sources/rag_lewis_2020]]"
tags:
  - rag
  - retrieval
  - knowledge-intensive-nlp
---

# Retrieval-Augmented Generation (RAG)

**首次提出**：Lewis et al., NeurIPS 2020, "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks" [[wiki/sources/rag_lewis_2020]]。

把**预训练参数化记忆**（seq2seq 生成器 BART）与**非参数化记忆**（用 [[wiki/concepts/dense_passage_retrieval|DPR]] 访问的维基百科稠密向量索引）结合的范式：用输入 x 检索文档 z，把 z 作为额外上下文生成答案 y。

## 核心机制

- **检索当隐变量**：对 top-K 检索文档按检索分加权（边缘化），检索器 + 生成器**联合训练、无检索监督** [[wiki/sources/rag_lewis_2020#^c-14-7d2e8c]]
- **RAG-Sequence**：用同一文档生成整句；**RAG-Token**：每个 token 可用不同文档，能融合多段证据 [[wiki/sources/rag_lewis_2020#^p-15-bc92a1]]
- **top-K 旋钮**：K 越大召回越高、成本越大，超过某点收益递减 [[wiki/sources/rag_lewis_2020#^p-16-5f3047]]

## 关键性质

- **知识可热插拔**：换索引即可更新世界知识，不需重训 [[wiki/sources/rag_lewis_2020#^p-28-7a2e1f]]
- **可溯源 + 抗幻觉**：答案显式依赖被检索段落

## 影响

后续 GraphRAG / Self-RAG / CRAG / HippoRAG 等几乎整条"RAG 演化"路线都建立在此范式之上——这是 2020 后知识密集型 NLP 的根架构。`,
  en: `---
title: "Retrieval-Augmented Generation (RAG)"
type: concept
created_date: 2026-05-08
last_modified: 2026-05-08
last_modified_by: LLM
status: draft
confidence: high
source_count: 1
sources:
  - "[[wiki/sources/rag_lewis_2020]]"
tags:
  - rag
  - retrieval
  - knowledge-intensive-nlp
---

# Retrieval-Augmented Generation (RAG)

**First proposed**: Lewis et al., NeurIPS 2020, "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks" [[wiki/sources/rag_lewis_2020]].

A paradigm that combines **pre-trained parametric memory** (the seq2seq generator BART) with **non-parametric memory** (a dense vector index over Wikipedia accessed via [[wiki/concepts/dense_passage_retrieval|DPR]]): retrieve documents z for input x, then generate answer y with z as extra context.

## Core mechanism

- **Retrieval as a latent variable**: weight the top-K retrieved documents by their retrieval scores (marginalization); retriever + generator are **trained jointly, with no retrieval supervision** [[wiki/sources/rag_lewis_2020#^c-14-7d2e8c]]
- **RAG-Sequence**: use one document for the whole sequence; **RAG-Token**: each token may use a different document, fusing evidence from several passages [[wiki/sources/rag_lewis_2020#^p-15-bc92a1]]
- **The top-K knob**: larger K means higher recall but more cost, with diminishing returns past a point [[wiki/sources/rag_lewis_2020#^p-16-5f3047]]

## Key properties

- **Hot-swappable knowledge**: update world knowledge by swapping the index, no retraining needed [[wiki/sources/rag_lewis_2020#^p-28-7a2e1f]]
- **Attributable + hallucination-resistant**: the answer explicitly depends on the retrieved passages

## Impact

Almost the entire "RAG evolution" line that follows — GraphRAG / Self-RAG / CRAG / HippoRAG and more — is built on this paradigm; it is the root architecture of knowledge-intensive NLP after 2020.`,
};

export const step6: StepData = {
  id: 6,
  titleKey: "learn.step.6.title",
  whyKey: "learn.step.6.why",
  whatNoteKey: "learn.cmd.note.edit",
  focusAnchors: [
    "p-15-bc92a1",
    "p-16-5f3047",
    "p-19-8b4f2a",
    "t-33-cf4a82",
    "p-5-c891ef",
  ],
  results: [
    {
      kind: "diff",
      before: pmBefore,
      after: pmAfter,
      pseudoPath: "wiki/concepts/parametric_memory.md",
    },
    {
      kind: "diff",
      before: qaBefore,
      after: qaAfter,
      pseudoPath: "wiki/concepts/open_domain_qa.md",
    },
    {
      kind: "diff",
      before: ragBefore,
      after: ragAfter,
      pseudoPath: "wiki/concepts/retrieval_augmented_generation.md",
      captionKey: "learn.caption.new_page",
    },
  ],
};
