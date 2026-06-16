---
title: "Retrieval-Augmented Generation (RAG)"
type: concept
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: draft
confidence: high
source_count: 6
sources:
  - "[[wiki/sources/self_rag]]"
  - "[[wiki/sources/crag]]"
  - "[[wiki/sources/graphrag]]"
  - "[[wiki/sources/rag_or_longcontext]]"
  - "[[wiki/sources/raft]]"
  - "[[wiki/sources/kag]]"
tags:
  - rag
  - core-concept
  - has-conflict
  - to-be-updated
---

# Retrieval-Augmented Generation (RAG) ^h-1-1-9feca5

> **占位说明**:本页是基础 RAG 概念的根定义页,目前仅基于 [[wiki/sources/self_rag]] 中对 RAG 的引述建立 stub,后续 ingest CRAG / GraphRAG / LightRAG / HippoRAG 2 / RAG-vs-Long-Context 时**必须回流更新**本页(标 `to-be-updated`)。 ^p-1-b171a5

## 定义 ^h-2-1-307d15

**Retrieval-Augmented Generation (RAG)** 是给 LM 的输入 prompt 前面附加"从外部知识库检索到的相关文段"的范式,目的是缓解 LM 的参数化知识陈旧、虚构(hallucination)、缺少 citation 的问题。最早系统性定义来自 Lewis et al. (2020)[[wiki/sources/self_rag#^p-11-991291]]。 ^p-2-ebb839

## 基本组件 ^h-2-2-ff0a40

- **Retriever** ℛ:把 query 编码成向量,从大规模文档库(corpus)取 top-K 段落;典型用 Contriever / DPR / BM25 等
- **Generator** ℳ:把 query + 检索到的 passages 拼起来作为 LM 输入,生成回答
- **Reader / Re-ranker**(可选):对 retrieved passages 重排或抽取 ^p-3-65ee0e

## vanilla RAG 的核心缺陷 ^h-2-3-a22114

根据 [[wiki/sources/self_rag]] 的归纳,标准 RAG 有两大缺陷:

1. **不分场合一律检索固定数量**:即使 query 不需要外部知识(如常识问答 / 创意写作),也会检索 top-K,引入噪声并浪费计算
2. **生成不保证 grounded**:LM 拿到 passages 后没机制强制它用这些 passages 生成,导致 citation 错位或事实虚构[[wiki/sources/self_rag#^p-11-991291]] ^p-4-f9f601

## 演化方向 ^h-2-4-fc9893

2023-2025 RAG 领域围绕缓解上述缺陷形成了几条主线:

- **自反思路线**(Self-RAG, 2023-10):训模型自决何时检索 + 评估生成质量 → [[wiki/concepts/self_reflective_rag]]
- **自纠错路线**(CRAG, 2024-01):用 evaluator + web search 修正低质检索 → [[wiki/concepts/corrective_rag]]
- **图结构路线**(GraphRAG 2024-04 / LightRAG / HippoRAG 2):构建知识图而非扁平 chunk pool;改 corpus 表征本身 → [[wiki/concepts/graph_rag]]
- **RL 训练路线**(Search-R1 / R1-Searcher,2025-03):用 RL 奖励"检索-推理"链路(待 ingest)
- **路线挑战**(RAG-vs-Long-Context, 2024-07):long-context 模型是否让 RAG 过时?(待 ingest)

**关键观察**:自反思 / 自纠错 / 图结构这 3 条路线**改进维度正交**——前两个改 query-time 控制流,后者改 index-time 数据表征。可同时叠加。RL 路线和 long-context 路线则是**更根本的方法论挑战**。 ^p-5-df556c

## 通用 RAG vs Domain-specific RAG(Batch 3 新增维度)^h-2-6-ee12e3

Batch 3 ingest [[wiki/sources/raft]] + Batch 2 ingest [[wiki/sources/kag]] 后,KB 识别出 RAG 演化的**第 5 条主线**——**通用 RAG 在专业领域不足以胜任**:

| 路径 | 代表 | 主张 |
|---|---|---|
| **通用 prompt + RAG** | 主流(Self-RAG / CRAG 等)| 强 base LLM + prompt 引导 + 通用 retriever 即可 |
| **Domain Fine-tune** | [[wiki/sources/raft]] (2024-03) | fine-tune 时混入 distractor passages,模型学会 domain noise filtering;7B 训后超过 175B 通用 |
| **Domain Schema KG** | [[wiki/sources/kag]] (2024-09,蚂蚁) | 不动 generator,重构 KG schema(医学/法律/金融本体)+ reasoning planner |
^t-1-5d67e9 ^p-6-81df8c

**共同论断**:专业领域(医疗 / 法律 / 金融)对事实严格性的要求,通用 RAG 不能满足。但 RAFT 和 KAG 解决方法相反——一个改 generator(fine-tune),一个改 KG(schema)。**预言**:domain-specific RAG 将成为独立子方向,工业界落地的主战场。 ^p-7-92b9d0

> [!WARNING] 知识更新冲突 — 2026-05-26
> **旧观点(Self-RAG/CRAG/GraphRAG 共同隐含, 2023-2024 前半)**:RAG 是 LLM 处理大 corpus 的事实标准;各种 RAG 改进路线(自反思 / 自纠错 / 图结构)都在显著提升准确率,值得继续投入。
>
> **新证据([[wiki/sources/rag_or_longcontext]], Google DeepMind 2024-07)**:
> - (a) **LC consistently outperforms RAG**:Gemini-1.5-Pro +7.6%、**GPT-4O +13.1%**、GPT-3.5 +3.6%(在 LongBench/∞Bench 9 个数据集上)
> - (b) 当 model context 够大(GPT-4O 128K / Gemini 1M),RAG 不再是"准确率方案",变成"成本方案" + "corpus 超 context 的 specific use case"
> - (c) **63% 的 query 上 RAG 和 LC 答案完全一致**——意味着 RAG 改进的边际收益主要在那不到 40% 的硬 query 上,而这些恰好是 multi-hop / 隐式查询(LC 反而擅长)
> - (d) **Self-Route hybrid** 是更合理的工程方向:RAG 解决便宜的 query,LC 解决贵的 query(实测 cost 减 65% Gemini / 39% GPT-4O)
>
> **LLM 判断**:这不是 RAG 死亡宣告,而是**重新定位**。Self-RAG/CRAG/GraphRAG 的具体技术(reflection tokens / 三档 action / community summary)在 LC 时代仍有价值,但**应用场景缩窄到成本敏感与 corpus 溢出**。后续 RAG 改进的合理方向是 **与 LC 互补的 routing/hybrid 系统**,而非追求"在 GPT-3.5 small 上替代 GPT-4O 长上下文"。
>
> **状态**: 👁 持续观察(keep_watching) — `keep_watching`——LC 模型继续进化时趋势可能变化;1-2 年后回看本论断是否仍成立 ^p-6-f88229

## 关联页面 ^h-2-5-825748

- [[wiki/concepts/self_reflective_rag]] — 自反思 RAG 范式
- [[wiki/concepts/corrective_rag]] — 自纠错 RAG 范式
- [[wiki/concepts/graph_rag]] — 图结构 RAG 范式
- [[wiki/concepts/rag_vs_long_context]] — **RAG vs LC 路线之争**(本页冲突标注的延伸讨论)
- [[wiki/indexes/rag_evolution_index]] — RAG 演化史 MOC ^p-7-36402b
