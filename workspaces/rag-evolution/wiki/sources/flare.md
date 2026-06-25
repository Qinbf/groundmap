---
title: "FLARE: Active Retrieval-Augmented Generation (Jiang et al. 2023-05)"
type: source_summary
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: draft
confidence: high
source_count: 1
sources:
  - "[[raw/papers/2023-05-flare]]"
tags:
  - rag
  - adaptive-retrieval
  - prompting
  - 2023
  - cmu
---

# FLARE: Active Retrieval-Augmented Generation ^h-1-1-d8c2e3

> **原始文件**: [[raw/papers/2023-05-flare]]
> **作者**: Zhengbao Jiang, Frank F. Xu et al.(CMU)
> **发表**: 2023-05 arXiv preprint(EMNLP 2023)
> **arXiv**: [2305.06983](https://arxiv.org/abs/2305.06983)
> **历史地位**:**Self-RAG 之前最有影响力的 adaptive retrieval 工作**;Gao Survey §II-C2 把 FLARE 和 Self-RAG 并列为 "Modular RAG / adaptive retrieval" 模式代表[[wiki/sources/gao_rag_survey#^p-5-3e97fb]] ^p-1-23031a

## 摘要 ^h-2-1-3ae146

FLARE 是 **prompting-based adaptive retrieval** 的代表 — 在生成过程中,LLM 每生成一个 sentence 都检查 token 的 logprob,**遇到 low-confidence token(< 阈值)就触发新检索**,用检索结果重新生成该 sentence。无需训练,**完全靠 prompting + token probability 实现 adaptive retrieval**。在多个长文生成 benchmark(ELI5 / 2WikiMultiHopQA / StrategyQA / ASQA)上显著优于固定检索次数的 RAG[[raw/papers/2023-05-flare]]。 ^p-2-a5ef2b

## 关键发现 / 论点 ^h-2-2-10e39a

1. **adaptive 决策无需新训练**:用 GPT-4 等强 LLM 的 token logprob 作信号,prompting 即可触发动态 retrieve [[raw/papers/2023-05-flare]]
2. **forward-looking retrieval**:不像 IRCoT 是 step-by-step,FLARE 先生成一个 tentative 句子,有 low-confidence token 就用该句作为 query 重检索 [[raw/papers/2023-05-flare]]
3. **vs vanilla RAG**:固定 top-K 检索会浪费(简单问题)+ 不够(复杂问题);FLARE 按需触发 [KB 综合]
4. **依赖闭源 LLM 的 logprob 访问** — 这一限制后来被 Self-RAG 在论文里点名批评[需要来源] ^p-3-05f326

## AI 综合判断 ^h-2-3-e0eacb

### 核心价值 ^h-3-1-57ae37

FLARE 确立了 **"adaptive retrieval = 按需触发"** 这一范式的雏形。**它是 Self-RAG 的直接前作之一**——Self-RAG 论文 §2 Related Work 明确把 FLARE 列为 "concurrent work" 并批评其依赖闭源 LLM。本论文是 [[wiki/concepts/self_reflective_rag]] 概念页"演化前置历史"的关键节点。 ^p-4-05a59f

### 关联 ^h-3-2-1c3cf7

- [[wiki/concepts/self_reflective_rag]] — 演化前置历史(prompting 起点)
- [[wiki/sources/self_rag]] — 后继 SFT 路线,显式批评 FLARE 的闭源依赖
- [[wiki/sources/gao_rag_survey]] — survey 把 FLARE 和 Self-RAG 并列为 Modular RAG adaptive 模式 ^p-5-3d809f

### 冲突 ^h-3-3-93190b

**不触发新冲突标注** — FLARE 的"prompting-based adaptive"在 Self-RAG/R1 派眼里的局限,已被 [[wiki/concepts/self_reflective_rag]] 现有 2 个 `> [!WARNING]` 块覆盖(prompting → SFT → RL 的三段式演化论)。 ^p-6-070d9e

## 与 Wiki 的关联 ^h-2-4-8625b8

- MOC:[[wiki/indexes/rag_evolution_index]] Batch 2 ^p-7-0b1d16
