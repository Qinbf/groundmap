---
title: "HippoRAG 1: Neurobiologically Inspired Long-Term Memory (Gutiérrez et al. 2024-05)"
type: source_summary
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: reviewed
confidence: high
source_count: 1
sources:
  - "[[raw/papers/2024-05-hipporag1]]"
tags:
  - rag
  - graph-rag
  - hipporag
  - personalized-pagerank
  - 2024
  - ohio-state
---

# HippoRAG 1: Neurobiologically Inspired LLM Long-Term Memory ^h-1-1-6fae41

> **原始文件**: [[raw/papers/2024-05-hipporag1]]
> **作者**: Bernal Jiménez Gutiérrez, Yiheng Shu et al.(Ohio State NLP Group)
> **发表**: 2024-05 arXiv preprint(NeurIPS 2024)
> **arXiv**: [2405.14831](https://arxiv.org/abs/2405.14831)
> **特殊地位**:**[[wiki/sources/hipporag2]] 的直接前作**,HippoRAG 2 在 §3.1 显式说"closely inspired by HippoRAG"[[wiki/sources/hipporag2#^p-3-6066c2]] ^p-1-23fd9a

## 摘要 ^h-2-1-3ae146

HippoRAG 1 首次把**神经科学的人脑长期记忆模型**(hippocampus + neocortex + parahippocampal regions 三组件协同)映射到 RAG 架构:**KG + Personalized PageRank** 作 hippocampus(联想记忆),**LLM** 作 neocortex(感知 + 推理),**retrieval encoder** 作 parahippocampal regions(感觉-记忆桥)。机制:LLM 用 OpenIE 从 passages 提 triples 构 schemaless KG → query 时 NER 抽实体 → 用实体作 seed nodes 跑 **PPR 在 KG 上游走** → 召回相关 passages[[raw/papers/2024-05-hipporag1]]。 ^p-2-f2670a

## 关键发现 / 论点 ^h-2-2-10e39a

1. **多跳 retrieval = 图上随机游走**:PPR 天然解决"多跳"问题,无需 multi-step retrieval [[raw/papers/2024-05-hipporag1]]
2. **schemaless OpenIE KG** 优于预定义 schema:LLM 自动决定什么 entity / relation 重要 [[raw/papers/2024-05-hipporag1]]
3. **单次 retrieval 处理 multi-hop**:相比 IRCoT 多次 retrieve,HippoRAG 一次 PPR 完成 [KB 综合]
4. **HippoRAG 2 改进的痛点**(本论文未解决):**entity-centric 偏差**——NER 抽 query 实体,丢失 query 上下文;HippoRAG 2 改 query-to-triple 解决[[wiki/sources/hipporag2#^p-5-f604fe]] ^p-3-58c402

## AI 综合判断 ^h-2-3-e0eacb

### 核心价值 ^h-3-1-57ae37

HippoRAG 1 是 **"用 KG 辅助 retrieval"派的开山之作**——确立了 [[wiki/concepts/graph_rag]] 三派对照表中"辅助 retrieval 派"(vs "扩充 corpus 派" GraphRAG/LightRAG/RAPTOR)的根本路径。本论文给 HippoRAG 2 的方法论反思提供了直接前作基础——HippoRAG 1 的 entity-centric 偏差正是 HippoRAG 2 想解决的问题。 ^p-4-534798

### 关联 ^h-3-2-1c3cf7

- [[wiki/concepts/graph_rag]] — "辅助 retrieval 派"的起点(三派对照表加 HippoRAG 1 行)
- [[wiki/sources/hipporag2]] — 直接后继,在 §3.1 显式继承本论文框架并改进 3 处(Dense-Sparse / Deeper Contextualization / Recognition Memory)
- [[wiki/sources/colbertv2]] — 同为 token-level 精细操作思路(虽然技术细节不同) ^p-5-56131e

### 冲突 ^h-3-3-93190b

**不触发新冲突标注** — HippoRAG 1 → HippoRAG 2 是同一团队的迭代改进,无冲突;[[wiki/concepts/graph_rag]] vol.2 标注已覆盖"辅助 retrieval 派 vs 扩充 corpus 派"的根本之争。 ^p-6-8c6c2f

## 与 Wiki 的关联 ^h-2-4-8625b8

- 影响:[[wiki/concepts/graph_rag]] 三派对照表加 HippoRAG 1 行(标"HippoRAG 系列前作")
- MOC:[[wiki/indexes/rag_evolution_index]] Batch 2 ^p-7-4bc5e7
