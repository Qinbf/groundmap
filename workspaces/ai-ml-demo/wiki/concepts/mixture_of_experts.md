---
title: "Mixture of Experts（MoE）"
type: concept
created_date: 2026-04-15
last_modified: 2026-04-15
last_modified_by: LLM
status: deprecated
confidence: high
source_count: 0
sources: []
tags:
  - architecture
  - efficiency
---

# Mixture of Experts（稀疏专家混合） ^h-1-1-76f719

把 [[wiki/concepts/transformer]] 的前馈层（FFN）替换为多个"专家"分支，**每个 token 只激活其中少数几个**——参数总量大但单次推理计算量小。 ^p-1-73a331

## 核心组件 ^h-2-1-90030e

- **Experts**：N 个独立 FFN（通常 8 / 16 / 64）
- **Gating Network**：决定每个 token 路由到哪 K 个专家（K 通常 2）
- **Top-K Routing**：选 score 最高的 K 个 ^p-2-8985d6

## 优势 ^h-2-2-f094dd

- **同算力下参数量更大** → 学习容量更高
- 推理时 active params 远小于总 params（如 Mixtral 8x7B：47B 总，13B active）
- 训练和推理都比同等总参数量稠密模型快 ^p-3-106074

## 挑战 ^h-2-3-590d8b

- **负载均衡**：避免少数专家过热（用 auxiliary loss 平衡）
- **训练稳定性**：路由策略对 loss 敏感
- **部署复杂**：需要把不同专家分配到不同 GPU ^p-4-51e1f6

## 主要采用者 ^h-2-4-fb288f

- [[wiki/entities/mistral-ai]] — Mixtral 8x7B / 8x22B
- [[wiki/entities/deepmind]] — GLaM、Switch Transformer（Google Brain 时期）
- 传闻 GPT-4 也是 MoE 架构（[[wiki/entities/openai]] 未官方确认） ^p-5-bd0a5a
