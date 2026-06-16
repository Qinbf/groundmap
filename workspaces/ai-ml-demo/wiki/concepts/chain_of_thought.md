---
title: "Chain-of-Thought（思维链）"
type: concept
created_date: 2026-04-11
last_modified: 2026-04-18
last_modified_by: LLM
status: deprecated
confidence: high
source_count: 1
sources:
  - "[[wiki/sources/wei2022_cot]]"
tags:
  - reasoning
  - prompting
---

# Chain-of-Thought（CoT） ^h-1-1-3cd47b

让模型在给出最终答案前**写出中间推理步骤**，显著提升复杂推理（数学、逻辑、多步问答）的准确率 [[wiki/sources/wei2022_cot]]。 ^p-1-0fdf2b

## 提示模板 ^h-2-1-394024

```
Q: <问题>
A: Let's think step by step.
   <模型逐步推理>
   The answer is <最终答案>.
``` ^c-2-c14a42

## 关键变体 ^h-2-2-f255a4

- **Few-shot CoT**：示例中给出推理过程
- **Zero-shot CoT**：仅加 "Let's think step by step"
- **Self-Consistency**：采样多条推理链，按多数投票
- **Tree of Thoughts**：分支式探索多种推理路径
- **Self-Refine**：让模型迭代改进自己的推理 ^p-3-358973

## 涌现性 ^h-2-3-c765e5

CoT 在小模型上几乎无效，模型规模超过约 100B 才显著生效 — 这是"涌现能力"的经典例证。 ^p-4-3079b3

## 与其他概念的关系 ^h-2-4-330f03

- 是 [[wiki/concepts/in_context_learning]] 的特化形式
- 是 [[wiki/concepts/tool_use]] 的前置能力（Agent 推理依赖 CoT）
- 推理时计算（test-time compute）的基础——OpenAI o 系列把 CoT 推到训练阶段 ^p-5-4bf79d
