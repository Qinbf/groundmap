---
title: "HippoRAG 2: From RAG to Memory (OSU 2025-02)"
type: source_summary
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: draft
confidence: high
source_count: 1
sources:
  - "[[raw/papers/2025-02-hipporag2]]"
tags:
  - rag
  - graph-rag
  - hipporag
  - personalized-pagerank
  - 2025
  - ohio-state
---

# HippoRAG 2: From RAG to Memory ^h-1-1-4d0ae1

> **原始文件**: [[raw/papers/2025-02-hipporag2]]
> **作者**: Bernal Jiménez Gutiérrez, Yiheng Shu, Weijian Qi, Sizhe Zhou, Yu Su (Ohio State University NLP Group)
> **发表**: 2025-02 arXiv preprint(ICML 2025 投稿)
> **arXiv**: [2502.14802](https://arxiv.org/abs/2502.14802)
> **开源**: <https://github.com/OSU-NLP-Group/HippoRAG> ^p-1-748726

## 摘要 ^h-2-1-811e72

HippoRAG 2 是同时**反驳 GraphRAG / LightRAG / RAPTOR 的 graph 派第三家**——其论文核心论断是 §1 line 91:"all previous structure-augmented methods **underperform against the strongest embedding-based RAG** methods on all three benchmark types"[[raw/papers/2025-02-hipporag2#^p-15-499758]]。即:GraphRAG/LightRAG/RAPTOR 在 simple factual QA 上反而**比 strong embedding(NV-Embed-v2)差**,因为 LLM 生成的 summary/community 引入噪声。 ^p-2-a9dab5

HippoRAG 2 的**根本路径区别**(论文 §2.2 line 130): [KB 综合]
- GraphRAG / LightRAG / RAPTOR:用 KG 或 hierarchical summary **扩充 retrieval corpus**——LLM 生成内容成为 retrieval 池一部分
- HippoRAG (1/2):用 KG **辅助 retrieval 过程**——不扩充 corpus,只决定哪些原始 passage 被检索

HippoRAG 2 在 HippoRAG 1 的 **OpenIE + Personalized PageRank** 基础上加 3 个改进:**Dense-Sparse Integration**(passage nodes 加入 KG)+ **Deeper Contextualization**(query-to-triple 而非 NER-to-node)+ **Recognition Memory**(LLM 过滤 triples)。结果:**首个在 factual + associative + sense-making 三类任务都不输 strong embedding 的 graph RAG**,associative 上比 NV-Embed-v2 **+7%**[[raw/papers/2025-02-hipporag2#^p-17-17114a]]。 ^p-3-6066c2

## 关键发现 / 论点 ^h-2-2-93d2ce

1. **核心论断**:所有 LLM-generated-summary 类的 graph RAG(GraphRAG/LightRAG/RAPTOR)**在 simple QA 上不如 strong embedding**——这反驳了"graph 结构必然更优"的范式假设 [KB 综合]
2. **根本路径区别**:"用 KG 扩充 corpus"(LLM 生成内容入池) vs "用 KG 辅助 retrieval"(只决定从原始 passages 中检哪些)——HippoRAG 2 走后者[[raw/papers/2025-02-hipporag2#^p-26-f0d8a2]]
3. **HippoRAG 2 的 3 个改进**: [[raw/papers/2025-02-hipporag2]]
   - **Dense-Sparse Integration**:phrase nodes(sparse coding,概念)+ passage nodes(dense coding,上下文)同时入 KG,context edge "contains" 连接 [[raw/papers/2025-02-hipporag2]]
   - **Deeper Contextualization**:query-to-triple(用 embedding 匹配 query 到 KG triples),取代 HippoRAG 1 的 NER-to-node [[raw/papers/2025-02-hipporag2]]
   - **Recognition Memory**:LLM 过滤 retrieved triples,留下相关的作为 seed nodes [[raw/papers/2025-02-hipporag2]]
4. **关键实验设置**:同时评测 3 类任务(simple QA / multi-hop QA / discourse understanding),不再让 graph 派"只在自己擅长的任务上跑" [[raw/papers/2025-02-hipporag2]]
5. **结果**:HippoRAG 2 是**首个不输 strong embedding 的 graph RAG**;associative memory(多跳 QA)+7% vs NV-Embed-v2[[raw/papers/2025-02-hipporag2#^p-17-17114a]]
6. **神经科学类比**:KG = hippocampus,LLM = neocortex,encoder = parahippocampal regions——非纯比喻,启发了 PPR 的设计选择 [[raw/papers/2025-02-hipporag2]] ^p-5-f604fe

## 方法论 ^h-2-3-f27051

- **数据集**:7 个,覆盖 3 类——Simple QA(NQ + PopQA),Multi-hop QA(MuSiQue + 2Wiki + HotpotQA + LV-Eval),Discourse(NarrativeQA)[[raw/papers/2025-02-hipporag2]]
- **基线**:BM25 / Contriever / GTR / GTE-Qwen2-7B / GritLM-7B / **NV-Embed-v2**(主要 baseline)/ RAPTOR / **GraphRAG** / **LightRAG** / HippoRAG 1 [[raw/papers/2025-02-hipporag2]]
- **LLM**:Llama-3.3-70B(主) + GPT-4o-mini(对照),证明 method robust 到 LLM 选择 [KB 综合]
- **Encoder**:NV-Embed-v2 + 其他 retrievers ablation [[raw/papers/2025-02-hipporag2]] ^p-6-5b67d3

## 局限性 ^h-2-4-d25123

- **依赖 OpenIE 提 triples**——三元组质量决定 KG 上限 [[raw/papers/2025-02-hipporag2]]
- **Recognition Memory 阶段加 LLM 调用** → inference cost 不低 [[raw/papers/2025-02-hipporag2]]
- **PPR 计算图操作**——大 corpus 下需要 graph DB 工程实现 [[raw/papers/2025-02-hipporag2]]
- **数据集仍偏 wikipedia-based**(NQ/PopQA/HotpotQA),可能与 LLM pretraining 有重叠 [[raw/papers/2025-02-hipporag2]] ^p-7-21e091

## AI 综合判断 ^h-2-5-006953

### 核心价值 ^h-3-1-eb2f7a

HippoRAG 2 给 graph 派提供了**第一个真正可与 strong embedding 全面对比的方案**——之前的 graph 派工作(GraphRAG / LightRAG)都在自己定义的 benchmark 上自证优势,在 simple QA 上反而拉胯。HippoRAG 2 通过"KG 辅助 retrieval 而非扩充 corpus"的本质性架构差异,跨任务保持 robust。这个**架构哲学的区分**比具体技术(PPR / Dense-Sparse / Recognition Memory)更重要——它告诉后续 graph RAG 工作:**不要让 LLM 生成内容进入 retrieval 池**。 [KB 综合] ^p-8-2a5c9d

### 关联 ^h-3-2-f856d6

- 概念页 [[wiki/concepts/graph_rag]] — **graph 派内部之争 vol.2**;冲突标注已注入该页
- vs [[wiki/sources/graphrag]]:反驳"LLM 生成 community summary"路径
- vs [[wiki/sources/lightrag]]:反驳"KG + dual-level retrieval"路径(LightRAG 也属于"扩充 corpus"类)
- vs [[wiki/sources/rag_or_longcontext]]:HippoRAG 2 间接回应该挑战——non-parametric continual learning 是 LC 完全做不了的(LC 不能持续更新,而 graph 可以增量)
- MOC [[wiki/indexes/rag_evolution_index]] — 第 6 篇 ^p-9-a71a57

### 冲突 ^h-3-3-cabb88

**冲突注入到 [[wiki/concepts/graph_rag]] 的 vol.2 块**,论断:

- **旧观点(GraphRAG / LightRAG / RAPTOR)**:用 KG 或 hierarchical summary 扩充 retrieval corpus,让 LLM 生成的高质量摘要参与检索 [需要来源]
- **新证据(HippoRAG 2)**:这种"LLM 生成内容入池"必然引入 noise,在 simple QA 上**比 strong embedding 还差**——graph 派的方法应该是"用 KG 辅助 retrieval 流程",不应当让 LLM 内容污染 retrieval pool [[raw/papers/2025-02-hipporag2]]
- **LLM 判断**:这是 graph 派内部最有方法论价值的反思——之前的 graph RAG 工作普遍只在 sensemaking / multi-hop 上证明优势,回避 simple QA。HippoRAG 2 把"必须 3 类任务都不输 strong embedding"作为新的 bar,这是健康的演化方向。**预言**:graph 派未来工作要么走 HippoRAG 2 的"辅助"路径,要么承认"扩充 corpus 路径"只适合特定 task(sensemaking) [KB 综合] ^p-10-31e0be

## 与 Wiki 的关联 ^h-2-6-da27d5

- 影响页面:[[wiki/concepts/graph_rag]] 第 2 次冲突标注(graph 派 vol.2)
- MOC 归属:[[wiki/indexes/rag_evolution_index]] 第 6 篇 ^p-11-e59f30
