---
title: "DeepRAG: Thinking to Retrieve Step by Step (Guan et al. 2025-02)"
type: source_summary
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: reviewed
confidence: high
source_count: 1
sources:
  - "[[raw/papers/2025-02-deeprag]]"
tags:
  - rag
  - reasoning
  - imitation-learning
  - 2025
  - cas
---

# DeepRAG: Thinking to Retrieve Step by Step ^h-1-1-6fcf1f

> **原始文件**: [[raw/papers/2025-02-deeprag]]
> **作者**: Xinyan Guan, Jiali Zeng et al.(中科院 CAS + Tencent)
> **发表**: 2025-02 arXiv preprint
> **arXiv**: [2502.01142](https://arxiv.org/abs/2502.01142)
> **特殊地位**:**与 Search-o1 / R1-Searcher / Search-R1 共同构成 2025 agentic RAG 三方对照**——DeepRAG 走 **imitation learning**(MCTS 搜索 → 训学生模型),不同于 prompting 或 RL ^p-1-12fb7e

## 摘要 ^h-2-1-3ae146

DeepRAG 把 RAG 建模为 **Markov Decision Process**——在每个推理 step 选择 atomic decision: **subquery generation** / **atomic decision**(是否检索) / **answer generation**。通过 **Imitation Learning + Chain of Calibration** 训练:先用 MCTS-style binary tree search 找最优路径,再训学生模型模仿。在多个 QA 数据集上**显著超过 ReAct / Self-RAG / Iter-RetGen**,21.99% 平均提升[[raw/papers/2025-02-deeprag]]。 ^p-2-dba305

## 关键发现 / 论点 ^h-2-2-10e39a

1. **RAG 决策建模为 MDP**:每步推理是一个 decision(retrieve / not / generate) [[raw/papers/2025-02-deeprag]]
2. **imitation learning 是 prompting 和 RL 之外的第三条路**:用 MCTS 找最优路径作监督信号 [[raw/papers/2025-02-deeprag]]
3. **Atomic decision** 比 reflection tokens 更细粒度:每个 subquery 独立决定 retrieve 与否 [KB 综合]
4. **vs R1 派**:DeepRAG 用 imitation learning 而非 outcome reward RL — 更稳定但需要 MCTS rollout 成本 [KB 综合]
5. **vs Search-o1**:DeepRAG 训新模型,Search-o1 纯 prompting [KB 综合] ^p-3-a150ff

## AI 综合判断 ^h-2-3-e0eacb

### 核心价值 ^h-3-1-57ae37

DeepRAG 让 **2025 agentic RAG 的方法论分歧从二元(prompting o1 派 vs RL R1 派)变为三元(+ imitation learning)**。它给 [[wiki/concepts/rl_augmented_retrieval]] 的新冲突标注(o1 派 vs R1 派)提供**第三个对照点**——MDP + IL 路径既非 prompting 也非 RL outcome reward。 ^p-4-4407e2

### 关联 ^h-3-2-1c3cf7

- [[wiki/concepts/rl_augmented_retrieval]] — 2025 agentic RAG 第三家(imitation learning 派)
- [[wiki/sources/search_o1]] — o1 派(prompting)
- [[wiki/sources/r1_searcher]] / [[wiki/sources/search_r1]] — R1 派(RL outcome reward) ^p-5-9da198

### 冲突 ^h-3-3-93190b

**不单独触发新冲突标注** — DeepRAG 作为 imitation learning 第三家,纳入 [[wiki/concepts/rl_augmented_retrieval]] 的 o1 派 vs R1 派冲突标注的对照表即可。 ^p-6-4226d0

## 与 Wiki 的关联 ^h-2-4-8625b8

- 影响:在 [[wiki/concepts/rl_augmented_retrieval]] 三家对照表里加 DeepRAG 行
- MOC:[[wiki/indexes/rag_evolution_index]] Batch 3 ^p-7-82410e
