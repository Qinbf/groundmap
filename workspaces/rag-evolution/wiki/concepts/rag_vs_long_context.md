---
title: "RAG vs Long-Context LLMs (路线之争)"
type: concept
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: draft
confidence: medium
source_count: 4
sources:
  - "[[wiki/sources/rag_or_longcontext]]"
  - "[[wiki/sources/longrag]]"
  - "[[wiki/sources/longllmlingua]]"
  - "[[wiki/sources/recomp]]"
tags:
  - rag
  - long-context
  - hybrid
  - existential-challenge
---

# RAG vs Long-Context LLMs(路线之争)^h-1-1-21f6f5

> 当 LLM context window 增长到 1M tokens(Gemini-1.5)、128K(GPT-4O)时,RAG 是否还有存在必要?DeepMind 2024-07 论文给出系统对比并提出 hybrid 方案 Self-Route[[wiki/sources/rag_or_longcontext]]。 ^p-1-5e5edd

## DeepMind 的核心论断 ^h-2-1-8c7e4c

**LC consistently outperforms RAG**,只要资源足够[[wiki/sources/rag_or_longcontext#^p-2-32eee0]]:
- Gemini-1.5-Pro: LC 49.70 vs RAG 37.33(**+7.6%**)
- GPT-4O: LC 48.67 vs RAG 32.60(**+13.1%**)
- GPT-3.5-Turbo: LC 32.07 vs RAG 30.33(+3.6%)

但 **RAG 仍有不可替代场景**:
- **成本优势**:输入 token 数显著少,直接对应 API 成本
- **Corpus 远超 model context**:GPT-3.5-Turbo (16K) 上 ∞Bench (147K) 时 RAG 反超
- **63% 的 query 上 RAG 与 LC 结果完全相同**——RAG 不是"差",是"在硬 query 上失败"[[wiki/sources/rag_or_longcontext#^p-38-54f895]] ^p-2-9e3703

## RAG 失败的 4 类硬 query ^h-2-2-ae1b9a

DeepMind 总结 RAG 输给 LC 的查询类型:

| 类型 | 例子 | 为什么 RAG 失败 |
|---|---|---|
| (A) Multi-step reasoning | "XX 歌曲演唱者的国籍是?" | 需要前一步结果做后一步检索,RAG 一次只检索 |
| (B) 一般性问题 | "这群人对 X 的态度?" | retriever 难构造好 query |
| (C) 长复杂查询 | 多嵌套长 query | retriever 难理解 query |
| (D) 隐式查询 | "飞船后的影子是什么?" 但原文从不直接提"影子" | 需要全文上下文推理 |
^t-1-5d67e9 ^p-3-c9be93

## Self-Route:两阶段 hybrid ^h-2-3-749f4e

**Step 1 (RAG-and-Route)**:LLM 拿到 retrieved chunks,prompt 加 `"Write unanswerable if the query can not be answered based on the provided text"`。
- 若 LLM 自评 answerable → 接受 RAG 答案(便宜)
- 若 unanswerable → 进入 Step 2

**Step 2 (LC)**:把全文给 LLM,LC 范式回答。

**结果**:成本减 65%(Gemini-1.5-Pro)/ 39%(GPT-4O),性能逼近 LC[[wiki/sources/rag_or_longcontext#^h-2-4-6a846e]]。 ^p-4-f44cd1

## 对前 3 篇 RAG 工作的隐含挑战 ^h-2-4-698a79

- **vs [[wiki/concepts/self_reflective_rag]] (Self-RAG)**:Self-RAG 改 generator 控制流以接近 ChatGPT 表现——但若 GPT-4O LC 直接超过 13.1%,Self-RAG 的 7B/13B 模型努力空间在哪?[[wiki/sources/rag_or_longcontext#^p-2-32eee0]]
- **vs [[wiki/concepts/corrective_rag]] (CRAG)**:CRAG 的 web search 兜底解决"static corpus 不够"——但 LC 1M 上下文直接吞下整个 corpus,web search 必要性下降
- **vs [[wiki/concepts/graph_rag]] (GraphRAG)**:GraphRAG 的 global sensemaking 优势,LC 长上下文也能做(成本贵但能做)

**关键观察**:这 3 篇 RAG 改进与 LC 路径**并非互斥**,但 LC 让"基础 RAG 不够好"的痛点弱化,RAG 改进的价值更多落到**成本敏感场景** + **corpus 大于 context** 两个 specific use case 上。 ^p-5-174837

## 局限性 ^h-2-5-3da1c7

- **数据集 leakage 难排除**:加 prompt 限制只是经验缓解
- **1M token 之外行为未知**:更长 corpus 上 LC 上限是多少[[wiki/sources/rag_or_longcontext]]
- **Cost 计算粗糙**:只看 input tokens,忽略 retriever 自身成本
- **不同 LLM alignments 影响 Self-Route 表现**:OpenAI vs Gemini 的 trade-off 不同 ^p-6-91582d

## 融合方案的工程化 ^h-2-7-ba1bea 3 升级)

Batch 3 ingest [[wiki/sources/longrag]] / [[wiki/sources/longllmlingua]] / [[wiki/sources/recomp]] 后,**RAG vs LC 之争实质上演化出 3 条融合路径**——而不只是 DeepMind 的 Self-Route 一种:

| 路径 | 代表论文 | 思路 |
|---|---|---|
| **Query-level routing** | [[wiki/sources/rag_or_longcontext]] Self-Route | 让 LLM 自决:答得了就 RAG,答不了就 LC |
| **Retrieval-unit scaling** | [[wiki/sources/longrag]] (2024-06) | 把 retrieval unit 从 100-word chunk 扩到 4K-word long doc;LC LLM 作 generator |
| **Prompt/Doc 压缩对抗 LC** | [[wiki/sources/longllmlingua]] (2023-10) + [[wiki/sources/recomp]] (2023-10) | 短 LLM + 压缩仍能处理大 corpus,抵销 LC 成本优势 |
^t-2-db7484 ^p-8-9dfe5c

**关键观察**:三条融合路径**互补而非互斥**——可以同时用 Self-Route 决定何时 RAG / 何时 LC + LongRAG 做 RAG retrieval unit 设计 + LongLLMLingua 压缩 retrieved 内容。**RAG 没有被 LC 取代,而是分化为"何时用 RAG 替代 LC"的工程系统**。 ^p-9-11b0c8

## 关联页面 ^h-2-6-1244d4

- [[wiki/sources/rag_or_longcontext]] — DeepMind 原论文(Self-Route)
- [[wiki/sources/longrag]] — 融合方案:retrieval unit scaling
- [[wiki/sources/longllmlingua]] / [[wiki/sources/recomp]] — 融合方案:压缩对抗 LC
- [[wiki/concepts/retrieval_augmented_generation]] — 上位概念
- [[wiki/indexes/rag_evolution_index]] — MOC ^p-10-572217
