---
title: "RECOMP: Compression + Selective Augmentation (Xu et al. 2023-10)"
type: source_summary
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: draft
confidence: high
source_count: 1
sources:
  - "[[raw/papers/2023-10-recomp]]"
tags:
  - rag
  - compression
  - post-retrieval
  - 2023
  - ut-austin
---

# RECOMP: Improving RAG with Compression and Selective Augmentation ^h-1-1-2aef9d

> **原始文件**: [[raw/papers/2023-10-recomp]]
> **作者**: Fangyuan Xu, Weijia Shi, Eunsol Choi(UT Austin / U Washington)
> **发表**: 2023-10 arXiv preprint(ICLR 2024)
> **arXiv**: [2310.04408](https://arxiv.org/abs/2310.04408)
> **历史地位**:**Gao Survey Table I 收录,line "Recomp \| Wikipedia \| Text \| Doc \| Inference \| Once"**[[wiki/sources/gao_rag_survey#^t-2-db7484]];RAG-or-LongContext §2 引用作 "prompt compression" 方向代表[需要来源] ^p-1-dd220f

## 摘要 ^h-2-1-3ae146

RECOMP 把 retrieved 文档**压缩成摘要后**再 prepend 给 LLM,**压缩率低至 6%** 但性能损失极小。提出两种 compressor:**extractive**(选句)+ **abstractive**(LLM 摘要)。**核心创新:Selective augmentation**——如果 retrieved 文档对 query 无用,compressor 直接返回**空串**,LLM 不带 retrieved context 生成。一个 compressor 训完可迁移到不同 LLM[[raw/papers/2023-10-recomp]]。 ^p-2-b97dbe

## 关键发现 / 论点 ^h-2-2-10e39a

1. **post-retrieval 压缩是 RAG 工程的关键**:压缩 6% 保留性能,显著降低 inference 成本[[raw/papers/2023-10-recomp]]
2. **Selective augmentation 思想** = 后来 Self-Route(2024-07)的雏形 — 都让 LLM 决定"要不要用 retrieved 内容" [KB 综合]
3. **vs Self-RAG 的 IsRel/IsSup**:RECOMP 用单独的 compressor 模型,Self-RAG 内化到 generator vocabulary [KB 综合]
4. **可迁移**:compressor 训完不绑特定 LLM,实用性高 [[raw/papers/2023-10-recomp]] ^p-3-34ea9c

## AI 综合判断 ^h-2-3-e0eacb

### 核心价值 ^h-3-1-57ae37

RECOMP 是 **post-retrieval 压缩**这条工程路线的代表作。它的 "selective augmentation"(retrieved 不好就返回空串)**早于** Self-Route 的 "answerable → RAG / unanswerable → LC" 一年,但思想同源:让模型/系统**自决何时跳过 retrieve**。Gao Survey 把 RECOMP 归入 Advanced RAG 的 post-retrieval 章节。 [KB 综合] ^p-4-f49c09

### 关联 ^h-3-2-1c3cf7

- [[wiki/concepts/retrieval_augmented_generation]] — post-retrieval 压缩方向具体 anchor
- [[wiki/sources/rag_or_longcontext]] — DeepMind Self-Route 思想前驱
- [[wiki/sources/longllmlingua]] — 同期 prompt 压缩工作(更通用) ^p-5-82bee7

### 冲突 ^h-3-3-93190b

**不触发新冲突标注** — RECOMP 是 post-retrieval 优化方向,与已 ingest 的所有 RAG 改进路线**正交**(不挑战任何论断)。但它的 "selective augmentation" 思想可作为 [[wiki/sources/rag_or_longcontext]] Self-Route 思想前驱的 anchor。 ^p-6-c2de45

## 与 Wiki 的关联 ^h-2-4-8625b8

- MOC:[[wiki/indexes/rag_evolution_index]] Batch 3 ^p-7-421d5f
