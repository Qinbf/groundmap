---
title: "Graph RAG (图结构 RAG)"
type: concept
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: draft
confidence: high
source_count: 6
sources:
  - "[[wiki/sources/graphrag]]"
  - "[[wiki/sources/lightrag]]"
  - "[[wiki/sources/hipporag2]]"
  - "[[wiki/sources/hipporag1]]"
  - "[[wiki/sources/raptor]]"
  - "[[wiki/sources/kag]]"
tags:
  - rag
  - graph-rag
  - knowledge-graph
  - community-detection
  - has-conflict
---

# Graph RAG (图结构 RAG) ^h-1-1-fb7d73

> 把 corpus 转成 **knowledge graph**(实体 + 关系)作为索引,用 **community detection** + **hierarchical summarization** 做 query 时的全局意义构建。原始定义见 Microsoft Research GraphRAG (2024-04)[[wiki/sources/graphrag]]。本概念页将在 LightRAG / HippoRAG 2 ingest 后扩展为"图结构 RAG 三大流派"对照页。 ^p-1-1a9693

## 核心 vs vector RAG 的差异 ^h-2-1-997cb7

| 维度 | vector RAG | Graph RAG |
|---|---|---|
| 索引 | 扁平 chunk pool + embedding | knowledge graph + community summaries |
| 检索 | 向量相似度 top-K | 社区匹配 + 全局摘要 |
| 适合的问题 | 局部事实问答("X 是什么时候发生的") | **全局 sensemaking**("主要主题/趋势是什么") |
| Index time 成本 | 低(embedding) | 高(LLM 提 entity + 生成所有社区摘要) |
| Query time 成本 | 低(向量检索) | 中(map-reduce 已生成摘要) |
^t-1-5d67e9 ^p-2-af89c4

## GraphRAG 索引流程 ^h-2-2-b7edfa

1. **Source Documents → Text Chunks**:常规切片
2. **Text Chunks → Entities & Relationships & Claims**:LLM in-context learning 提取
3. **构图**:实例聚合 → nodes (entities) + edges (relationships, 含权重) + covariates (claims)
4. **Leiden 社区检测**:递归 hierarchical,leaf → root
5. **Community Summaries**:LLM 给每个社区生成"报告型"摘要,low-level 摘要被 high-level 摘要递归 incorporate

详见 [[raw/papers/2024-04-graphrag#^h-2-3-c08b6a]]。 ^p-3-2e58b6

## GraphRAG Query 流程 ^h-2-3-55fa8c

**Map-Reduce 模式**:
- **Map**:每个相关 community summary 独立产生 partial answer
- **Reduce**:合并所有 partial answers,LLM 生成 global answer

Query time **不需要重 LLM 推理 entity 提取**——所有重活在 index time 已完成。 ^p-4-c3d701

## 与其他 RAG 范式的关系 ^h-2-4-d681cd

- vs [[wiki/concepts/retrieval_augmented_generation]] (vanilla):**根本性的范式切换**——从扁平到图结构
- vs [[wiki/concepts/self_reflective_rag]]:**正交**——Self-RAG 改 generator 控制,GraphRAG 改 corpus 表征,理论可叠加
- vs [[wiki/concepts/corrective_rag]]:**正交**——CRAG 加 evaluator,GraphRAG 改 index,理论可叠加
- vs **LightRAG**(待 ingest, 2024-10):**同派内部之争**——LightRAG 双层 graph 范式声称比 GraphRAG 更快更准
- vs **HippoRAG 2**(待 ingest, 2025-02):**同派第三家**——基于 Personalized PageRank + 类海马体记忆 ^p-5-c9aa0a

## 经验结果摘要 ^h-2-5-bb0354

- GraphRAG **强烈优于 vector RAG** 在 comprehensiveness + diversity 两个指标上(GPT-4 evaluator, 1M token corpus, podcast + news 两个数据集)[[wiki/sources/graphrag]]
- *后续 ingest LightRAG / HippoRAG 2 后,本节会扩展为三方对照* ^p-6-9f602b

> [!WARNING] 知识更新冲突 — 2026-05-26(Graph 派内部之争 vol.1)
> **旧观点(GraphRAG, Microsoft Research 2024-04)**:Knowledge Graph + Leiden hierarchical community detection + 预生成 community summaries + map-reduce query 是 graph-RAG 的正确架构;index time 重投入换 query time 高效。
>
> **新证据([[wiki/sources/lightrag]], HKU 2024-10)**:
> - (a) **Community detection 是不必要的复杂度**——LightRAG 论文 §3.4 直接说"markedly reduces retrieval overhead compared to the community-based traversal method used in GraphRAG"
> - (b) 用 **key-value pair**(K=entity/relation 名称, V=text 段落)+ **dual-level retrieval**(low-level entity 精确 vs high-level abstract)+ vector keyword matching,可以拿到大部分 graph 收益,**而不需要社区摘要 + traversal**
> - (c) **Incremental update**:LightRAG 增量加 graph 不重建索引,GraphRAG 数据一变就得重跑全部 community detection + summary
>
> **LLM 判断**:LightRAG 的实验数字声明需谨慎(评估都用 LLM-as-judge,数据集不同不能直接对比;UltraDomain ≠ GraphRAG 原 Podcast/News)。但**两个工程论断是真实的**:(1) community detection 确实增加复杂度;(2) GraphRAG 不支持增量更新是真实痛点。预言:graph 派的真正分歧将是**"针对什么 query 类型"**——sensemaking 仍可能 community summary 胜,knowledge graph QA 可能 key-value 胜。
>
> **状态**: 👁 持续观察(keep_watching) — `merge` —— 两种架构对应不同 use case,而非互相替代;详见后续 HippoRAG 2 ingest 进一步演化 ^p-8-1775c9

> [!WARNING] 知识更新冲突 — 2026-05-26(Graph 派内部之争 vol.2)
> **旧观点(GraphRAG + LightRAG + RAPTOR 共同, 2024)**:Graph-RAG 的核心是"用 KG 或层次结构 + LLM 生成的 summary"**扩充 retrieval corpus**,让模型在更丰富的 context 池上检索。
>
> **新证据([[wiki/sources/hipporag2]], OSU 2025-02)**:
> - (a) **所有 LLM-生成-summary 类 graph RAG 在 simple factual QA 上不如 strong embedding**(GraphRAG/LightRAG/RAPTOR vs NV-Embed-v2),因为 LLM 生成内容引入 noise 污染 retrieval pool
> - (b) **正确的 graph RAG 范式是"用 KG 辅助 retrieval 流程"**(HippoRAG 1/2 路径)——KG 只决定哪些原始 passages 被检索,不让 LLM 生成内容进入 retrieval 池
> - (c) HippoRAG 2 用 OpenIE + Personalized PageRank + Dense-Sparse Integration + Recognition Memory,首次在 factual + multi-hop + sense-making **三类任务都不输 strong embedding**,associative 上 +7% vs NV-Embed-v2
>
> **LLM 判断**:这是 graph 派最有方法论价值的反思。之前的 graph RAG 论文(包括 GraphRAG/LightRAG)通常只在自己擅长的 sensemaking benchmark 上自证优势,**回避 simple QA**。HippoRAG 2 把"3 类任务都不输 strong embedding"作为新 bar——这是健康的演化方向。**graph 派的真正分歧**已经清晰:扩充 corpus 派(GraphRAG/LightRAG/RAPTOR)只适合 sensemaking;辅助 retrieval 派(HippoRAG 系列)在 factual + multi-hop 上更稳。
>
> **状态**: 👁 持续观察(keep_watching) — `adopt_new` 的部分性版本 —— 接受 HippoRAG 2 的方法论反思即"扩充 corpus 路径只适合 sensemaking",但保留 GraphRAG 在 sensemaking 场景下的合理性 ^p-10-e059f6

## 三派 Graph RAG 对照(Batch 2 升级版,加 6 个具体代表)^h-2-7-0d8319

经过 Batch 0 GraphRAG / LightRAG / HippoRAG 2 + Batch 2 HippoRAG 1 / RAPTOR / KAG 共 6 篇 ingest 后,graph RAG 范式可分两大方法论 + 一个应用层独立分类:

| 范式 | 代表 | KG 作用 | LLM 生成内容是否入 retrieval pool | 强在什么任务 | 弱在什么任务 |
|---|---|---|---|---|---|
| **扩充 corpus 派** | [[wiki/sources/graphrag]] / [[wiki/sources/lightrag]] / **[[wiki/sources/raptor]]** | 让 LLM 生成 summary/community/tree-node,作为可被检索的内容 | ✓(LLM 生成的摘要进 retrieval pool) | global sensemaking,long-form QA | simple QA(LLM 生成 noise > signal) |
| **辅助 retrieval 派** | **[[wiki/sources/hipporag1]]**(开山) / [[wiki/sources/hipporag2]](改进) | KG 只决定哪些**原始 passages** 被检索;PPR 在 KG 上随机游走 | ✗(KG 是路由器,不是 corpus) | factual QA + multi-hop + sensemaking 都不输 | KG 提取质量(OpenIE)是上限 |
| **应用层(独立)** | [[wiki/sources/kag]] | 用 **domain-specific schema KG**(医疗/法律/金融本体)而非 schemaless OpenIE | 部分(reasoning planner 生成结构化中间状态) | 专业领域事实严格性 | 通用 open-domain 任务 |
^t-2-db7484 ^p-11-cae110

详见 [[wiki/sources/hipporag2]] 的 §2.2(扩充 corpus vs 辅助 retrieval 的最清晰论述)+ [[wiki/sources/raptor]] 提供"扩充 corpus 派"的具体 anchor(用 GMM 聚类 + 递归 LLM 摘要;HippoRAG 2 §2.2 line 127 显式批评 RAPTOR 引入 noise)。 ^p-12-229831

**关键观察**:Batch 2 ingest 后,**[[wiki/concepts/graph_rag]] vol.2 冲突标注的"扩充 corpus 派"指代从抽象类别变为 3 个具体代表**(GraphRAG / LightRAG / RAPTOR),"辅助 retrieval 派"是 HippoRAG 系列 1/2 完整谱系。**KAG 是 graph RAG 在专业领域的应用层框架**,正交于两大方法论分裂。 ^p-13-a94a12

## 关联页面 ^h-2-6-1244d4

- [[wiki/sources/graphrag]] — GraphRAG 原论文
- [[wiki/sources/lightrag]] — LightRAG 原论文(挑战 GraphRAG)
- [[wiki/sources/hipporag2]] — HippoRAG 2 原论文(graph 派内部第 2 次反思)
- [[wiki/concepts/retrieval_augmented_generation]] — 上位概念
- [[wiki/indexes/rag_evolution_index]] — MOC ^p-13-9026a8
