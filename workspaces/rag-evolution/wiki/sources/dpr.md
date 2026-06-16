---
title: "DPR: Dense Passage Retrieval (Karpukhin et al. 2020)"
type: source_summary
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: reviewed
confidence: high
source_count: 1
sources:
  - "[[raw/papers/2020-04-dpr]]"
tags:
  - retrieval
  - dense-retrieval
  - 2020
  - facebook-ai
---

# DPR: Dense Passage Retrieval ^h-1-1-5bcf6b

> **原始文件**: [[raw/papers/2020-04-dpr]]
> **作者**: Vladimir Karpukhin, Barlas Oğuz et al.(Facebook AI / U Washington / Princeton)
> **发表**: 2020-04 arXiv preprint(EMNLP 2020)
> **arXiv**: [2004.04906](https://arxiv.org/abs/2004.04906)
> **历史地位**:**现代 dense retrieval 的开山之作**,被 Self-RAG / CRAG / Contriever 等几乎所有后续工作 cite 为基础[[raw/papers/2020-04-dpr#^h-2-3-1d223c]] ^p-1-17dcad

## 摘要 ^h-2-1-3ae146

DPR 用 **BERT 双塔架构**(question encoder + passage encoder)+ **对比学习**做 open-domain QA passage retrieval,**首次在 5 个 ODQA 数据集上显著超过 BM25**(传统 sparse retrieval)。训练用 in-batch negatives + hard negatives(BM25 retrieved 但非正确)实现高效学习。在 NQ / TriviaQA / WebQuestions / CuratedTREC / SQuAD 上,DPR top-20 retrieval accuracy 提升 9-19 个百分点[[raw/papers/2020-04-dpr#^h-2-5-4b14da]]。 ^p-2-c77698

## 关键发现 / 论点 ^h-2-2-10e39a

1. **dense 表征可以超过 BM25**——之前业界共识是 dense retrieval 只对 in-domain 有效,DPR 证伪 [KB 综合]
2. **双塔结构 + dot product 相似度**就够好——不需要 cross-encoder 的复杂度 [[raw/papers/2020-04-dpr]]
3. **In-batch negatives** 是高效训练 trick,negatives 数量 = batch size,几乎免费 [[raw/papers/2020-04-dpr]]
4. **下游 QA 模型(extractive reader)+ DPR retriever** 端到端性能 SOTA [[raw/papers/2020-04-dpr]] ^p-3-481949

## AI 综合判断 ^h-2-3-e0eacb

### 核心价值 ^h-3-1-57ae37

DPR 是 **RAG 文献中"retrieval"组件的事实起点**。所有后续 retriever 工作(ColBERT / Contriever / E5 / BGE 等)都把 DPR 作为基线对照。Gao Survey 的 III Retrieval 章节也以 DPR 为代表说明"unstructured data 检索"[[raw/papers/2023-12-gao-rag-survey#^p-58-28f248]]。 ^p-4-a041ac

### 关联 ^h-3-2-1c3cf7

- [[wiki/concepts/retrieval_foundations]] — 本论文是该概念页的起点
- [[wiki/sources/gao_rag_survey]] — Gao Survey 多次引用 DPR
- [[wiki/concepts/retrieval_augmented_generation]] — DPR 是 vanilla RAG 范式的核心组件
- [[wiki/sources/contriever]] — Contriever 的 supervised baseline ^p-5-abf185

### 冲突 ^h-3-3-93190b

无冲突。DPR 是基础工作,后续 retriever 都是改进或扩展而非反驳。 [KB 综合] ^p-6-473c4c

## 与 Wiki 的关联 ^h-2-4-8625b8

- 影响:[[wiki/concepts/retrieval_foundations]](起点)
- MOC:[[wiki/indexes/rag_evolution_index]] Batch 1 ^p-7-fe2a06
