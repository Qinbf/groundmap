---
title: "AI / 大模型 子领域索引"
type: index
created_date: 2026-04-08
last_modified: 2026-05-03
last_modified_by: LLM
status: deprecated
confidence: high
source_count: 0
sources: []
tags:
  - artificial-intelligence
  - llm
scope: "wiki/concepts/*, wiki/entities/*, wiki/sources/*"
page_count: 24
---

# AI / 大模型 子领域索引 ^h-1-1-d8d28f

## 核心架构 ^h-2-1-e2b5e0

- [[wiki/concepts/transformer]] — Transformer 架构，主流 LLM 基础
- [[wiki/concepts/attention]] — 注意力机制
- [[wiki/concepts/mixture_of_experts]] — 稀疏专家混合（MoE） ^p-1-c63044

## 训练与对齐 ^h-2-2-e6b6c6

- [[wiki/concepts/rlhf]] — 人类反馈强化学习
- [[wiki/concepts/dpo]] — 直接偏好优化
- [[wiki/concepts/constitutional_ai]] — Constitutional AI（Anthropic 路线）
- [[wiki/concepts/in_context_learning]] — 上下文学习 ^p-2-93521d

## 推理能力 ^h-2-3-6c6581

- [[wiki/concepts/chain_of_thought]] — 思维链提示
- [[wiki/concepts/tool_use]] — 工具调用 / Agent 能力
- [[wiki/concepts/multimodal_reasoning]] — 多模态推理（confidence: low） ^p-3-abdcb6

## 训练动力学 / 泛化 ^h-2-4-11d088

- [[wiki/concepts/grokking]] — 延迟泛化现象（status: draft，待补 raw 来源） ^p-4-793e2c

## 关键实体 ^h-2-5-f8b0aa

- [[wiki/entities/openai]] — GPT 系列开发者
- [[wiki/entities/anthropic]] — Claude 系列、Constitutional AI 路线
- [[wiki/entities/deepmind]] — Gemini、AlphaCode、Transformer 共同源头
- [[wiki/entities/meta-ai]] — LLaMA 系列（开源路线）
- [[wiki/entities/mistral-ai]] — Mistral / Mixtral ^p-5-2bf3f7

## 关键来源 ^h-2-6-8da9ae

- [[wiki/sources/vaswani2017_transformer]] — Attention Is All You Need
- [[wiki/sources/brown2020_gpt3]] — GPT-3 论文
- [[wiki/sources/ouyang2022_instructgpt]] — InstructGPT
- [[wiki/sources/bai2022_constitutional]] — Constitutional AI 论文
- [[wiki/sources/rafailov2023_dpo]] — DPO 论文
- [[wiki/sources/wei2022_cot]] — Chain-of-Thought 论文
- [[wiki/sources/transformer_architecture_tour]] — Transformer 架构导览综述（演示材料）
- [[wiki/sources/alignment_methods_survey]] — RLHF/DPO/CAI 三路线综述（演示材料） ^p-6-caf616

## 综合分析 ^h-2-7-ba7540

- [[wiki/analyses/rlhf_vs_dpo]]
- [[wiki/analyses/attention_evolution]]
- [[wiki/analyses/agent_paradigms]] ^p-7-d5cf88

## 近期更新 ^h-2-8-deb736

- 2026-05-03: ingest — 新增两份演示材料综述 [[wiki/sources/transformer_architecture_tour]] 与 [[wiki/sources/alignment_methods_survey]]，验证 raw → wiki 完整链路
- 2026-05-03: lint W18 — [[wiki/concepts/grokking]] 纳入"训练动力学"分类（不再为孤儿）
- 2026-04-26: 新增 [[wiki/sources/rafailov2023_dpo]] 与 [[wiki/concepts/dpo]]
- 2026-04-22: [[wiki/analyses/rlhf_vs_dpo]] 标注一处冲突，待人类判别
- 2026-04-15: 新增 [[wiki/entities/mistral-ai]]（status: draft） ^p-8-7da3f0
