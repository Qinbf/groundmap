---
title: "Brown et al. 2020 — GPT-3: Language Models are Few-Shot Learners"
type: source_summary
created_date: 2026-04-09
last_modified: 2026-05-03
last_modified_by: LLM
status: deprecated
confidence: medium
source_count: 0
sources: []
tags:
  - foundational
  - llm
  - scaling
  - icl
  - demo-data
  - stub
---

# GPT-3 论文 ^h-1-1-f99e8d

> [!NOTE] 演示数据 — 原始 PDF 待入库
> 此摘要页由人工撰写，对应 `raw/papers/brown2020` 文件**尚未入库**。下方所有应附引用的论断均标注 `[需要来源]`，等真实 PDF 摄入并跑 `convert.py` 后，通过 `python scripts/k.py find-anchor raw/papers/brown2020.md "<原文片段>"` 反查 anchor 并替换。 ^p-1-017b64

**作者**：Brown et al.（OpenAI） · **会议**：NeurIPS 2020 ^p-2-3b6bdb

## 核心论点 ^h-2-1-522a48

**模型规模化（175B 参数）+ 大规模预训练 ⇒ [[wiki/concepts/in_context_learning]] 的涌现** [需要来源] ^p-3-7261fb

## 关键发现 ^h-2-2-229af0

1. **少样本性能随规模急剧提升** [需要来源]
   - 1.3B → 175B：在大量任务上 few-shot 性能从近随机变为接近精调
2. **不需要梯度更新**
   - 仅通过 prompt 中的几个示例即可适应新任务
3. **任务覆盖广**
   - 翻译、问答、算术、SAT 类比、常识推理
4. **失败模式**
   - 长程推理仍弱
   - 某些常识陷阱（"Will a glass shatter if dropped in space"） ^p-4-625f2d

## 影响 ^h-2-3-28b423

- 开启了 **scaling 时代**（"more is different"）
- 催生 [[wiki/concepts/chain_of_thought]] 等提示工程方向
- 直接导致 [[wiki/concepts/rlhf]] 必要性显现（基础模型有用但不够"听话"） ^p-5-bf77b7

## 关联工作 ^h-2-4-2d6e0d

- 后续 [[wiki/sources/ouyang2022_instructgpt]] 用 [[wiki/concepts/rlhf]] 把 GPT-3 对齐为 InstructGPT
- 启发了 [[wiki/entities/anthropic]] / [[wiki/entities/deepmind]] 的同类大模型 ^p-6-1c1948
