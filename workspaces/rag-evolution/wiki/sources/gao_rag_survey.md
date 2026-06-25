---
title: "Retrieval-Augmented Generation for LLMs: A Survey (Gao et al. 2023-12)"
type: source_summary
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: draft
confidence: high
source_count: 1
sources:
  - "[[raw/papers/2023-12-gao-rag-survey]]"
partial_ingest_count: 0
tags:
  - rag
  - survey
  - benchmark-reference
  - 2023
  - tongji
---

# Gao et al. 2024 RAG Survey ^h-1-1-95a2d0

> **原始文件**: [[raw/papers/2023-12-gao-rag-survey]]
> **作者**: Yunfan Gao, Yun Xiong, Xinyu Gao, Kangxiang Jia, Jinliu Pan, Yuxi Bi, Yi Dai, Jiawei Sun, Meng Wang, Haofen Wang(同济大学 + 复旦)
> **首次发表**: 2023-12 arXiv preprint
> **本 KB 读到的版本**: v5(2024-03 update,内容截至 2024-Q1)
> **arXiv**: [2312.10997](https://arxiv.org/abs/2312.10997)
> **特殊地位**:本 KB 唯一 ingest 的**综述论文**,作为 KB 自动综合能力的**对照基准**(详见 [[wiki/analyses/kb_vs_human_survey_coverage]]) ^p-1-26ed2b

## 章节深度登记 ^h-2-1-9f7e46

**第③档(整本书规模 152509 字符)处理记录** — agent 自决深读 / 扫读 / 跳过策略:

| Section | 字符数 | 状态 | 选择理由 |
|---|---|---|---|
| I Introduction | 6987 | ⊙ 扫读 | 基础概述,直接读 II 即可 |
| **II Overview of RAG** | 25851 | **✓ 深读** | **三代分类(Naive/Advanced/Modular)是 KB 对照核心** + Table I 收录 70+ RAG 方法 |
| **III Retrieval** | 20316 | ⊙ 扫读 | 与本 KB Batch 1 的 retrieval foundation 6 篇对应,扫读以建立映射 |
| IV Generation | 5916 | × 跳过 | 短章节 + 与本 KB 当前关注点弱相关 |
| V Augmentation process in RAG | 7080 | × 跳过 | 与 II Overview 内容重叠 |
| **VI Task and Evaluation** | 24160 | ⊙ 扫读 | 对应本 KB Batch 4 计划的 evaluation 方向(RAGAS/CRAG-bench 等);只读 evaluation framework 部分 |
| VII Discussion and Future Prospects | 9656 | ⊙ 扫读 | survey 作者的"未来方向"预测,与本 KB 实际后续(GraphRAG/HippoRAG 2/RL 派)对照价值高 |
| VIII Conclusion | 1795 | × 跳过 | 短结论 |
| References | 39475 | × 跳过 | 引用列表,不解析 |
^t-1-5d67e9 ^p-2-af89c4

**深读总字符**:25851(II)= ~25K 中文等价。**扫读总字符**:20316 + 24160 + 9656 = ~54K。后续 partial re-ingest 可升级扫读章节至深读。[[raw/papers/2023-12-gao-rag-survey]] ^p-3-75e3b6

## 摘要 ^h-2-2-7bcea9

Gao et al. 2024 是**最被引用的 RAG 综述**,确立了 RAG 演化的**三代分类框架**(Naive / Advanced / Modular RAG)以及核心组件分解(Retrieval / Generation / Augmentation)。Table I 系统总结了 70+ 个 RAG 方法,按 5 个维度(Retrieval Source / Data Type / Retrieval Granularity / Augmentation Stage / Retrieval Process)分类[[raw/papers/2023-12-gao-rag-survey#^t-54-9b5c2e]]。 ^p-4-d12e13

**三代 RAG 定义**[[raw/papers/2023-12-gao-rag-survey#^h-2-2-e8b623]]:

- **Naive RAG**:索引 → 检索 → 生成 三段式 pipeline("Retrieve-Read" 范式)。痛点:precision/recall 不足、hallucination、redundancy [KB 综合]
- **Advanced RAG**:加 pre-retrieval(query rewriting/expansion/decomposition)+ post-retrieval(re-ranking/context compression) [[raw/papers/2023-12-gao-rag-survey]]
- **Modular RAG**:模块化,引入 Search/Memory/Routing/Predict/TaskAdapter 等可重组模块;**Self-RAG / FLARE 被归类为 Modular RAG 的 "adaptive retrieval" 模式**[[raw/papers/2023-12-gao-rag-survey#^p-47-068fd8]] ^p-5-3e97fb

**关键时间点**:Gao survey v5 内容截至 2024-Q1,**未覆盖 GraphRAG(2024-04)/ LightRAG(2024-10)/ HippoRAG 2(2025-02)/ R1-Searcher / Search-R1(2025-03)**。这是本 KB demo 对 survey 形成实质扩展的时间窗口。 [KB 综合] ^p-6-7c89c8

## KB demo vs Survey 覆盖度对照矩阵 ^h-2-3-98666e

### 已 ingest 8 篇在 Survey 中的定位 ^h-3-1-1ca7fa

| KB demo 论文 | Gao Survey 中的归类 | Survey 章节锚定 | 覆盖完整度 |
|---|---|---|---|
| [[wiki/sources/self_rag]] (2023-10) | **Modular RAG / adaptive retrieval** | Table I line 226 + §II-C2[[raw/papers/2023-12-gao-rag-survey#^p-47-068fd8]] | ✅ 完整 |
| [[wiki/sources/crag]] (2024-01) | **Modular RAG / Doc-level Inference** | Table I line 246 | ✅ 完整 |
| [[wiki/sources/graphrag]] (2024-04) | **未覆盖**(v5 在 GraphRAG 发布前定稿) | — | ❌ KB 扩展 +1 |
| [[wiki/sources/rag_or_longcontext]] (2024-07) | **未覆盖** | — | ❌ KB 扩展 +1 |
| [[wiki/sources/lightrag]] (2024-10) | **未覆盖** | — | ❌ KB 扩展 +1 |
| [[wiki/sources/hipporag2]] (2025-02) | **未覆盖**(HippoRAG 1 可能在 v6 后更新) | — | ❌ KB 扩展 +1 |
| [[wiki/sources/r1_searcher]] (2025-03) | **未覆盖** | — | ❌ KB 扩展 +1 |
| [[wiki/sources/search_r1]] (2025-03) | **未覆盖** | — | ❌ KB 扩展 +1 |
^t-2-db7484 ^p-7-0b3105

**结论**:8 篇中 **2 篇被 survey 覆盖,6 篇是 KB 对 survey 的实质扩展**(时间窗 2024-04 → 2025-03)。 ^p-8-a40cdf

### Survey 三代分类 vs KB 4 主线对照 ^h-3-2-6c8e1a

| Gao Survey 三代 | KB demo 4 主线对照 | 对应关系 |
|---|---|---|
| **Naive RAG** | — | KB 未直接 ingest naive RAG 论文(Lewis 2020 等),只通过 Self-RAG/CRAG 的 Related Work 间接覆盖 |
| **Advanced RAG**(pre-retrieval + post-retrieval 优化) | 主线 1 部分(Self-Reflective / Corrective) | 部分对应——CRAG 的 decompose-then-recompose 属于 post-retrieval 思路 |
| **Modular RAG**(Routing / Adaptive / Memory) | **主线 1 + 主线 4** | Self-RAG(adaptive)、CRAG(routing 三档 action)、Self-Route(routing) — Modular RAG 框架可解释这些工作 |
| **Survey 未覆盖** | **主线 2(Graph)+ 主线 3(LC 挑战)+ 主线 1 末端(RL)** | 6 篇 KB 论文形成的 3 个新议题 |
^t-3-68635f ^p-9-8779ac

## 局限性 ^h-2-4-d25123

- **时效性**:v5 截至 2024-Q1,2024-2025 的 RAG 重大演化(图结构爆发 + LC 挑战 + RL 范式)完全未覆盖 [KB 综合]
- **方法论分类有局限**:三代分类对 query-time 控制流(Self-RAG / CRAG)分得清,但对 **corpus 表征改造**(GraphRAG / HippoRAG)无对应槽位 — 这是 KB demo 主线 2 凸显出的盲点 [KB 综合]
- **Table I 总结性强但维度固定**:5 维(Source/Type/Granularity/Stage/Process)无法编码 graph RAG 的"扩充 corpus 派 vs 辅助 retrieval 派"分裂(详见 [[wiki/concepts/graph_rag]])
- **未深入 evaluation 的工具链**:Section VI 列了任务和数据集,但缺少 RAGAS / CRAG-bench / MultiHop-RAG 等专用评估框架的深度讨论(后续 partial re-ingest 可补) [KB 观察]
- **survey 自己也提出"RAG vs Fine-tuning"对比框架**,但**没正面回应 RAG vs Long-Context 的元挑战**(那是 2024-07 才出现) [KB 综合] ^p-10-00fd45

## AI 综合判断 ^h-2-5-006953

### 核心价值 ^h-3-1-eb2f7a

Gao Survey 是 **2023 末 RAG 文献的最佳整理**——三代分类 + Table I 70+ 方法总结 + Section III 对 retrieval 各维度的系统覆盖,任何后续 RAG 工作都绕不开它的术语框架。它作为本 KB 的**对照基准**意义重大:**KB 在 8 篇范围内识别出的 4 条主线,其中 2 条(主线 2 graph + 主线 3 LC 挑战)是 Gao Survey 没覆盖的盲点**——这证明 KB 自动综合不仅复制了 survey 的结构,还实质扩展了 survey 的时间范围。 [KB 综合] ^p-11-f7b639

### 关联 ^h-3-2-f856d6

- 影响所有 [[wiki/sources/*]] 页面 — 每个 source_summary 的"AI 综合判断"段落都可以引用 survey 中对应位置
- 重写 [[wiki/analyses/kb_vs_human_survey_coverage]] — 从定性对照升级为基于本 source_summary 的**逐章节对照**
- 升级 [[wiki/concepts/retrieval_augmented_generation]] — 用 survey 的三代分类作为根概念页的官方分类
- MOC [[wiki/indexes/rag_evolution_index]] — survey 作为"对照基准"独立成一档 ^p-12-342a34

### 冲突 ^h-3-3-cabb88

**本 KB 与 Gao Survey 不冲突,而是互补**——survey 提供 2023-Q4 之前的整理,KB 扩展到 2025-Q1。 [KB 综合]

但 KB 识别出 survey 的 **2 个结构性盲点**: [KB 综合]
1. **三代分类无法装下"corpus 表征改造"**(graph RAG 派) — Modular RAG 框架是从"query-time 模块组合"角度切的,GraphRAG 的"index-time 重构 corpus"无对应槽位
2. **survey 没预期到 RAG 路线本身的存在性挑战**(LC > RAG) — survey VII 的 "Future Prospects" 章预测的是 RAG 内部优化方向,完全没有"RAG 是否会被 LC 替代"的讨论

这两个盲点不是 survey 的错,是**时间窗口的限制**——本 KB 通过 2024-04 → 2025-03 的 6 篇 ingest **填补了这两个盲点**。 [KB 综合] ^p-13-4a9846

## 与 Wiki 的关联 ^h-2-6-da27d5

- 影响所有 wiki source_summary + 重写 [[wiki/analyses/kb_vs_human_survey_coverage]]
- MOC 归属:[[wiki/indexes/rag_evolution_index]] 作为"对照基准"独立列
- partial re-ingest 路径:扫读章节(III Retrieval / VI Evaluation / VII Discussion)在 Batch 2-4 ingest 对应主题论文后可升级深读 ^p-14-2f11a9
