---
title: "注意力机制的演进"
type: analysis
created_date: 2026-04-20
last_modified: 2026-04-20
last_modified_by: LLM
status: deprecated
confidence: high
source_count: 1
sources:
  - "[[wiki/sources/vaswani2017_transformer]]"
tags:
  - attention
  - architecture
  - evolution
---

# 注意力机制的演进 ^h-1-1-e07600

## 触发问题 ^h-2-1-5a47ad

从 2017 年原始 [[wiki/concepts/transformer]] 至今，[[wiki/concepts/attention]] 演化了哪些关键变体？目前的瓶颈是什么？ ^p-1-c0b2d0

## 时间线 ^h-2-2-4404a8

### 2017 — 原始 Multi-Head Self-Attention ^h-3-1-b6a7e1
[[wiki/sources/vaswani2017_transformer]]：奠基方案，复杂度 O(n²)。 ^p-2-d9d335

### 2019 - 2020 — 稀疏 Attention ^h-3-2-ebb42c
- **Sparse Transformer**（OpenAI 2019）：固定模式稀疏化
- **Longformer / BigBird**：滑窗 + 全局 token
- 目标：把 O(n²) 降到 O(n log n) 或 O(n) ^p-3-6c1c6a

### 2020 - 2022 — 线性 Attention ^h-3-3-f557e9
- **Linear Transformer**：把 softmax 用核函数近似
- **Performer**：随机特征近似 softmax
- 实践中精度损失常见，未成主流 ^p-4-4fda8e

### 2022 - 2023 — Flash Attention 系列 ^h-3-4-6e288e
- **FlashAttention** v1/v2/v3（Stanford / Tri Dao）
- 不改变数学定义，**IO-aware GPU 优化**
- 已成现代实现的事实标配 ^p-5-517c92

### 2023 - 2024 — 长上下文工程优化 ^h-3-5-8ead69
- **Ring Attention**（多 GPU 切分序列）
- **Tree Attention**
- **YaRN / RoPE 缩放**：让短训练长度模型外推到长上下文 ^p-6-b9f90b

### 2024 - 2025 — 混合方案 ^h-3-6-cbd047
- **Mamba / SSM**：状态空间模型部分替代 attention（O(n)）
- **Hybrid**：Attention + SSM 混合，吸收两者优势
- [[wiki/concepts/mixture_of_experts]] 在 attention 之上稀疏化 ^p-7-851ad7

## 当前瓶颈 ^h-2-3-7e20f2

1. **真实长程依赖**：超长上下文（百万 token）下注意力分布稀薄，模型偏向 recency
2. **跨模态 attention**：[[wiki/concepts/multimodal_reasoning]] 中视觉 token 数量爆炸
3. **推理成本**：KV cache 是部署瓶颈 ^p-8-c9da66

## 关联 ^h-2-4-1c3cf7

- [[wiki/concepts/transformer]] · [[wiki/concepts/attention]]
- [[wiki/sources/vaswani2017_transformer]] ^p-9-fb6242
