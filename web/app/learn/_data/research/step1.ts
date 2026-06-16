import "server-only";
import type { StepData } from "../types";

const articleExcerpt = `---
title: "Attention Is All You Need"
authors: "Vaswani et al."
venue: "NeurIPS 2017 (arXiv:1706.03762)"
created: 2026-05-08
---

# Attention Is All You Need ^h-1-1-a7c310

我们提出一种全新的序列转导网络架构 —— **Transformer**，完全建立在注意力机制之上，彻底抛弃了循环与卷积。在 WMT 2014 英德翻译任务上达到 28.4 BLEU…… ^p-1-3e8c92

## Introduction ^h-2-2-c0712f

循环神经网络 —— 尤其是 LSTM 和 GRU —— 长期以来都是序列建模的当然之选。这些模型沿序列位置顺序计算……固有的顺序性阻断了训练时跨样本的并行化。 ^p-4-2c8a91

## Model Architecture ^h-2-3-d4b201

大多数有竞争力的神经序列转导模型都遵循 encoder-decoder 结构……Transformer 沿用这个总体结构，但 encoder 与 decoder 两边都采用**堆叠的自注意力与逐位置全连接层**。 ^p-9-7c305d
`;

const outlineJsonExcerpt = `\`\`\`json
{
  "doc_path": "raw/papers/_learn_demo/attention_is_all_you_need.md",
  "doc_chars": 8742,
  "doc_paragraphs": 40,
  "generated_at": "2026-05-08T10:14:33",
  "sections": [
    {
      "level": 1, "seq": 1, "anchor": "h-1-1-a7c310",
      "title": "Attention Is All You Need",
      "line": 11, "char_start": 0, "char_end": 8742,
      "children": [
        { "level": 2, "seq": 1, "anchor": "h-2-1-b4d217", "title": "Abstract" },
        { "level": 2, "seq": 2, "anchor": "h-2-2-c0712f", "title": "Introduction" },
        {
          "level": 2, "seq": 3, "anchor": "h-2-3-d4b201", "title": "Model Architecture",
          "children": [
            { "level": 3, "seq": 1, "anchor": "h-3-1-4f8e29", "title": "Encoder and Decoder Stacks" },
            { "level": 3, "seq": 2, "anchor": "h-3-2-3d6f0a", "title": "Attention" },
            { "level": 3, "seq": 3, "anchor": "h-3-3-72bef4", "title": "Multi-Head Attention" },
            { "level": 3, "seq": 4, "anchor": "h-3-4-91a5d8", "title": "Position-wise Feed-Forward Networks" },
            { "level": 3, "seq": 5, "anchor": "h-3-5-8a2b59", "title": "Positional Encoding" }
          ]
        },
        { "level": 2, "seq": 4, "anchor": "h-2-4-be4790", "title": "Why Self-Attention" },
        { "level": 2, "seq": 5, "anchor": "h-2-5-09b3ea", "title": "Results" },
        { "level": 2, "seq": 6, "anchor": "h-2-6-7da3e1", "title": "Conclusion" }
      ]
    }
  ]
}
\`\`\``;

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
      pseudoPath: "raw/papers/_learn_demo/attention_is_all_you_need.md",
    },
    {
      kind: "markdown",
      content: outlineJsonExcerpt,
      pseudoPath: "raw/papers/_learn_demo/attention_is_all_you_need.outline.json",
    },
  ],
  concepts: [
    { termKey: "learn.concept.markdown.title", bodyKey: "learn.concept.markdown.body" },
    { termKey: "learn.concept.anchor.title", bodyKey: "learn.concept.anchor.body" },
  ],
};
