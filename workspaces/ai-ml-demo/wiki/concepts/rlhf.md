---
title: "RLHF（人类反馈强化学习）"
type: concept
created_date: 2026-04-09
last_modified: 2026-04-26
last_modified_by: LLM
status: deprecated
confidence: high
source_count: 1
sources:
  - "[[wiki/sources/ouyang2022_instructgpt]]"
tags:
  - alignment
  - reinforcement-learning
  - stub
---

# RLHF（人类反馈强化学习） ^h-1-1-73897e

让大模型对齐人类偏好的主流方法。InstructGPT / ChatGPT 普及了这一范式 [[wiki/sources/ouyang2022_instructgpt]]。 ^p-1-aa006c

## 三阶段流程 ^h-2-1-d1e51c

1. **SFT（Supervised Fine-Tuning）**：用人类示范数据微调预训练模型
2. **RM（Reward Model）训练**：对模型生成的多个回答让人类排序，训练一个打分模型
3. **PPO 强化学习**：用 RM 给模型打分，PPO 算法优化让得分上升（同时 KL 约束防偏离 SFT 模型） ^p-2-5fd199

## 优点 ^h-2-2-52b8c1

- 让模型遵循指令、避免有害输出
- 经过实践验证（GPT、Claude 早期、LLaMA 2 都用） ^p-3-d5a18e

## 缺点 ^h-2-3-2e769a

- 需要训练 reward model（额外成本、可能学到人类偏见）
- PPO 训练不稳定、超参敏感
- "对齐税"：模型在通用能力上可能下降 ^p-4-584897

## 替代与变体 ^h-2-4-5b4042

- [[wiki/concepts/dpo]]：跳过 RM，直接从偏好数据优化
- [[wiki/concepts/constitutional_ai]]（Anthropic）：用原则约束代替部分人类反馈（RLAIF） ^p-5-acf933

详见 [[wiki/analyses/rlhf_vs_dpo]]。 ^p-6-ad6a58

## 关键应用 ^h-2-5-09bb32

- [[wiki/entities/openai]] 的 InstructGPT、ChatGPT、GPT-4
- [[wiki/entities/meta-ai]] 的 LLaMA 2 / 3 Chat 版本
- 早期 [[wiki/entities/anthropic]] 模型（后期转 [[wiki/concepts/constitutional_ai]]） ^p-7-a62af8
