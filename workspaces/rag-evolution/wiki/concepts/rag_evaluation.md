---
title: "RAG Evaluation (评估框架与 Benchmark)"
type: concept
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: draft
confidence: high
source_count: 3
sources:
  - "[[wiki/sources/ragas]]"
  - "[[wiki/sources/crag_benchmark]]"
  - "[[wiki/sources/multihop_rag]]"
tags:
  - rag
  - evaluation
  - benchmark
---

# RAG Evaluation (评估框架与 Benchmark) ^h-1-1-093690

> 本页综合 Batch 4 ingest 的 3 篇评估论文,梳理 **RAG 评估的两个维度**:**自动指标框架**(RAGAS)+ **benchmark 数据集**(CRAG benchmark / MultiHop-RAG)。这是本 KB demo 的最后一块拼图——之前 30 篇 ingest 都聚焦"如何改进 RAG",这 3 篇聚焦"如何评估 RAG"。 ^p-1-33b75e

## 自动指标框架:RAGAS ^h-2-1-bd696d

[[wiki/sources/ragas]] 提出三维度评估,**无需 reference answer**:

| 维度 | 测什么 | 类比 Self-RAG token |
|---|---|---|
| **Faithfulness** | answer 是否被 retrieved context 支持 | 类 IsSup |
| **Context Relevance** | retrieved context 对 query 是否相关 | 类 IsRel |
| **Answer Relevance** | answer 是否回答了 query | 类 IsUse |
^t-1-5d67e9 ^p-2-af89c4

**关键洞察**:RAGAS 的三维度评估框架**与 Self-RAG 的 reflection tokens 思想同源** — 但 RAGAS 在评估层(外部 LLM-as-judge),Self-RAG 在生成层(内嵌到 vocabulary)[[wiki/sources/self_rag#^t-23-1c2106]]。这是同一组思想的不同实现层级。 ^p-3-693526

详见 [[wiki/sources/ragas]] + Gao Survey §VI 章节[[wiki/sources/gao_rag_survey#^h-2-1-9f7e46]]。 ^p-3a-re-ragas-anchor

## Benchmark 数据集 ^h-2-2-32080b

| Benchmark | 时间 | 规模 | 特点 | 暴露的 RAG 短板 |
|---|---|---|---|---|
| **NQ / TriviaQA / HotpotQA** | 2017-2018 | 大 | Wikipedia,简单/半合成多跳 | 已 saturated,过于乐观 |
| **MuSiQue / 2WikiMultiHopQA** | 2022 | 中 | 更难的合成多跳 | retriever 多跳能力 |
| **[[wiki/sources/multihop_rag]]** | 2024-01 | 2.5K | News 真实多跳 + Null query | 真实多跳 + 拒答能力 |
| **[[wiki/sources/crag_benchmark]]** | 2024-06 | 4.4K | 4 领域 + 8 query 类型 + 3 维度变化 | aggregation / set / temporal / false premise |
^t-2-db7484 ^p-4-c9bb14

**关键论断**:**主流 RAG(GPT-4 + dense retriever)在 CRAG benchmark 上准确率仅 ~40%** —— 远低于 NQ 等简单 benchmark 上 80%+ 的水平[[wiki/sources/crag_benchmark#^p-3-3284e5]]。**这意味着 RAG 演化的"性能领先"宣称大多基于过时 benchmark,真实场景仍有巨大改进空间**。 ^p-5-f6b9bf

## 与本 KB 已 ingest 30 篇论文的关系 ^h-2-3-de05f1

| 论文 | 在 CRAG benchmark / MultiHop-RAG 上跑过吗 |
|---|---|
| [[wiki/sources/self_rag]] (2023-10) | ✗ benchmark 发布晚于此论文 |
| [[wiki/sources/crag]] (2024-01 Corrective RAG) | ✗ |
| [[wiki/sources/graphrag]] (2024-04) | ✗ |
| [[wiki/sources/lightrag]] (2024-10) | ✗ 但论文用了类似评估范式 |
| [[wiki/sources/hipporag2]] (2025-02) | ⚠ 部分(MuSiQue / 2Wiki 是其 multi-hop 集) |
| [[wiki/sources/r1_searcher]] / [[wiki/sources/search_r1]] (2025-03) | ⚠ 部分(HotpotQA / 2Wiki / Bamboogle) |
^t-3-68635f ^p-6-81df8c

**关键观察**:**几乎所有 KB demo 已 ingest 的 RAG 改进工作都未在 CRAG benchmark 上跑分** — 这意味着这些工作宣称的"SOTA" 基于过时 benchmark。后续 2025 后期 / 2026 工作应该在 CRAG benchmark + MultiHop-RAG 上重新对照。 ^p-7-3fd99f

## 与 Gao Survey §VI 的对照 ^h-2-4-f0f728

[[wiki/sources/gao_rag_survey]] §VI Task and Evaluation(扫读)讨论了 RAG 评估维度——但 survey v5(2024-03)早于 CRAG benchmark(2024-06),**RAGAS 和 MultiHop-RAG 已被 survey 覆盖但 CRAG benchmark 未覆盖**。本 KB 通过 Batch 4 ingest **实质扩展了 survey §VI 章节** — 类似 Batch 0 扩展 survey 时间窗 1 年的逻辑。 ^p-8-3b9cb6

## 关联页面 ^h-2-5-825748

- 3 个 source_summary:[[wiki/sources/ragas]] / [[wiki/sources/crag_benchmark]] / [[wiki/sources/multihop_rag]]
- [[wiki/sources/gao_rag_survey]] §VI 章节
- [[wiki/concepts/retrieval_augmented_generation]] — 上位概念(评估方向新增 anchor)
- [[wiki/indexes/rag_evolution_index]] — MOC ^p-9-1ef89b
