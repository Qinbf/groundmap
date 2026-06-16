---
title: "Constitutional AI"
type: concept
created_date: 2026-04-10
last_modified: 2026-04-18
last_modified_by: LLM
status: deprecated
confidence: high
source_count: 1
sources:
  - "[[wiki/sources/bai2022_constitutional]]"
tags:
  - alignment
  - safety
  - anthropic
---

# Constitutional AI（CAI） ^h-1-1-dd9d1d

Anthropic 2022 年提出的对齐方法，**用一组明确的原则（"宪法"）约束模型行为**，减少对人类反馈数据的依赖 [[wiki/sources/bai2022_constitutional]]。 ^p-1-68be03

## 流程 ^h-2-1-f630b9

1. **SL-CAI**（监督学习阶段）
   - 让模型对自己的输出做 "critique" → "revision"，按宪法原则修改
   - 用修改后的数据做监督微调
2. **RL-CAI**（RLAIF 阶段）
   - 用 AI（而非人类）对回答打偏好对
   - 训练 reward model
   - 用 PPO 优化（与 [[wiki/concepts/rlhf]] 同样的算法，但反馈源不同） ^p-2-64d604

## 与 RLHF 的核心差异 ^h-2-2-175e1e

| | [[wiki/concepts/rlhf]] | Constitutional AI |
|---|---|---|
| 反馈源 | 人类标注 | AI 自评（按原则）|
| 数据成本 | 高 | 低 |
| 可审计性 | 偏好不透明 | 原则显式可读 |
| 路线代表 | [[wiki/entities/openai]] | [[wiki/entities/anthropic]] | ^t-3-e97225

## "宪法"内容（节选） ^h-2-3-5e2eb2

- 选择有助于、诚实、无害的回答
- 避免对其它法律实体造成伤害
- 拒绝执行明确的非法 / 不道德请求
- 完整原则集合见原论文 [[wiki/sources/bai2022_constitutional]] ^p-4-8cc7b8

## 影响 ^h-2-4-28b423

- 主导 [[wiki/entities/anthropic]] Claude 系列对齐路线
- RLAIF 范式被广泛采用（Llama 3、Gemini 部分阶段） ^p-5-7314bd
