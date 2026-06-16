---
title: "Grokking（顿悟泛化）"
type: concept
created_date: 2026-04-13
last_modified: 2026-05-03
last_modified_by: LLM
status: deprecated
confidence: medium
source_count: 0
sources: []
tags:
  - generalization
  - training-dynamics
  - frontier
---

# Grokking（顿悟泛化） ^h-1-1-571cb1

神经网络在训练初期记住训练集后，**继续训练（远超过拟合点）会突然在测试集上达到接近完美的泛化**——这种延迟泛化现象被 Power et al. (2022) 命名为 grokking。 ^p-1-f3ea9f

## 现象核心 ^h-2-1-aedcde

```
training_acc:  早期上升 → 接近 100%（记忆）→ 维持
test_acc:      早期低 → 长时间低 → 某一刻突然急剧上升
``` ^c-2-e1d49d

中间的"高 train / 低 test"区可能持续 10x-100x 训练步骤。 ^p-3-6a6335

## 主流解释 ^h-2-2-6e2347

1. **隐式正则化**：weight decay 让模型从"记忆解"漂移到"泛化解"
2. **特征学习相变**：内部表征经历从随机到结构化的相变
3. **平坦极小值**：泛化解处于损失景观的更平坦区 ^p-4-8f2c9e

## 与其他主题的关系 ^h-2-3-4468e4

- 涉及 [[wiki/concepts/transformer]] 等架构（grokking 在 transformer 上也观察到）
- 是"涌现能力"在训练动力学维度的对应现象
- 实践指导：early stopping 可能错过 grokking 时机 ^p-5-d508be

## 待补充 ^h-2-4-a0a785

- 系统综述（多个原始来源）
- 大模型上是否同样存在（论文较少） ^p-6-191221

> 2026-05-03 lint W18：本页已纳入 [[wiki/indexes/ai_index]] "训练动力学 / 泛化" 分类（之前为孤儿）。 ^p-7-03bf85
