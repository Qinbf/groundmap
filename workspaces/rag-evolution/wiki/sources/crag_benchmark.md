---
title: "CRAG -- Comprehensive RAG Benchmark (Yang et al. Meta 2024-06)"
type: source_summary
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: draft
confidence: high
source_count: 1
sources:
  - "[[raw/papers/2024-06-crag-bench]]"
tags:
  - rag
  - benchmark
  - evaluation
  - 2024
  - meta
---

# CRAG: Comprehensive RAG Benchmark(Meta KDD Cup 2024)^h-1-1-7d9fa7

> **原始文件**: [[raw/papers/2024-06-crag-bench]]
> **作者**: Xiao Yang, Kai Sun, Hao Xin et al.(Meta FAIR)
> **发表**: 2024-06 arXiv preprint(NeurIPS 2024 D&B)
> **arXiv**: [2406.04744](https://arxiv.org/abs/2406.04744)
> **⚠ 命名碰撞**:此 CRAG 是 Meta 出的 **Comprehensive RAG Benchmark**,与 [[wiki/sources/crag]](Yan et al. 2024-01 的 Corrective RAG)**完全不同**,只是缩写撞名 ^p-1-2740e8

## 摘要 ^h-2-1-811e72

Meta CRAG benchmark 是 **2024 KDD Cup 比赛使用的综合 RAG 评估集**——目标:**测试真实场景的 RAG 鲁棒性**,显著扩展 NQ / TriviaQA 等单维度 benchmark。包含 **4 个领域**(Finance / Sports / Music / Movie / Open)+ **8 种 query 类型**(Simple / Conditional / Aggregation / Set / Comparison / Multi-hop / Post-processing / False Premise)+ **3 维度变化**(Dynamic / Popularity / Temporal),约 **4400 个标注问题**[[raw/papers/2024-06-crag-bench]]。 ^p-2-e52076

## 关键发现 / 论点 ^h-2-2-93d2ce

1. **真实场景 ≠ 简单事实问答**:8 种 query 类型暴露了主流 RAG 在 aggregation / set / comparison 类问题上的盲点[[raw/papers/2024-06-crag-bench]]
2. **Dynamic / temporal 维度**:数据新鲜度对 RAG 表现影响巨大(财经数据每日变化) [[raw/papers/2024-06-crag-bench]]
3. **False Premise** 类:测试 RAG 是否能识别"问题本身错"(而非硬答)— 与 Self-RAG 的 IsRel 思想同源 [KB 综合]
4. **Meta 评估发现**:GPT-4 + 主流 RAG 在 CRAG benchmark 上准确率仅 ~40%,远低于 NQ 等简单 benchmark [[raw/papers/2024-06-crag-bench]] ^p-3-3284e5

## AI 综合判断 ^h-2-3-3d5f17

### 核心价值 ^h-3-1-eb2f7a

CRAG benchmark 是 **2024 之后 RAG 工作的事实评估标准**——之前的工作普遍只在 NQ / TriviaQA / HotpotQA 上报告分数,容易高估。CRAG 的 8 种 query 类型和 4 领域设计**暴露了主流 RAG 的真实弱点**。本 KB 已 ingest 的 [[wiki/sources/r1_searcher]] / [[wiki/sources/search_r1]] / [[wiki/sources/hipporag2]] 等 2024-2025 论文虽未在 CRAG benchmark 上跑分(发布早于 CRAG),但后续工作普遍报告 CRAG 分数。 ^p-4-35fc0a

### 关联 ^h-3-2-f856d6

- [[wiki/sources/gao_rag_survey]] — Gao Survey §VI 章节(survey 写作时 CRAG benchmark 还未发布,但 v6 可能补充)
- [[wiki/sources/ragas]] — RAGAS 是评估指标,CRAG 是评估数据集 — **互补关系** ^p-5-7fec4e

### 冲突 ^h-3-3-cabb88

**不触发新冲突标注** — 评估 benchmark 不直接挑战任何 RAG 方法。但**给 [[wiki/concepts/retrieval_augmented_generation]] 提供新论断**:**主流 RAG 在真实场景下表现远不如 NQ 等 benchmark 显示**——这值得纳入根概念页的"局限性"段。 ^p-6-ebb4e7

## 与 Wiki 的关联 ^h-2-4-5a2e99

- MOC:[[wiki/indexes/rag_evolution_index]] Batch 4 ^p-7-71c33a
