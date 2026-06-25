---
title: "R1-Searcher: Incentivizing Search via RL (RUC 2025-03)"
type: source_summary
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: draft
confidence: high
source_count: 1
sources:
  - "[[raw/papers/2025-03-r1-searcher]]"
tags:
  - rag
  - rl
  - r1-style
  - 2025
  - renmin-univ
---

# R1-Searcher: 用 RL 激励 LLM 学会搜索 ^h-1-1-af16c3

> **原始文件**: [[raw/papers/2025-03-r1-searcher]]
> **作者**: Huatong Song, Jinhao Jiang, Yingqian Min, Jie Chen, Zhipeng Chen, Wayne Xin Zhao, Lei Fang, Ji-Rong Wen (Renmin Univ AI Box + DataCanvas)
> **发表**: 2025-03-05 arXiv preprint
> **arXiv**: [2503.05592](https://arxiv.org/abs/2503.05592)
> **开源**: <https://github.com/RUCAIBox/R1-Searcher> ^p-1-6159a4

## 摘要 ^h-2-1-811e72

R1-Searcher 提出**两阶段 outcome-based RL**,让 LLM **自主学会**何时调用 search engine、如何写 query、如何用 retrieved 文档继续推理——**完全不需要 SFT 冷启动 / process reward / distillation**[[raw/papers/2025-03-r1-searcher#^p-12-52de3a]]。 ^p-2-cbb3a6

**两阶段 reward 设计**:Stage 1 用 retrieve reward + format reward 让模型学会调用搜索(不考虑答案对错);Stage 2 切换为 answer reward(F1)+ format reward 让模型学会用搜索结果回答正确[[raw/papers/2025-03-r1-searcher#^h-3-2-fb4ea9]]。基础 RL 算法是 Reinforce++ 改造,加入 **RAG-based Rollout**(`<begin_of_query>` / `<begin_of_documents>` tags)+ **Retrieve Mask-based Loss Calculation**(检索文档不参与 loss)[[raw/papers/2025-03-r1-searcher#^p-47-cdde6d]]。 ^p-3-4b5611

实验在 4 个 multi-hop benchmark(HotpotQA / 2WikiMultiHopQA / MuSiQue / Bamboogle)用 Qwen-2.5-7B-Base 和 Llama-3.1-8B-Instruct 作 backbone。**关键结果**:超过 ReARTeR(GPT-4o-mini base 的 SOTA test-time scaling)最多 **+48.22% on HotpotQA / +21.72% on 2Wiki**;在未见过的 Bamboogle online search 上比 Search-o1 (32B) **+11.4%**[[raw/papers/2025-03-r1-searcher#^p-14-f86361]]。 ^p-4-40c58f

## 关键发现 / 论点 ^h-2-2-93d2ce

1. **纯 RL,无 SFT 冷启动**——比 SFT distillation 路线(如 CoRAG)更具泛化能力(论文 §1 line 59 引 chu2025sftmemorizesrlgeneralizes) [KB 综合]
2. **两阶段 reward 解耦**:先学"调用搜索的格式",再学"用结果答对题",避免冷启动困难 [[raw/papers/2025-03-r1-searcher]]
3. **RAG-based Rollout**:LLM 生成 `<begin_of_query>` 后,系统暂停,执行真实 retrieval,把结果用 `<begin_of_documents>` 包回继续生成 [[raw/papers/2025-03-r1-searcher]]
4. **Retrieve Mask-based Loss**:检索文档不应该被模型"学会生成",mask 掉这些 token 不参与 policy gradient [[raw/papers/2025-03-r1-searcher]]
5. **OOD 泛化好**:仅 HotpotQA + 2Wiki 训练 → Bamboogle online search 也能用,超过 32B Search-o1[[raw/papers/2025-03-r1-searcher#^p-14-f86361]]
6. **开源 7-8B base 超过闭源 GPT-4o-mini**(在 multi-hop QA 上)——RL 训出的 7B 不输大模型 prompt engineering [[raw/papers/2025-03-r1-searcher]] ^p-5-92e908

## 局限性 ^h-2-4-d25123

- **训练 corpus 是 KILT Wikipedia 2019 (29M passages)**——非时效性测试场景[[raw/papers/2025-03-r1-searcher]]
- **数据集选择基于难度分级**(easy/medium/difficult by rollout count)——需要预跑一遍判定难度,不是完全 zero-cost [[raw/papers/2025-03-r1-searcher]]
- **两阶段切换的时机**未充分 ablation [KB 观察]
- 与 Search-R1(2025-03-12 并发)未对比 [KB 观察] ^p-7-5ffa2f

## AI 综合判断 ^h-2-5-006953

### 核心价值 ^h-3-1-eb2f7a

R1-Searcher 是 **RAG 演化的第三次范式翻新**——从 SFT(Self-RAG 的 reflection tokens 离线训练)→ test-time prompting(MCTS-based 方案)→ **RL outcome-based 训练**。它把 DeepSeek-R1 的 RL 方法应用到 retrieval 调用上,**让 LLM 自主学会"何时该 search"**——这是 Self-RAG reflection tokens 范式的功能性替代,但用更通用的 RL 框架。**纯 RL + 无 SFT 冷启动**的训练范式在 2025 是 R1-style 工作的共同特征。 [KB 综合] ^p-8-ff65d8

### 关联 ^h-3-2-f856d6

- 新建概念页 [[wiki/concepts/rl_augmented_retrieval]] — 该范式定义,与 Search-R1 共享
- 冲突注入到 [[wiki/concepts/self_reflective_rag]] — RL 范式替代 reflection tokens SFT
- vs [[wiki/sources/search_r1]] (2025-03-12):**并发工作,高度相似**;R1-Searcher 强调 2 阶段 outcome reward,Search-R1 强调 PPO/GRPO 多算法 + 系统 ablation
- MOC [[wiki/indexes/rag_evolution_index]] — 第 7 篇 ^p-9-34b899

### 冲突 ^h-3-3-cabb88

**冲突注入到 [[wiki/concepts/self_reflective_rag]] 第 2 块**:

- **旧观点(Self-RAG, 2023-10)**:用 reflection tokens(Retrieve/IsRel/IsSup/IsUse)显式编码到 LM vocabulary,通过 GPT-4 监督 + critic distillation + 离线增强 corpus → 训 generator,让模型学会自决检索[[raw/papers/2025-03-r1-searcher]]
- **新证据(R1-Searcher 2025-03 + Search-R1 2025-03)**:用 RL outcome reward 直接训练 LLM 在生成中调用 search,**完全不需要 reflection tokens / critic / 离线 corpus 增强**;7B 模型超过 GPT-4o-mini 在 multi-hop 上 [[raw/papers/2025-03-r1-searcher]]
- **LLM 判断**:Self-RAG 的 reflection tokens 范式被功能性取代——RL 框架更通用,outcome reward 比 process reward 更鲁棒,且不需要预先定义 4 类 token 的语义。**Self-RAG 仍在简单场景有 citation precision 优势**(reflection tokens 显式编码 IsSup),但作为通用"自决检索"框架,RL 范式胜出 [KB 综合] ^p-10-18a72d

## 与 Wiki 的关联 ^h-2-6-da27d5

- 新建 [[wiki/concepts/rl_augmented_retrieval]] + 冲突注入 [[wiki/concepts/self_reflective_rag]]
- MOC 归属:[[wiki/indexes/rag_evolution_index]] 第 7 篇 ^p-11-110ede
