---
title: "LongRAG: RAG with Long-context LLMs (Jiang et al. 2024-06)"
type: source_summary
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: reviewed
confidence: high
source_count: 1
sources:
  - "[[raw/papers/2024-06-longrag]]"
tags:
  - rag
  - long-context
  - hybrid
  - 2024
  - waterloo
---

# LongRAG: Enhancing RAG with Long-context LLMs ^h-1-1-ddbb52

> **原始文件**: [[raw/papers/2024-06-longrag]]
> **作者**: Ziyan Jiang, Xueguang Ma, Wenhu Chen(U Waterloo)
> **发表**: 2024-06 arXiv preprint
> **arXiv**: [2406.15319](https://arxiv.org/abs/2406.15319)
> **特殊地位**:**RAG vs LC 路线之争的"融合方案"代表**——用 LC LLM 做 RAG generator,而非取代 RAG[[wiki/concepts/rag_vs_long_context]] ^p-1-19ac97

## 摘要 ^h-2-1-3ae146

LongRAG 把 RAG 的 **retrieval unit 从 100-word chunk 扩到 4K-word "long document"**,**只检索 top-4-8 而非 top-100**,然后用 long-context LLM(GPT-4 128K)作 generator 一次性消化所有 retrieved long documents。在 NQ / HotpotQA 上接近 SOTA(86.4% on NQ),**显著优于 chunk-based RAG**,且需要的 retrieval 调用次数从 100+ 降到 < 10[[raw/papers/2024-06-longrag]]。 ^p-2-1a340f

## 关键发现 / 论点 ^h-2-2-10e39a

1. **长 retrieval unit 让 retriever 更轻松**:retriever 不必精准定位 100-word 段,只要找到相关 4K-word 段即可[[raw/papers/2024-06-longrag]]
2. **LC LLM 让 RAG generator 更鲁棒**:128K context 处理多个 4K 段不再 lost-in-the-middle [KB 综合]
3. **vs DeepMind RAG-or-LongContext 的 Self-Route**:Self-Route 是 routing(用 RAG 或 LC),LongRAG 是 **融合**(RAG + LC generator) [KB 综合]
4. **vs chunk-based RAG**:retrieval 调用次数减 90%,但召回质量不降 [KB 综合] ^p-3-1a06af

## AI 综合判断 ^h-2-3-e0eacb

### 核心价值 ^h-3-1-57ae37

LongRAG 是 **"RAG 不会被 LC 取代,而是融合"** 的具体技术方案。它与 [[wiki/sources/rag_or_longcontext]] Self-Route 共同构成 **2024 RAG vs LC 之争的两种和解路径**:Self-Route 是 query-level routing,LongRAG 是 retrieval-unit-level scaling。**这是给 [[wiki/concepts/rag_vs_long_context]] 概念页加"融合方案"小节的关键 anchor**——之前该概念页只有 Self-Route 一种融合思路。 ^p-4-831300

### 关联 ^h-3-2-1c3cf7

- [[wiki/concepts/rag_vs_long_context]] — 融合方案具体 anchor(LongRAG 让 RAG 的 retrieval unit 适配 LC)
- [[wiki/sources/rag_or_longcontext]] — Self-Route 是另一种融合思路(query-level routing)
- [[wiki/sources/recomp]] / [[wiki/sources/longllmlingua]] — 同期 LC 工程武器,但路径不同 ^p-5-015f30

### 冲突 ^h-3-3-93190b

**不触发新冲突标注** — LongRAG 是融合方案而非新挑战。给 [[wiki/concepts/rag_vs_long_context]] 加"融合方案"小节即可。 ^p-6-ef9b9a

## 与 Wiki 的关联 ^h-2-4-8625b8

- MOC:[[wiki/indexes/rag_evolution_index]] Batch 3 ^p-7-421d5f
