---
title: "RL-Augmented Retrieval (2025 Agentic RAG 三家鼎立)"
type: concept
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: reviewed
confidence: high
source_count: 5
sources:
  - "[[wiki/sources/r1_searcher]]"
  - "[[wiki/sources/search_r1]]"
  - "[[wiki/sources/search_o1]]"
  - "[[wiki/sources/deeprag]]"
  - "[[wiki/sources/zerosearch]]"
tags:
  - rag
  - rl
  - r1-style
  - o1-style
  - 2025
  - has-conflict
---

# RL-Augmented Retrieval (RL 范式 RAG) ^h-1-1-298299

> 用强化学习 outcome-based reward **训练 LLM 自主学会调用搜索引擎**,在生成过程中决定何时检索、写什么 query、如何用 retrieved 文档继续推理。代表工作:R1-Searcher (Renmin Univ 2025-03-05) + Search-R1 (UIUC 2025-03-12)[[wiki/sources/r1_searcher]] [[wiki/sources/search_r1]]。 ^p-1-4cadc1

## 核心机制 ^h-2-1-eb3cb7

1. **训练目标**:RL outcome reward(答对 = +,答错 = -)+ format reward(必须用规定 tag 包 query / 文档 / 推理 / 答案)[[wiki/sources/r1_searcher#^h-3-2-fb4ea9]]
2. **多轮交互 rollout**:LLM 生成 → 触发 `<search>` 或 `<begin_of_query>` → 系统调真实 retrieval → 把结果用 `<information>` 或 `<begin_of_documents>` 包回 → LLM 继续推理 → 最终 `<answer>`[[wiki/sources/search_r1#^p-5-0140b8]]
3. **Retrieved Token Loss Masking**:检索文档不应被"学会生成",mask 这些 token 不参与 policy gradient[[raw/papers/2025-03-search-r1#^h-4-1-1d50aa]]
4. **基础 RL 算法**:可选 Reinforce++ / PPO / GRPO[[raw/papers/2025-03-search-r1#^h-4-3-432983]]
5. **无需 SFT 冷启动**:完全 outcome-based RL 训(承袭 DeepSeek-R1 Zero 路线)[[raw/papers/2025-03-r1-searcher#^p-12-52de3a]] ^p-2-fae921

## 两种实现路径对比 ^h-2-2-bf50ce

| 维度 | R1-Searcher | Search-R1 |
|---|---|---|
| 时间 | 2025-03-05 | 2025-03-12 |
| 团队 | 人大 AI Box + DataCanvas | UIUC + UMass + Google Cloud |
| RL 算法 | Reinforce++ 改造 | PPO + GRPO 双兼容 |
| Reward 设计 | **两阶段**(Stage 1 retrieve+format / Stage 2 answer+format) | **单阶段** outcome-based(简单) |
| Tag 格式 | `<begin_of_query>`/`<begin_of_documents>` | `<search>`/`<information>`/`<think>`/`<answer>` |
| 数据集 | 训:HotpotQA + 2Wiki / 测:4 multi-hop | 7 QA datasets(NQ/TriviaQA/HotpotQA 等) |
| 关键论断 | 超 ReARTeR (GPT-4o-mini) +48.22% on HotpotQA | Qwen2.5-7B 平均 +41% over RAG baselines |
| Ablation 重点 | 数据难度分级 + 阶段切换 | PPO vs GRPO + token masking |
^t-1-e1cc91 ^p-3-c05ca7

## 与其他 RAG 范式的关系 ^h-2-3-869b3a

- vs [[wiki/concepts/self_reflective_rag]] (Self-RAG 2023-10):**功能性替代**——都做"模型自决检索",但 RL 用 outcome reward 替代 reflection tokens SFT。Self-RAG 仍在 citation precision 上有 reflection tokens 的显式优势,但通用 self-decision 框架被 RL 取代。详见 [[wiki/concepts/self_reflective_rag]] 冲突标注块
- vs [[wiki/concepts/corrective_rag]] (CRAG 2024-01):CRAG 用外置 evaluator + 三档 action;RL 范式直接训模型学会"如果检索结果不好就再 query"——同样的功能,但训出来比手工设计 trigger 更灵活
- vs [[wiki/concepts/graph_rag]] (GraphRAG / LightRAG / HippoRAG):**正交方向**——graph 改 corpus 结构,RL 改决策能力,可叠加(理论上可以在 graph index 上面跑 RL search)
- vs [[wiki/concepts/rag_vs_long_context]] (DeepMind 2024-07):**部分回应** Self-Route 的精神——RL 让模型 dynamically decide retrieve/not,不需要预定义 hybrid 规则 ^p-4-5a0a61

## 经验结果摘要 ^h-2-4-6a2356

- **多 multi-hop 大幅领先 GPT-4o-mini**(R1-Searcher 在 HotpotQA +48.22% vs ReARTeR base on GPT-4o-mini)[[wiki/sources/r1_searcher#^p-4-40c58f]]
- **开源 7B 不输闭源大模型**——RL 训出的搜索决策可以让 7-8B 在 multi-hop QA 上超过 GPT-4o-mini[[wiki/sources/search_r1#^p-7-93266d]]
- **OOD 泛化好**:R1-Searcher 仅训 HotpotQA + 2Wiki,在 Bamboogle online search 也胜 32B Search-o1[[wiki/sources/r1_searcher#^p-4-40c58f]]
- **PPO 和 GRPO 都 work**(Search-R1 ablation) ^p-5-913382

## 局限性 ^h-2-5-fb390e

- **训练 corpus 是 wiki 离线**,真实 web search 场景未充分测试(R1-Searcher 在 Bamboogle 用了 Google Search 验证)
- **数据集选择有偏**:NQ/HotpotQA/2Wiki 等都偏 wiki 起源,可能与 LLM pretraining 重叠
- **inference 多次 forward + 实时 search**:成本仍高,延迟敏感场景不友好
- **R1-Searcher 与 Search-R1 互相未对比**——本概念页综合两者,但严格 head-to-head 实验缺失 ^p-6-1f0a1d

> [!WARNING] 知识更新冲突 — 2026-05-26(2025 Agentic RAG 三家鼎立:o1 派 vs R1 派 vs IL 派)
> **背景**:[[wiki/sources/r1_searcher]] + [[wiki/sources/search_r1]] 在 Batch 0 ingest 时,被视为"agentic RAG 的 2025 新范式"。Batch 3 ingest [[wiki/sources/search_o1]](2025-01)+ [[wiki/sources/deeprag]](2025-02)后,KB 识别出 **2025 agentic RAG 内部存在 3 条根本不同的方法论路径**:
>
> **三家对照**:
>
> | 派别 | 代表 | 训练方式 | 训练成本 | 推理时 | 关键论断 |
> |---|---|---|---|---|---|
> | **o1 派**(prompting 涌现)| [[wiki/sources/search_o1]] (2025-01) | **无需训练** — 用现成 LRM(QwQ-32B)+ prompting | 0(只用现成模型) | LRM long CoT 内自主触发 `<search>` | 强 base model + prompt 涌现 search 能力 |
> | **R1 派**(RL outcome reward)| [[wiki/sources/r1_searcher]] (2025-03-05) + [[wiki/sources/search_r1]] (2025-03-12) | **outcome-based RL**(Reinforce++ / PPO / GRPO)| 中(需要 rollout 训练) | RL 训出 LLM 自决检索 | RL 训出可泛化的 search 能力,**7B 超过 o1 派 32B** |
> | **IL 派**(MCTS + imitation)| [[wiki/sources/deeprag]] (2025-02) | **MCTS 找路径 → Imitation Learning 训学生** | 高(MCTS rollout 昂贵) | 学生模仿 MCTS 最优路径 | atomic decision MDP 建模比 outcome reward 更细 |
>
> **核心冲突论断**:
> - **R1 派挑战 o1 派**:[[wiki/sources/r1_searcher]] 论文显式声明在 Bamboogle 上 **7B base 超过 Search-o1 32B base 11.4%**[[wiki/sources/r1_searcher#^p-14-f86361]] — 这反驳了 o1 派的"靠强 base model + prompting 涌现"假设
> - **IL 派 vs RL 派的 MDP 粒度之争**:DeepRAG 主张 atomic decision MDP 比 outcome reward 更细粒度,更稳定;但 IL 需要 MCTS rollout 昂贵
> - **R1 派 vs o1 派的训练必要性之争**:R1 派必须训新模型,o1 派完全靠现成 LRM — **范式根本对立**
>
> **LLM 判断**:这是 KB demo 首次识别出 **2025 同年内的范式分歧**(之前 5 处冲突都跨年)。三家各有 trade-off:
> - 强 base model 可用 → o1 派最便宜
> - 7B 资源 + 想要泛化 → R1 派 RL
> - 想要细粒度可控 → IL 派(但成本高)
>
> **状态**: 👁 持续观察(keep_watching) — `keep_watching` — 2025-03 后续工作如何选择路线是关键信号;若 R1 派持续占优,IL 派可能被吸收为"RL 训练 + MCTS 数据增强"混合 ^p-7-7a9dea

> [!WARNING] 知识更新冲突 — 2026-05-26(2025 Agentic RAG 第 4 家:模拟器派 ZeroSearch)
> **背景**:Batch 5 ingest [[wiki/sources/zerosearch]](阿里 2025-05)后,KB 识别出"2025 三家鼎立" 实际是"四家鼎立"——出现了第 4 条根本不同的方法论路径:**用 LLM 模拟 search engine 训练**,完全不需要真实 retrieval。
>
> **四家对照升级**:
>
> | 派别 | 代表 | 训练时是否用真实 search | 训练成本 |
> |---|---|---|---|
> | **o1 派**(prompting 涌现)| [[wiki/sources/search_o1]] | 无需训练,推理时用真实 | 0 训练成本 |
> | **R1 派**(RL outcome reward + 本地 corpus)| [[wiki/sources/r1_searcher]] + [[wiki/sources/search_r1]] | 静态 Wikipedia corpus | 中(无 API 费,但 corpus 老化) |
> | **IL 派**(MCTS + imitation)| [[wiki/sources/deeprag]] | MCTS rollout(本地)| 高(MCTS 昂贵) |
> | **真实 API 派**(R1 派子分支)| DeepResearcher / WebThinker(本 KB 未 ingest) | **真实 Google API** | **极高**(数十万 API 调用) |
> | **模拟器派**(新)| [[wiki/sources/zerosearch]] (2025-05) | **LLM 模拟,不用任何 search**;推理时用真实 | **0 API + 可控** |
>
> **核心冲突论断**:
> - **ZeroSearch 挑战所有前三条路**:R1 派(本地 corpus 老化)/ 真实 API 派(成本不可行)/ o1 派(对 base model 要求高)。它的方法论假设是:**LLM 模拟环境质量足够好就够,真实数据不必需**。
> - **关键证据**:**14B 模拟器训出的 policy > 真实 Google search engine 训出的 policy**[[wiki/sources/zerosearch#^t-60-60b1ca]] — 这反驳了"必须真实数据"假设
> - **与 R1 派同 backbone 对比**:Qwen-2.5-7B 上 ZeroSearch avg 40.93 vs Search-R1 39.51(+1.42)[[wiki/sources/zerosearch#^t-60-60b1ca]]
>
> **LLM 判断**:这是 simulator-based RL 范式(类 AlphaGo Zero self-play 思想)在 LLM agent 时代的应用。**预言**:
> 1. 2025 Q3 后续 R1 派工作会迁移到 ZeroSearch 范式(成本数量级下降)
> 2. 模拟 LLM 质量成为新瓶颈 — 弱模拟 LLM 会限制 policy 上限
> 3. 真实 API 派可能彻底失势(除非验证 ZeroSearch 在长尾 / 时效性查询上不行)
>
> **状态**: 👁 持续观察(keep_watching) — `adopt_new` 部分 — 接受 ZeroSearch 的"模拟器够用"论断,但保留真实 API 派在时效性 query / OOD 场景的合理性;6 个月后回看 ^p-zs-conflict-2025-q2

## 关联页面 ^h-2-6-28482c

- [[wiki/sources/r1_searcher]] — R1 派 (RL)
- [[wiki/sources/search_r1]] — R1 派 (RL)
- [[wiki/sources/search_o1]] — o1 派 (prompting)
- [[wiki/sources/deeprag]] — IL 派 (MCTS + imitation)
- [[wiki/sources/memgpt]] — agentic 范式前驱(memory-augmented,非 RAG 主线)
- [[wiki/sources/react]] — agentic 框架前驱
- [[wiki/concepts/self_reflective_rag]] — 被本范式替代(部分)的 SFT-based 路径
- [[wiki/concepts/retrieval_augmented_generation]] — 上位概念
- [[wiki/indexes/rag_evolution_index]] — MOC ^p-8-53f1c3
