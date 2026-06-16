---
title: "Bai et al. 2022 — Constitutional AI: Harmlessness from AI Feedback"
type: source_summary
created_date: 2026-04-11
last_modified: 2026-05-03
last_modified_by: LLM
status: deprecated
confidence: medium
source_count: 0
sources: []
tags:
  - alignment
  - safety
  - anthropic
  - rlaif
  - demo-data
  - stub
---

# Constitutional AI 论文 ^h-1-1-8eda29

> [!NOTE] 演示数据 — 原始 PDF 待入库
> 此摘要页由人工撰写，对应 `raw/papers/bai2022_constitutional` 文件**尚未入库**。下方所有应附引用的论断均标注 `[需要来源]`，等真实 PDF 摄入并跑 `convert.py` 后，通过 `python scripts/k.py find-anchor raw/papers/bai2022_constitutional.md "<原文片段>"` 反查 anchor 并替换。 ^p-1-08886c

**作者**：Bai et al.（Anthropic） · **2022** ^p-2-fa2eb8

## 核心贡献 ^h-2-1-f4e44b

提出 [[wiki/concepts/constitutional_ai]] —— 用一组"宪法原则"替代部分人类反馈，做出更安全的对话模型 [需要来源]。 ^p-3-2d95c5

## 方法 ^h-2-2-ea340b

详见原文方法章节 [需要来源]： ^p-4-be9868

1. **SL-CAI（监督学习阶段）**
   - 让模型 self-critique → self-revise，按宪法约束改回答
2. **RL-CAI（RLAIF）**
   - 用模型自己（按宪法）做偏好打分
   - PPO 优化（同 [[wiki/concepts/rlhf]] 但反馈源不同） ^p-5-529673

## 宪法原则（节选） ^h-2-3-678065

详见原文宪法附录 [需要来源]： ^p-6-ec484e

- "选择有助于、诚实、无害的回答"
- "避免任何形式的歧视"
- "拒绝执行明显非法 / 不道德的请求"
- 完整原则约 16 条 ^p-7-6b8ee4

## 关键发现 ^h-2-4-229af0

- AI 反馈与人类反馈在多数维度上**相关性高**
- 大幅减少有害输出，无明显性能损失
- 减少了"对齐税" ^p-8-03598c

## 影响 ^h-2-5-28b423

- 主导 [[wiki/entities/anthropic]] Claude 全系列对齐路线
- RLAIF 范式被 [[wiki/entities/meta-ai]] LLaMA 3、[[wiki/entities/deepmind]] Gemini 部分采纳
- 与 [[wiki/sources/ouyang2022_instructgpt]] 形成 alignment 双主线 ^p-9-0daded
