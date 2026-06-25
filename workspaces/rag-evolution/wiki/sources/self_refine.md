---
title: "Self-Refine: Iterative Self-Feedback (Madaan et al. 2023-03)"
type: source_summary
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: draft
confidence: high
source_count: 1
sources:
  - "[[raw/papers/2023-03-self-refine]]"
tags:
  - llm-refinement
  - prompting
  - self-feedback
  - 2023
  - cmu
---

# Self-Refine: Iterative Refinement with Self-Feedback ^h-1-1-25c4b9

> **原始文件**: [[raw/papers/2023-03-self-refine]]
> **作者**: Aman Madaan, Niket Tandon et al.(CMU / Allen AI / Microsoft Research)
> **发表**: 2023-03 arXiv preprint(NeurIPS 2023)
> **arXiv**: [2303.17651](https://arxiv.org/abs/2303.17651)
> **特殊地位**:**Self-RAG 论文 §2 Related Work 把 Self-Refine 列为"recent work on LLM refinement"对照**[[raw/papers/2023-10-self-rag#^p-19-a2d09f]] ^p-1-a2bdb2

## 摘要 ^h-2-1-3ae146

Self-Refine 是 **iterative self-feedback** 范式的代表:**同一个 LLM** 先生成初始输出,再对自己输出 critique(用不同 prompt 角色),根据 critique 重写输出,反复直到满意。**不需要训练 / 不需要 retrieve / 不需要外部工具** — 完全 prompting + iterative loop。在 7 个任务上(数学 / 对话回复 / 代码优化等)显著提升 GPT-4 / ChatGPT 输出质量[[raw/papers/2023-03-self-refine]]。 ^p-2-0d0d6e

## 关键发现 / 论点 ^h-2-2-10e39a

1. **同一 LLM 既可生成也可批评** — 用不同 prompt 切换角色(generator / critic / refiner) [[raw/papers/2023-03-self-refine]]
2. **iterative 比 single-pass 好** — 即使 critic 和 generator 是同一模型,迭代修正仍带来显著改进 [KB 综合]
3. **任务无关** — 数学 / 对话 / 代码 / 翻译都 work [[raw/papers/2023-03-self-refine]]
4. **inference-time only** — 不修改模型,只多次 forward [[raw/papers/2023-03-self-refine]] ^p-3-29ea94

## AI 综合判断 ^h-2-3-e0eacb

### 核心价值 ^h-3-1-57ae37

Self-Refine 是 **"LLM 自我修正"范式的最知名代表**——Self-RAG 论文显式把 Self-Refine 归为 "Recent work on LLM refinement" 并区分:Self-Refine 多次 forward 浪费成本,Self-RAG reflection tokens 是单次 forward 内嵌的自评[[raw/papers/2023-10-self-rag#^p-19-a2d09f]]。**Self-Refine 不本质上是 RAG 工作**(无 retrieval),但其"self-critique"思想被 Self-RAG / CRAG 直接继承 — Self-RAG 的 reflection tokens 可看作 Self-Refine 思想 + retrieval 的结合。 ^p-4-705c27

### 关联 ^h-3-2-1c3cf7

- [[wiki/concepts/self_reflective_rag]] — 演化前置历史(self-critique 思想起点)
- [[wiki/sources/self_rag]] — 显式批评 Self-Refine 的多次 forward 成本[[raw/papers/2023-10-self-rag#^p-19-a2d09f]] ^p-5-811855

### 冲突 ^h-3-3-93190b

**不触发新冲突标注** — Self-Refine 不是 RAG 工作本身,只是 self-critique 思想前驱,演化关系已被现有冲突标注间接覆盖。 [KB 综合] ^p-6-cc883e

## 与 Wiki 的关联 ^h-2-4-8625b8

- MOC:[[wiki/indexes/rag_evolution_index]] Batch 2 ^p-7-0b1d16
