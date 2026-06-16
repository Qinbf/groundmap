---
title: "Self-Reflective RAG (自反思 RAG)"
type: concept
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: reviewed
confidence: high
source_count: 9
sources:
  - "[[wiki/sources/self_rag]]"
  - "[[wiki/sources/crag]]"
  - "[[wiki/sources/r1_searcher]]"
  - "[[wiki/sources/search_r1]]"
  - "[[wiki/sources/flare]]"
  - "[[wiki/sources/ircot]]"
  - "[[wiki/sources/self_ask]]"
  - "[[wiki/sources/react]]"
  - "[[wiki/sources/self_refine]]"
tags:
  - rag
  - self-reflective
  - reflection-tokens
  - has-conflict
---

# Self-Reflective RAG (自反思 RAG) ^h-1-1-ba0bad

> 把"是否检索 / 检索是否相关 / 生成是否 grounded / 整体是否有用"4 个判断**显式编码到 LM 的输出 token vocabulary**,让模型在生成同时自我评估的 RAG 范式。原始定义见 Asai et al. ICLR 2024[[wiki/sources/self_rag]]。 ^p-1-9c464d

## 核心机制:Reflection Tokens ^h-2-1-2c8f19

Self-RAG 引入 4 类特殊 tokens 作为 LM vocabulary 的扩展:

| Token | 输入 | 输出空间 | 含义 |
|---|---|---|---|
| `Retrieve` | x 或 (x, y) | {yes, no, continue} | 当前需要触发检索器吗 |
| `IsRel` | (x, d) | {relevant, irrelevant} | 检索到的段落 d 对回答 x 有用吗 |
| `IsSup` | (x, d, y) | {fully / partial / no support} | 生成的 y 被段落 d 支持的程度 |
| `IsUse` | (x, y) | {5, 4, 3, 2, 1} | 整体回答有多有用 |
^t-1-5d67e9

详见 [[wiki/sources/self_rag#^t-23-1c2106]]。 ^p-2-54f54a

## 训练流程 ^h-2-2-41bef4

1. **GPT-4 监督**:对每类 reflection token,prompt GPT-4 生成 4k-20k 训练样本
2. **distill 到 critic model 𝒞**:用监督样本训 Llama2-7B critic,与 GPT-4 标注 agreement >90%[[wiki/sources/self_rag#^p-49-b2784e]]
3. **离线增强 corpus**:用 𝒞 给 instruction corpus 自动插入 reflection tokens
4. **训 generator ℳ**:在增强后的 corpus 上做标准 next-token 训练,把 reflection 能力内化进 Llama2 7B/13B

**关键工程优势**:inference 时不再需要跑 critic,reflection 能力已经在 generator 的 vocabulary 里[[wiki/sources/self_rag#^h-5-3-a0c095]]。 ^p-3-a9bcc4

## 与 RLHF / PPO 的区别 ^h-2-3-71265d

RLHF/PPO 需要在训练循环里跑 reward model + actor-critic 更新,计算昂贵。Self-Reflective RAG 把 critique 离线插入 corpus,用标准 LM objective 训,**训练成本显著低于 PPO**[[wiki/sources/self_rag#^h-5-3-a0c095]]。 ^p-4-da546b

## Inference 可控性 ^h-2-4-7e7e9a

- **Hard threshold**:`Retrieve=Yes` 的概率超过阈值才触发检索器
- **Soft re-ranking**:对每个 segment 候选,用 reflection tokens 的概率加权打分(`w_IsRel · s_IsRel + w_IsSup · s_IsSup + w_IsUse · s_IsUse`)
- **Segment-level beam search**:每个 segment 取 top-B,最终序列由 reflection 加权决定
- **Hard constraints**:可在 decoding 时过滤 `IsSup=No support` 的候选[[wiki/sources/self_rag#^h-3-3-e26d42]] ^p-5-018201

## 经验结果摘要 ^h-2-5-bb0354

- Self-RAG **7B** 在 PopQA / PubHealth / Bio / ASQA 超过 ChatGPT
- Self-RAG **13B** 全面超过所有 non-proprietary 基线
- **citation precision** 是最大亮点:13B 在 ASQA 达 70.3,vs Llama2-13B + 标准 RAG 的 2.3(30× 提升)[[wiki/sources/self_rag#^t-77-9e8336]] ^p-6-5bbaae

> [!WARNING] 知识更新冲突 — 2026-05-26
> **旧观点(Self-RAG, Asai et al. ICLR 2024)**:把"何时检索 / 检索是否相关 / 生成是否 grounded"这些判断**内化到 generator vocabulary**(reflection tokens)是 RAG 自纠错的最佳路径;训练流程 = GPT-4 → Llama2-7B critic → 离线给 corpus 标注 → 训 generator。Self-RAG 7B/13B 已超过所有 non-proprietary baselines(来源:[[wiki/sources/self_rag#^h-3-2-aeed1d]])。
>
> **新证据(CRAG, Yan et al. arXiv 2024-01)**:
> - (a) 把 critic **外置为独立 evaluator**(T5-large fine-tuned, **0.77B 参数**)比 Self-RAG 的 Llama2-7B critic **轻 9 倍**且效果更好[[wiki/sources/crag#^p-33-cfbe40]]
> - (b) **Self-CRAG > Self-RAG**(在 SelfRAG-LLaMA2-7B base 上):PopQA +6.9% / Bio FactScore +5.0% / PubHealth +2.4%——意味着即使采纳了 Self-RAG 的内化训练,**外部 evaluator + web search 兜底仍能再加显著一层收益**[[wiki/sources/crag#^t-61-e54a35]]
> - (c) Self-RAG 完全限定在**静态 corpus**;CRAG 引入 **web search 兜底**,处理 corpus 本身缺失的场景
>
> **LLM 判断**:这不是 Self-RAG 错了,而是 Self-RAG 的"内化是终极路径"的隐含假设被证伪——critic 内化与外置 evaluator 是**互补**而非互斥。CRAG 表明 Self-RAG 还有未充分利用的"外加一层精炼"空间。但 CRAG 也引入了新依赖(Google Search API)与额外 inference 开销,生产落地的 trade-off 仍未明朗。
>
> **状态**: 👁 持续观察(keep_watching) — `merge`——保留 Self-RAG 的核心机制论断,在本页明确"外部 evaluator 路线是互补方案",而非"被取代" ^p-7-c7c7e9

> [!WARNING] 知识更新冲突 — 2026-05-26(自决检索范式翻新:SFT → RL)
> **旧观点(Self-RAG, 2023-10)**:把"何时检索 / 检索是否相关 / 生成是否 grounded / 综合 utility"4 个判断**显式编码到 LM vocabulary**(reflection tokens),通过 GPT-4 监督 + Llama2-7B critic distillation + 离线增强 corpus + 标准 next-token 训练 generator;让模型在 SFT 阶段内化"自反思"能力。
>
> **新证据([[wiki/sources/r1_searcher]] + [[wiki/sources/search_r1]], 2025-03)**:
> - (a) **R1-Searcher**(人大 2025-03-05):两阶段 outcome-based RL(Stage 1 retrieve+format reward / Stage 2 answer F1+format reward)+ Reinforce++ + RAG-based Rollout + Retrieve Mask Loss。**完全不需要 reflection tokens、GPT-4 监督、SFT distillation**。Qwen-2.5-7B-Base 超过 GPT-4o-mini 在 HotpotQA 上 +48.22%
> - (b) **Search-R1**(UIUC 2025-03-12):兼容 PPO + GRPO 的统一 RL 框架,把 Search-R1 明确定位为 DeepSeek-R1 Zero 的扩展。Qwen2.5-7B 平均 +41% over RAG baselines
> - (c) 两篇都论证 **RL > SFT distillation**:SFT 记忆 solution paths,泛化差;RL outcome reward 训练模型 transferable 的搜索决策能力
>
> **LLM 判断**:Self-RAG 的 reflection tokens **作为通用"自决检索"框架被功能性替代**——RL outcome reward 更通用、更鲁棒、不需要预定义 4 类 token 的语义。但 reflection tokens 的两个特性仍有独立价值:(1) 显式 IsSup token 让 citation precision 极高(70.3 vs vanilla RAG 的 2.3)[[wiki/sources/self_rag#^p-5-4d0635]],这是 RL outcome reward 难以直接复现的;(2) 推理时**可调权重**(soft re-ranking),无需重训。预言:未来工作可能是 RL 训 + reflection tokens 显式 head 的混合方案。
>
> **状态**: 👁 持续观察(keep_watching) — `adopt_new` 的部分性版本 —— 接受"RL 是更通用的自决检索框架",但保留 Self-RAG 在 citation precision + 推理时可调上的独特价值 ^p-9-f73e2e

## 演化前置历史:Prompting 路线(2022-2023)^h-2-9-31d3b9

Batch 2 ingest 后,本概念页可以梳理 **"自决检索"思想的完整演化谱系**——它不是从 Self-RAG 开始的,而是有清晰的 prompting 路线前史:

| 时间 | 论文 | 核心贡献 | 与 Self-RAG 关系 |
|---|---|---|---|
| 2022-10 | [[wiki/sources/self_ask]] | 显式 query decomposition 的 prompting 模板("Follow up: ...") | Self-RAG 论文 §2 列为 concurrent prompting work |
| 2022-10 | [[wiki/sources/react]] | Reasoning + Acting 交替的 agent 模板 | Self-RAG 引用,Search-R1 显式作 prompting 路线代表 |
| 2022-12 | [[wiki/sources/ircot]] | Interleaving Retrieval with CoT,multi-hop 多次检索 | Self-RAG 引用为"concurrent multi-step prompting" |
| 2023-03 | [[wiki/sources/self_refine]] | 同一 LLM iterative self-feedback(不涉 retrieval)| Self-RAG §2 显式批评其多次 forward 成本 [需要来源] |
| 2023-05 | [[wiki/sources/flare]] | Active RAG:token logprob 触发动态 retrieve | Self-RAG §2 显式批评其依赖闭源 LLM [需要来源] |
| **2023-10** | **Self-RAG(本范式定义)** | SFT + reflection tokens 内化"自决检索"能力 | **被 CRAG/R1 派后续挑战(详见上方冲突标注)** |

**完整三段演化论**:
1. **Prompting 路线**(2022-2023):靠 LLM in-context learning,无需训练,依赖大模型 + 闭源访问
2. **SFT 路线**(2023-10 Self-RAG / 2024-01 CRAG):训新模型 / 加 evaluator,可控但需数据
3. **RL 路线**(2025-03 R1-Searcher / Search-R1):outcome reward 训练,泛化强,继承 ReAct 多轮模板

**关键观察**:**ReAct 的多轮模板**(`<think> / <action> / <observation>`)在 R1 派 RL 范式中**被强化**而非废弃——RL 训练让 LLM 从"靠 prompt 学 ReAct"变为"参数里内化 ReAct"。Prompting → SFT → RL 是同一思想的不同实现层级,而非互相替代。 ^p-11-a0327a

## 与其他范式的关系 ^h-2-6-41a67a

- vs [[wiki/concepts/retrieval_augmented_generation]] (vanilla RAG):本范式解决了 vanilla RAG 的"无差别检索 + 不 grounded 生成"两大缺陷
- vs [[wiki/concepts/corrective_rag]] (CRAG, 2024-01):**同样做自纠错,但路径根本不同**——CRAG 用外部 lightweight evaluator(T5-large 0.77B)而非内化 critic,且引入 web search 兜底。Self-CRAG > Self-RAG 在 PopQA/Bio/PubHealth 上[[wiki/sources/crag#^p-2-04adb2]](详见上方冲突标注)
- vs [[wiki/concepts/graph_rag]] (GraphRAG / LightRAG / HippoRAG 2):图结构路线 — 改造的是"corpus 的组织形式"而非"检索-生成-评估的控制流"
- vs [[wiki/concepts/rl_augmented_retrieval]] (Search-R1 / R1-Searcher 2025-03):**功能性替代**——RL outcome reward 直接训"检索 → 推理 → 答案"链路,reflection tokens 范式作为通用框架已被替代(详见上方第 2 个冲突标注块) ^p-10-98d609

## 关联页面 ^h-2-7-e10f36

- [[wiki/sources/self_rag]] — 原论文 source_summary
- [[wiki/concepts/retrieval_augmented_generation]] — 上位概念
- [[wiki/indexes/rag_evolution_index]] — MOC ^p-8-6a0aea
