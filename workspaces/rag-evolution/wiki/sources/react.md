---
title: "ReAct: Reasoning + Acting (Yao et al. 2022-10)"
type: source_summary
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: reviewed
confidence: high
source_count: 1
sources:
  - "[[raw/papers/2022-10-react]]"
tags:
  - rag
  - agent
  - prompting
  - 2022
  - princeton
---

# ReAct: Synergizing Reasoning and Acting ^h-1-1-b444f7

> **原始文件**: [[raw/papers/2022-10-react]]
> **作者**: Shunyu Yao, Jeffrey Zhao et al.(Princeton / Google Research)
> **发表**: 2022-10 arXiv preprint(ICLR 2023)
> **arXiv**: [2210.03629](https://arxiv.org/abs/2210.03629)
> **历史地位**:**LLM agent 的奠基性工作**;LangChain / AutoGPT / 大量 agent 框架的核心 prompting 模板来源 ^p-1-0c5850

## 摘要 ^h-2-1-3ae146

ReAct 提出 LLM **交替生成 reasoning trace 和 action**(action 包括 search / lookup / finish 等)的 prompting 模板:`Thought → Action → Observation → Thought → Action → ...`。**在 HotpotQA / FEVER 等 QA 任务上显著超过纯 CoT 和纯 Acting**,在 ALFWorld / WebShop 等 interactive 任务上超过 RL agent[[raw/papers/2022-10-react]]。 ^p-2-27f340

## 关键发现 / 论点 ^h-2-2-10e39a

1. **Reasoning 帮 Acting**:Thought 让 LLM "想清楚下一步要做什么 action" [[raw/papers/2022-10-react]]
2. **Acting 帮 Reasoning**:Observation(action 返回结果)修正 LLM 的 reasoning 偏差 [[raw/papers/2022-10-react]]
3. **两者协同 > 任一单独**:HotpotQA F1 ReAct > CoT 6.8%,> Acting-only 16%[[raw/papers/2022-10-react#^p-13-63c4e3]]
4. **completely prompting-based**:用 4-6 个 in-context examples 即可,无需 fine-tune [[raw/papers/2022-10-react]] ^p-3-7ba51f

## AI 综合判断 ^h-2-3-e0eacb

### 核心价值 ^h-3-1-57ae37

ReAct 是 **2022-2024 agent 框架的事实模板**。本 KB 的 R1-Searcher / Search-R1 的多轮 search 模板(`<think> / <search> / <information>`)本质上是 ReAct 的 RL 强化版——Search-R1 论文 §2 显式承认这点[[raw/papers/2025-03-search-r1#^p-19-ab77b7]]。**ReAct → Self-Ask → IRCoT → FLARE 是 prompting 路线的完整演化链**,共同被 Self-RAG (SFT) 和 R1 派 (RL) propose 替代。 ^p-4-f8a14e

### 关联 ^h-3-2-1c3cf7

- [[wiki/concepts/self_reflective_rag]] — 演化前置历史(agent loop 起点)
- [[wiki/concepts/rl_augmented_retrieval]] — R1 派的 multi-turn 模板继承 ReAct 框架
- [[wiki/sources/search_r1]] — 显式引用 ReAct 作 prompting 路线代表[[raw/papers/2025-03-search-r1#^p-19-ab77b7]] ^p-5-4884c7

### 冲突 ^h-3-3-93190b

**不触发新冲突标注** — prompting 路线的代表,与 Self-RAG/R1 派的演化关系已被现有冲突标注覆盖。 [KB 综合] ^p-6-de8137

## 与 Wiki 的关联 ^h-2-4-8625b8

- MOC:[[wiki/indexes/rag_evolution_index]] Batch 2 ^p-7-0b1d16
