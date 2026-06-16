---
title: "MultiHop-RAG: Benchmarking RAG for Multi-Hop (Tang & Yang 2024-01)"
type: source_summary
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: reviewed
confidence: high
source_count: 1
sources:
  - "[[raw/papers/2024-01-multihop-rag]]"
tags:
  - rag
  - benchmark
  - multi-hop
  - 2024
---

# MultiHop-RAG: Benchmarking RAG for Multi-Hop Queries ^h-1-1-a63f48

> **原始文件**: [[raw/papers/2024-01-multihop-rag]]
> **作者**: Yixuan Tang, Yi Yang(HKUST)
> **发表**: 2024-01 arXiv preprint
> **arXiv**: [2401.15391](https://arxiv.org/abs/2401.15391)
> **特殊地位**:**专门 multi-hop QA 的 RAG benchmark**;Gao Survey §VI 章节引用为 multi-hop 评估代表 ^p-1-d9053b

## 摘要 ^h-2-1-811e72

MultiHop-RAG 是**首个专门为 multi-hop RAG 设计的 benchmark**。基于真实 news 数据,提供 **2556 个 multi-hop queries**,分 4 类: [KB 综合]
- **Inference**:需要在多个段落间推断(类 HotpotQA)
- **Comparison**:对比多个实体的属性
- **Temporal**:跨时间事件序列
- **Null**:故意构造"corpus 中无答案"的 query,测试 RAG 拒答能力

实验显示主流 RAG(包括 GPT-4 + dense retriever)在 MultiHop-RAG 上**显著低于 HotpotQA** — 真实多跳推理 vs 半合成多跳推理差异很大[[raw/papers/2024-01-multihop-rag]]。 ^p-2-c1da84

## 关键发现 / 论点 ^h-2-2-93d2ce

1. **Null query 是关键设计**:测试 RAG 是否会"硬答"(应回 "I don't know") [[raw/papers/2024-01-multihop-rag]]
2. **真实 news 数据 > 半合成数据**:HotpotQA / 2WikiMultiHopQA 是从 Wikipedia 半合成的,real-world news 更难 [[raw/papers/2024-01-multihop-rag]]
3. **4 类 query 暴露不同短板**:retriever 弱在 Comparison(多实体匹配)+ Temporal(时间推理) [[raw/papers/2024-01-multihop-rag]]
4. **本 KB 关联工作**:[[wiki/sources/hipporag2]] / [[wiki/sources/r1_searcher]] / [[wiki/sources/search_r1]] / [[wiki/sources/deeprag]] 都在 multi-hop 上做改进,但**未在 MultiHop-RAG benchmark 上跑**(发布时间相近)— 后续工作应该补 ^p-3-d4d5ee

## AI 综合判断 ^h-2-3-3d5f17

### 核心价值 ^h-3-1-eb2f7a

MultiHop-RAG 与 CRAG benchmark 共同构成 **2024 RAG 评估的新标准** — 之前的 HotpotQA / 2Wiki 等被认为 saturated(easy)。MultiHop-RAG 的 Null query 设计**与 Self-RAG IsRel + CRAG Corrective 三档 action 思想同源**——都是"RAG 应该会拒答而非硬答"。 [KB 综合] ^p-4-53c500

### 关联 ^h-3-2-f856d6

- [[wiki/sources/crag_benchmark]] — 同期 RAG benchmark,但 MultiHop-RAG 更专一(只测 multi-hop)
- [[wiki/sources/ragas]] — RAGAS 是指标框架,MultiHop-RAG 是数据集
- [[wiki/sources/hipporag2]] / [[wiki/sources/r1_searcher]] / [[wiki/sources/search_r1]] / [[wiki/sources/deeprag]] — multi-hop RAG 工作的应跑 benchmark ^p-5-8b8ed8

### 冲突 ^h-3-3-cabb88

**不触发新冲突标注**。 [KB 综合] ^p-6-4c483a

## 与 Wiki 的关联 ^h-2-4-5a2e99

- MOC:[[wiki/indexes/rag_evolution_index]] Batch 4 ^p-7-71c33a
