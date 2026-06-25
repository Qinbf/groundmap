---
title: "Retrieval Foundations (2020-2024 dense retriever 演化)"
type: concept
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: draft
confidence: high
source_count: 6
sources:
  - "[[wiki/sources/dpr]]"
  - "[[wiki/sources/colbertv2]]"
  - "[[wiki/sources/contriever]]"
  - "[[wiki/sources/e5]]"
  - "[[wiki/sources/bge]]"
  - "[[wiki/sources/nv_embed_v2]]"
tags:
  - retrieval
  - dense-retrieval
  - embedding
  - foundations
---

# Retrieval Foundations (2020-2024 dense retriever 演化) ^h-1-1-061ad8

> 本页综合 Batch 1 ingest 的 6 篇基础检索器论文,梳理 **2020-2024 dense retrieval 的演化主线**——从 DPR 开山 → late interaction(ColBERT v2)→ unsupervised(Contriever)→ 工程化双塔(E5/BGE)→ LLM-based(NV-Embed v2)。这些工作是 RAG 演化的"地基",前面 8 篇 RAG 论文几乎都在这一基础上做 query-time 或 corpus 表征的改进。 ^p-1-f90e27

## 演化主线 ^h-2-1-9ffd9a

```
2020-04  DPR (Karpukhin et al.)             — 现代 dense retrieval 起点
            ↓ BERT 双塔 + 对比学习,首次 OOD 超过 BM25
2021-12  ColBERTv2 (Santhanam et al.)       — late interaction 派代表
            ↓ token-level MaxSim + residual compression
2021-12  Contriever (Izacard et al.)        — unsupervised 派代表
            ↓ MoCo contrastive,无需标注 QA 也能训
2022-12  E5 (Wang et al., Microsoft)        — 工程化双塔
            ↓ 270M CCPairs 大规模 + 两阶段训练范式
2023-09  BGE / C-Pack (BAAI)                — E5 范式中文/双语扩展
            ↓ MTEB / C-MTEB 双榜 SOTA,Hugging Face 下载冠军
2024-05  NV-Embed v2 (NVIDIA)               — LLM-as-encoder 时代
            ↓ Mistral-7B + latent attention pooling,显著超 BGE
```
^p-2-af89c4

## 三派架构对照 ^h-2-2-d6c05b

| 维度 | Single-Vector 派 | Late Interaction 派 | LLM-based 派 |
|---|---|---|---|
| **代表** | DPR / Contriever / E5 / BGE | ColBERT v2 | NV-Embed v2 |
| **passage 表征** | 1 个 vector(CLS / mean pooling) | N 个 token vectors(MaxSim 匹配) | 1 个 vector(latent attention pooling 从 LLM 内部读出) |
| **Index 大小** | 极小(~768 dim × 文档数) | 大(每个 token 都存)→ 压缩后中等 | 中等(LLM dim 一般更大,但单 vector) |
| **精度** | 中-高 | **最高**(token 级精细匹配) | 中-高,但 LLM 加持有上限 |
| **训练成本** | 中(BERT 量级) | 中 | **高**(7B+ LLM)|
| **现状** | 工程主流(BGE / E5) | 高精场景(法律 / 医学) | 2024-2025 SOTA bar |
^t-1-5d67e9 ^p-3-c9be93

## supervised vs unsupervised 之争 ^h-2-3-4a404b

DPR(2020)开启 supervised dense retrieval 时代,**需要 labeled QA pairs**(positive + negative)训练。Contriever(2021-12)证伪了"必须 supervised"的隐含假设:用 wiki 段对的 self-supervised contrastive learning 也能训出 BEIR zero-shot 超过 BM25 的 retriever。

后续 E5 / BGE / NV-Embed 走的是**两阶段折衷**——weakly-supervised pretrain(大数据 + 弱标签)+ supervised fine-tune(小数据 + 强标签)。这一两阶段范式已成事实标准[[wiki/sources/e5#^p-3-8d5f19]]。 ^p-4-0bcfc3

## 与本 KB 已 ingest 8 篇 RAG 论文的关系 ^h-2-4-e89ca2

| Foundation 论文 | 被哪些 KB demo 论文使用 |
|---|---|
| DPR | Self-RAG / CRAG / Gao Survey 多次引用为基线 |
| ColBERT v2 | Gao Survey III 章节讨论;graph RAG 论文都引用 |
| **Contriever** | **Self-RAG / CRAG / RAG-or-LongContext 默认 retriever**[[wiki/sources/self_rag#^p-6-b07098]] |
| E5 | 工程 RAG 框架(LangChain / LlamaIndex)默认 |
| **BGE** | **R1-Searcher 默认 retriever**[[wiki/sources/r1_searcher#^p-11-110ede]] |
| **NV-Embed v2** | **HippoRAG 2 的主要 baseline**(用以证明"扩充 corpus 派 graph RAG 不如 strong embedding")[[wiki/sources/hipporag2]] |
^t-2-db7484 ^p-5-55818e

**关键观察**:**NV-Embed v2 是 graph RAG 内部之争 vol.2 的具体 anchor**——HippoRAG 2 不只是反驳 GraphRAG/LightRAG 抽象路线,而是用 NV-Embed v2 作具体强基线。没有 retrieval foundation 6 篇做 anchor,KB demo 的冲突标注就缺一层支撑。 ^p-6-63ff90

## 在 Gao Survey 中的对应 ^h-2-5-647208

Gao Survey **§III Retrieval** 章节扫读([[raw/papers/2023-12-gao-rag-survey#^h-2-3-b1b6f2]]):

- §III-A Retrieval Source — 覆盖 unstructured(text)/ semi-structured(PDF)/ structured(KG)三种 source
- §III 后续 — Retrieval Granularity(phrase/sentence/chunk/doc) + embedding model 选择
- **本 KB Batch 1 的 6 篇**正好对应 Gao Survey §III 中 embedding model 演化部分

Gao Survey v5(2024-03)写作时 BGE / NV-Embed v2 还较新,引用相对少;Contriever / DPR / ColBERT 是 survey 的核心引用。**本 KB demo 通过 ingest 6 篇 retrieval foundation,实质补全了 Gao Survey §III 的工程现状**。 ^p-7-524339

## 局限性 ^h-2-6-de894e

- **未覆盖 sparse retrieval 派**(SPLADE / DRAGON / Hybrid):这些是本 KB 的盲点,后续 Batch 可补
- **未覆盖 cross-encoder re-ranker**(Cohere Rerank / BAAI re-ranker):re-ranking 是 RAG 的关键 post-retrieval 步,缺失影响 Batch 4 升级 [[wiki/concepts/retrieval_augmented_generation]] 演化方向章节的完整性
- **MTEB / BEIR benchmark 数据集泄露问题**未深入讨论 — 6 篇都在这两个 benchmark 上 SOTA,但 leakage 风险与 Long-Context vs RAG 论文 [[wiki/sources/rag_or_longcontext#^p-7-d302ef]] 提的 leakage 问题同源 ^p-8-9a1793

## 关联页面 ^h-2-7-e10f36

- 6 个 source_summary:[[wiki/sources/dpr]] / [[wiki/sources/colbertv2]] / [[wiki/sources/contriever]] / [[wiki/sources/e5]] / [[wiki/sources/bge]] / [[wiki/sources/nv_embed_v2]]
- [[wiki/concepts/retrieval_augmented_generation]] — 上位概念(retrieval 是 RAG 的核心组件之一)
- [[wiki/sources/gao_rag_survey]] — Gao Survey §III 章节对应
- [[wiki/indexes/rag_evolution_index]] — MOC ^p-9-1ef89b
