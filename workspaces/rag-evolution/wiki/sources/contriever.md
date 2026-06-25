---
title: "Contriever: Unsupervised Dense Retrieval (Izacard et al. 2021-12)"
type: source_summary
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: draft
confidence: high
source_count: 1
sources:
  - "[[raw/papers/2021-12-contriever]]"
tags:
  - retrieval
  - dense-retrieval
  - unsupervised
  - 2021
  - meta-ai
---

# Contriever: Unsupervised Dense Information Retrieval ^h-1-1-64d4ae

> **原始文件**: [[raw/papers/2021-12-contriever]]
> **作者**: Gautier Izacard, Mathilde Caron et al.(Meta AI / INRIA)
> **发表**: 2021-12 arXiv preprint
> **arXiv**: [2112.09118](https://arxiv.org/abs/2112.09118)
> **特殊地位**:**unsupervised dense retrieval 标杆**;Self-RAG 和 HippoRAG 2 都用 Contriever 作 default retriever[[raw/papers/2023-10-self-rag#^p-74-a641c0]] ^p-1-974236

## 摘要 ^h-2-1-3ae146

Contriever 用 **MoCo-style contrastive learning**(从 SimCLR / MoCo 的 self-supervised vision 学习)训练 BERT 双塔 retriever,**完全不需要 labeled QA 数据**——用 Wikipedia 段对、随机文档片段作为 weak supervision 信号。在 BEIR benchmark zero-shot 上**超过 BM25**(此前业界共识是 zero-shot dense retrieval 不如 BM25)。多语言版本(mContriever)也展示了 cross-lingual zero-shot retrieval[[raw/papers/2021-12-contriever#^h-2-5-5bb172]]。 ^p-2-636b8c

## 关键发现 / 论点 ^h-2-2-10e39a

1. **不需要 labeled QA data 也能训好 dense retriever**——挑战 DPR 的 supervised 范式 [KB 综合]
2. **Momentum encoder + queue**(从 MoCo 借)解决 contrastive learning 的 negative 不足问题 [[raw/papers/2021-12-contriever]]
3. **BEIR zero-shot 超过 BM25**——里程碑结论,改变了"dense 必须监督"的共识 [KB 综合]
4. **跨语言** retrieval 的零成本支持(mContriever 在 100+ 语言上 work) [[raw/papers/2021-12-contriever]] ^p-3-a05f94

## AI 综合判断 ^h-2-3-e0eacb

### 核心价值 ^h-3-1-57ae37

Contriever 解锁了 **"unsupervised dense retrieval 可以作为通用 base retriever"** 这一范式。后续大量 RAG 工作(Self-RAG / HippoRAG 2 / GraphRAG 等)默认使用 Contriever 或其衍生作为 retriever,因为它**不需要任务特定数据**就能用。Gao Survey III 章节将其与 DPR 并列为"主流 dense retrieval"代表[[raw/papers/2023-12-gao-rag-survey#^p-58-28f248]]。 ^p-4-eec1c6

### 关联 ^h-3-2-1c3cf7

- [[wiki/concepts/retrieval_foundations]] — unsupervised 派代表
- [[wiki/sources/dpr]] — supervised 派对照
- [[wiki/sources/self_rag]] / [[wiki/sources/crag]] / [[wiki/sources/rag_or_longcontext]] — 三者均默认或主要用 Contriever
- [[wiki/sources/gao_rag_survey]] — Gao Survey 引用 ^p-5-31d65f

### 冲突 ^h-3-3-93190b

**轻度冲突 vs DPR 的"supervised 必需"假设**——但这是范式扩展而非反驳,因为 Contriever supervised fine-tune 版本(Contriever-MS MARCO)依然存在并被广泛使用。**不构成需要标注的冲突块**。 [KB 综合] ^p-6-46063c

## 与 Wiki 的关联 ^h-2-4-8625b8

- 影响:[[wiki/concepts/retrieval_foundations]] unsupervised 分支
- MOC:[[wiki/indexes/rag_evolution_index]] Batch 1 ^p-7-1b4c7a
