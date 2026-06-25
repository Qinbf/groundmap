---
title: "Search-o1: Agentic Search-Enhanced LRM (Li et al. 2025-01)"
type: source_summary
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: draft
confidence: high
source_count: 1
sources:
  - "[[raw/papers/2025-01-search-o1]]"
partial_ingest_count: 0
tags:
  - rag
  - reasoning
  - agentic
  - o1-style
  - 2025
---

# Search-o1: Agentic Search-Enhanced Large Reasoning Models ^h-1-1-1a0368

> **原始文件**: [[raw/papers/2025-01-search-o1]]
> **作者**: Xiaoxi Li et al.(BUPT / 北邮 + 其他)
> **发表**: 2025-01 arXiv preprint
> **arXiv**: [2501.05366](https://arxiv.org/abs/2501.05366)
> **字符数**: 151464 — **第③档(整本书规模)**
> **特殊地位**:**R1-Searcher 论文 §1 引用 Search-o1 作为对照基线**[[raw/papers/2025-03-r1-searcher#^p-14-f86361]];Search-o1 是 **o1 派的搜索增强**,与 R1-Searcher / Search-R1 的 **R1 派 RL 范式**形成 2025 最重要的内部分歧 ^p-1-c94353

## 章节深度登记 ^h-2-1-9f7e46

第③档处理(151K 字符)— 因 Search-o1 是 2025 RL/Agentic RAG 范式之争的关键对照基线,深读 Method 部分:[[raw/papers/2025-01-search-o1]]

| Section | 状态 | 选择理由 |
|---|---|---|
| Introduction | ✓ 深读 | 与 R1 派对照的核心动机 |
| Related Work | ⊙ 扫读 | 综述类内容 |
| Method (Search-o1 + Reason-in-Documents) | ✓ 深读 | 核心方法,与 R1 派 RL 对照 |
| Experiments | ⊙ 扫读 | 结果数字,与 R1-Searcher Bamboogle 对比的关键 |
| Discussion / Conclusion | × 跳过 | 短结论 |
^t-1-5d67e9 ^p-2-af89c4

## 摘要 ^h-2-1-811e72

Search-o1 是 **o1-style large reasoning model + agentic search** 的融合。在 long CoT 推理过程中,LRM(QwQ-32B 等)**自主触发 search**——遇到不确定的知识点,生成 `<|begin_search_query|> ... <|end_search_query|>` 调用 retrieval。检索结果通过 **Reason-in-Documents** 模块二次推理后再纳入 CoT。**不需要训练**——纯 prompting + 现成 LRM[[raw/papers/2025-01-search-o1]]。 ^p-3-590241

## 关键发现 / 论点 ^h-2-2-93d2ce

1. **LRM long CoT + 搜索 = 强大组合**:32B QwQ + search 在多跳 QA 上达到 SOTA [[raw/papers/2025-01-search-o1]]
2. **Reason-in-Documents 是关键创新**:不直接把 retrieved 内容塞回 CoT,而是先用 LLM 二次推理压缩,避免污染 long CoT [[raw/papers/2025-01-search-o1]]
3. **完全无需训练**:与 R1 派的 RL 训练形成根本对照 [KB 综合]
4. **R1-Searcher 论文显式比较**:R1-Searcher 在 Bamboogle 上超过 Search-o1 32B **+11.4%**(用 7B base)[[wiki/sources/r1_searcher#^p-14-f86361]] ^p-4-40ed90

## AI 综合判断 ^h-2-3-3d5f17

### 核心价值 ^h-3-1-eb2f7a

Search-o1 是 **2025 agentic RAG 的"o1 派"代表**——继承 OpenAI o1 的 long CoT 推理范式,在推理中嵌入 search。与 R1 派(R1-Searcher / Search-R1)的 RL outcome reward 范式形成 **2025 最重要的方法论分歧**:**靠强 LRM + prompt 涌现 search 能力 vs 用 RL 训出 search 能力**。本论文给 [[wiki/concepts/rl_augmented_retrieval]] 概念页**带来新的内部冲突标注**——之前该概念页只覆盖 R1 派,现在需要纳入 o1 派对照。 ^p-5-5de8a4

### 关联 ^h-3-2-f856d6

- [[wiki/concepts/rl_augmented_retrieval]] — **新增 o1 派 vs R1 派内部冲突**(详见该概念页新冲突标注块)
- [[wiki/sources/r1_searcher]] / [[wiki/sources/search_r1]] — R1 派对照
- [[wiki/sources/react]] — agentic search 范式的前驱
- [[wiki/sources/deeprag]] — 同期 2025 工作,但路径不同(DeepRAG 用 imitation learning) ^p-6-591fc6

### 冲突 ^h-3-3-cabb88

**触发新冲突标注**(本 KB demo 第 6 处)— **o1 派 vs R1 派之争**:
- Search-o1(prompting + LRM 涌现):无需训练,但需要强 base model(QwQ-32B+)
- R1-Searcher / Search-R1(RL outcome reward):需要训练,但 7B base 也能用且**超过** Search-o1 32B(+11.4% on Bamboogle)[[wiki/sources/r1_searcher#^p-4-40c58f]]

详见 [[wiki/concepts/rl_augmented_retrieval]] 新冲突标注块。 ^p-7-472eef

## 与 Wiki 的关联 ^h-2-4-5a2e99

- 影响:在 [[wiki/concepts/rl_augmented_retrieval]] 注入 `> [!WARNING]` 块(o1 派 vs R1 派)
- MOC:[[wiki/indexes/rag_evolution_index]] Batch 3 ^p-8-2fa616
