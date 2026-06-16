---
title: "In-Context Learning（上下文学习）"
type: concept
created_date: 2026-04-10
last_modified: 2026-04-12
last_modified_by: LLM
status: deprecated
confidence: high
source_count: 1
sources:
  - "[[wiki/sources/brown2020_gpt3]]"
tags:
  - llm
  - prompting
  - emergent
---

# In-Context Learning（ICL） ^h-1-1-702dea

大模型在**不更新参数**的情况下，仅通过 prompt 中的少量示例学会新任务。GPT-3 论文 [[wiki/sources/brown2020_gpt3]] 首次系统揭示了这一涌现能力。 ^p-1-e8be61

## 三种范式 ^h-2-1-5a65c7

| 范式 | 描述 | 示例数 |
|---|---|---|
| Zero-shot | 仅指令 | 0 |
| One-shot | 一个示例 | 1 |
| Few-shot | 多个示例 | 通常 2-32 | ^t-2-0dc79c

## 为什么有效 ^h-2-2-9dac11

学界仍在争论。主流假说： ^p-3-7032c7

1. **梯度下降的隐式模拟**：[[wiki/concepts/attention]] 在前向传播中模拟了在示例上的梯度更新
2. **任务定位**：示例帮助模型在内部"激活"已学过的相似任务
3. **贝叶斯推理**：示例更新模型对当前任务的后验 ^p-4-9d89aa

## 与其他概念的关系 ^h-2-3-330f03

- 是 [[wiki/concepts/transformer]] + 大规模预训练的涌现能力
- [[wiki/concepts/chain_of_thought]] 可以看作 ICL 的特化形式（示例中包含推理步骤）
- 与 [[wiki/concepts/tool_use]] 结合 → Agent 能力 ^p-5-075ca5

## 实践要点 ^h-2-4-2630a6

- 示例顺序敏感（"recency bias"）
- 示例多样性比数量更重要
- 长上下文模型让 ICL 范围扩大到 100+ 示例 ^p-6-1f0fb3
