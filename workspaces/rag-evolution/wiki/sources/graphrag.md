---
title: "GraphRAG: From Local to Global Query-Focused Summarization"
type: source_summary
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: reviewed
confidence: high
source_count: 1
sources:
  - "[[raw/papers/2024-04-graphrag]]"
tags:
  - rag
  - graph-rag
  - knowledge-graph
  - community-detection
  - 2024
  - microsoft
---

# GraphRAG: From Local to Global ^h-1-1-ad6364

> **原始文件**: [[raw/papers/2024-04-graphrag]]
> **作者**: Darren Edge, Ha Trinh, Newman Cheng, Joshua Bradley, Alex Chao, Apurva Mody, Steven Truitt, Dasha Metropolitansky, Robert Osazuwa Ness, Jonathan Larson (Microsoft Research / Strategic Missions / CTO Office)
> **发表**: 2024-04 arXiv preprint
> **arXiv**: [2404.16130](https://arxiv.org/abs/2404.16130)
> **开源**: <https://github.com/microsoft/graphrag> ^p-1-2c9f5d

## 摘要 ^h-2-1-811e72

GraphRAG 解决一类 vector RAG **完全失败**的问题:**全局意义构建**(global sensemaking),如"这个 corpus 的主要主题是什么"。这类问题需要对整个文档集做 reasoning,而非局部信息检索。GraphRAG 用 LLM 把 corpus 转成**知识图**(entities + relationships + claims),用 **Leiden 算法**做 hierarchical community detection,**预生成每个社区的摘要**作为索引[[raw/papers/2024-04-graphrag#^h-2-3-c08b6a]]。 ^p-2-d15c40

Query 时走 **map-reduce**:每个相关 community summary 独立产生 partial answer(map),再合并成 global answer(reduce)。**Index time 重投入**(LLM 生成全部社区摘要),**query time 高效**(只需 map-reduce 现成摘要)[[raw/papers/2024-04-graphrag#^p-13-2e08a8]]。 ^p-3-69d181

评估上,论文用 LLM-as-judge + adaptive benchmarking(LLM 生成 sensemaking queries),在 1M token 量级 corpus 上,GraphRAG 在 **comprehensiveness** 和 **diversity** 两个指标上**显著优于 vector RAG**(GPT-4 评分)[[raw/papers/2024-04-graphrag#^p-14-6b609e]]。 ^p-4-d4294f

## 关键发现 / 论点 ^h-2-2-93d2ce

1. **vector RAG 在 global sensemaking 上根本不可用**——这是 GraphRAG 论文确立的**新问题类**[[raw/papers/2024-04-graphrag#^p-11-d03edc]]
2. **Knowledge graph + community detection** 取代 flat chunk pool:graph 的 **modularity** 让"分而治之的全局摘要"成为可能[[raw/papers/2024-04-graphrag#^p-19-c70749]]
3. **Hierarchical community summary**:Leiden 算法递归分社区,每层都生成摘要,leaf → root 自底向上聚合 [[raw/papers/2024-04-graphrag]]
4. **Map-reduce query pattern**:并行处理多个社区,最后聚合;query time 没有重 LLM 推理 [[raw/papers/2024-04-graphrag]]
5. **LLM 作 entity extractor**:in-context learning + 域特定 few-shot,可处理任意领域 corpus [[raw/papers/2024-04-graphrag]]
6. **新评估范式**:adaptive benchmarking(LLM 生成 sensemaking queries)+ LLM-as-judge(GPT-4 评分两个候选系统)+ verifiable claims 统计验证 [KB 综合]
7. **开源**:microsoft/graphrag,以及 LangChain / LlamaIndex / NebulaGraph / Neo4J 等多个生态集成 [[raw/papers/2024-04-graphrag]] ^p-5-e52470

## 方法论 ^h-2-3-f27051

- **Indexing pipeline**:Source Docs → Text Chunks → LLM 提取 Entities + Relationships + Claims → Knowledge Graph → Leiden 社区检测 → Community Summaries(hierarchical)[[raw/papers/2024-04-graphrag]]
- **Query pipeline**:Query → 匹配相关 community summaries → map(每个 summary 独立答 partial)→ reduce(合并 → global answer) [[raw/papers/2024-04-graphrag]]
- **Entity extraction**:LLM prompted,默认提取 named entities,可域定制 few-shot [[raw/papers/2024-04-graphrag]]
- **Entity matching**:论文用 exact string matching;可换 fuzzy matching [[raw/papers/2024-04-graphrag]]
- **数据集**:Podcast transcripts + News articles(各 ~1M tokens) [[raw/papers/2024-04-graphrag]]
- **LLM**:GPT-4(extraction + summarization + judge) [[raw/papers/2024-04-graphrag]] ^p-6-060796

## 局限性 ^h-2-4-d25123

- **index time 极重**:对 1M token corpus 需要数百次 LLM 调用做 entity extraction + 社区摘要,GPT-4 成本可观[[raw/papers/2024-04-graphrag]]
- **entity matching 弱**:exact string matching 漏掉同实体不同表述(e.g., "U.S." vs "United States") [KB 综合]
- **针对 sensemaking 优化,local fact retrieval 未必更好**:论文承认这种范式对"精确事实问答"不是优势项 [KB 综合]
- **依赖 GPT-4 评估** — 评估指标 comprehensiveness/diversity 由 GPT-4 给,无 ground truth [[raw/papers/2024-04-graphrag]]
- **Leiden 调参敏感**:社区粒度对最终摘要质量有显著影响 [[raw/papers/2024-04-graphrag]] ^p-7-bf6038

## AI 综合判断 ^h-2-5-006953

### 核心价值 ^h-3-1-eb2f7a

GraphRAG 是 **2024 RAG 范式分叉**的里程碑——它把改进焦点**从"retrieve/generate 控制流"切到"corpus 表征本身"**。Self-RAG 和 CRAG 都在改 query-time 行为(模型自决 / 评估器),GraphRAG **完全在 index-time 解决问题**:重新组织 corpus 本身的结构,query 阶段几乎不做新推理。它还**定义了新问题类**(global sensemaking),这是后续 LightRAG / HippoRAG 2 等 graph 派工作的共同前提。开源 + 多生态集成 + 微软背书让 GraphRAG 成为后续 graph 派范式的**事实标准与靶子**。 [KB 综合] ^p-8-901626

### 关联 ^h-3-2-f856d6

- 概念页 [[wiki/concepts/retrieval_augmented_generation]] — GraphRAG **开启了 RAG 演化的"图结构分支"**;更新该页演化方向章节
- 新建概念页 [[wiki/concepts/graph_rag]] — 本文是该范式的原始定义
- vs [[wiki/concepts/self_reflective_rag]]:**正交改进**(改 generator 控制 vs 改 corpus 表征);理论上可叠加
- vs [[wiki/concepts/corrective_rag]]:**正交改进**(加 evaluator vs 改 corpus 表征);理论上可叠加
- MOC [[wiki/indexes/rag_evolution_index]] — 第 3 篇,RAG 演化首次出现"完全不同方向"的范式 ^p-9-45a9fa

### 冲突 ^h-3-3-cabb88

**与 Self-RAG / CRAG 无直接冲突**(改进维度完全正交)。但本文**预言了后续冲突**: [KB 综合]

- **vs LightRAG**(待 ingest, 2024-10):LightRAG 论文显式声称比 GraphRAG "fast 10×、accurate higher"——届时会在 [[wiki/concepts/graph_rag]] 注入冲突标注
- **vs HippoRAG 2**(待 ingest, 2025-02):提出第三种 graph 范式(基于 PPR + 海马体记忆),与本文的 Leiden + community summary 直接竞争 [KB 综合]
- **vs RAG-or-LongContext**(待 ingest, 2024-07):**整个 RAG 方向**(包括 GraphRAG)被质疑——long-context 模型是否让 RAG 过时? [KB 综合] ^p-10-0bcc23

## 与 Wiki 的关联 ^h-2-6-da27d5

- 影响页面:[[wiki/concepts/retrieval_augmented_generation]] 加图结构分支说明 / 新建 [[wiki/concepts/graph_rag]]
- MOC 归属:[[wiki/indexes/rag_evolution_index]] 第 3 篇,RAG 演化方向首次分叉
- 预留冲突锚点:LightRAG / HippoRAG 2 ingest 时回流注入冲突 ^p-11-81d4c8
