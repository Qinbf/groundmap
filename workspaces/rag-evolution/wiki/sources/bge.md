---
title: "BGE / C-Pack: General Chinese Embeddings (Xiao et al. 2023-09)"
type: source_summary
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: reviewed
confidence: high
source_count: 1
sources:
  - "[[raw/papers/2023-09-bge]]"
tags:
  - retrieval
  - dense-retrieval
  - chinese-embedding
  - 2023
  - baai
---

# BGE / C-Pack: Packed Resources For General Chinese Embeddings ^h-1-1-7ee2d9

> **原始文件**: [[raw/papers/2023-09-bge]]
> **作者**: Shitao Xiao, Zheng Liu et al.(北京智源人工智能研究院 BAAI)
> **发表**: 2023-09 arXiv preprint
> **arXiv**: [2309.07597](https://arxiv.org/abs/2309.07597)
> **历史地位**:**Hugging Face 下载最多的 embedding 之一**(BGE-large-zh / BGE-large-en);R1-Searcher 论文使用 BGE-large-en-v1.5 作为 default retriever[[raw/papers/2025-03-r1-searcher#^p-61-bb2bbe]] ^p-1-a66855

## 摘要 ^h-2-1-3ae146

C-Pack 是 BAAI 开源的**中文 embedding 完整套件**,包含三部分:**C-MTEB**(中文版 MTEB benchmark, 6 个任务 35 个数据集)+ **C-MTP**(中文文本对 100M+ 训练数据)+ **BGE 模型**(small / base / large 三规模)。BGE 同时发布中文(BGE-zh)和英文(BGE-en)版本,英文版在 MTEB 上达到 SOTA(2023-08 时点)[[raw/papers/2023-09-bge#^h-2-3-ebfc75]]。 ^p-2-d46688

## 关键发现 / 论点 ^h-2-2-10e39a

1. **方法论**:沿用 E5 的两阶段范式(weak supervision pretrain → supervised fine-tune),但**数据规模更大** + **中英双语** [KB 综合]
2. **C-MTEB 中文 benchmark**:填补了中文 embedding 评估的工具空白,BAAI 推动其成为中文标准 [[raw/papers/2023-09-bge]]
3. **MTEB SOTA**(英文)+ C-MTEB SOTA(中文)双榜霸权 [[raw/papers/2023-09-bge]]
4. **生态**:BGE 系列后续衍生 BGE-M3(多语言 + 多粒度 + 多任务)/ BGE-reranker 等 [[raw/papers/2023-09-bge]] ^p-3-806a07

## AI 综合判断 ^h-2-3-e0eacb

### 核心价值 ^h-3-1-57ae37

BGE 是**中文 RAG 的事实标准 retriever**——任何中文 RAG 项目几乎都会用到 BGE 或其衍生。它证明了**E5 范式的可移植性**(从英文搬到中文不损失方法论),并通过完整开源(模型 + 训练数据 + benchmark)推动了中文 NLP 生态。R1-Searcher(2025-03)选用 BGE-large-en-v1.5 作 default retriever 而非 Contriever / DPR,说明 BGE 已经成为 **2024-2025 新工作的 default 选择**[[raw/papers/2025-03-r1-searcher#^p-61-bb2bbe]]。 ^p-4-de449d

### 关联 ^h-3-2-1c3cf7

- [[wiki/concepts/retrieval_foundations]] — E5 范式中文移植 + 工程开源标杆
- [[wiki/sources/e5]] — 同方法论,中文/双语扩展
- [[wiki/sources/r1_searcher]] — 使用 BGE 作 default retriever
- [[wiki/sources/gao_rag_survey]] — Gao Survey 写作时点 BGE 刚发布,引用较少 ^p-5-ec8806

### 冲突 ^h-3-3-93190b

无冲突。BGE 是 E5 范式的中文实现 + 工程优化。 [KB 综合] ^p-6-76144d

## 与 Wiki 的关联 ^h-2-4-8625b8

- 影响:[[wiki/concepts/retrieval_foundations]] 双语/工程化分支
- MOC:[[wiki/indexes/rag_evolution_index]] Batch 1 ^p-7-73ed8c
