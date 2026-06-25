---
title: "RAGAS: Automated Evaluation of RAG (Es et al. 2023-09)"
type: source_summary
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: draft
confidence: high
source_count: 1
sources:
  - "[[raw/papers/2023-09-ragas]]"
tags:
  - rag
  - evaluation
  - llm-as-judge
  - 2023
---

# RAGAS: Automated Evaluation of RAG ^h-1-1-b54ae5

> **原始文件**: [[raw/papers/2023-09-ragas]]
> **作者**: Shahul Es, Jithin James et al.(Exploding Gradients 创业团队)
> **发表**: 2023-09 arXiv preprint(EACL 2024)
> **arXiv**: [2309.15217](https://arxiv.org/abs/2309.15217)
> **特殊地位**:**Gao Survey §VI Task and Evaluation 引用 RAGAS 作 "automated RAG metrics" 代表**[[wiki/sources/gao_rag_survey#^p-9-8779ac]];RAGAS Python 库(github.com/explodinggradients/ragas)是工程界事实标准 ^p-1-f54d4c

## 摘要 ^h-2-1-811e72

RAGAS 提出 **无需 reference answer** 的 RAG 自动评估框架,完全靠 **LLM-as-judge**。三大维度: [KB 综合]
- **Faithfulness**:生成的 answer 是否被 retrieved context 支持(类 Self-RAG 的 IsSup)
- **Context Relevance**:retrieved context 相对于 query 的相关度
- **Answer Relevance**:answer 是否真的回答了 query

每个维度都通过 LLM 多步 prompt 计算分数(0-1)。在 WikiEval 数据集上,RAGAS 评分**与人工标注高度相关**(spearman > 0.8)[[raw/papers/2023-09-ragas]]。 ^p-2-2c2871

## 关键发现 / 论点 ^h-2-2-93d2ce

1. **三维度足够覆盖 RAG 评估** — 之前评估靠 EM/F1 或人工 [KB 综合]
2. **LLM-as-judge 可替代标注** — 显著降低评估成本,也支持开发循环中持续评估 [[raw/papers/2023-09-ragas]]
3. **可分别诊断**:Faithfulness 低 → generator 问题;Context Relevance 低 → retriever 问题 [[raw/papers/2023-09-ragas]]
4. **Python 库工程化**:RAGAS 库是 LangChain / LlamaIndex 配套生态 [[raw/papers/2023-09-ragas]] ^p-3-520f02

## AI 综合判断 ^h-2-3-3d5f17

### 核心价值 ^h-3-1-eb2f7a

RAGAS 把 RAG 评估**从研究的"标注稀缺"困境中解放**——开发者无需准备 reference answer,任何 corpus + LLM 都能跑评估。它的 3 维度框架被 Gao Survey §VI 直接引用,后续 RAG 工作普遍报告 RAGAS 分数。**与 Self-RAG 的 reflection tokens 思想同源**(都把 retrieval / generation 各环节解耦评估),但 RAGAS 在评估层 + Self-RAG 在生成层。 [KB 综合] ^p-4-5d0f0d

### 关联 ^h-3-2-f856d6

- [[wiki/sources/gao_rag_survey]] — Gao Survey §VI 章节核心引用
- [[wiki/concepts/self_reflective_rag]] — RAGAS 三维度与 Self-RAG IsRel/IsSup/IsUse 思想同源
- [[wiki/concepts/retrieval_augmented_generation]] — RAG 评估方向具体 anchor ^p-5-d5a3d7

### 冲突 ^h-3-3-cabb88

**不触发新冲突标注** — 评估方法不冲突任何 RAG 改进路线,正交于本 KB 的 5 条主线。 [KB 综合] ^p-6-2f3f28

## 与 Wiki 的关联 ^h-2-4-5a2e99

- MOC:[[wiki/indexes/rag_evolution_index]] Batch 4 ^p-7-71c33a
