---
title: "Self-Ask: Compositionality Gap (Press et al. 2022-10)"
type: source_summary
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: draft
confidence: high
source_count: 1
sources:
  - "[[raw/papers/2022-10-self-ask]]"
tags:
  - rag
  - query-decomposition
  - prompting
  - 2022
---

# Self-Ask: 显式 query decomposition prompting ^h-1-1-37888c

> **原始文件**: [[raw/papers/2022-10-self-ask]]
> **作者**: Ofir Press, Muru Zhang et al.(U Washington / Allen AI / Meta AI)
> **发表**: 2022-10 arXiv preprint
> **arXiv**: [2210.03350](https://arxiv.org/abs/2210.03350)
> **完整标题**:"Measuring and Narrowing the Compositionality Gap in Language Models" — Self-Ask 是论文提出的解决方法
> **历史地位**:**显式 query decomposition** 路线的起点;LangChain 等框架默认实现的"agent loop"模式来源 ^p-1-d60ebe

## 摘要 ^h-2-1-3ae146

Press et al. 首次定义并量化 **"compositionality gap"**:LLM 能答对单个 sub-question 但答错 compositional question 的概率差。提出 **Self-Ask prompting**:让 LLM 在回答主问题前**显式问自己 follow-up question**(用 "Are follow up questions needed here?" + "Follow up: ..." + "Intermediate answer: ..." 这套固定结构),每个 follow-up 都可单独检索/回答。Self-Ask + search engine 在 multi-hop QA 上显著超过 vanilla CoT[[raw/papers/2022-10-self-ask]]。 ^p-2-2ebac1

## 关键发现 / 论点 ^h-2-2-10e39a

1. **Compositionality gap 是 LLM 的内在弱点** — 模型知道每个 sub-fact 但不会自己 compose[[raw/papers/2022-10-self-ask]]
2. **显式 decomposition 是解药** — Self-Ask 用结构化 prompt 强制 LLM 拆问题 [[raw/papers/2022-10-self-ask]]
3. **整合 search engine 是自然下一步** — 每个 follow-up 都是一个 search-able query [[raw/papers/2022-10-self-ask]]
4. **scaling 不能解决** — 论文显示 GPT-3 175B 仍有显著 compositionality gap [[raw/papers/2022-10-self-ask]] ^p-3-63401b

## AI 综合判断 ^h-2-3-e0eacb

### 核心价值 ^h-3-1-57ae37

Self-Ask 是 **现代 agentic 模式的雏形**——它的"follow up question + intermediate answer"结构启发了 LangChain 等框架默认的 agent loop。Search-R1 论文 §2 把 Self-Ask 归类为 "search-as-a-tool with prompting" 路线[[raw/papers/2025-03-search-r1#^p-19-ab77b7]]。Self-Ask **不直接做 RAG**(主要面向 search engine 调用),但实质上是 query decomposition + iterative retrieval 范式的起点。 ^p-4-d9b05d

### 关联 ^h-3-2-1c3cf7

- [[wiki/concepts/self_reflective_rag]] — 演化前置历史(显式 decomposition 起点)
- [[wiki/sources/react]] — 同期 prompting agent 工作(ReAct 更强调 Action 范畴)
- [[wiki/sources/ircot]] — 同为 multi-step retrieval prompting,但 IRCoT 隐式 / Self-Ask 显式 ^p-5-2809ea

### 冲突 ^h-3-3-93190b

**不触发新冲突标注** — 与 FLARE / IRCoT 同属 prompting 路线,演化前置历史。 [KB 综合] ^p-6-46e19b

## 与 Wiki 的关联 ^h-2-4-8625b8

- MOC:[[wiki/indexes/rag_evolution_index]] Batch 2 ^p-7-0b1d16
