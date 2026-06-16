---
title: "DPO（直接偏好优化）"
type: concept
created_date: 2026-04-26
last_modified: 2026-04-26
last_modified_by: LLM
status: deprecated
confidence: high
source_count: 1
sources:
  - "[[wiki/sources/rafailov2023_dpo]]"
tags:
  - alignment
  - rlhf
---

# DPO（Direct Preference Optimization） ^h-1-1-c7aada

Stanford 2023 年提出，绕过 [[wiki/concepts/rlhf]] 中的 reward model 训练，直接从偏好对优化策略 [[wiki/sources/rafailov2023_dpo]]。 ^p-1-43a03e

## 核心思想 ^h-2-1-0b7bd0

把 RLHF 的 RL 目标重写为一个监督式分类损失： ^p-2-b29653

```
L_DPO(θ) = -E_(x,y_w,y_l)~D [ log σ(β log π_θ(y_w|x)/π_ref(y_w|x) - β log π_θ(y_l|x)/π_ref(y_l|x)) ]
``` ^c-3-61d79f

- y_w：人类偏好的回答（chosen）
- y_l：人类不偏好的回答（rejected）
- π_ref：SFT 后的参考策略
- β：温度（控制偏离 ref 的强度） ^p-4-fcf936

## 优点 ^h-2-2-52b8c1

- **无需训练 reward model**，省一阶段
- 训练稳定（监督式 vs PPO 强化）
- 实现简单 ^p-5-641a20

## 缺点 ^h-2-3-2e769a

- 对偏好数据质量敏感
- 在小模型上据 [[wiki/sources/rafailov2023_dpo]] 表现不如 RLHF（**注意：此点存在新证据，参见 [[wiki/analyses/rlhf_vs_dpo]] 中的冲突标注**）
- 难以利用 online exploration ^p-6-1e6584

## 与 RLHF 对比 ^h-2-4-672e25

详见 [[wiki/analyses/rlhf_vs_dpo]]。 ^p-7-ad6a58

## 衍生方法 ^h-2-5-a14aaa

- IPO（Identity Preference Optimization）
- KTO（Kahneman-Tversky Optimization）
- ORPO（Odds Ratio Preference Optimization） ^p-8-fdd858
