---
title: "MemGPT: LLMs as Operating Systems (Packer et al. 2023-10)"
type: source_summary
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: reviewed
confidence: high
source_count: 1
sources:
  - "[[raw/papers/2023-10-memgpt]]"
tags:
  - llm
  - memory-augmented
  - agentic
  - 2023
  - berkeley
---

# MemGPT: LLMs as Operating Systems(后改名 Letta)^h-1-1-011500

> **原始文件**: [[raw/papers/2023-10-memgpt]]
> **作者**: Charles Packer, Sarah Wooders et al.(UC Berkeley)
> **发表**: 2023-10 arXiv preprint
> **arXiv**: [2310.08560](https://arxiv.org/abs/2310.08560)
> **历史地位**:**memory-augmented LLM 范式开山**;2024 改名为 **Letta**(letta.ai)成为商业产品 ^p-1-29ddd0

## 摘要 ^h-2-1-811e72

MemGPT 把 LLM 当作 **操作系统的 CPU**,管理 **multi-tier memory hierarchy**: [KB 综合]
- **Main context**(LLM context window)= RAM
- **External storage**(KV store / archival memory)= disk
- LLM **自己决定何时 page in/out**(用 function call:`mem_get` / `mem_set` 等)
- 类似 OS 虚拟内存机制,但 LLM 自主管理

在长对话(deep memory)+ 文档分析(deep document)两类任务上,**显著超过 vanilla LLM**(即使 GPT-4 32K)[[raw/papers/2023-10-memgpt]]。 ^p-2-95317e

## 关键发现 / 论点 ^h-2-2-93d2ce

1. **memory hierarchy 类比 OS** 是有效的 LLM 系统设计抽象 [KB 综合]
2. **LLM 自主管理 memory**(不是外部 controller 决定):用 function call 让 LLM 决定何时 archive / recall [[raw/papers/2023-10-memgpt]]
3. **vs RAG**:RAG 是被动 retrieval(query 触发),MemGPT 是主动 paging(LLM 自决) [KB 综合]
4. **vs HippoRAG 的"hippocampal memory"**:**思想相通但实现不同** — HippoRAG 用 KG + PPR 模拟海马体联想,MemGPT 用 OS 抽象模拟 RAM/disk paging [KB 综合] ^p-3-93afe3

## AI 综合判断 ^h-2-3-3d5f17

### 核心价值 ^h-3-1-eb2f7a

MemGPT 开启了 **"LLM 是 agent 而非函数"** 的范式 — LLM 不仅生成 token,还**主动管理外部资源**(memory / file / tool)。它与 ReAct(agent 框架)+ HippoRAG(记忆模型)共同构成 2023-2024 agent-like RAG 的方法论基础。**MemGPT 与 HippoRAG 的对比有意思**:都用神经/计算系统的记忆比喻(海马体 vs OS),但 HippoRAG 是**static graph + PPR**,MemGPT 是**dynamic paging + function call**——这是 graph-based memory vs OS-based memory 的范式分叉。 [KB 综合] ^p-4-1d1db1

### 关联 ^h-3-2-f856d6

- [[wiki/concepts/rl_augmented_retrieval]] — agentic 范式具体 anchor(虽然 MemGPT 本身不是 RL,但与 R1 派的 agent loop 思想同源)
- [[wiki/sources/hipporag1]] / [[wiki/sources/hipporag2]] — 记忆系统比喻的对照(graph-based vs OS-based)
- [[wiki/sources/react]] — agent function call 框架的前驱 ^p-5-dce390

### 冲突 ^h-3-3-cabb88

**不触发新冲突标注** — MemGPT 是独立范式(memory-augmented),与本 KB 已有 4 主线**正交**。但与 HippoRAG 的"记忆系统比喻"对照有方法论价值,在 [[wiki/concepts/graph_rag]] / [[wiki/concepts/rl_augmented_retrieval]] 相关段可提及。 ^p-6-1f8bac

## 与 Wiki 的关联 ^h-2-4-5a2e99

- MOC:[[wiki/indexes/rag_evolution_index]] Batch 3 ^p-7-8b22fe
