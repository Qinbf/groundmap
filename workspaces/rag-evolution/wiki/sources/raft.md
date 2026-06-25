---
title: "RAFT: RAG-Aware Fine-Tuning (Zhang et al. 2024-03)"
type: source_summary
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: draft
confidence: high
source_count: 1
sources:
  - "[[raw/papers/2024-03-raft]]"
tags:
  - rag
  - fine-tuning
  - domain-specific
  - 2024
  - berkeley
---

# RAFT: Adapting LM to Domain-Specific RAG ^h-1-1-f0c449

> **原始文件**: [[raw/papers/2024-03-raft]]
> **作者**: Tianjun Zhang, Shishir G. Patil et al.(UC Berkeley / Gorilla 团队)
> **发表**: 2024-03 arXiv preprint(COLM 2024)
> **arXiv**: [2403.10131](https://arxiv.org/abs/2403.10131)
> **特殊地位**:**主张"domain-specific RAG 应 fine-tune"**,与 KAG(蚂蚁)的"domain schema KG"形成同方向不同方法论 ^p-1-2f53ca

## 摘要 ^h-2-1-3ae146

RAFT 提出 **RAG-Aware Fine-Tuning**:fine-tune 时不只用 golden passages,**混入 distractor passages**(无关但相似的),让模型学会"忽略 distractor,只看 golden"。结果模型在 domain-specific RAG 任务(医疗 / 法律 / 文档 QA)上显著优于:(a) 通用 fine-tune + 通用 RAG;(b) 仅 prompt + RAG;(c) 仅 fine-tune 无 RAG。**核心论断**:**通用 RAG ≠ domain RAG**,后者需要 RAG-aware 训练[[raw/papers/2024-03-raft]]。 ^p-2-550e48

## 关键发现 / 论点 ^h-2-2-10e39a

1. **distractor passage** 是关键训练 trick:让模型学会 noise filtering[[raw/papers/2024-03-raft]]
2. **CoT + RAG 联合 fine-tune**:模型学会"先推理 → 引用具体 passage → 给答案" [[raw/papers/2024-03-raft]]
3. **vs 通用 RAG**:domain 任务上,RAFT > GPT-3.5 + RAG(7B base 超过 175B 通用方案) [KB 综合]
4. **思想与 KAG 重叠但路径不同**:KAG 用 domain schema KG,RAFT 用 distractor 训练 — 两者都主张"domain RAG ≠ 通用 RAG" [[raw/papers/2024-03-raft]] ^p-3-2dc0fb

## AI 综合判断 ^h-2-3-e0eacb

### 核心价值 ^h-3-1-57ae37

RAFT 是 **"通用 RAG 不够用,domain 需 fine-tune"** 这一论断的代表作。它给 [[wiki/concepts/retrieval_augmented_generation]] 演化方向章节加了一个**新维度**:**通用 RAG vs domain fine-tuned RAG**。与 KAG(2024-09)共同构成 2024 "domain-specific RAG" 方向的两条路径:(a) RAFT 训新 generator(prompt + retrieval 不变);(b) KAG 重构 KG schema(generator 不变)。 ^p-4-576b9d

### 关联 ^h-3-2-1c3cf7

- [[wiki/concepts/retrieval_augmented_generation]] — domain fine-tune 维度具体 anchor
- [[wiki/sources/kag]] — 同方向不同方法论
- [[wiki/sources/self_rag]] — Self-RAG 也是 RAG fine-tune,但目标不同(reflection tokens 而非 noise filtering) ^p-5-5eeb49

### 冲突 ^h-3-3-93190b

**轻度冲突但不标注**:RAFT 主张"domain 必须 fine-tune",而 RAG-or-LongContext(DeepMind 2024-07)的论断是"LC > RAG"——若 LC 通用模型够强,domain fine-tune 是否还有必要?这个张力存在但不到"知识更新冲突"级别(两个论文针对不同问题:domain 严格度 vs 通用任务性能)。 [KB 综合] ^p-6-1f91d5

## 与 Wiki 的关联 ^h-2-4-8625b8

- 给 [[wiki/concepts/retrieval_augmented_generation]] 加"domain RAG"维度
- MOC:[[wiki/indexes/rag_evolution_index]] Batch 3 ^p-7-295a14
