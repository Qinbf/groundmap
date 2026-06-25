---
title: "ZeroSearch: Incentivize Search without Searching (Alibaba 2025-05)"
type: source_summary
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: draft
confidence: high
source_count: 1
sources:
  - "[[raw/papers/2025-05-zerosearch]]"
tags:
  - rag
  - rl
  - r1-style
  - llm-simulation
  - 2025
  - alibaba
---

# ZeroSearch: Incentivize Search Capability without Searching ^h-1-1-859d9d

> **原始文件**: [[raw/papers/2025-05-zerosearch]]
> **作者**: Hao Sun, Zile Qiao, Jiayan Guo et al.(阿里巴巴 Tongyi Lab)
> **发表**: 2025-05 arXiv preprint
> **arXiv**: [2505.04588](https://arxiv.org/abs/2505.04588)
> **特殊地位**:**2025-05 RL agentic RAG 范式翻新** — 同时挑战 R1-Searcher / Search-R1(本地 corpus 训练)与 DeepResearcher / WebThinker(真实 Google API 训练)两条路线,提出"**用 LLM 模拟 search engine**"第三条路 ^p-1-8f9323

## 摘要 ^h-2-1-811e72

ZeroSearch 提出 **"训练 LLM 学搜索,完全不需要真实 search engine"** 这一颠覆性范式。核心机制:**用一个 LLM 模拟 search engine**,通过轻量 SFT 让模拟 LLM 学会生成"useful"与"noisy"两种文档(prompt 控制),policy model 通过 RL 在模拟环境中学会调用 search[[raw/papers/2025-05-zerosearch#^p-21-63b772]]。 ^p-2-f57db1

**关键创新**:**Curriculum rollout 机制** — 训练初期模拟 LLM 生成高质量文档让 policy 学基本格式,后期逐步降级到 noisy 文档让 policy 适应复杂场景。这种"由易到难"的 curriculum 在静态 corpus 训练里**做不到**,在真实 Google API 训练里**控制不了**[[raw/papers/2025-05-zerosearch#^p-21-63b772]]。 ^p-3-d97b60

**实验结果**(Qwen-2.5-7B-Base):**ZeroSearch avg 40.93 > Search-R1 39.51**(+1.42 个点)[[raw/papers/2025-05-zerosearch#^t-60-60b1ca]]。**3 个 model family(Qwen-7B / Qwen-3B / LLaMA-3.2-3B)所有 7 个数据集上 ZeroSearch 均超过 Search-R1**。**3B 模拟 LLM 即可有效**;**14B 模拟器超过真实 Google search engine 训练**[[raw/papers/2025-05-zerosearch#^p-21-63b772]]。 ^p-4-b113f9

## 关键发现 / 论点 ^h-2-2-93d2ce

1. **真实 search engine 训练的两大痛点**(论文 §1 line 107-109 显式列出)[[raw/papers/2025-05-zerosearch#^p-20-74a568]]:
   - **Uncontrolled Document Quality**:真实 API 返回质量不可控,training 不稳定 [[raw/papers/2025-05-zerosearch#^h-2-1-f8eb4d]]
   - **Prohibitively High API Costs**:RL rollout 需要数十万 API 调用,商业不可行 [[raw/papers/2025-05-zerosearch#^h-2-1-f8eb4d]]
2. **LLM 模拟器的关键优势** [KB 综合]:
   - **0 API cost** — 完全本地 [derived]
   - **质量可控** — SFT + prompt 调节 noise 程度 [[raw/papers/2025-05-zerosearch#^h-3-5-c778e6]]
   - **可 scale** — GPU 多就吞吐高 [KB 综合]
3. **Curriculum rollout** 是性能关键:noisy 文档比例从低到高渐进,policy 学到的搜索决策更鲁棒 [[raw/papers/2025-05-zerosearch#^h-3-6-f83b78]]
4. **核心反直觉论断**:**14B 模拟器 > 真实 Google search engine** — 模拟环境的"可控性"价值超过真实环境的"真实性"价值[[raw/papers/2025-05-zerosearch#^p-21-63b772]]
5. **兼容 REINFORCE / PPO / GRPO** — 不绑定特定 RL 算法,作为通用 RL+RAG 训练范式 [[raw/papers/2025-05-zerosearch#^h-3-16-ebf303]]
6. **Base / Instruct 通用** — 不需要 SFT warm-up 阶段 [[raw/papers/2025-05-zerosearch#^h-2-9-8cd741]] ^p-5-feb83f

## 方法论 ^h-2-3-f27051

- **Backbone**:Qwen-2.5-7B-Base/Instruct / Qwen-2.5-3B / LLaMA-3.2-3B(policy);Qwen-2.5-14B-Instruct(默认模拟器) [[raw/papers/2025-05-zerosearch#^h-3-11-467793]]
- **训练数据**:NQ + HotpotQA 合并训练集(与 [[wiki/sources/search_r1]] 完全一致,**确保 fair comparison**)
- **评估**:7 个 QA datasets(单跳 NQ/TriviaQA/PopQA + 多跳 HotpotQA/2Wiki/MuSiQue/Bamboogle),指标 EM [[raw/papers/2025-05-zerosearch#^h-3-9-a963dd]]
- **推理时**:**所有方法用真实 Google SerpAPI 评测** — 训练用模拟,推理用真实,**这是关键设计**[[raw/papers/2025-05-zerosearch#^p-57-8601ae]]
- **硬件**:4×H20 跑模拟服务器 + 4×H20 跑 RL 训练 [[raw/papers/2025-05-zerosearch#^h-3-11-467793]] ^p-6-bc9e34

## 局限性 ^h-2-4-d25123

- **依赖模拟 LLM 的世界知识** — 如果模拟 LLM 对某领域陌生,生成的文档可能误导 policy(论文 Conclusion 段承认)[[raw/papers/2025-05-zerosearch#^h-2-6-53c06f]]
- **模拟 LLM 自身需要预先 SFT** — 不是真正"zero-shot" [KB 综合]
- **未对比 DeepResearcher / WebThinker** — 后两者用真实 Google API 训练,ZeroSearch 论文 §2 提到但未做 head-to-head 实验 [[raw/papers/2025-05-zerosearch#^h-2-2-3cc1d1]] [KB 观察]
- **policy model 推理时仍依赖真实 API** — 训练时省了,部署时省不了 [derived]
- **curriculum schedule 是超参数** — 论文给了 default,具体最优调度可能依任务而变 [[raw/papers/2025-05-zerosearch#^h-3-6-f83b78]] ^p-7-cbeb6e

## AI 综合判断 ^h-2-5-006953

### 核心价值 ^h-3-1-eb2f7a

ZeroSearch 是 **2025 RL+RAG 派的工程化破局** — 它解决了 R1-Searcher / Search-R1 / DeepResearcher 共同面临的训练成本与可控性瓶颈,把"训练 LLM 学搜索"从研究 demo 推向真正可商业 scale 的范式。**14B 模拟器超过真实 Google API 训练**这一结果颠覆了"必须真实数据才能训出好 policy"的隐含假设[[raw/papers/2025-05-zerosearch#^p-21-63b772]],与 simulator-based RL(如 AlphaGo Zero 的 self-play)思想同源。 ^p-8-886bc6

### 关联 ^h-3-2-f856d6

- 概念页 [[wiki/concepts/rl_augmented_retrieval]] — **触发第 7 处冲突标注 + 2025 三家鼎立扩为四家**(o1 / R1 / IL / 模拟器派)
- 对照 [[wiki/sources/search_r1]] — 训练同 backbone / 同 dataset / 同算法,**ZeroSearch +1.42 个点**[[raw/papers/2025-05-zerosearch#^t-60-60b1ca]]
- 对照 [[wiki/sources/r1_searcher]] — 同为 RL 训搜索,但 ZeroSearch 不用真实 search engine
- 对照 [[wiki/sources/search_o1]] / [[wiki/sources/deeprag]] — 同为 2025 agentic RAG 派,但方法论根本不同
- MOC [[wiki/indexes/rag_evolution_index]] — Batch 5 末位 ^p-9-07bdf8

### 冲突 ^h-3-3-cabb88

**触发本 KB demo 第 7 处冲突标注**(注入到 [[wiki/concepts/rl_augmented_retrieval]]),核心论断:

- **旧观点(R1-Searcher / Search-R1, 2025-03)**:RL 训搜索必须有真实 retrieval(本地 Wikipedia corpus 或真实 search API)。这是隐含假设——所有 R1 派工作都基于此。 [[wiki/sources/r1_searcher]] [[wiki/sources/search_r1]]
- **旧观点(DeepResearcher / WebThinker, 2025-04)**:更进一步主张**必须真实 Google API**才能 capture real-world 复杂性。 [需要来源]
- **新证据(ZeroSearch, 2025-05)**:**两条路都不需要** — LLM 模拟器即可,**14B 模拟器训出的 policy 在真实 Google API 评测上超过真实 search engine 训练的 policy**[[raw/papers/2025-05-zerosearch#^t-60-60b1ca]]
- **LLM 判断**:这是 simulator-based RL 思想在 LLM agent 时代的应用,与 AlphaGo Zero 同源。**预言**:2025 Q3-Q4 会出现 RL+RAG 论文不再用真实 retrieval 训练,改用模拟器(成本数量级下降)。但模拟器质量是新瓶颈,且需要更强 base LLM 作模拟。 [KB 综合] ^p-10-c0c982

## 与 Wiki 的关联 ^h-2-6-da27d5

- 影响:在 [[wiki/concepts/rl_augmented_retrieval]] 注入第 7 处 `> [!WARNING]` 块 + 升级"三家鼎立"为"四家鼎立"(模拟器派)
- MOC 归属:[[wiki/indexes/rag_evolution_index]] Batch 5
- partial re-ingest 路径:Section 5 Further Analysis(curriculum rollout / 模拟器 scale law)在后续工作引用时升级深读 ^p-11-fe187c
