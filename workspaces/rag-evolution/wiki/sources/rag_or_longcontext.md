---
title: "RAG or Long-Context LLMs? Self-Route Hybrid (Li et al. DeepMind 2024-07)"
type: source_summary
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: draft
confidence: high
source_count: 1
sources:
  - "[[raw/papers/2024-07-rag-or-longcontext]]"
tags:
  - rag
  - long-context
  - hybrid
  - 2024
  - deepmind
  - existential-challenge
---

# RAG or Long-Context LLMs? — DeepMind 路线对比 ^h-1-1-a68f55

> **原始文件**: [[raw/papers/2024-07-rag-or-longcontext]]
> **作者**: Zhuowan Li, Cheng Li, Mingyang Zhang (Google DeepMind), Qiaozhu Mei (UMich), Michael Bendersky (DeepMind)
> **发表**: 2024-07 arXiv preprint
> **arXiv**: [2407.16833](https://arxiv.org/abs/2407.16833) ^p-1-ddb83e

## 摘要 ^h-2-1-811e72

DeepMind 团队系统对比 RAG vs 直接用长上下文 LLM(LC) 处理大文档,核心发现:**只要资源足够,LC consistently outperforms RAG**——Gemini-1.5-Pro 上 +7.6%,GPT-4O 上 **+13.1%**,GPT-3.5-Turbo 上 +3.6%[[raw/papers/2024-07-rag-or-longcontext#^t-33-0c8446]]。这直接挑战整个 RAG 改进方向(Self-RAG / CRAG / GraphRAG 等)的存在合理性。 ^p-2-32eee0

但论文同时承认 **RAG 仍有不可替代价值**:成本显著更低,且当 corpus 超过 model context window 时(如 GPT-3.5-Turbo 16K 上面对 ∞Bench 147K corpus),RAG 反而胜出。论文提出 **Self-Route**:让 LLM 自反思"能否基于 retrieved chunks 回答",能 → 用 RAG(便宜),不能 → 转 LC(贵但准),实测 cost 减 65%(Gemini) / 39%(GPT-4O)而性能逼近 LC[[raw/papers/2024-07-rag-or-longcontext#^h-2-4-6a846e]]。 ^p-3-622050

关键洞察:**RAG 与 LC 在 63% 的 query 上预测完全相同**,70% 差异 <10 分——意味着 RAG 不是性能问题,是"对小部分硬 query 失败" + cost 问题的混合[[raw/papers/2024-07-rag-or-longcontext#^p-38-54f895]]。 ^p-4-145946

## 关键发现 / 论点 ^h-2-2-93d2ce

1. **LC > RAG 在主流任务上**(7 个 LongBench + 2 个 ∞Bench 数据集,3 个最新 LLM 全部验证) [[raw/papers/2024-07-rag-or-longcontext]]
2. **GPT-3.5 在超长 corpus 上 RAG 反超**——specific use case:当 model context window 不够大时 RAG 仍必需[[raw/papers/2024-07-rag-or-longcontext#^p-32-69450f]]
3. **Self-Route 双层路由**:Step 1 = RAG + 让 LLM 决定 answerable;Step 2 = unanswerable 时转 LC。82% query 在 Step 1 就解决(Gemini) [KB 综合]
4. **RAG 失败的 4 类典型场景**[[raw/papers/2024-07-rag-or-longcontext#^h-3-8-c1e8bd]]:
   - (A) Multi-step reasoning(retrieval 一次只能找一跳) [[raw/papers/2024-07-rag-or-longcontext]]
   - (B) 一般性问题(query 太模糊,retrieval 拼凑不出 query) [[raw/papers/2024-07-rag-or-longcontext]]
   - (C) 长复杂查询(retriever 难理解) [[raw/papers/2024-07-rag-or-longcontext]]
   - (D) 隐式查询(需要全文上下文理解) [[raw/papers/2024-07-rag-or-longcontext]]
5. **数据集 leakage 问题**:加 `"based only on the provided passage"` 提示后 LC 性能从 50.57 → 45.53,但趋势不变[[raw/papers/2024-07-rag-or-longcontext#^t-67-570020]]
6. **k 值的非单调成本曲线**:Self-Route 的 cost 在 k=5 附近最低(k 大 → RAG cost 增 + 更多 query 路到 RAG;k 小 → RAG 命中率低,转 LC 增多) [KB 综合] ^p-5-9d5b72

## 方法论 ^h-2-3-f27051

- **数据集**:7 LongBench + 2 ∞Bench(英文、real、query-based,排除 summarization)[[raw/papers/2024-07-rag-or-longcontext]]
- **LLM**:Gemini-1.5-Pro (1M ctx) / GPT-4O (128K) / GPT-3.5-Turbo (16K) [[raw/papers/2024-07-rag-or-longcontext]]
- **Retriever**:Contriever + Dragon(两者结果一致,趋势 generalizable) [[raw/papers/2024-07-rag-or-longcontext]]
- **chunk 大小**:300 词,默认 top-5 [[raw/papers/2024-07-rag-or-longcontext]]
- **Self-Route 实现**:在 prompt 加 `"Write unanswerable if the query can not be answered based on the provided text"`,LLM 自己判定 [KB 综合] ^p-6-12ed92

## 局限性 ^h-2-4-d25123

- **数据集 leakage 难以彻底排除**:Wikipedia-based 数据集很可能被 LLM pretraining 见过,加 prompt 也只是经验缓解[[raw/papers/2024-07-rag-or-longcontext]]
- **成本以 token 数计算,忽略了 retriever 自己的成本**(论文承认) [[raw/papers/2024-07-rag-or-longcontext]]
- **synthetic 数据(PassKey)上 RAG 反而胜 LC**——但小改 query 表述就翻转,说明 synthetic 测试本身有 artifact [[raw/papers/2024-07-rag-or-longcontext]]
- **不同 LLM alignments 影响 Self-Route 表现**——OpenAI 模型更倾向拒答,Gemini 更倾向答 → 不同 cost-perf trade-off [KB 综合]
- **只测 1M token 量级**——不知道在 corpus → ∞ 时 LC 上限在哪 [[raw/papers/2024-07-rag-or-longcontext]] ^p-7-d302ef

## AI 综合判断 ^h-2-5-006953

### 核心价值 ^h-3-1-eb2f7a

这是 2024 RAG 文献中**对整个赛道最严重的质疑**——来自 Gemini 团队、用 Gemini-1.5 自家长上下文模型做对比。它把 RAG 的价值从"准确率优势"重新定义为"**成本优势 + corpus 溢出场景必需**"。**Self-Route 是范式融合的代表**:不再问"RAG 还是 LC",而问"针对这个 query 用 RAG 够吗,不够再上 LC"。这种 hybrid 思路成为后续 2025 RL/agentic RAG 工作的隐含前提。 [KB 综合] ^p-8-d7e5a6

### 关联 ^h-3-2-f856d6

- **冲突注入到 [[wiki/concepts/retrieval_augmented_generation]] 根概念页**——本论文质疑整个 RAG 改进方向(包括 Self-RAG / CRAG / GraphRAG)
- 新建 [[wiki/concepts/rag_vs_long_context]] — 该路线之争的对照页
- vs [[wiki/sources/self_rag]]:Self-RAG 在 PopQA/PubHealth 上的优势,在 LC 模型上可能消失
- vs [[wiki/sources/crag]]:CRAG 的 web search 兜底在 LC 范式下完全无关
- vs [[wiki/sources/graphrag]]:GraphRAG 的 global sensemaking 用例,LC 1M 直接塞 corpus 也能做(但成本巨大)
- MOC [[wiki/indexes/rag_evolution_index]] — 第 4 篇,**首个对整个赛道的存在性挑战** ^p-9-6b0b7a

### 冲突 ^h-3-3-cabb88

**冲突标注已注入到 [[wiki/concepts/retrieval_augmented_generation]]**,论断:

- **旧观点(Self-RAG/CRAG/GraphRAG 隐含)**:RAG 是 LLM 处理大 corpus 的事实标准,各种 RAG 改进都有价值[[raw/papers/2024-07-rag-or-longcontext]]
- **新证据(RAG-or-LC)**:LC consistently > RAG(GPT-4O +13.1%);RAG 应被定位为"成本优化方案"而非"准确率方案";多数 RAG 改进可能在为正被取代的范式做工作 [[raw/papers/2024-07-rag-or-longcontext]]
- **LLM 判断**:这不是 RAG 死亡宣告,而是定位重塑。RAG 的核心价值变成 **成本** 和 **超长 corpus** 两个场景。Self-Route 是合理融合方案。但 LC 的"长上下文是否真理解"仍未完全解答(参考 lost-in-the-middle / leakage 等问题)。 [KB 综合] ^p-10-4e31dc

## 与 Wiki 的关联 ^h-2-6-da27d5

- 影响页面:[[wiki/concepts/retrieval_augmented_generation]] 注入冲突标注 + 新建 [[wiki/concepts/rag_vs_long_context]]
- MOC 归属:[[wiki/indexes/rag_evolution_index]] 第 4 篇
- 触发动作:在 root RAG 概念页注入 `> [!WARNING]` 块,因为冲突针对整个赛道 ^p-11-b0259a
