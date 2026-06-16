---
title: "Vaswani et al. 2017 — Attention Is All You Need"
type: source_summary
created_date: 2026-04-08
last_modified: 2026-05-03
last_modified_by: LLM
status: deprecated
confidence: medium
source_count: 0
sources: []
tags:
  - foundational
  - transformer
  - attention
  - demo-data
  - stub
---

# Attention Is All You Need ^h-1-1-431e0c

> [!NOTE] 演示数据 — 原始 PDF 待入库
> 此摘要页由人工撰写，对应 `raw/papers/vaswani2017` 文件**尚未入库**。下方所有应附引用的论断均标注 `[需要来源]`，等真实 PDF 摄入并跑 `convert.py` 后，通过 `python scripts/k.py find-anchor raw/papers/vaswani2017.md "<原文片段>"` 反查 anchor 并替换。 ^p-1-dd30ab

**作者**：Vaswani et al.（Google Brain / Google Research） · **会议**：NeurIPS 2017 ^p-2-96bf62

## 核心贡献 ^h-2-1-f4e44b

提出 [[wiki/concepts/transformer]] 架构：**纯基于 [[wiki/concepts/attention]]，无 RNN / CNN** 的序列建模 [需要来源]。 ^p-3-825954

## 关键创新 ^h-2-2-0defae

1. **Multi-Head Self-Attention** [需要来源]
   - 多组并行 Q/K/V，捕捉不同语义子空间
2. **Position Encoding**
   - 用正弦函数注入位置信息（无需可学习参数）
3. **Encoder-Decoder 架构**
   - 6 层编码器 + 6 层解码器（论文配置）
4. **训练并行化**
   - 整个序列一次处理（vs RNN 顺序处理） ^p-4-24d673

## 实验结果 ^h-2-3-cd4741

- WMT-2014 英德机器翻译：**28.4 BLEU**（当时 SOTA）
- 训练成本仅 RNN baseline 的一小部分 ^p-5-8ad2e9

## 为何成为奠基 ^h-2-4-ad2232

- **Decoder-only 变体** → GPT 系列（[[wiki/entities/openai]]）
- **Encoder-only 变体** → BERT 系列
- 几乎所有 LLM 都基于此（[[wiki/entities/anthropic]] Claude、[[wiki/entities/deepmind]] Gemini、[[wiki/entities/meta-ai]] LLaMA） ^p-6-f7d62e

## 局限 ^h-2-5-0abf3d

- 计算复杂度 O(n²)，长上下文成本高
- 后续大量工作围绕此优化（Sparse Attention、Flash Attention、Linear Attention）
- 详见 [[wiki/analyses/attention_evolution]] ^p-7-57779c
