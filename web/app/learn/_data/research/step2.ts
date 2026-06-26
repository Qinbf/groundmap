import "server-only";
import type { StepData, Localized } from "../types";

const outlineCliOutput: Localized = {
  zh: `文档: raw/papers/_learn_demo/rag_lewis_2020.md
字符数: 8910 | 段数: 40 | 生成于: 2026-05-08

# Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks  [^h-1-1-a7c310]  (line 11, 8910 字符)
  └─ (预览) 我们提出检索增强生成（RAG）——把预训练参数化记忆（BART）与非参数化记忆（DPR + 维基百科索引）结合的通用微调范式。
  ## Abstract  [^h-2-1-b4d217]  (line 17, 430 字符)
    └─ (预览) 大型预训练语言模型把事实知识隐式地存进参数里，但这种参数化记忆难以检视与更新，且倾向幻觉。
  ## Introduction  [^h-2-2-c0712f]  (line 23, 1010 字符)
    └─ (预览) 预训练语言模型在参数中学到大量事实知识——"参数化记忆"——但它无法被检视、无法被定点更新。
  ## Model Architecture  [^h-2-3-d4b201]  (line 35, 4180 字符)
    └─ (预览) RAG 用输入 x 检索文档 z，再把 z 作为生成 y 的额外上下文。两个组件：检索器 p(z|x) + 生成器 p(y|x,z)。
    ### Retriever 与 Generator  [^h-3-1-4f8e29]  (line 42, 620 字符)
      └─ (预览) 检索器采用 DPR bi-encoder（BERT_d / BERT_q），top-K 通过 MIPS（FAISS）求解；索引把维基百科切成 2100 万段落。
    ### 检索机制：把检索当隐变量  [^h-3-2-3d6f0a]  (line 53, 1030 字符)
      └─ (预览) 核心思路：把检索结果作为隐变量、让生成对它求加权和（边缘化），检索器与生成器可联合训练。
    ### RAG-Sequence vs RAG-Token  [^h-3-3-72bef4]  (line 71, 745 字符)
      └─ (预览) RAG-Sequence 用同一文档生成整句；RAG-Token 每个 token 可用不同文档，能融合多段证据。
    ### 训练（联合、无检索监督）  [^h-3-4-91a5d8]  (line 85, 390 字符)
      └─ (预览) 检索器与生成器联合训练，最小化负边缘对数似然，没有任何"该检索哪篇"的直接监督。
    ### 解码与索引热插拔  [^h-3-5-8a2b59]  (line 95, 910 字符)
      └─ (预览) RAG 的知识在非参数化索引里——测试时可直接替换索引来更新世界知识，完全不需要重训模型。
  ## 为什么要检索（vs 纯参数化）  [^h-2-4-be4790]  (line 109, 1030 字符)
    └─ (预览) 沿"知识可更新性 / 可溯源性 / 幻觉倾向"几个维度，对比检索增强与纯参数化（靠 scale 取胜）。
  ## Results  [^h-2-5-09b3ea]  (line 119, 545 字符)
    └─ (预览) RAG 在 NaturalQuestions 达到 44.5 EM，并在 TriviaQA / WebQuestions 上超过抽取式与纯参数化 seq2seq 基线。
  ## Conclusion  [^h-2-6-7da3e1]  (line 129, 485 字符)
    └─ (预览) RAG 是第一个把参数化与非参数化记忆结合用于知识密集型生成的通用范式，非参数化记忆可在不重训下更新。

✓ 文档 8910 字符（约 4500 中文字 < 3 万），分级为 ① 短文——一次 Read 全文，进入第 3 步。
  · 注：上面每个 H 段的「(预览)」是 outline 自动从该段首段截取的前 120 字预览；
    AI 在第 2 步就能基于「标题 + 字符数 + 首段预览」做整体判断，不是只看光秃秃的标题。
  · 完整版（含全部实验配置 + 消融 + 附录）会落入 ② 档：按 H1/H2 切块、每块 ≤3 万分段读，每节读完调 annotate-section 把 (预览) 替换为 (LLM) 精排摘要。`,
  en: `doc: raw/papers/_learn_demo/rag_lewis_2020.md
chars: 8910 | paragraphs: 40 | generated: 2026-05-08

# Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks  [^h-1-1-a7c310]  (line 11, 8910 chars)
  └─ (preview) We propose Retrieval-Augmented Generation (RAG) — a general fine-tuning recipe combining pre-trained parametric memory (BART) with non-parametric memory (DPR + a Wikipedia index).
  ## Abstract  [^h-2-1-b4d217]  (line 17, 430 chars)
    └─ (preview) Large pre-trained LMs store factual knowledge implicitly in their parameters, but this parametric memory is hard to inspect or update and tends to hallucinate.
  ## Introduction  [^h-2-2-c0712f]  (line 23, 1010 chars)
    └─ (preview) Pre-trained LMs learn a lot of factual knowledge in their parameters — "parametric memory" — but it cannot be inspected or surgically updated.
  ## Model Architecture  [^h-2-3-d4b201]  (line 35, 4180 chars)
    └─ (preview) RAG retrieves documents z given input x, then uses z as extra context for generating y. Two components: retriever p(z|x) + generator p(y|x,z).
    ### Retriever and Generator  [^h-3-1-4f8e29]  (line 42, 620 chars)
      └─ (preview) The retriever is a DPR bi-encoder (BERT_d / BERT_q); top-K via MIPS (FAISS); the index splits Wikipedia into 21M passages.
    ### Retrieval as a latent variable  [^h-3-2-3d6f0a]  (line 53, 1030 chars)
      └─ (preview) Key idea: treat retrieval as a latent variable and let generation marginalize (weight-sum) over it, so retriever and generator train jointly.
    ### RAG-Sequence vs RAG-Token  [^h-3-3-72bef4]  (line 71, 745 chars)
      └─ (preview) RAG-Sequence uses one document for the whole answer; RAG-Token may use a different document per token, fusing evidence across passages.
    ### Training (joint, no retrieval supervision)  [^h-3-4-91a5d8]  (line 85, 390 chars)
      └─ (preview) Retriever and generator are trained jointly to minimize the negative marginal log-likelihood — with no direct "which document to retrieve" supervision.
    ### Decoding and hot-swappable index  [^h-3-5-8a2b59]  (line 95, 910 chars)
      └─ (preview) RAG's knowledge lives in a non-parametric index — at test time you can swap the index to update world knowledge with no retraining.
  ## Why retrieve (vs pure parametric)  [^h-2-4-be4790]  (line 109, 1030 chars)
    └─ (preview) Compares retrieval-augmented vs pure-parametric (scale-only) along updatability / traceability / hallucination.
  ## Results  [^h-2-5-09b3ea]  (line 119, 545 chars)
    └─ (preview) RAG reaches 44.5 EM on NaturalQuestions and beats extractive and pure-parametric seq2seq baselines on TriviaQA / WebQuestions.
  ## Conclusion  [^h-2-6-7da3e1]  (line 129, 485 chars)
    └─ (preview) RAG is the first general recipe combining parametric and non-parametric memory for knowledge-intensive generation; the non-parametric memory updates without retraining.

✓ Document is 8910 chars (~4,500 CJK-equivalent < 30k) → tier ① short — Read it whole, go to step 3.
  · Note: the "(preview)" under each H section is the first ~120 chars auto-extracted from that section's opening paragraph;
    at step 2 the AI can already judge from "title + char count + opening preview," not bare titles alone.
  · The full version (all experiment configs + ablations + appendix) would land in tier ②: split by H1/H2, read each ≤30k chunk, and call annotate-section after each section to replace (preview) with an (LLM) polished summary.`,
};

const tierExplanationMarkdown: Localized = {
  zh: `## 三档分级（按中文字符等价；英文 × 0.5 估算）

| 档 | 字数 | 策略 | 本样例 |
|---|---|---|---|
| ① **短文** | < 3 万 | 一次 Read 全文 | ✅ 命中 |
| ② **中长文** | 3 - 15 万 | 按 H1 切块、每块 ≤3 万分段读，每段读完 \`annotate-section\` 精排摘要 | — |
| ③ **整本书规模** | > 15 万 | TOC 扫全 + AI 决定深读章节；**全部章节登记**到「章节深度登记」表（深读 / 扫读 / 跳过），扫读章节保留 partial re-ingest 升级路径 | — |

> **30K 上限的依据**：单次 Read 超过 30K 中文字符会触发 LLM "lost in the middle" 衰减——综合质量下降。所以即便是 1M context 的 Claude Opus，也不在单次塞进太多。

> **本样例的真实情况**：RAG 原论文含完整 DPR / BART 配置、训练细节与多任务实验，约 5-6 万中文字等价，会落入 ② 档。此处展示的「教学演示版」只保留了 Abstract / Intro / Model Architecture / 为什么要检索 / Results / Conclusion 六节核心内容，因此命中 ① 档。`,
  en: `## Three reading tiers (by CJK-character equivalent; English ≈ × 0.5)

| Tier | Size | Strategy | This sample |
|---|---|---|---|
| ① **Short** | < 30k | Read the whole thing at once | ✅ matches |
| ② **Medium/long** | 30k – 150k | Split by H1, read each ≤30k chunk, and \`annotate-section\` a polished summary after each | — |
| ③ **Book-scale** | > 150k | Scan the full TOC + let the AI decide which chapters to read deeply; **register every chapter** in a "chapter depth log" (deep-read / skim / skip), keeping a partial re-ingest upgrade path for skimmed chapters | — |

> **Why the 30k ceiling**: a single Read over ~30k CJK chars triggers the LLM "lost in the middle" decay — synthesis quality drops. So even 1M-context Claude Opus does not cram too much into one read.

> **Reality for this sample**: the actual RAG paper, with full DPR / BART configs, training details, and multi-task experiments, is ~50–60k CJK-equivalent and would fall into tier ②. The "teaching-demo version" shown here keeps only the six core sections (Abstract / Intro / Model Architecture / Why retrieve / Results / Conclusion), so it matches tier ①.`,
};

export const step2: StepData = {
  id: 2,
  titleKey: "learn.step.2.title",
  whyKey: "learn.step.2.why",
  whatCommand: "python scripts/k.py outline raw/papers/_learn_demo/rag_lewis_2020.md",
  whatNoteKey: "learn.cmd.note.outline",
  focusAnchors: [
    "h-2-1-b4d217",
    "h-2-2-c0712f",
    "h-2-3-d4b201",
    "h-2-4-be4790",
    "h-2-5-09b3ea",
    "h-2-6-7da3e1",
  ],
  results: [
    { kind: "outline-cli", content: outlineCliOutput },
    {
      kind: "markdown",
      content: tierExplanationMarkdown,
      captionKey: "learn.caption.tier_table",
    },
  ],
};
