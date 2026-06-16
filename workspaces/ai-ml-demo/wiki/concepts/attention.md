---
title: "注意力机制（Attention）"
type: concept
created_date: 2026-04-08
last_modified: 2026-04-20
last_modified_by: LLM
status: deprecated
confidence: high
source_count: 1
sources:
  - "[[wiki/sources/vaswani2017_transformer]]"
tags:
  - architecture
  - attention
---

# 注意力机制（Attention） ^h-1-1-9dbe17

让模型在处理某个 token 时，**有选择性地关注输入的其他部分**。是 [[wiki/concepts/transformer]] 的核心组件。 ^p-1-312570

## 数学定义 ^h-2-1-72050e

```
Attention(Q, K, V) = softmax(QK^T / √d_k) V
``` ^c-2-2e76fb

- Q (Query)：当前 token 的查询向量
- K (Key)：所有 token 的键向量
- V (Value)：所有 token 的值向量
- √d_k：缩放因子，避免 softmax 梯度消失 ^p-3-c3349b

详见 [[wiki/sources/vaswani2017_transformer]]。 ^p-4-ab04b0

## 主要变体 ^h-2-2-7b888a

| 变体 | 特点 | 应用 |
|---|---|---|
| Self-Attention | Q=K=V 同一序列 | [[wiki/concepts/transformer]] 编码层 |
| Cross-Attention | Q 与 K/V 来自不同序列 | Encoder-Decoder（如机器翻译）|
| Multi-Head | 并行多组 Q/K/V，捕捉不同子空间 | 标准 Transformer |
| Causal (Masked) | 屏蔽未来 token | GPT 等 Decoder-only |
| Sparse / Linear | O(n²) → O(n log n) 或 O(n) | 长上下文优化 |
| Flash Attention | IO-aware GPU 优化 | 现代实现标配 | ^t-5-908b45

## 演进时间线 ^h-2-3-4dde3c

详见 [[wiki/analyses/attention_evolution]]。 ^p-6-855f36

## 与其他概念的关系 ^h-2-4-330f03

- [[wiki/concepts/transformer]] 完全基于此
- [[wiki/concepts/mixture_of_experts]] 在 attention 之上做稀疏化
- [[wiki/concepts/in_context_learning]] 的能力来源之一是 attention 跨样本检索 ^p-7-dc7363

---
#to-be-updated 2026-04-20: 待补充 RoPE / ALiBi 等位置编码与 attention 的交互章节 ^p-8-5c3694
