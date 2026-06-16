---
title: "Corrective RAG (自纠错 RAG)"
type: concept
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: reviewed
confidence: high
source_count: 1
sources:
  - "[[wiki/sources/crag]]"
tags:
  - rag
  - corrective-rag
  - retrieval-evaluator
  - web-search
---

# Corrective RAG (自纠错 RAG) ^h-1-1-311ff6

> 用一个独立的、**轻量级的检索质量 evaluator**(典型实现:T5-large fine-tuned, 0.77B)对 retrieval 结果打分;根据分数触发 Correct/Incorrect/Ambiguous 三档动作,**Incorrect 档用 web search 兜底**。原始定义见 Yan et al. arXiv 2024-01[[wiki/sources/crag]]。 ^p-1-1d0344

## 核心机制:三档 Action Trigger ^h-2-1-91b99e

| Action | 触发条件 | 动作 |
|---|---|---|
| **Correct** | 至少一个检索文档分数 > upper threshold | 走 knowledge refine(decompose-then-recompose)精炼后给 generator |
| **Incorrect** | 所有检索文档分数 < lower threshold | **抛弃 retrieval 结果,走 web search**(Google Search + ChatGPT 改写 query) |
| **Ambiguous** | 中间档 | 上述两种结果都做,合并 |
^t-1-435878 ^p-2-ff84ed

详见 [[wiki/sources/crag#^h-2-2-93d2ce]]。 ^p-3-0b51a7

## decompose-then-recompose 精炼算法 ^h-2-2-a75f9d

把检索文档切成"knowledge strips"(几句话级),evaluator 对每个 strip 单独打分,过滤掉低分 strip,把高分 strip 重新拼接成"internal knowledge"——这是 vanilla RAG 与 Self-RAG 都没做的细粒度精炼。 ^p-4-e27358

## Web Search 兜底 ^h-2-3-c61281

当 evaluator 判断所有 retrieved 文档都不可靠时,系统**主动放弃静态 corpus**,改用大规模 web search(Google API)+ ChatGPT 改写 query 为关键词形式;web 结果同样过 decompose-then-recompose 精炼。这是 CRAG 与 Self-RAG 的**根本架构差异**——Self-RAG 完全限定在静态 corpus 内。 ^p-5-2c6ecf

## 与 Self-Reflective RAG 的路径差异 ^h-2-4-72f912

| 维度 | Self-Reflective RAG | Corrective RAG |
|---|---|---|
| 改进对象 | 训新 generator LM | 加外部 evaluator |
| 训练成本 | Llama2-7B critic + GPT-4 监督 | T5-large (0.77B) fine-tune |
| 内化 vs 外挂 | reflection tokens 内化到 generator vocabulary | evaluator 独立模块 |
| 处理 retriever 错的能力 | 间接(通过 IsRel/IsSup 判断) | **直接**(三档 + web search 兜底) |
| plug-and-play | ✗(必须用专门训的 generator) | ✓(可叠在 Self-RAG 或任意 RAG 上) |
^t-2-8be637 ^p-6-ec5906

详见 [[wiki/concepts/self_reflective_rag]] 的"⚠ 知识更新冲突"标注块。 ^p-7-66c18d

## 经验结果摘要 ^h-2-5-6a2356

- **Self-CRAG > Self-RAG**(在 SelfRAG-LLaMA2-7B base 上):PopQA +6.9% / Bio +5.0% / PubHealth +2.4% [[wiki/sources/crag#^t-61-e54a35]]
- CRAG **plug-and-play 上 vanilla RAG**:PopQA +4.4% / Bio +2.8% / PubHealth +29.5% / ARC +10.3%
- 关键洞察:CRAG 是 RAG 升级套件,可与各种 generator 自由组合 ^p-8-2feda4

## 关联页面 ^h-2-6-28482c

- [[wiki/sources/crag]] — 原论文 source_summary
- [[wiki/concepts/retrieval_augmented_generation]] — 上位概念
- [[wiki/concepts/self_reflective_rag]] — **被本文挑战的同时代范式**
- [[wiki/indexes/rag_evolution_index]] — MOC ^p-9-9195d3
