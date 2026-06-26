import "server-only";
import type { StepData, Localized } from "../types";

const articleExcerpt: Localized = {
  zh: `---
title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks"
authors: "Lewis et al."
venue: "NeurIPS 2020 (arXiv:2005.11401)"
created: 2026-05-08
---

# Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks ^h-1-1-a7c310

我们提出 **检索增强生成（RAG）**——把预训练参数化记忆（seq2seq 模型 BART）与非参数化记忆（用 DPR 访问的维基百科稠密向量索引）结合的通用微调范式。在开放域问答上刷新 SOTA…… ^p-1-3e8c92

## Introduction ^h-2-2-c0712f

预训练语言模型把事实知识隐式地存进**参数**里——"参数化记忆"。但它无法被检视、无法被定点更新，且在长尾事实上倾向幻觉。 ^p-4-2c8a91

## Model Architecture ^h-2-3-d4b201

为了端到端训练，我们把"检索到的文档"当作**隐变量**并对它**边缘化**……两种边缘化方式对应 RAG-Sequence 与 RAG-Token。 ^p-9-7c305d
`,
  en: `---
title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks"
authors: "Lewis et al."
venue: "NeurIPS 2020 (arXiv:2005.11401)"
created: 2026-05-08
---

# Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks ^h-1-1-a7c310

We propose **Retrieval-Augmented Generation (RAG)** — a general fine-tuning recipe that combines pre-trained *parametric* memory (the seq2seq model BART) with *non-parametric* memory (a dense vector index over Wikipedia, accessed via DPR). RAG sets a new state of the art on open-domain question answering… ^p-1-3e8c92

## Introduction ^h-2-2-c0712f

Pre-trained language models store factual knowledge implicitly in their **parameters** — "parametric memory." But that knowledge cannot be inspected or surgically updated, and the model tends to hallucinate on long-tail facts. ^p-4-2c8a91

## Model Architecture ^h-2-3-d4b201

For end-to-end training we treat the retrieved document as a **latent variable** and **marginalize** over it… the two ways of marginalizing correspond to RAG-Sequence and RAG-Token. ^p-9-7c305d
`,
};

const outlineJsonExcerpt: Localized = {
  zh: `\`\`\`json
{
  "doc_path": "raw/papers/_learn_demo/rag_lewis_2020.md",
  "doc_chars": 8910,
  "doc_paragraphs": 40,
  "generated_at": "2026-05-08T10:14:33",
  "sections": [
    {
      "level": 1, "seq": 1, "anchor": "h-1-1-a7c310",
      "title": "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
      "line": 11, "char_start": 0, "char_end": 8910,
      "children": [
        { "level": 2, "seq": 1, "anchor": "h-2-1-b4d217", "title": "Abstract" },
        { "level": 2, "seq": 2, "anchor": "h-2-2-c0712f", "title": "Introduction" },
        {
          "level": 2, "seq": 3, "anchor": "h-2-3-d4b201", "title": "Model Architecture",
          "children": [
            { "level": 3, "seq": 1, "anchor": "h-3-1-4f8e29", "title": "Retriever 与 Generator" },
            { "level": 3, "seq": 2, "anchor": "h-3-2-3d6f0a", "title": "检索机制：把检索当隐变量" },
            { "level": 3, "seq": 3, "anchor": "h-3-3-72bef4", "title": "RAG-Sequence vs RAG-Token" },
            { "level": 3, "seq": 4, "anchor": "h-3-4-91a5d8", "title": "训练（联合、无检索监督）" },
            { "level": 3, "seq": 5, "anchor": "h-3-5-8a2b59", "title": "解码与索引热插拔" }
          ]
        },
        { "level": 2, "seq": 4, "anchor": "h-2-4-be4790", "title": "为什么要检索（vs 纯参数化）" },
        { "level": 2, "seq": 5, "anchor": "h-2-5-09b3ea", "title": "Results" },
        { "level": 2, "seq": 6, "anchor": "h-2-6-7da3e1", "title": "Conclusion" }
      ]
    }
  ]
}
\`\`\``,
  en: `\`\`\`json
{
  "doc_path": "raw/papers/_learn_demo/rag_lewis_2020.md",
  "doc_chars": 8910,
  "doc_paragraphs": 40,
  "generated_at": "2026-05-08T10:14:33",
  "sections": [
    {
      "level": 1, "seq": 1, "anchor": "h-1-1-a7c310",
      "title": "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
      "line": 11, "char_start": 0, "char_end": 8910,
      "children": [
        { "level": 2, "seq": 1, "anchor": "h-2-1-b4d217", "title": "Abstract" },
        { "level": 2, "seq": 2, "anchor": "h-2-2-c0712f", "title": "Introduction" },
        {
          "level": 2, "seq": 3, "anchor": "h-2-3-d4b201", "title": "Model Architecture",
          "children": [
            { "level": 3, "seq": 1, "anchor": "h-3-1-4f8e29", "title": "Retriever and Generator" },
            { "level": 3, "seq": 2, "anchor": "h-3-2-3d6f0a", "title": "Retrieval as a latent variable" },
            { "level": 3, "seq": 3, "anchor": "h-3-3-72bef4", "title": "RAG-Sequence vs RAG-Token" },
            { "level": 3, "seq": 4, "anchor": "h-3-4-91a5d8", "title": "Training (joint, no retrieval supervision)" },
            { "level": 3, "seq": 5, "anchor": "h-3-5-8a2b59", "title": "Decoding and hot-swappable index" }
          ]
        },
        { "level": 2, "seq": 4, "anchor": "h-2-4-be4790", "title": "Why retrieve (vs pure parametric)" },
        { "level": 2, "seq": 5, "anchor": "h-2-5-09b3ea", "title": "Results" },
        { "level": 2, "seq": 6, "anchor": "h-2-6-7da3e1", "title": "Conclusion" }
      ]
    }
  ]
}
\`\`\``,
};

export const step1: StepData = {
  id: 1,
  titleKey: "learn.step.1.title",
  whyKey: "learn.step.1.why",
  whatCommand: "python scripts/convert.py",
  whatNoteKey: "learn.cmd.note.convert",
  focusAnchors: ["h-1-1-a7c310", "p-1-3e8c92"],
  results: [
    {
      kind: "markdown",
      content: articleExcerpt,
      pseudoPath: "raw/papers/_learn_demo/rag_lewis_2020.md",
    },
    {
      kind: "markdown",
      content: outlineJsonExcerpt,
      pseudoPath: "raw/papers/_learn_demo/rag_lewis_2020.outline.json",
    },
  ],
  concepts: [
    { termKey: "learn.concept.markdown.title", bodyKey: "learn.concept.markdown.body" },
    { termKey: "learn.concept.anchor.title", bodyKey: "learn.concept.anchor.body" },
  ],
};
