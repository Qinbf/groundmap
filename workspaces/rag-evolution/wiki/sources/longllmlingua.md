---
title: "LongLLMLingua: Long Context Prompt Compression (Jiang et al. 2023-10)"
type: source_summary
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: reviewed
confidence: high
source_count: 1
sources:
  - "[[raw/papers/2023-10-longllmlingua]]"
tags:
  - llm
  - long-context
  - prompt-compression
  - 2023
  - microsoft
---

# LongLLMLingua: 长上下文场景的 Prompt 压缩 ^h-1-1-c32a94

> **原始文件**: [[raw/papers/2023-10-longllmlingua]]
> **作者**: Huiqiang Jiang, Qianhui Wu et al.(Microsoft Research)
> **发表**: 2023-10 arXiv preprint(ACL 2024)
> **arXiv**: [2310.06839](https://arxiv.org/abs/2310.06839)
> **历史地位**:**RAG-or-LongContext 论文 §2 引用作 prompt compression 方向代表** [需要来源] ^p-1-180545

## 摘要 ^h-2-1-3ae146

LongLLMLingua 用 small LLM(GPT-2-small)作 token-level **prompt compressor**,基于 perplexity 和 query-aware contrastive perplexity 选择最重要的 tokens 保留。**2-6× 压缩率**而性能不降,**在 RAG 场景下甚至提升**(因为压缩去掉了 retrieved 文档的 lost-in-the-middle 噪声)[[raw/papers/2023-10-longllmlingua]]。 ^p-2-3b991f

## 关键发现 / 论点 ^h-2-2-10e39a

1. **prompt 压缩不只是省 token,还能提升性能**——去掉 noise tokens 让 LLM focus[[raw/papers/2023-10-longllmlingua]]
2. **query-aware compression**:不同 query 应保留不同 tokens,而非 task-agnostic [[raw/papers/2023-10-longllmlingua]]
3. **降本 vs LC 直接处理 long context**:LongLLMLingua 让 RAG 不必依赖 200K context LLM [KB 综合]
4. **vs RECOMP**:RECOMP 是文档级 abstract/extractive 摘要,LongLLMLingua 是 token 级压缩,粒度不同 [KB 综合] ^p-3-819078

## AI 综合判断 ^h-2-3-e0eacb

### 核心价值 ^h-3-1-57ae37

LongLLMLingua 与 RECOMP 共同代表 **"对抗 LC 的工程武器"**——RAG 路线坚守者用压缩技术让 short-context LLM 仍能处理大 corpus,反击 "LC > RAG" 的成本论。RAG-or-LongContext 引用为该方向代表 [需要来源],但 DeepMind 论文核心论断仍是"LC 在性能上 > RAG"——压缩只解决了成本问题。 ^p-4-19e3c3

### 关联 ^h-3-2-1c3cf7

- [[wiki/concepts/rag_vs_long_context]] — 给 RAG 派提供工程武器的具体 anchor
- [[wiki/sources/recomp]] — 同期 retrieved doc 压缩工作(文档级 vs token 级)
- [[wiki/sources/rag_or_longcontext]] — 引用为 prompt compression 方向代表 ^p-5-bf3041

### 冲突 ^h-3-3-93190b

**不触发新冲突标注** — LongLLMLingua 是 LC 派 vs RAG 派斗争的"工程武器",已被 [[wiki/concepts/rag_vs_long_context]] 概念页综合。 ^p-6-dc9d78

## 与 Wiki 的关联 ^h-2-4-8625b8

- MOC:[[wiki/indexes/rag_evolution_index]] Batch 3 ^p-7-421d5f
