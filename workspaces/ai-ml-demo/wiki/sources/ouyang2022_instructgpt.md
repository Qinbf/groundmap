---
title: "Ouyang et al. 2022 — Training Language Models to Follow Instructions"
type: source_summary
created_date: 2026-04-10
last_modified: 2026-05-03
last_modified_by: LLM
status: deprecated
confidence: medium
source_count: 0
sources: []
tags:
  - alignment
  - rlhf
  - instructgpt
  - demo-data
  - stub
---

# InstructGPT 论文 ^h-1-1-976c8c

> [!NOTE] 演示数据 — 原始 PDF 待入库
> 此摘要页由人工撰写，对应 `raw/papers/ouyang2022_instructgpt` 文件**尚未入库**。下方所有应附引用的论断均标注 `[需要来源]`，等真实 PDF 摄入并跑 `convert.py` 后，通过 `python scripts/k.py find-anchor raw/papers/ouyang2022_instructgpt.md "<原文片段>"` 反查 anchor 并替换。 ^p-1-d5004c

**作者**：Ouyang et al.（OpenAI） · **2022** ^p-2-4ac90a

## 核心贡献 ^h-2-1-f4e44b

把 [[wiki/concepts/rlhf]] 应用到 GPT-3，做出 **InstructGPT** —— ChatGPT 的直接前身 [需要来源]。 ^p-3-109022

## 三阶段方法 ^h-2-2-bc2f4b

详见原文方法章节 [需要来源]： ^p-4-be9868

1. **SFT 监督微调**
   - 13k 人类示范数据，让模型模仿"好"回答
2. **RM 奖励模型训练**
   - 33k 偏好对，6B 参数 RM
3. **PPO 强化学习**
   - 31k prompt，PPO + KL penalty ^p-5-5cd3ab

## 关键发现 ^h-2-3-229af0

- **1.3B InstructGPT 比 175B GPT-3 更受偏好**
   - 对齐税：在某些 NLP benchmark 上略降
- **拒绝有害指令的能力大幅提升**
- **Hallucination 减少** ^p-6-043d4a

## 路线影响 ^h-2-4-595a43

- ChatGPT（2022.11）：本质就是 InstructGPT 的继任者
- 让 [[wiki/concepts/rlhf]] 成为 alignment 的事实标准
- 推动 [[wiki/concepts/dpo]] 等简化方法的研究（绕过 RM 训练）
- 催生 [[wiki/concepts/constitutional_ai]] 等替代方案（[[wiki/entities/anthropic]] 路线） ^p-7-7a2bd9

## 与其他来源的关系 ^h-2-5-289095

- 是 [[wiki/sources/brown2020_gpt3]] 的对齐扩展
- 与 [[wiki/sources/bai2022_constitutional]] 形成 RLHF vs CAI 的两条主线 ^p-8-182b33
