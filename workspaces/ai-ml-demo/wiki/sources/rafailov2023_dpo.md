---
title: "Rafailov et al. 2023 — Direct Preference Optimization"
type: source_summary
created_date: 2026-04-26
last_modified: 2026-05-03
last_modified_by: LLM
status: deprecated
confidence: medium
source_count: 0
sources: []
tags:
  - alignment
  - rlhf
  - dpo
  - demo-data
  - stub
---

# DPO 论文 ^h-1-1-a75cc8

> [!NOTE] 演示数据 — 原始 PDF 待入库
> 此摘要页由人工撰写，对应 `raw/papers/rafailov2023_dpo` 文件**尚未入库**。下方所有应附引用的论断均标注 `[需要来源]`，等真实 PDF 摄入并跑 `convert.py` 后，通过 `python scripts/k.py find-anchor raw/papers/rafailov2023_dpo.md "<原文片段>"` 反查 anchor 并替换。 ^p-1-5e55ef

**作者**：Rafailov et al.（Stanford） · **NeurIPS 2023** ^p-2-221d5f

## 核心贡献 ^h-2-1-f4e44b

把 [[wiki/concepts/rlhf]] 的 RL 目标重写为**监督式分类损失**，无需训练 reward model [需要来源]。 ^p-3-64cb22

## 关键推导 ^h-2-2-eb5828

详见原文方法章节 [需要来源]： ^p-4-be9868

把 RLHF 中"reward model + RL"的两阶段，通过 Bradley-Terry 偏好模型 + 闭式解，等价转化为单一损失： ^p-5-c7ac5c

```
L_DPO = -log σ(β · log π(y_w|x)/π_ref(y_w|x) - β · log π(y_l|x)/π_ref(y_l|x))
``` ^c-6-7a65d5

直接对策略 π 优化即可，省去 reward model 这一阶段。 ^p-7-b31c87

## 实验结果 ^h-2-3-cd4741

详见原文实验章节 [需要来源]： ^p-8-2ae77b

- **IMDB 情感控制**：DPO ≥ PPO
- **TL;DR 摘要**：DPO ≥ PPO
- **Anthropic HH 单轮对话**：DPO ≥ PPO
- 训练**更稳定**、超参更鲁棒 ^p-9-ab4ba8

## 局限 ^h-2-4-0abf3d

- 论文未充分覆盖**小模型 + 复杂任务**的情形
- 后续 [[wiki/analyses/rlhf_vs_dpo]] 中的冲突标注：Zhang 2025 的更大规模数据集发现 DPO 在小模型上稳定性弱于 PPO ^p-10-88fc33

## 影响 ^h-2-5-28b423

- 大量后续工作（IPO、KTO、ORPO）基于 DPO 改进
- 开源社区广泛采用（LLaMA 微调、Mixtral fine-tunes）
- [[wiki/entities/anthropic]] / [[wiki/entities/openai]] 是否在生产中使用 DPO 未公开 ^p-11-9bc0f1
