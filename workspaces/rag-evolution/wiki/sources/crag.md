---
title: "CRAG: Corrective Retrieval Augmented Generation"
type: source_summary
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: draft
confidence: high
source_count: 1
sources:
  - "[[raw/papers/2024-01-crag]]"
tags:
  - rag
  - corrective-rag
  - retrieval-evaluator
  - web-search
  - 2024
---

# CRAG: Corrective Retrieval Augmented Generation ^h-1-1-69651a

> **原始文件**: [[raw/papers/2024-01-crag]]
> **作者**: Shi-Qi Yan (USTC), Jia-Chen Gu (UCLA), Yun Zhu (Google DeepMind), Zhen-Hua Ling (USTC)
> **发表**: 2024-01 arXiv preprint
> **arXiv**: [2401.15884](https://arxiv.org/abs/2401.15884) ^p-1-a06f60

## 摘要 ^h-2-1-811e72

CRAG 解决 vanilla RAG 与 Self-RAG 都没有正面处理的问题:**当检索结果本身错的怎么办**。它引入一个**轻量级 retrieval evaluator**(T5-large fine-tuned,0.77B 参数)对每个检索文档打质量分,基于分数触发三档 action:**Correct**(refine 后使用)/ **Incorrect**(扔掉,改用 web search)/ **Ambiguous**(两者合并)[[raw/papers/2024-01-crag#^h-2-4-b13f23]]。 ^p-2-04adb2

关键创新:**decompose-then-recompose 知识精炼算法**——把检索文档切成 knowledge strips,evaluator 单独打分,过滤后重组,精确控制送入 generator 的内容粒度[[raw/papers/2024-01-crag#^h-3-4-ba97f2]]。另一关键:**用 Google Search API 做 web search 兜底**,解决静态 corpus 知识不全的问题[[raw/papers/2024-01-crag#^h-3-5-6b60fa]]。 ^p-3-e897d2

CRAG 是**plug-and-play 的**——既可叠在 vanilla RAG 上(称 CRAG),也可叠在 Self-RAG 上(称 Self-CRAG)。Self-CRAG 在 4 个数据集上**全面超过 Self-RAG**:LLaMA2-7B base 上 PopQA +20.0% / Bio +36.9%;SelfRAG-LLaMA2-7B base 上 PopQA +6.9% / Bio +5.0%[[raw/papers/2024-01-crag#^t-61-e54a35]]。 ^p-4-149c64

## 关键发现 / 论点 ^h-2-2-93d2ce

1. **首次显式研究"retriever 出错时怎么办"**——论文明确这是"to the best of our knowledge, the first attempt to design corrective strategies for RAG"[[raw/papers/2024-01-crag#^p-26-3fa906]]
2. **外部 lightweight evaluator(T5-large 0.77B)优于内化 critic(Llama2-7B)**——论文直接对比 Self-RAG 的 critic 模型,指出 0.77B vs 7B 的成本差异[[raw/papers/2024-01-crag#^p-33-cfbe40]]
3. **三档 action 触发**(Correct / Incorrect / Ambiguous):Ambiguous 这一档对缓解 evaluator 误判至关重要,论文 ablation 说明若只有 Correct + Incorrect,效果对 evaluator 准确率非常敏感[[raw/papers/2024-01-crag#^p-58-471b3b]]
4. **decompose-then-recompose**:把检索文档拆成 knowledge strips,单独评分过滤——这是 Self-RAG 完全没做的细粒度控制 [[raw/papers/2024-01-crag]]
5. **Web search 兜底**:静态 corpus 缺失时,直接走 Google Search + 用 ChatGPT 改写 query 为关键词形式[[raw/papers/2024-01-crag#^p-60-81694b]]
6. **Self-CRAG > Self-RAG**(关键论断):在 LLaMA2-7B base 上 Bio FactScore 从 32.2 提到 69.1(+36.9%);在 SelfRAG-LLaMA2-7B base 上 Bio 从 81.2 提到 86.2(+5.0%)[[raw/papers/2024-01-crag#^t-61-e54a35]] ^p-5-e1e0e1

## 方法论 ^h-2-3-f27051

- **Retrieval Evaluator**:T5-large fine-tuned。正样本用数据集自带的金标 wiki 段落(如 PopQA 提供 subject wiki title);负样本随机采自 retrieval 结果中相似但不相关的段落 [[raw/papers/2024-01-crag]]
- **三档阈值**:upper / lower 两个阈值切出三档;论文未明确数值,见 Appendix B [KB 观察]
- **Web Search**:Google Search API + ChatGPT rewrite query;过滤偏向 Wikipedia 等 authoritative 来源 [[raw/papers/2024-01-crag]]
- **数据集**:PopQA / Biography / PubHealth / Arc-Challenge(完全对齐 Self-RAG 的评测设置,便于直接对比)[[raw/papers/2024-01-crag#^h-3-6-2a7068]]
- **Generator 不动**:CRAG 不训新 LM,直接复用 Self-RAG / LLaMA2 等现成 generator [[raw/papers/2024-01-crag]] ^p-6-25ffb6

## 局限性 ^h-2-4-d25123

- **依赖 Google Search API**:工程实现需要外部 API、有成本、且实验结果可能受 Google 索引变化影响 [[raw/papers/2024-01-crag]]
- **额外 inference 开销**:每个检索结果都要过一遍 evaluator + 多次 LLM 调用(query 改写、knowledge refine) [[raw/papers/2024-01-crag]]
- **evaluator 准确率上限**:T5-large 在长文本细粒度判断上有天然能力上限,Section 5.5 ablation 显示 evaluator 准确率显著影响整体效果 [[raw/papers/2024-01-crag]]
- **Self-CRAG 是 CRAG + Self-RAG 的组合**——不算独立架构,实际是"借 Self-RAG 的 generator + 外加 CRAG 的 evaluator/web search 一层"[[raw/papers/2024-01-crag#^p-70-9caaea]] ^p-7-2b7ad8

## AI 综合判断 ^h-2-5-006953

### 核心价值 ^h-3-1-eb2f7a

CRAG 把 RAG 改进的焦点**从"模型自决"切到"检索质量本身可信吗"**——这是与 Self-RAG 互补但路径不同的方向。Self-RAG 处理"要不要检索/检索完怎么用",CRAG 处理"检索完了怎么知道结果对不对、对不对的时候怎么换源"。引入 **web search 兜底**和**knowledge strip 级精炼**是后续工作大量复用的工程模式。**最重要的实验论断**:Self-CRAG > Self-RAG,意味着 Self-RAG 把 critic 内化的设计不充分,外部 evaluator 仍然能再加一层显著收益。 [KB 综合] ^p-8-e46c7d

### 关联 ^h-3-2-f856d6

- 概念页 [[wiki/concepts/retrieval_augmented_generation]] — 本文继续把"基础 RAG"概念扩展(加入"retrieval correctness"维度)
- 概念页 [[wiki/concepts/self_reflective_rag]] — 本文与之**路径不同但结果可叠加**;在该页注入了冲突标注
- 概念页 [[wiki/concepts/corrective_rag]] — 本文是该范式的原始定义
- MOC [[wiki/indexes/rag_evolution_index]] — 第 2 篇,与 #1 形成 RAG 演化首个"路径之争" ^p-9-1c85c4

### 冲突 ^h-3-3-cabb88

**与 [[wiki/sources/self_rag]] 的两个核心冲突已标注在 [[wiki/concepts/self_reflective_rag]] 页**(见该页"⚠ 知识更新冲突"块):

1. **"critic 是否应内化"**:Self-RAG 主张内化(critic-distillation 到 generator);CRAG 主张外部 lightweight evaluator(0.77B 显著优于 7B critic)[[raw/papers/2024-01-crag]]
2. **"自反思能否处理 retriever 本身出错"**:Self-RAG 没正面处理;CRAG 通过 web search 兜底 + decompose-then-recompose 解决,且 Self-CRAG > Self-RAG 在 4 个数据集上 [[raw/papers/2024-01-crag]]

**对未来 ingest 的预言**:CRAG 的"加 evaluator 外挂"路线 vs Self-RAG 的"训新 LM"路线之争,会在 2025 [[wiki/sources/search_r1]] / [[wiki/sources/r1_searcher]] 被 RL 范式重新定义——届时这两条路线可能都被"用 RL 直接训 retrieval + reasoning 链路"超越。 ^p-10-8b65c6

## 与 Wiki 的关联 ^h-2-6-da27d5

- 影响页面:[[wiki/concepts/self_reflective_rag]](注入冲突标注)、[[wiki/concepts/retrieval_augmented_generation]]、[[wiki/concepts/corrective_rag]]
- MOC 归属:[[wiki/indexes/rag_evolution_index]] 第 2 篇
- 触发动作:在 [[wiki/concepts/self_reflective_rag]] 写入 `> [!WARNING]` 冲突标注块 ^p-11-818932
