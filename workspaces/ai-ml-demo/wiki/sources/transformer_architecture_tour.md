---
title: "Transformer 架构导览（演示材料综述）"
type: source_summary
created_date: 2026-05-03
last_modified: 2026-05-03
last_modified_by: LLM
status: deprecated
confidence: high
source_count: 1
sources:
  - "[[raw/_archive_ai_ml_demo/articles/transformer_architecture_tour]]"
tags:
  - transformer
  - attention
  - architecture
  - demo-data
---

# Transformer 架构导览 ^h-1-1-eba9db

> **来源**：[[raw/_archive_ai_ml_demo/articles/transformer_architecture_tour]] —— AI agent 撰写的演示材料（非论文原文），用于测试 ingest 流程与 block 视图 ^p-1-f35614

## 核心论点 ^h-2-1-522a48

1. Transformer 的关键不在于"发明 attention"，而在于**证明了仅靠 attention + FFN 就足以达到序列建模 SOTA**——把循环依赖这个并行化障碍移除 [[raw/_archive_ai_ml_demo/articles/transformer_architecture_tour#^p-2-26d6ff]]
2. 模型本身是 Encoder-Decoder 双塔架构（各 6 层），子层为 Multi-Head Self-Attention + Position-wise FFN，加 LayerNorm + 残差连接稳定深层训练 [[raw/_archive_ai_ml_demo/articles/transformer_architecture_tour#^h-2-1-f9f55d]]
3. Multi-Head 把 Q/K/V 投影到 h=8 个子空间并行做 attention 再拼接；不同 head 倾向于捕捉不同的语言现象（句法依存、共指、语义角色等）[[raw/_archive_ai_ml_demo/articles/transformer_architecture_tour#^h-2-2-29b373]] ^p-2-1e07ba

## 关键数据 ^h-2-2-595c8c

- WMT-2014 EN-DE：Big 模型 **28.4 BLEU**（当时 SOTA）；EN-FR：**41.8 BLEU**；训练时间 **8×P100 GPU 跑 3.5 天** [[raw/_archive_ai_ml_demo/articles/transformer_architecture_tour#^h-2-5-493142]]
- 参数规模：Base **65M** / Big **213M**
- 优化器：Adam(β₁=0.9, β₂=0.98)，warmup 4000 步后 step^(-0.5) 衰减 ^p-3-685596

## 与传统架构的对比 ^h-2-3-28657a

3 维度对比表，详见 [[raw/_archive_ai_ml_demo/articles/transformer_architecture_tour#^h-2-4-28657a]]： ^p-4-6b4a7e

| 维度 | RNN/LSTM | CNN | Transformer |
|---|---|---|---|
| 训练并行化 | 难 | 容易 | 容易 |
| 长距离依赖 | 弱（梯度衰减） | 弱（感受野） | **强**（任意两点直接交互） |
| 单步复杂度 | O(n·d²) | O(k·n·d²) | O(n²·d) | ^t-5-76c341

代价是 O(n²) 注意力矩阵——后续 [[wiki/analyses/attention_evolution]] 中所有变体的核心瓶颈。 ^p-6-3c130f

## Position Encoding 的演进 ^h-2-4-40d3f2

原论文用正弦/余弦（无可学习参数、可外推），但后续提出多种替代方案。原文表格列了 5 种方案的对比 [[raw/_archive_ai_ml_demo/articles/transformer_architecture_tour#^h-2-3-8fd022]]： ^p-7-57edfa

- **Sinusoidal**（2017）：原始 Transformer；外推弱
- **Learned Absolute**（2018）：BERT/GPT-2；外推几乎无
- **RoPE**（2021）：LLaMA/GLM；外推较强
- **ALiBi**（2021）：BLOOM/MPT；外推强
- **YaRN**（2023）：长上下文微调常用；外推极强 ^p-8-0c8e07

## 局限与开放问题 ^h-2-5-8977d2

四大根本问题 [[raw/_archive_ai_ml_demo/articles/transformer_architecture_tour#^h-2-7-8977d2]]： ^p-9-e28d27

1. O(n²) 复杂度让长上下文（>100k tokens）成本陡增
2. KV cache 是部署的主要内存压力
3. 百万 token 上下文下注意力分布稀薄、模型偏 recency
4. Mamba/SSM 等 O(n) 架构在某些任务上已逼近 Transformer ^p-10-eda328

## 与已有知识的关系 ^h-2-6-452557

- 加强了 [[wiki/concepts/transformer]] 的"核心设计"小节叙述（PE 5 种变体表格补充原页未列的 ALiBi/YaRN 行业采用情况）
- 与 [[wiki/sources/vaswani2017_transformer]] 互补：那篇是论文级精确摘要，本篇是综述视角的导览
- "为什么成为奠基"小节 [[raw/_archive_ai_ml_demo/articles/transformer_architecture_tour#^h-2-6-6dfee5]] 与 [[wiki/concepts/in_context_learning]]、[[wiki/concepts/mixture_of_experts]] 的"演化路径"叙事呼应
- 附 attention 公式与代码片段 [[raw/_archive_ai_ml_demo/articles/transformer_architecture_tour#^h-2-2-29b373]]，可作 [[wiki/concepts/attention]] 的实现细节补充 ^p-11-0bbf3a

## 与现有内容的差异点 ^h-2-7-4df226

无矛盾。本篇视角更"工程综述"、列了部分实现细节（Adam β、PPO 类比的 KL 系数等），可作 [[wiki/concepts/transformer]] 与 [[wiki/concepts/attention]] 的次级佐证来源。 ^p-12-4fe93c
