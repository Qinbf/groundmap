---
title: "RLHF vs DPO：对齐方法对比分析"
type: analysis
created_date: 2026-04-22
last_modified: 2026-04-22
last_modified_by: LLM
status: deprecated
confidence: medium
source_count: 3
sources:
  - "[[wiki/sources/ouyang2022_instructgpt]]"
  - "[[wiki/sources/rafailov2023_dpo]]"
  - "[[wiki/sources/bai2022_constitutional]]"
tags:
  - alignment
  - comparison
  - analysis
---

# RLHF vs DPO：对齐方法对比 ^h-1-1-4c8253

## 触发问题 ^h-2-1-5a47ad

如何在生产 LLM 中选择 [[wiki/concepts/rlhf]] 还是 [[wiki/concepts/dpo]]？两者各自适用什么场景？ ^p-1-18e58f

## 维度对比 ^h-2-2-0db41f

| 维度 | [[wiki/concepts/rlhf]] | [[wiki/concepts/dpo]] |
|---|---|---|
| 阶段数 | 3（SFT + RM + PPO）| 2（SFT + DPO）|
| 是否需要 RM | 是 | **否** |
| 训练稳定性 | PPO 难调，超参敏感 | **稳定**（监督式）|
| 计算成本 | 高（要跑两个模型）| 低 |
| Online exploration | 支持 | 不支持 |
| 数据要求 | 偏好对 + RM 数据 | 偏好对 |
| 实现复杂度 | 高 | 低 |
| 工业采用 | OpenAI、Anthropic 早期 | 开源社区主流 | ^t-2-8ea0c4

## 性能差异 ^h-2-3-1498c7

[[wiki/sources/rafailov2023_dpo]]：DPO 在 IMDB / TL;DR / HH 等基准上**不弱于 PPO**。 ^p-3-943abc

## 第三种范式 ^h-2-4-b86b83

[[wiki/concepts/constitutional_ai]]（[[wiki/sources/bai2022_constitutional]]）走的是 RLAIF 路线：用 AI 自评替代部分人类反馈，与 RLHF / DPO 正交（都可以套用）。 ^p-4-0521df

## 知识更新冲突 ^h-2-5-84effa

> [!WARNING] 知识更新冲突 — 2026-04-22
> **旧观点**：根据 [[wiki/sources/rafailov2023_dpo]]（Rafailov 2023），DPO 在所有测试任务上不弱于 PPO，且更稳定。
> **新证据**：根据 [[raw/papers/zhang2025_dpo_revisit]]（Zhang et al. 2025，更大规模 + 小模型实验），DPO 在 ≤7B 模型上对偏好数据噪声极敏感，方差显著大于 PPO。
> **LLM 判断**：两者实验设置不可比（Rafailov 2023 用 Pythia 1.4B-6B，Zhang 2025 用 Llama-7B / Mistral-7B + 噪声偏好数据），不能直接说谁错。但下游建议偏向：**大模型 / 干净偏好数据 → DPO 优势明显；小模型 / 噪声数据 → PPO 仍稳定**。
> **状态**：⏳ 待人类判别 ^p-5-9a8317

## 当前推荐（基于现有证据） ^h-2-6-f61e60

- **大型基础模型（>30B）+ 高质量人类标注**：DPO 是首选（实现简单、效果不弱）
- **小型模型（<7B）+ 噪声数据**：仍用 RLHF / PPO（稳定性更可靠）
- **追求最低对齐成本**：[[wiki/concepts/constitutional_ai]] / RLAIF ^p-6-e0eb27

## 关联页面 ^h-2-7-28482c

- [[wiki/concepts/rlhf]] · [[wiki/concepts/dpo]] · [[wiki/concepts/constitutional_ai]]
- [[wiki/entities/openai]] · [[wiki/entities/anthropic]] ^p-7-56d11b
