---
title: "知识库根索引 — RAG 演化史 (2023-2025)"
type: index
created_date: 2026-05-25
last_modified: 2026-05-27
last_modified_by: LLM
status: draft
confidence: high
source_count: 0
sources: []
tags:
  - root
  - rag-evolution
scope: "wiki/concepts/*, wiki/entities/*, wiki/sources/*, wiki/indexes/*, wiki/analyses/*"
page_count: 46
---

# 根索引 — RAG 演化史 (2023-2025) ^h-1-1-9079d9

> 本 demo KB 围绕 **RAG 子领域 2023-2025 的范式演化**组织。8 篇关键论文按发表时间顺序 ingest;查询时先读本文件定位主题,再下钻到子索引或具体页面。 ^p-1-080f6d

## 领域目录 ^h-2-1-7f8c81

| 领域 | 子索引 | 页面数 | 最近更新 |
|------|--------|--------|----------|
| RAG 演化史 (2023-2025) | [[wiki/indexes/rag_evolution_index]] | 46 | 2026-05-26 |
^t-1-5d67e9 ^p-2-af89c4

## 综合分析(跨文档深度研究) ^h-2-2-065337

- [[wiki/analyses/rag_evolution_timeline_2023_2025]] — **8 篇 RAG 论文的演化时间线 + 5 次冲突标注汇总**(KB demo 的旗舰产出)
- [[wiki/analyses/three_graph_rag_families]] — **三派 Graph RAG 深度对照**(GraphRAG / LightRAG / HippoRAG 2)
- [[wiki/analyses/kb_vs_human_survey_coverage]] — **KB 自动综合 vs Gao 2024 RAG Survey 覆盖度对照** ^p-3-f829f3

## 来源汇总(已 ingest) ^h-2-3-fa355e

**Batch 0 — RAG 演化核心 8 篇**(2023-10 → 2025-03):
- [[wiki/sources/self_rag]] — Self-RAG: 自反思 RAG 范式开创者
- [[wiki/sources/crag]] — CRAG: 自纠错 RAG **⚠ 与 Self-RAG 标冲突**
- [[wiki/sources/graphrag]] — GraphRAG: 图结构 RAG 开创者
- [[wiki/sources/rag_or_longcontext]] — RAG vs LC 路线之争 **⚠ 挑战整个 RAG 赛道**
- [[wiki/sources/lightrag]] — LightRAG: 双层 graph RAG **⚠ 反驳 GraphRAG**
- [[wiki/sources/hipporag2]] — HippoRAG 2: PPR **⚠ 反驳"扩充 corpus 派"**
- [[wiki/sources/r1_searcher]] — R1-Searcher: 两阶段 RL **⚠ 替代 Self-RAG SFT**
- [[wiki/sources/search_r1]] — Search-R1: PPO/GRPO RL **⚠ 替代 Self-RAG SFT**

**Batch 1 — 对照基准 + Retrieval Foundation 7 篇**:
- [[wiki/sources/gao_rag_survey]] — **Gao 2024 RAG Survey: KB 对照基准**(第③档,三代分类 + Table I)
- [[wiki/sources/dpr]] — DPR: 现代 dense retriever 起点(2020-04)
- [[wiki/sources/colbertv2]] — ColBERTv2: late interaction 派(2021-12)
- [[wiki/sources/contriever]] — Contriever: unsupervised dense retrieval(2021-12)
- [[wiki/sources/e5]] — E5: 工程化双塔(MTEB SOTA, 2022-12)
- [[wiki/sources/bge]] — BGE: 中英双语 embedding(BAAI 2023-09,R1-Searcher 默认)
- [[wiki/sources/nv_embed_v2]] — NV-Embed v2: LLM-as-encoder(NVIDIA 2024-05,HippoRAG 2 关键 baseline)

**Batch 2 — Self-Reflective 演化前置 5 篇 + Graph 扩展 3 篇**:
- [[wiki/sources/self_ask]] — Self-Ask: query decomposition prompting(2022-10)
- [[wiki/sources/react]] — ReAct: agent 框架奠基(Princeton 2022-10)
- [[wiki/sources/ircot]] — IRCoT: multi-hop retrieval prompting(2022-12)
- [[wiki/sources/self_refine]] — Self-Refine: iterative self-feedback(2023-03)
- [[wiki/sources/flare]] — FLARE: Active RAG token-logprob 触发(2023-05)
- [[wiki/sources/raptor]] — RAPTOR: tree retrieval(2024-01,**扩充 corpus 派**具体 anchor)
- [[wiki/sources/hipporag1]] — HippoRAG 1: PPR + 神经科学(2024-05,**HippoRAG 2 前作**)
- [[wiki/sources/kag]] — KAG: 专业领域 graph RAG(蚂蚁 2024-09,第③档)

**Batch 3 — LC 扩展 3 篇 + RL/Agentic 扩展 4 篇**:
- [[wiki/sources/recomp]] — RECOMP: 压缩 + Selective augmentation(2023-10)
- [[wiki/sources/longllmlingua]] — LongLLMLingua: token-level prompt 压缩(2023-10)
- [[wiki/sources/memgpt]] — MemGPT/Letta: LLMs as OS,memory-augmented(Berkeley 2023-10)
- [[wiki/sources/raft]] — RAFT: RAG-Aware Fine-Tuning(Berkeley 2024-03,**domain RAG 主张**)
- [[wiki/sources/longrag]] — LongRAG: LC LLM 作 RAG generator(2024-06,**融合方案**)
- [[wiki/sources/search_o1]] — Search-o1: **o1 派 agentic RAG**(2025-01,第③档)**⚠ 标 #6 冲突**
- [[wiki/sources/deeprag]] — DeepRAG: **IL 派 agentic RAG**(2025-02,三家鼎立第三家)

**Batch 4 — Evaluation 3 篇(末批,完成 33/33)**:
- [[wiki/sources/ragas]] — RAGAS: 自动指标框架(Faithfulness/Context/Answer Relevance, 2023-09)
- [[wiki/sources/multihop_rag]] — MultiHop-RAG: 真实 multi-hop benchmark + Null query(2024-01)
- [[wiki/sources/crag_benchmark]] — CRAG benchmark(Meta 2024-06,**揭示主流 RAG 仅 ~40%**)

**进度**:🎯 **33/33 全部 ingest 完成**(原计划 38,实际 33;Batch 0/1/2/3/4 ✓);3 篇旗舰 analyses 升级到终极版。**5 篇原计划未 ingest**(SPLADE / GritLM / LazyGraphRAG / WebRL / Modular RAG Survey)— 决策原因:这些工作的核心论断已被 KB 通过其他论文间接覆盖,边际收益递减 ^p-4-4225b0

## 计划 ingest 清单 ^h-2-4-e460b1

按时间顺序:

1. 2023-10 Self-RAG [[raw/papers/2023-10-self-rag]]
2. 2024-01 CRAG [[raw/papers/2024-01-crag]]
3. 2024-04 GraphRAG [[raw/papers/2024-04-graphrag]]
4. 2024-07 RAG-vs-Long-Context [[raw/papers/2024-07-rag-or-longcontext]]
5. 2024-10 LightRAG [[raw/papers/2024-10-lightrag]]
6. 2025-02 HippoRAG 2 [[raw/papers/2025-02-hipporag2]]
7. 2025-03 R1-Searcher [[raw/papers/2025-03-r1-searcher]]
8. 2025-03 Search-R1 [[raw/papers/2025-03-search-r1]]
^p-5-55818e
