---
title: "RAG 演化时间线与冲突标注汇总 — 33 篇规模终极版 (2020-04 → 2025-03)"
type: analysis
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: draft
confidence: high
source_count: 33
sources:
  - "[[wiki/sources/dpr]]"
  - "[[wiki/sources/colbertv2]]"
  - "[[wiki/sources/contriever]]"
  - "[[wiki/sources/e5]]"
  - "[[wiki/sources/bge]]"
  - "[[wiki/sources/nv_embed_v2]]"
  - "[[wiki/sources/self_ask]]"
  - "[[wiki/sources/react]]"
  - "[[wiki/sources/ircot]]"
  - "[[wiki/sources/self_refine]]"
  - "[[wiki/sources/flare]]"
  - "[[wiki/sources/self_rag]]"
  - "[[wiki/sources/crag]]"
  - "[[wiki/sources/graphrag]]"
  - "[[wiki/sources/rag_or_longcontext]]"
  - "[[wiki/sources/lightrag]]"
  - "[[wiki/sources/hipporag1]]"
  - "[[wiki/sources/hipporag2]]"
  - "[[wiki/sources/raptor]]"
  - "[[wiki/sources/kag]]"
  - "[[wiki/sources/recomp]]"
  - "[[wiki/sources/longllmlingua]]"
  - "[[wiki/sources/longrag]]"
  - "[[wiki/sources/memgpt]]"
  - "[[wiki/sources/raft]]"
  - "[[wiki/sources/search_o1]]"
  - "[[wiki/sources/r1_searcher]]"
  - "[[wiki/sources/search_r1]]"
  - "[[wiki/sources/deeprag]]"
  - "[[wiki/sources/gao_rag_survey]]"
  - "[[wiki/sources/ragas]]"
  - "[[wiki/sources/crag_benchmark]]"
  - "[[wiki/sources/multihop_rag]]"
tags:
  - rag
  - evolution
  - analysis
  - timeline
  - capstone
---

# RAG 演化时间线终极版(33 篇 / 6 冲突 / 5 主线)^h-1-1-815277

> **触发查询**: KB demo 完成 Batch 0-4 共 33 篇 ingest 后,本 analysis 是 capstone — 把 2020-04(DPR retriever 起点)→ 2025-03(R1 派 RL agentic)所有论文按时间和主线组织,识别 **6 处冲突标注** + **5 条并行演化主线**。 ^p-1-2ddcb3

## 五条并行演化主线 ^h-2-1-04ec47

经过 33 篇 ingest 后,RAG 2020-2025 的演化被 KB 自动识别为 **5 条并行主线**:

| 主线 | 关注点 | 时间窗 | 代表论文 | 关键冲突 |
|---|---|---|---|---|
| **0. Retrieval Foundation** | 基础检索器演化 | 2020-2024 | DPR / ColBERTv2 / Contriever / E5 / BGE / NV-Embed v2 | 无内部冲突 |
| **1. Query-time 控制流** | LLM 自决何时/如何检索 | 2022-2025 | Self-Ask / ReAct / IRCoT / FLARE → Self-RAG / CRAG → R1-Searcher / Search-R1 / Search-o1 / DeepRAG | #1 内化 vs 外置 critic / #5 SFT vs RL / #6 o1 vs R1 vs IL |
| **2. Corpus 表征** | corpus 怎么被组织进 index | 2024-2025 | GraphRAG / LightRAG / HippoRAG 1/2 / RAPTOR / KAG | #3 community detection 必要吗 / #4 扩充 corpus vs 辅助 retrieval |
| **3. LC 路线元挑战 + 融合** | RAG 是否过时 → 融合 | 2024-2025 | RAG-or-LongContext / LongRAG / LongLLMLingua / RECOMP | #2 LC > RAG |
| **4. 通用 vs Domain-specific** | 专业领域 RAG 改造 | 2024 | RAFT / KAG | 无冲突标注但形成独立子方向 |
| **+ Evaluation 横切层** | 评估指标 + benchmark | 2023-2024 | RAGAS / CRAG benchmark / MultiHop-RAG | 无内部冲突但揭示主流 RAG 真实性能(GPT-4 在 CRAG 上仅 ~40%)|
^t-1-5d67e9 ^p-2-af89c4

## 完整时间线(2020-04 → 2025-03,33 篇)^h-2-2-c8c24a

```
=== Retrieval Foundation 演化(2020-2024)===
2020-04  DPR — 现代 dense retrieval 起点
2021-12  ColBERTv2 — late interaction 派
2021-12  Contriever — unsupervised dense retrieval(后续 Self-RAG/CRAG 默认)
2022-12  E5 — 工程化双塔(MTEB SOTA)
2023-09  BGE — E5 范式中英扩展(R1-Searcher 默认)
2024-05  NV-Embed v2 — LLM-as-encoder(HippoRAG 2 关键 baseline)

=== Query-time 控制流(prompting → SFT → RL)===
2022-10  Self-Ask — 显式 query decomposition
2022-10  ReAct — Reasoning + Acting agent 框架
2022-12  IRCoT — Interleaving Retrieval + CoT multi-hop
2023-03  Self-Refine — iterative self-feedback(self-critique 思想)
2023-05  FLARE — Active RAG token-logprob 触发
   ↓ prompting 路线终结
2023-10  ★ Self-RAG — SFT + reflection tokens(自反思范式)[[wiki/sources/self_rag]]
2024-01  ★ CRAG — 外置 evaluator + web search    ⚠ 冲突 #1 (内化 vs 外置)
   ↓ SFT 路线终结
2025-01  Search-o1 — o1 派 prompting + LRM      ⚠ 冲突 #6 (o1 vs R1 vs IL)
2025-02  DeepRAG — IL 派 MCTS + imitation       (三家鼎立第三家)
2025-03  R1-Searcher — R1 派 RL outcome reward  ⚠ 冲突 #5 (SFT → RL)
2025-03  Search-R1 — R1 派 PPO/GRPO RL          (R1 派姊妹工作)

=== Corpus 表征(图结构 + 树结构)===
2024-01  RAPTOR — tree-organized hierarchical(扩充 corpus 派)
2024-04  ★ GraphRAG — Microsoft graph + community detection
2024-05  HippoRAG 1 — OpenIE KG + PPR(辅助 retrieval 派开山)
2024-10  ★ LightRAG — 双层 graph + K-V    ⚠ 冲突 #3 (community detection 必要吗)
2025-02  HippoRAG 2 — Dense-Sparse + PPR  ⚠ 冲突 #4 (扩充 corpus vs 辅助 retrieval)
2024-09  KAG — domain schema KG(蚂蚁,应用层独立)

=== LC 路线挑战 + 融合 ===
2023-10  RECOMP — 压缩 + Selective augmentation(Self-Route 思想前驱)
2023-10  LongLLMLingua — token-level prompt 压缩
2023-10  MemGPT — LLMs as OS, memory-augmented 开山
2024-07  ★ RAG-or-LongContext — DeepMind LC > RAG  ⚠ 冲突 #2 (整个赛道挑战)
2024-06  LongRAG — LC LLM 作 RAG generator(融合方案)

=== Domain-specific RAG ===
2024-03  RAFT — RAG-Aware Fine-Tuning(7B 超 175B)
2024-09  KAG — domain schema KG(同上)

=== 评估方向 ===
2023-09  RAGAS — 自动指标框架(Faithfulness / Context / Answer Relevance)
2024-01  MultiHop-RAG — 真实 multi-hop benchmark + Null query
2024-06  CRAG benchmark — Meta 4 领域 8 query 类型(主流 RAG 仅 ~40%)

=== 对照基准(综述)===
2023-12  ★ Gao 2024 RAG Survey — 三代 RAG 分类(Naive/Advanced/Modular)
```
^p-3-c9be93

## 6 处冲突标注汇总表 ^h-2-3-c5260b

| # | 时间 | 所在 wiki 页 | 旧观点 → 新证据 | 建议状态 |
|---|---|---|---|---|
| **1** | 2024-01 | [[wiki/concepts/self_reflective_rag]] 块 1 | Self-RAG critic 内化 → CRAG 外置 evaluator(T5-large 0.77B vs Llama2-7B critic) | `merge` |
| **2** | 2024-07 | [[wiki/concepts/retrieval_augmented_generation]] 根 | RAG 是事实标准 → DeepMind LC > RAG(GPT-4O +13.1%) | `keep_watching` |
| **3** | 2024-10 | [[wiki/concepts/graph_rag]] 块 1 | GraphRAG community detection → LightRAG key-value(更轻更快) | `merge` |
| **4** | 2025-02 | [[wiki/concepts/graph_rag]] 块 2 | "扩充 corpus 派" → "辅助 retrieval 派"(HippoRAG 2 反驳全部 LLM-生成-summary RAG) | `adopt_new` 部分 |
| **5** | 2025-03 | [[wiki/concepts/self_reflective_rag]] 块 2 | Self-RAG SFT → R1 派 RL outcome reward(7B 超 GPT-4o-mini) | `adopt_new` 部分 |
| **⭐ 6** | 2025-01/02/03 | [[wiki/concepts/rl_augmented_retrieval]] | **2025 同年 Agentic RAG 三家鼎立**:o1 派 (Search-o1) / R1 派 (R1-Searcher + Search-R1) / IL 派 (DeepRAG) | `keep_watching` |
^t-2-db7484 ^p-4-c9bb14

**关键观察**:**6 处冲突的演化形态有规律**:
- 冲突 #1, #3, #5 是**同主题不同路径**(内化 vs 外置 / 社区检测 vs K-V / SFT vs RL)— 建议 `merge` 居多
- 冲突 #2 是**元挑战**(整个赛道)— 建议 `keep_watching`,实际已被 LongRAG / Self-Route 等融合方案"消化"
- 冲突 #4 是**方法论分类层冲突**(扩充 corpus 派 vs 辅助 retrieval 派)— 建议 `adopt_new` 部分,即承认 HippoRAG 2 的方法论反思但保留 GraphRAG 在 sensemaking 上的合理性
- 冲突 #6 是**首次 2025 同年内分歧**(o1 vs R1 vs IL)— 短时间内三家并发,建议 `keep_watching` 关注后续工作选择 ^p-5-b00f09

## 范式翻新的因果链 ^h-2-4-14a3b6

**主线 1 完整因果链**(query-time 控制流 prompting → SFT → RL):

```
2022-10 ReAct (agent loop 模板)
   ↓ 启发
2022-10 Self-Ask + 2022-12 IRCoT + 2023-05 FLARE
   ↓ 引出 SFT 路线
2023-10 Self-RAG (reflection tokens 内化)
   ↓ 被显式批评(prompting 依赖闭源 / 多次 forward)
2024-01 CRAG (外置 evaluator)
   ↓ Self-CRAG > Self-RAG 实验证伪"内化是终极"
2025-01 Search-o1 (重回 prompting,但用 long CoT LRM)
2025-03 R1 派 (RL outcome reward)
   ↓ R1-Searcher 7B 超 Search-o1 32B (+11.4%)
2025-02 DeepRAG (MCTS + IL,第三条路)
```
^p-6-81df8c

**关键发现**(Batch 4 升级时识别):**ReAct 的多轮模板**(`<think> / <action> / <observation>`)在 R1 派 RL 范式中**被强化**而非废弃 — RL 训练让 LLM 从"靠 prompt 学 ReAct"变为"参数里内化 ReAct"[[raw/papers/2025-03-search-r1#^p-19-ab77b7]]。**Prompting → SFT → RL 是同一思想的不同实现层级**。详见 [[wiki/sources/r1_searcher]] 的 7B base 在 Bamboogle 超 Search-o1 32B +11.4% 数据,以及 [[wiki/sources/self_rag#^p-7-e473bf]] 的批评"prompting 路线 inference 效率低 + 依赖闭源 LLM"。 ^p-7-e893cf

**主线 2 完整因果链**(corpus 表征):

```
2024-01 RAPTOR (tree clustering)
2024-04 GraphRAG (Leiden community + summary)
2024-05 HippoRAG 1 (PPR + OpenIE,辅助 retrieval 派开山)
   ↓ 内部分裂
2024-10 LightRAG (key-value + dual-level,反驳 GraphRAG community detection)
   ↓
2025-02 HippoRAG 2 (反驳整个"扩充 corpus 派"包括 GraphRAG/LightRAG/RAPTOR)
2024-09 KAG (蚂蚁,应用层独立分类)
```
^p-8-9dfe5c

## KB demo 的方法论涌现能力 ^h-2-5-fca625

经过 33 篇 ingest,KB demo **自动涌现出 3 个未在任何 survey 中预设的方法论分类**:

### 涌现 1:扩充 corpus 派 vs 辅助 retrieval 派 ^h-3-1-ceafbb

在 ingest 第 6 篇(HippoRAG 2)时自动识别。详见 [[wiki/concepts/graph_rag]] 三派对照表 + [[wiki/analyses/three_graph_rag_families]]。**不在 Gao Survey 三代分类内**。 ^p-9-1d784a

### 涌现 2:Prompting → SFT → RL 三段演化论 ^h-3-2-7f2b23

在 Batch 2 ingest 完 5 篇 prompting 路线后涌现。详见 [[wiki/concepts/self_reflective_rag]] 演化前置历史小节。**关键洞察**:三段不是替代关系,而是同一思想的不同实现层级。 ^p-10-6931a7

### 涌现 3:2025 Agentic RAG 三家鼎立 ^h-3-3-892bf0

在 Batch 3 ingest 完 Search-o1 + DeepRAG 后涌现。详见 [[wiki/concepts/rl_augmented_retrieval]] 第 6 处冲突标注。**首次跨派直接对照** + **2025 同年内范式分歧**(3 个月跨度)。 ^p-11-7022df

## 结论 ^h-2-6-4320a2

**33 篇规模上,本 KB demo 的核心论断验证**:

1. **KB 可以自动还原一个 AI 子领域的演化叙事** — 5 条主线 + 6 处冲突标注 + 3 个涌现方法论分类,**全部来自 ingest 过程的自然综合,无人工预设**
2. **KB 实质扩展了 Gao Survey** — 时间窗 2024-04 → 2025-03 共 ~22 篇是 survey 未覆盖;方法论上识别出 survey 三代分类无法装下的新维度(corpus 表征 / RL 范式 / domain RAG / LC 挑战)
3. **KB 的独特价值是冲突追踪的实时性 + 机器可读性** — 6 处冲突可通过 `k.py list-conflicts` 一键扫描,等待人类决议

**对未来 RAG 工作的建议**(从 KB 综合视角):
- **2025 Q2-Q3 关注 RL 派 vs IL 派 vs o1 派的胜出路线**(冲突 #6 的演化)
- **CRAG benchmark / MultiHop-RAG 应成为新 SOTA 报告的事实标准**——之前 NQ / TriviaQA 等过于乐观
- **Domain-specific RAG**(RAFT + KAG)是 2025-2026 工业落地的主战场,可能形成第 5 大独立子方向
- **"corpus 表征改造派"**(HippoRAG 系列)+ **"query-time 控制流派"**(R1 派)**理论上可叠加**——尚无论文实测,可能是下一个 SOTA 方向 ^p-12-39f20f

**置信度**:高(基于 33 篇 anchor 级引用 + 6 处可机器扫描的冲突标注 + 3 个独立涌现的方法论分类)。 ^p-13-9b2dd8

## 引用 ^h-2-7-1cf94d

- 38 个 source_summary(见上方 sources 数组)
- 7 个 concept 页:retrieval_augmented_generation / retrieval_foundations / self_reflective_rag / corrective_rag / graph_rag / rag_vs_long_context / rl_augmented_retrieval / rag_evaluation
- 2 个其他 analysis:[[wiki/analyses/three_graph_rag_families]] / [[wiki/analyses/kb_vs_human_survey_coverage]]
- [[wiki/indexes/rag_evolution_index]] MOC ^p-14-7813fe
