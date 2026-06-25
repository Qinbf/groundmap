---
title: "RAPTOR: Recursive Abstractive Processing (Sarthi et al. 2024-01)"
type: source_summary
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: draft
confidence: high
source_count: 1
sources:
  - "[[raw/papers/2024-01-raptor]]"
tags:
  - rag
  - tree-retrieval
  - hierarchical-summary
  - 2024
  - stanford
---

# RAPTOR: Recursive Abstractive Processing for Tree-Organized Retrieval ^h-1-1-cec8af

> **原始文件**: [[raw/papers/2024-01-raptor]]
> **作者**: Parth Sarthi, Salman Abdullah et al.(Stanford)
> **发表**: 2024-01 arXiv preprint(ICLR 2024)
> **arXiv**: [2401.18059](https://arxiv.org/abs/2401.18059)
> **特殊地位**:**[[wiki/sources/hipporag2]] 显式反驳的"扩充 corpus 派"代表之一**[[raw/papers/2025-02-hipporag2#^p-25-03f09c]] ^p-1-73426a

## 摘要 ^h-2-1-3ae146

RAPTOR 用 **Gaussian Mixture Model 聚类 + 递归 LLM 摘要** 构建层次 retrieval 树:文档 chunks → GMM 聚类 → 每个 cluster 用 LLM 生成摘要 → 摘要再聚类再摘要(自底向上)→ 最终成树。Query 时可以在树的任意层级 retrieve(精细 leaf chunks 或高层摘要)。在 NarrativeQA / QASPER 等 long-form QA 上显著超过 chunk-level RAG[[raw/papers/2024-01-raptor]]。 ^p-2-b307f6

## 关键发现 / 论点 ^h-2-2-10e39a

1. **递归摘要 + 多层级检索**:flat chunk retrieval 漏掉 global context;多层级 retrieval 兼顾局部细节和整体主题 [[raw/papers/2024-01-raptor]]
2. **GMM 聚类优于 k-means**:soft assignment 允许 chunk 属于多个 cluster(主题交叉) [[raw/papers/2024-01-raptor]]
3. **LLM 生成摘要进 retrieval pool** — 这正是 HippoRAG 2 反驳的核心:LLM 生成内容可能引入 noise [[raw/papers/2024-01-raptor]]
4. **vs GraphRAG**:都用层次摘要,但 GraphRAG 用 graph community detection,RAPTOR 用 tree(GMM 聚类) [KB 综合] ^p-3-855b09

## AI 综合判断 ^h-2-3-e0eacb

### 核心价值 ^h-3-1-57ae37

RAPTOR 与 GraphRAG / LightRAG 共同代表 **"扩充 corpus 派"** 方法论——让 LLM 生成的高层摘要参与 retrieval。本论文 ingest **回流验证**了 [[wiki/concepts/graph_rag]] 第 2 个冲突标注的内容:HippoRAG 2 论文 §2.2 line 127 显式说"RAPTOR uses GMM to detect document clusters to summarize"[[raw/papers/2025-02-hipporag2#^p-25-03f09c]]——之前该标注用的是间接引用,现在 RAPTOR 本体 ingest 后有了具体 anchor。 ^p-4-730c19

### 关联 ^h-3-2-1c3cf7

- [[wiki/concepts/graph_rag]] — "扩充 corpus 派"代表之一(三派对照表加 RAPTOR 行)
- [[wiki/sources/graphrag]] / [[wiki/sources/lightrag]] — 同派(graph + LLM 生成摘要)
- [[wiki/sources/hipporag2]] — 反对派,显式批评 RAPTOR ^p-5-d141ea

### 冲突 ^h-3-3-93190b

**给 [[wiki/concepts/graph_rag]] 第 2 个冲突标注回流补充 anchor** — RAPTOR 现在是该标注里"扩充 corpus 派"的具体引用,而非抽象类别。**本身不新建冲突标注**(冲突已在 graph_rag.md 里)。 ^p-6-e10d3a

## 与 Wiki 的关联 ^h-2-4-8625b8

- 影响:[[wiki/concepts/graph_rag]] 三派对照表加 RAPTOR 行(标"扩充 corpus 派 / Tree-based")
- MOC:[[wiki/indexes/rag_evolution_index]] Batch 2 ^p-7-0a047a
