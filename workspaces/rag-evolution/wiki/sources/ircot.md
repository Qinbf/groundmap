---
title: "IRCoT: Interleaving Retrieval with CoT (Trivedi et al. 2022-12)"
type: source_summary
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: reviewed
confidence: high
source_count: 1
sources:
  - "[[raw/papers/2022-12-ircot]]"
tags:
  - rag
  - multi-step
  - prompting
  - cot
  - 2022
---

# IRCoT: Interleaving Retrieval with Chain-of-Thought Reasoning ^h-1-1-44af57

> **原始文件**: [[raw/papers/2022-12-ircot]]
> **作者**: Harsh Trivedi, Niranjan Balasubramanian et al.(Stony Brook)
> **发表**: 2022-12 arXiv preprint(ACL 2023)
> **arXiv**: [2212.10509](https://arxiv.org/abs/2212.10509)
> **特殊地位**:**Search-R1 论文 §2 显式列 IRCoT 作 multi-turn prompting 代表**,与本 KB 的 R1 派 RL 范式形成对照[[wiki/sources/search_r1#^p-10-3376e9]] ^p-1-3d1861

## 摘要 ^h-2-1-3ae146

IRCoT 解决 **multi-hop QA** 问题——单次 retrieval 不足以回答需要多步推理的问题。机制:**交替 retrieval 和 CoT reasoning**,每次 LLM 生成一段 CoT 推理 → 用该段作 query 触发新 retrieval → 用新 retrieved 内容继续推理。**完全靠 prompting**,不训新模型。在 4 个 multi-hop QA benchmark(HotpotQA / 2WikiMultiHopQA / MuSiQue / IIRC)上**显著超过一次性 retrieval**[[raw/papers/2022-12-ircot]]。 ^p-2-6fa680

## 关键发现 / 论点 ^h-2-2-10e39a

1. **multi-hop 必须 multi-retrieval**:一次检索拿不到多跳的"中间事实",必须 step-by-step [[raw/papers/2022-12-ircot]]
2. **CoT step 作 query 比原始问题作 query 更好** — 中间推理步骤里的实体词指代更精确 [[raw/papers/2022-12-ircot]]
3. **prompting 路线 vs 训练路线**:论文论证用 in-context examples 就能做 multi-step,无需 SFT(此处与 Self-Ask / ReAct 共享思路) [KB 综合]
4. **Self-RAG 论文 §2 Related Work 把 IRCoT 列为"concurrent prompting work"作对照** [需要来源] ^p-3-560a4f

## AI 综合判断 ^h-2-3-e0eacb

### 核心价值 ^h-3-1-57ae37

IRCoT 是 **multi-hop retrieval 的 prompting 经典** — Self-RAG / CRAG / R1 派的多跳能力本质上都在解决 IRCoT 提出的问题,但路径不同(SFT / evaluator / RL)。Gao Survey Table I 收录 IRCoT 为 "Wikipedia / Chunk / Inference / Recursive" 类[[wiki/sources/gao_rag_survey#^t-2-db7484]]。**Search-R1 论文 §2 显式批评 IRCoT**:依赖高质量 prompt 工程,无法 scale[[raw/papers/2025-03-search-r1#^p-19-ab77b7]]。 ^p-4-1ce538

### 关联 ^h-3-2-1c3cf7

- [[wiki/concepts/self_reflective_rag]] — 演化前置历史(multi-step prompting 起点)
- [[wiki/sources/self_rag]] / [[wiki/sources/search_r1]] — 后继 SFT / RL 路线
- [[wiki/sources/gao_rag_survey]] — Table I 收录 ^p-5-8a23d9

### 冲突 ^h-3-3-93190b

**不触发新冲突标注** — 与 FLARE 同属 prompting 路线,与 Self-RAG/R1 派的辩论已被 [[wiki/concepts/self_reflective_rag]] 2 个 `> [!WARNING]` 块覆盖。 ^p-6-58a237

## 与 Wiki 的关联 ^h-2-4-8625b8

- MOC:[[wiki/indexes/rag_evolution_index]] Batch 2 ^p-7-0b1d16
