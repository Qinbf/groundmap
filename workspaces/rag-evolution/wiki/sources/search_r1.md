---
title: "Search-R1: RL for LLM-Search Engine Interaction (UIUC 2025-03)"
type: source_summary
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: reviewed
confidence: high
source_count: 1
sources:
  - "[[raw/papers/2025-03-search-r1]]"
tags:
  - rag
  - rl
  - r1-style
  - ppo
  - grpo
  - 2025
  - uiuc
---

# Search-R1: 用 RL 训 LLM 与搜索引擎交互 ^h-1-1-b952b5

> **原始文件**: [[raw/papers/2025-03-search-r1]]
> **作者**: Bowen Jin (UIUC), Hansi Zeng (UMass), Zhenrui Yue (UIUC), Jinsung Yoon (Google Cloud), Sercan Ö. Arık (Google Cloud), Dong Wang (UIUC), Hamed Zamani (UMass), Jiawei Han (UIUC)
> **发表**: 2025-03-12 arXiv preprint
> **arXiv**: [2503.09516](https://arxiv.org/abs/2503.09516)
> **开源**: <https://github.com/PeterGriffinJin/Search-R1> ^p-1-20d6ff

## 摘要 ^h-2-1-811e72

Search-R1 是 **R1-Searcher 的姊妹工作**(早 7 天发布,2025-03-12 vs 03-05),独立提出**用 RL 训练 LLM 在推理过程中自主调用搜索引擎**。论文显式定位为"**DeepSeek-R1 Zero 的扩展**"——把 R1 的"参数化推理 RL"扩展到"搜索增强推理 RL"[[raw/papers/2025-03-search-r1#^p-13-9ed33c]]。 ^p-2-336316

**核心 vs R1-Searcher 的差异**:
- 不分阶段:单一 outcome-based reward,从头到尾一致
- **同时支持 PPO 和 GRPO 两种 RL 算法**——明确比较两者(论文 §3.1 显式给出两套 loss 公式)[[raw/papers/2025-03-search-r1#^h-4-3-432983]]
- 多轮 search 触发用 `<search>` `</search>` tags;`<information>` 包检索结果;`<think>` 包推理;`<answer>` 包答案
- **Retrieved Token Loss Masking**:与 R1-Searcher 同思路(检索内容不参与 loss),但论文 Appendix D 做了 ablation

实验在 7 个 QA datasets 上,Qwen2.5-7B / Qwen2.5-3B 作 backbone。结果:Qwen2.5-7B 平均比 RAG baselines 提升 **41%**(系统性),Qwen2.5-3B 提升 **20%**[[raw/papers/2025-03-search-r1#^p-9-052ef8]]。 ^p-3-5b53ee

## 关键发现 / 论点 ^h-2-2-93d2ce

1. **3 大设计挑战**(论文 §1)[[raw/papers/2025-03-search-r1#^p-12-3ae133]]:
   - (a) RL Framework Stability(retrieved context 怎么不破坏 RL 优化) [[raw/papers/2025-03-search-r1]]
   - (b) Multi-Turn Interleaved Reasoning + Search(模型应能反复决策) [[raw/papers/2025-03-search-r1]]
   - (c) Reward Design(outcome-based 够不够) [[raw/papers/2025-03-search-r1]]
2. **PPO + GRPO 双兼容**:论文同时给出两套 loss 公式 + 配对 ablation,证明两种 RL 算法都 work [[raw/papers/2025-03-search-r1]]
3. **Retrieved Token Masking 是必需**(Appendix D 显示无 masking 时训练不稳定) [[raw/papers/2025-03-search-r1]]
4. **简单 outcome-based reward 足够**——不需要 process reward 或 critic [[raw/papers/2025-03-search-r1]]
5. **多轮交互**:`<search>` → 触发实时检索 → `<information>` 注入 → 模型继续 `<think>` → 可能再 `<search>` → 最终 `<answer>` [[raw/papers/2025-03-search-r1]]
6. **明确定位为 R1 Zero 的扩展**:Search-R1 不需要 SFT 冷启动(R1 Zero 路线),直接 RL [[raw/papers/2025-03-search-r1]] ^p-5-0140b8

## 方法论 ^h-2-3-f27051

- **Backbone**:Qwen2.5-7B / Qwen2.5-3B / 14B(Appendix C)/ Base + Instruct 变体(Appendix E)[[raw/papers/2025-03-search-r1]]
- **Search engine**:本地 Wikipedia retrieval(详见 Appendix B) [[raw/papers/2025-03-search-r1]]
- **数据集**:7 个 QA datasets(NQ, TriviaQA, HotpotQA, 2Wiki, MuSiQue, PopQA, Bamboogle) [[raw/papers/2025-03-search-r1]]
- **RL 算法**:PPO 和 GRPO 都跑(并比较) [[raw/papers/2025-03-search-r1]]
- **训练**:数千步,outcome reward 用 Exact Match [[raw/papers/2025-03-search-r1]] ^p-6-2c69e5

## 局限性 ^h-2-4-d25123

- **没和 R1-Searcher 对比**(R1-Searcher 早 7 天发布,可能仍在 review 阶段) [[raw/papers/2025-03-search-r1]]
- **训练数据较单一**:NQ + HotpotQA 为主,可能影响泛化结论 [[raw/papers/2025-03-search-r1]]
- **PPO vs GRPO 选择的建议**仍较经验性,缺乏理论指导 [KB 综合]
- **Search engine 是本地 retrieval**,非真实 web search [[raw/papers/2025-03-search-r1]] ^p-7-93266d

## AI 综合判断 ^h-2-5-006953

### 核心价值 ^h-3-1-eb2f7a

Search-R1 和 R1-Searcher 共同**确立了 RAG 演化的新范式**——RL 训 retrieval 行为。Search-R1 的特殊价值在于**系统性 ablation 与多算法对比**(PPO vs GRPO),为后续工作提供了 RL framework 选择指南。它明确把这一范式归到"DeepSeek-R1 Zero 扩展"谱系下,把 retrieval 视作 R1 reasoning 的一个新维度——这给 reasoning + retrieval + 多模态 future work 提供了统一框架。 [KB 综合] ^p-8-590ee5

### 关联 ^h-3-2-f856d6

- 新建概念页 [[wiki/concepts/rl_augmented_retrieval]] — 与 R1-Searcher 共享
- vs [[wiki/sources/r1_searcher]]:**并发工作,高度互补**——R1-Searcher 单阶段 reward 切两段,Search-R1 单 reward 但兼容两种 RL 算法
- 冲突注入到 [[wiki/concepts/self_reflective_rag]] — RL 替代 reflection tokens
- MOC [[wiki/indexes/rag_evolution_index]] — 第 8 篇 ^p-9-266b31

### 冲突 ^h-3-3-cabb88

**与 R1-Searcher 共享冲突注入到 [[wiki/concepts/self_reflective_rag]] 第 2 块**(详见 [[wiki/sources/r1_searcher]] 冲突段)。

**新增针对 self_reflective_rag 的细节论断**:Search-R1 还**强调"RL 比 prompting 和 SFT 都好"**——prompting 没法泛化到新任务,SFT distillation 记忆 solution paths,只有 RL 能让模型学到 transferable 的搜索决策能力[[raw/papers/2025-03-search-r1#^p-11-6f3300]]。这是对 Self-RAG (SFT 路线) 与 IRCoT/ReAct (prompting 路线) 两者同时的方法论否定。 ^p-10-3376e9

## 与 Wiki 的关联 ^h-2-6-da27d5

- 与 [[wiki/sources/r1_searcher]] 共享 [[wiki/concepts/rl_augmented_retrieval]] 概念页
- MOC 归属:[[wiki/indexes/rag_evolution_index]] 第 8 篇(末篇) ^p-11-d73df4
