---
title: "Transformer 架构"
type: concept
created_date: 2026-04-08
last_modified: 2026-05-03
last_modified_by: LLM
status: deprecated
confidence: high
source_count: 1
sources:
  - "[[wiki/sources/vaswani2017_transformer]]"
tags:
  - architecture
  - attention
  - llm
  - stub
---

# Transformer 架构 ^h-1-1-854df3

Vaswani 等人于 2017 年提出，基于纯 [[wiki/concepts/attention]] 机制（无 RNN/CNN）的序列建模架构。**主流大语言模型（GPT、Claude、Gemini、LLaMA）的基础架构。** [[wiki/sources/vaswani2017_transformer]] ^p-1-a47f52

## 核心设计 ^h-2-1-e07066

- **Encoder-Decoder** 双塔结构（GPT 系列只用 Decoder）
- **Multi-Head Self-Attention**：让序列内每个 token 直接与所有其他 token 交互
- **Position Encoding**：注入位置信息（绝对位置 / RoPE / ALiBi 等变体）
- **Layer Normalization + Residual Connections**：稳定深层训练 ^p-2-29bb5f

详见 [[wiki/sources/vaswani2017_transformer]]。 ^p-3-9ce963

## 与传统架构的对比 ^h-2-2-28657a

| | RNN/LSTM | CNN | Transformer |
|---|---|---|---|
| 并行化 | 难 | 容易 | 容易 |
| 长距离依赖 | 弱 | 弱 | **强** |
| 计算复杂度 | O(n) | O(n) | O(n²)（被 [[wiki/concepts/attention]] 限制） | ^t-4-36259c

## 关键演进 ^h-2-3-f6e827

- **[[wiki/concepts/mixture_of_experts]]**：稀疏激活降低计算成本（Mixtral、GLaM、Switch）
- **长上下文**：Flash Attention、Ring Attention 等优化
- **[[wiki/concepts/multimodal_reasoning]]**：扩展到图像/音频/视频 token ^p-5-d02e76

详见 [[wiki/analyses/attention_evolution]]。 ^p-6-855f36

## 影响 ^h-2-4-28b423

- [[wiki/entities/openai]]、[[wiki/entities/anthropic]]、[[wiki/entities/deepmind]] 的旗舰模型均基于此
- [[wiki/concepts/in_context_learning]] 能力是 Transformer + 大规模预训练的涌现产物 ^p-7-5781fa
