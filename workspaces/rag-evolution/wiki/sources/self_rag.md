---
title: "Self-RAG: 通过自反思的检索-生成-评估"
type: source_summary
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: draft
confidence: high
source_count: 1
sources:
  - "[[raw/papers/2023-10-self-rag]]"
tags:
  - rag
  - self-reflective
  - reflection-tokens
  - 2023
  - iclr-2024
---

# Self-RAG: Self-Reflective Retrieval-Augmented Generation ^h-1-1-cdcb68

> **原始文件**: [[raw/papers/2023-10-self-rag]]
> **作者**: Akari Asai, Zeqiu Wu, Yizhong Wang, Avirup Sil, Hannaneh Hajishirzi (UW / IBM Research / AI2)
> **发表**: 2023-10 arXiv preprint;正式发表于 ICLR 2024
> **arXiv**: [2310.11511](https://arxiv.org/abs/2310.11511) ^p-1-8c0b1d

## 摘要 ^h-2-1-811e72

Self-RAG 训练单个 LM 在生成过程中**自决何时检索**、并对检索到的段落和自己的输出进行**自我评估**。机制是引入 4 类"反思 tokens"(`Retrieve` / `IsRel` / `IsSup` / `IsUse`),作为模型 vocabulary 的扩展,与正常 token 一起按"下一个 token 预测"训练[[raw/papers/2023-10-self-rag#^h-2-3-d44593]]。 ^p-2-6a8ed6

训练分两步:先用 GPT-4 监督生成 critic 训练数据,distill 到 in-house critic model 𝒞(Llama2-7B);再用 𝒞 给原 corpus 离线插入 reflection tokens,作为 generator ℳ 的训练数据[[raw/papers/2023-10-self-rag#^h-3-2-aeed1d]]。**关键工程优势**:inference 时不需要跑 critic,reflection 能力已内化到 generator,训练成本远低于 RLHF/PPO[[raw/papers/2023-10-self-rag#^h-5-3-a0c095]]。 ^p-3-34a06a

实验显示 Self-RAG 7B 在 PopQA / PubHealth / Bio / ASQA 等任务上**超过 ChatGPT**,Self-RAG 13B 全面超过所有 non-proprietary 基线;尤其 citation precision(7B 模型 66.9 vs 标准 Llama2-RAG 的 5.0)显著高于其他 RAG 方案[[raw/papers/2023-10-self-rag#^t-77-9e8336]]。 ^p-4-34d5b1

## 关键发现 / 论点 ^h-2-2-93d2ce

1. **vanilla RAG 的两大缺陷**:不分场合一律检索固定数量段落 → 浪费且可能引入噪声;生成不保证 grounded 在检索内容上[[raw/papers/2023-10-self-rag#^p-11-991291]]
2. **4 类 reflection tokens** 让模型在生成中显式编码 4 个判断:`Retrieve`(要不要检索) / `IsRel`(检索段落相关吗) / `IsSup`(我的输出被段落支持吗) / `IsUse`(我的回答有用吗)[[raw/papers/2023-10-self-rag#^t-23-1c2106]]
3. **训练时不需要 PPO/RLHF**——critic 是离线的,把 reflection token 插入 corpus 后用标准 LM objective 训练 generator,显著降低训练成本[[raw/papers/2023-10-self-rag#^h-5-3-a0c095]]
4. **inference 可控**:可设阈值 hard-control 是否触发检索;可对 reflection tokens 加权做 soft re-ranking;可 segment-level beam search[[raw/papers/2023-10-self-rag#^h-3-3-e26d42]]
5. **citation precision 大幅领先**:在 ASQA 上 Self-RAG 13B 达到 70.3 的 citation precision,比 Llama2-13B + RAG (2.3) 提高 30 倍[[raw/papers/2023-10-self-rag#^t-77-9e8336]] ^p-5-4d0635

## 方法论 ^h-2-3-f27051

- **数据**:Open-Instruct + 知识密集型数据集(NQ / ASQA / FactScore-bio),共 150k instruction-output pairs [[raw/papers/2023-10-self-rag]]
- **base model**:Llama2 7B / 13B(generator),Llama2 7B(critic) [[raw/papers/2023-10-self-rag]]
- **retriever**:Contriever-MS MARCO(off-the-shelf),每条 query 取 top 10 文档 [[raw/papers/2023-10-self-rag]]
- **GPT-4 monitor**:每类 reflection token 用 4k-20k 监督样本,distill 到 Llama2-7B critic;critic 与 GPT-4 标注 agreement > 90%[[raw/papers/2023-10-self-rag#^p-49-b2784e]]
- **evaluation**:6 个任务(PopQA / TriviaQA / PubHealth / ARC-C / Bio-FactScore / ALCE-ASQA),zero-shot 评测 [[raw/papers/2023-10-self-rag]] ^p-6-b07098

## 局限性 ^h-2-4-d25123

- **依赖 GPT-4** 生成 critic 训练数据,引入闭源依赖与成本(论文承认这是反复现性的隐患)[[raw/papers/2023-10-self-rag#^p-45-d8809f]]
- **inference 时多次 forward**(每段都要 reflection token + 评估多个候选 passage)→ 推理速度比 vanilla RAG 慢 [KB 综合]
- 训练数据规模(150k)远小于 instruction-tuning 主流量级,扩展性未验证 [KB 观察]
- 7B/13B base 不能直接看出在 70B+ 上是否仍有收益 [KB 观察] ^p-7-e473bf

## AI 综合判断 ^h-2-5-006953

### 核心价值 ^h-3-1-eb2f7a

这是**首次系统性把"何时检索 + 检索质量 + 生成 grounding + 综合 utility"四个判断显式编码进 LM 输出 vocabulary** 的工作,把传统 RAG pipeline 的多个外部判断模块**内化到单一 LM**。它定义了后续"自反思 / 自纠错 RAG"路线的基本词汇——`reflection tokens` / `adaptive retrieval` / `critic-distillation` 这些概念在 2024 RAG 文献中被广泛复用。 [KB 综合] ^p-8-f8b455

### 关联 ^h-3-2-f856d6

- 概念页 [[wiki/concepts/retrieval_augmented_generation]] —— 本文是对原始 RAG (Lewis 2020) 的一次系统性升级
- 概念页 [[wiki/concepts/self_reflective_rag]] —— 本文是该范式的原始定义
- MOC [[wiki/indexes/rag_evolution_index]] —— 本文是 2023-2025 RAG 演化时间线的起点 ^p-9-34fd3f

### 冲突 ^h-3-3-cabb88

**本文是首篇 ingest,无前置冲突。** 但有 2 个**前置预言**(需要后续论文验证或反驳): [KB 综合]

- **关于 critic-distillation 路径**:Self-RAG 假设"先训 critic 再 distill"是必经路径。后续 [[wiki/sources/crag]] 用 evaluator + web search 走了完全不同的"工程化"路径,挑战这一假设。
- **关于 inference 自决检索**:Self-RAG 训模型内化决策。**2025-03 [[wiki/sources/search_r1]] 用 RL 重新定义这件事**——直接奖励"检索 → 推理 → 答案"链路,可能让 reflection tokens 范式过时。 ^p-10-671a4d

## 与 Wiki 的关联 ^h-2-6-da27d5

- 影响页面:[[wiki/concepts/retrieval_augmented_generation]] / [[wiki/concepts/self_reflective_rag]]
- MOC 归属:[[wiki/indexes/rag_evolution_index]] 第 1 篇
- 后续 ingest **必须对照本文**:CRAG(同主题不同路径)、Search-R1(同主题新范式) ^p-11-6e8e3c
