---
title: "多模态推理（Multimodal Reasoning）"
type: concept
created_date: 2026-04-14
last_modified: 2026-04-21
last_modified_by: LLM
status: deprecated
confidence: low
source_count: 0
sources: []
tags:
  - multimodal
  - reasoning
  - frontier
---

# 多模态推理 ^h-1-1-e088ca

让大模型同时处理文本、图像、音频、视频等多种模态，并基于跨模态信息推理。 ^p-1-08801d

## 当前主流路线 ^h-2-1-ca80cf

1. **统一 Token 化**：所有模态都映射到同一 token 空间（GPT-4V、Gemini 1.5）
2. **Adapter / Connector**：视觉编码器 + 语言模型用 cross-attention 连接（早期 BLIP、LLaVA）
3. **原生多模态训练**：从预训练阶段就用混合模态数据（Gemini 系列） ^p-2-6b2ad5

## 评测困境 ^h-2-2-0a1969

- 现有 benchmark（MMMU、MathVista）覆盖度不足
- 真实推理 vs 表面匹配难以区分
- "Reasoning over images" 仍弱于纯文本任务 ^p-3-5b1206

## 主要玩家 ^h-2-3-3c4882

- [[wiki/entities/openai]] — GPT-4o（实时多模态对话）
- [[wiki/entities/deepmind]] — Gemini（原生多模态）
- [[wiki/entities/anthropic]] — Claude 3+（视觉理解） ^p-4-b32cc6

## 为什么 confidence: low ^h-2-4-fcafeb

- 该领域演进极快（数月迭代一次基础假设）
- benchmark 不可靠（MMMU 已被多次质疑）
- 研究者对"是否真的在跨模态推理"仍有分歧 ^p-5-6273b9

待补充原始来源后升级 confidence。 ^p-6-032f2a
