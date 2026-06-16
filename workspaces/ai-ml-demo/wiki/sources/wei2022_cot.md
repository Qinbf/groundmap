---
title: "Wei et al. 2022 — Chain-of-Thought Prompting"
type: source_summary
created_date: 2026-04-11
last_modified: 2026-05-03
last_modified_by: LLM
status: deprecated
confidence: medium
source_count: 0
sources: []
tags:
  - reasoning
  - prompting
  - emergent
  - demo-data
  - stub
---

# Chain-of-Thought 论文 ^h-1-1-abf28c

> [!NOTE] 演示数据 — 原始 PDF 待入库
> 此摘要页由人工撰写，对应 `raw/papers/wei2022_cot` 文件**尚未入库**。下方所有应附引用的论断均标注 `[需要来源]`，等真实 PDF 摄入并跑 `convert.py` 后，通过 `python scripts/k.py find-anchor raw/papers/wei2022_cot.md "<原文片段>"` 反查 anchor 并替换。 ^p-1-985ce1

**作者**：Wei et al.（Google Brain） · **NeurIPS 2022** ^p-2-7af342

## 核心贡献 ^h-2-1-f4e44b

提出 [[wiki/concepts/chain_of_thought]] 提示法：**给示例中加入中间推理步骤**，显著提升大模型在多步推理任务上的表现 [需要来源]。 ^p-3-0839a0

## 关键发现 ^h-2-2-229af0

详见原文实验章节 [需要来源]： ^p-4-2ae77b

| Benchmark | 标准提示 | CoT 提示 |
|---|---|---|
| GSM8K（小学数学）| 17.7% | **57.1%** |
| SVAMP（数学）| 70.5% | **86.4%** |
| MAWPS（数学）| 88.4% | **95.0%** | ^t-5-7aeee9

## 涌现性 ^h-2-3-c765e5

CoT 增益**只在大模型上出现**： ^p-6-baa420

- < 100B 参数：CoT 提升小或负向
- > 100B 参数：CoT 大幅超过标准提示 ^p-7-03254c

这是"涌现能力"（emergent abilities）的最经典例证之一。 ^p-8-58d1e3

## 后续演进 ^h-2-4-b7530c

- **Zero-shot CoT**（Kojima et al.）：仅加 "Let's think step by step"
- **Self-Consistency**（Wang et al.）：多采样 + 多数投票
- **Tree of Thoughts**：分支搜索推理路径
- **Process Reward Model**：对每一步推理给奖励（OpenAI o 系列） ^p-9-097721

## 与其他主题的关系 ^h-2-5-4468e4

- 是 [[wiki/concepts/in_context_learning]] 的特化形式
- 是 [[wiki/concepts/tool_use]] 的前置能力（Agent 推理依赖 CoT）
- OpenAI o1 / o3：把 CoT 推到训练阶段，"test-time compute"成为新维度 ^p-10-4bf79d
