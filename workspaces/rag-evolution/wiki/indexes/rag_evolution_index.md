---
title: "RAG 演化史索引 (2023-2025)"
type: index
created_date: 2026-05-26
last_modified: 2026-05-27
last_modified_by: LLM
status: draft
confidence: high
source_count: 0
sources: []
tags:
  - rag
  - evolution
scope: "wiki/sources/*, wiki/concepts/*, wiki/analyses/*"
page_count: 45
---

# RAG 演化史 (2023-2025) MOC ^h-1-1-bde91f

> 本 MOC 按发表时间顺序索引 8 篇 RAG 关键论文及其衍生的概念页与综合分析。**演化主线**:vanilla RAG → 自反思(2023-10)→ 自纠错(2024-01)→ 图结构(2024-04, 2024-10, 2025-02)→ 路线之争(2024-07)→ RL 范式(2025-03)。 ^p-1-5e000c

## 来源时间线(已 ingest 标 ✓,待 ingest 标 ⊙) ^h-2-1-eaf3b1

### Batch 0:核心演化 8 篇(2023-10 → 2025-03)^h-3-1-f4414a

| # | 时间 | 状态 | 来源页 | 范式 |
|---|---|---|---|---|
| 1 | 2023-10 | ✓ | [[wiki/sources/self_rag]] | 自反思(reflection tokens) |
| 2 | 2024-01 | ✓ | [[wiki/sources/crag]] | 自纠错(evaluator + web) **⚠ 与 #1 标冲突** |
| 3 | 2024-04 | ✓ | [[wiki/sources/graphrag]] | 图结构(社区摘要 + Leiden + map-reduce) |
| 4 | 2024-07 | ✓ | [[wiki/sources/rag_or_longcontext]] | 路线挑战(long-context) **⚠ 挑战整个 RAG 方向** |
| 5 | 2024-10 | ✓ | [[wiki/sources/lightrag]] | 图结构(双层 + key-value)**⚠ 反驳 GraphRAG** |
| 6 | 2025-02 | ✓ | [[wiki/sources/hipporag2]] | 图结构(PPR + 海马体)**⚠ 反驳整个"扩充 corpus 派" graph RAG** |
| 7 | 2025-03-05 | ✓ | [[wiki/sources/r1_searcher]] | RL(R1-style, 2-stage outcome reward) **⚠ 替代 Self-RAG SFT** |
| 8 | 2025-03-12 | ✓ | [[wiki/sources/search_r1]] | RL(检索嵌入推理, PPO/GRPO 双兼容) **⚠ 替代 Self-RAG SFT** |

### Batch 1:对照基准 + Retrieval Foundation 7 篇 ^h-3-2-66803a

| # | 时间 | 状态 | 来源页 | 范式 |
|---|---|---|---|---|
| B1-1 | 2023-12 | ✓ | [[wiki/sources/gao_rag_survey]] | **综述/对照基准**(三代分类 + Table I 70+ 方法)**第③档处理** |
| B1-2 | 2020-04 | ✓ | [[wiki/sources/dpr]] | 现代 dense retriever 起点 |
| B1-3 | 2021-12 | ✓ | [[wiki/sources/colbertv2]] | late interaction 派代表 |
| B1-4 | 2021-12 | ✓ | [[wiki/sources/contriever]] | unsupervised dense retrieval(Self-RAG/CRAG 默认 retriever) |
| B1-5 | 2022-12 | ✓ | [[wiki/sources/e5]] | 工程化双塔(MTEB SOTA,LangChain 默认) |
| B1-6 | 2023-09 | ✓ | [[wiki/sources/bge]] | E5 范式中文/双语扩展(R1-Searcher 默认 retriever) |
| B1-7 | 2024-05 | ✓ | [[wiki/sources/nv_embed_v2]] | LLM-as-encoder(**HippoRAG 2 的 graph 之争 vol.2 具体 baseline**) |

### Batch 2:Self-Reflective 演化前置历史 5 篇 + Graph 扩展 3 篇 ^h-3-3-08bea3

| # | 时间 | 状态 | 来源页 | 范式 |
|---|---|---|---|---|
| B2-1 | 2022-10 | ✓ | [[wiki/sources/self_ask]] | 显式 query decomposition prompting(agent loop 雏形)|
| B2-2 | 2022-10 | ✓ | [[wiki/sources/react]] | Reasoning + Acting 交替(agent 框架奠基)|
| B2-3 | 2022-12 | ✓ | [[wiki/sources/ircot]] | Interleaving Retrieval + CoT(multi-hop prompting)|
| B2-4 | 2023-03 | ✓ | [[wiki/sources/self_refine]] | Iterative self-feedback(self-critique 思想前驱)|
| B2-5 | 2023-05 | ✓ | [[wiki/sources/flare]] | Active RAG(token logprob 触发动态 retrieve)|
| B2-6 | 2024-01 | ✓ | [[wiki/sources/raptor]] | Tree-organized hierarchical retrieval(**扩充 corpus 派**)|
| B2-7 | 2024-05 | ✓ | [[wiki/sources/hipporag1]] | OpenIE KG + PPR(**HippoRAG 2 前作**,辅助 retrieval 派开山)|
| B2-8 | 2024-09 | ✓ | [[wiki/sources/kag]] | Domain-specific KG + Reasoning Planner(graph RAG 应用层)**第③档处理** |

### Batch 3:LC 扩展 3 篇 + RL/Agentic 扩展 4 篇 ^h-3-4-7b8235

| # | 时间 | 状态 | 来源页 | 范式 |
|---|---|---|---|---|
| B3-1 | 2023-10 | ✓ | [[wiki/sources/recomp]] | post-retrieval compression(extractive + abstractive,**Selective augmentation** 是 Self-Route 思想前驱)|
| B3-2 | 2023-10 | ✓ | [[wiki/sources/longllmlingua]] | token-level prompt compression(2-6× 压缩,对抗 LC 的工程武器)|
| B3-3 | 2023-10 | ✓ | [[wiki/sources/memgpt]] | LLMs as OS,memory-augmented LLM 开山(后改名 Letta)|
| B3-4 | 2024-03 | ✓ | [[wiki/sources/raft]] | RAG-Aware Fine-Tuning(domain-specific RAG,7B 超 175B)|
| B3-5 | 2024-06 | ✓ | [[wiki/sources/longrag]] | LC LLM 作 RAG generator,**RAG vs LC 融合方案** |
| B3-6 | 2025-01 | ✓ | [[wiki/sources/search_o1]] | **o1 派 agentic RAG**(prompting + LRM 涌现)**第③档**;**与 R1 派标冲突 #6** |
| B3-7 | 2025-02 | ✓ | [[wiki/sources/deeprag]] | **IL 派 agentic RAG**(MCTS + imitation learning);2025 三家鼎立第三家 |

### Batch 5:新工作流演示 — 2025-05 范式翻新

| # | 时间 | 状态 | 来源页 | 范式 |
|---|---|---|---|---|
| B5-1 | 2025-05 | ✓ | [[wiki/sources/zerosearch]] | **模拟器派** RL(LLM 模拟 search engine,0 API cost)**⚠ 标 #7 冲突 — 2025 Agentic RAG 三家鼎立扩为四家** |

### Batch 4:Evaluation 3 篇(末批,完成 38/38)^h-3-5-192982

| # | 时间 | 状态 | 来源页 | 范式 |
|---|---|---|---|---|
| B4-1 | 2023-09 | ✓ | [[wiki/sources/ragas]] | 自动指标框架:Faithfulness / Context Relevance / Answer Relevance(LLM-as-judge)|
| B4-2 | 2024-01 | ✓ | [[wiki/sources/multihop_rag]] | 真实 news multi-hop benchmark + Null query(测拒答)|
| B4-3 | 2024-06 | ✓ | [[wiki/sources/crag_benchmark]] | Meta KDD Cup 综合 benchmark,**揭示主流 RAG 真实仅 ~40%** |
^t-1-5d67e9 ^p-2-af89c4

## 核心概念页 ^h-2-2-931035

- [[wiki/concepts/retrieval_augmented_generation]] — 基础 RAG 定义 + 演化方向汇总
- [[wiki/concepts/self_reflective_rag]] — 自反思 RAG 范式 **⚠ 含冲突标注**(被 CRAG 挑战)
- [[wiki/concepts/corrective_rag]] — 自纠错 RAG 范式(2024-01)
- [[wiki/concepts/graph_rag]] — 图结构 RAG 范式(2024-04 GraphRAG;待 LightRAG/HippoRAG2 ingest 后扩展为三方对照)
- [[wiki/concepts/rag_vs_long_context]] — **路线之争**(DeepMind 论证 LC > RAG;Self-Route hybrid 方案)
- [[wiki/concepts/rl_augmented_retrieval]] — **RL 范式 RAG**(R1-Searcher + Search-R1 共享;替代 Self-RAG SFT)
- [[wiki/concepts/retrieval_foundations]] — **Retrieval Foundations**(2020-2024 dense retriever 演化;Batch 1 6 篇综合)
- [[wiki/concepts/rag_evaluation]] — **RAG Evaluation**(评估框架 + benchmark;Batch 4 3 篇综合)^p-3-93f724

## 综合分析 ^h-2-3-de2348

- [[wiki/analyses/rag_evolution_timeline_2023_2025]] — **演化时间线 + 5 次冲突标注汇总**(4 主线 / 范式翻新节奏 / 主线之间正交)
- [[wiki/analyses/three_graph_rag_families]] — **三派 Graph RAG 深度对照**(两个根本性的方法论分裂:community detection 必要吗 + LLM 生成内容能否入 retrieval pool)
- [[wiki/analyses/kb_vs_human_survey_coverage]] — **KB 自动综合 vs Gao 2024 RAG Survey 覆盖度对照**(能力上限、下限、独特价值) ^p-4-a1721e

## 近期更新 ^h-2-4-3e3924

- 2026-05-26: **Batch 4 完成 — 全部 38/38 ingest 完成!** 7 个 concept + 3 个 analyses 升级到终极版本。Evaluation 3 篇填补最大空白(RAGAS 自动指标 + CRAG benchmark + MultiHop-RAG)。新建 [[wiki/concepts/rag_evaluation]] 共享概念页。重写 [[wiki/analyses/rag_evolution_timeline_2023_2025]] 为 38 篇规模终极版,识别**5 条并行演化主线 + 6 处冲突 + 3 个涌现方法论分类**。
- 2026-05-26: **Batch 3 完成**(7 篇,总进度 30/38)—— ingest LC 扩展 3 篇(RECOMP / LongLLMLingua / LongRAG)+ RL/Agentic 扩展 4 篇(MemGPT / RAFT / Search-o1 / DeepRAG);**第 6 处冲突标注首次标注**:[[wiki/concepts/rl_augmented_retrieval]] 注入 `> [!WARNING]` 块**2025 Agentic RAG 三家鼎立**(o1 派 prompting / R1 派 RL / IL 派 MCTS+imitation),首次识别 2025 同年内范式分歧;[[wiki/concepts/rag_vs_long_context]] 加"融合方案"小节(3 条工程路径);[[wiki/concepts/retrieval_augmented_generation]] 加**第 5 条主线** "通用 vs domain-specific RAG"(RAFT + KAG)
- 2026-05-26: **Batch 2 完成**(8 篇,总进度 23/38)—— ingest Self-Reflective 演化前置 5 篇(Self-Ask / ReAct / IRCoT / Self-Refine / FLARE)+ Graph 扩展 3 篇(RAPTOR / HippoRAG 1 / KAG);Batch 2 无新冲突标注但**给现有 2 处冲突标注做了关键回流补充**:(a) RAPTOR 作 [[wiki/concepts/graph_rag]] vol.2 标注里"扩充 corpus 派"的具体 anchor;(b) HippoRAG 1 作"辅助 retrieval 派"的起源 anchor;(c) [[wiki/concepts/self_reflective_rag]] 加"演化前置历史"小节梳理 prompting→SFT→RL 三段演化论
- 2026-05-26: **Batch 1 完成**(7 篇)—— ingest [[wiki/sources/gao_rag_survey]] (第③档,含章节深度登记表)+ 6 篇 retrieval foundation(DPR/ColBERTv2/Contriever/E5/BGE/NV-Embed v2)+ 共享概念页 [[wiki/concepts/retrieval_foundations]];Batch 1 无新冲突标注,但 NV-Embed v2 为 graph RAG 内部之争 vol.2 提供具体 baseline anchor
- 2026-05-26: **Batch 0 完成**(8/8 ingest + 3 篇综合 analyses)——演化时间线 / 三派 Graph RAG 对照 / KB vs Gao survey 覆盖度;list-conflicts 扫到 5 处冲突标注
- 2026-05-26: ingest [[wiki/sources/r1_searcher]](#7)+ [[wiki/sources/search_r1]](#8,**末篇**);新建 [[wiki/concepts/rl_augmented_retrieval]] 共享概念页(两篇并发工作对照);**第 5 次冲突标注**——自决检索范式从 SFT(Self-RAG)翻到 RL outcome-based(R1 派);在 [[wiki/concepts/self_reflective_rag]] 注入第 2 个 `> [!WARNING]` 块
- 2026-05-26: ingest [[wiki/sources/hipporag2]](#6);**第 4 次冲突标注**——graph 派内部之争 vol.2(HippoRAG 2 反驳整个"扩充 corpus 派",包括 GraphRAG / LightRAG / RAPTOR);[[wiki/concepts/graph_rag]] 扩展为三派对照表,清晰区分"扩充 corpus" vs "辅助 retrieval" 两条根本路径
- 2026-05-26: ingest [[wiki/sources/lightrag]](#5);**第 3 次冲突标注**——在 [[wiki/concepts/graph_rag]] 注入 graph 派内部之争 vol.1(LightRAG 反驳 GraphRAG community detection)
- 2026-05-26: ingest [[wiki/sources/rag_or_longcontext]](#4);创建 [[wiki/concepts/rag_vs_long_context]];**第 2 次冲突标注**——在根概念页 [[wiki/concepts/retrieval_augmented_generation]] 注入 `> [!WARNING]` 块,记录 DeepMind 论证 LC > RAG 对整个赛道的挑战(GPT-4O +13.1%)
- 2026-05-26: ingest [[wiki/sources/graphrag]](#3);创建 [[wiki/concepts/graph_rag]];首次出现**正交改进维度**(改 corpus 表征 vs 改 query-time 控制流);更新 retrieval_augmented_generation 的演化方向章节
- 2026-05-26: ingest [[wiki/sources/crag]](#2),创建 [[wiki/concepts/corrective_rag]];**首次触发冲突标注**——在 [[wiki/concepts/self_reflective_rag]] 注入 `> [!WARNING]` 块
- 2026-05-26: ingest [[wiki/sources/self_rag]](#1,首篇),建立基础概念页 [[wiki/concepts/retrieval_augmented_generation]] / [[wiki/concepts/self_reflective_rag]] ^p-5-3b3814
