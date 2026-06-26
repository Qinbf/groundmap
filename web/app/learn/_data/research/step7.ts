import "server-only";
import type { StepData } from "../types";

const seqBefore = {
  zh: `---
title: "Seq2Seq"
type: concept
created_date: 2025-07-08
last_modified: 2026-02-04
last_modified_by: LLM
confidence: high
source_count: 3
---

# Seq2Seq

Sequence-to-Sequence（Sutskever et al., 2014）用 encoder 压缩输入、decoder 自回归生成输出。BART / T5 是其预训练去噪变种。

## 典型应用

机器翻译、摘要、问答生成。`,
  en: `---
title: "Seq2Seq"
type: concept
created_date: 2025-07-08
last_modified: 2026-02-04
last_modified_by: LLM
confidence: high
source_count: 3
---

# Seq2Seq

Sequence-to-Sequence (Sutskever et al., 2014) compresses the input with an encoder and autoregressively generates the output with a decoder. BART / T5 are its pre-trained denoising variants.

## Typical applications

Machine translation, summarization, question generation.`,
};

const seqAfter = {
  zh: `---
title: "Seq2Seq"
type: concept
created_date: 2025-07-08
last_modified: 2026-02-04
last_modified_by: LLM
confidence: high
source_count: 3
---

# Seq2Seq

Sequence-to-Sequence（Sutskever et al., 2014）用 encoder 压缩输入、decoder 自回归生成输出。BART / T5 是其预训练去噪变种。

## 典型应用

机器翻译、摘要、问答生成。

---
#to-be-updated 2026-05-08: 因 [[wiki/sources/rag_lewis_2020]] 把 BART 用作"检索增强生成器"，需要在「典型应用」节补充一条：作为 RAG 的参数化生成组件——把检索文档与输入拼接后生成答案。`,
  en: `---
title: "Seq2Seq"
type: concept
created_date: 2025-07-08
last_modified: 2026-02-04
last_modified_by: LLM
confidence: high
source_count: 3
---

# Seq2Seq

Sequence-to-Sequence (Sutskever et al., 2014) compresses the input with an encoder and autoregressively generates the output with a decoder. BART / T5 are its pre-trained denoising variants.

## Typical applications

Machine translation, summarization, question generation.

---
#to-be-updated 2026-05-08: Because [[wiki/sources/rag_lewis_2020]] uses BART as a "retrieval-augmented generator," the "Typical applications" section needs a new entry: serving as RAG's parametric generation component — generating the answer after concatenating the retrieved documents with the input.`,
};

const halBefore = {
  zh: `---
title: "幻觉 Hallucination"
type: concept
created_date: 2025-06-20
last_modified: 2026-01-10
last_modified_by: LLM
confidence: high
source_count: 4
---

# 幻觉

语言模型生成**听起来流畅、实则与事实不符**的内容。

## 成因

- 参数化记忆覆盖不到的长尾事实
- 训练目标是"流畅"而非"真实"
- 缺乏外部事实约束

## 常见缓解

- 更大模型 / 更多数据
- RLHF 对齐`,
  en: `---
title: "Hallucination"
type: concept
created_date: 2025-06-20
last_modified: 2026-01-10
last_modified_by: LLM
confidence: high
source_count: 4
---

# Hallucination

When a language model produces content that **sounds fluent but is factually wrong**.

## Causes

- Long-tail facts not covered by parametric memory
- The training objective rewards "fluency," not "truth"
- No external factual grounding

## Common mitigations

- Bigger models / more data
- RLHF alignment`,
};

const halAfter = {
  zh: `---
title: "幻觉 Hallucination"
type: concept
created_date: 2025-06-20
last_modified: 2026-01-10
last_modified_by: LLM
confidence: high
source_count: 4
---

# 幻觉

语言模型生成**听起来流畅、实则与事实不符**的内容。

## 成因

- 参数化记忆覆盖不到的长尾事实
- 训练目标是"流畅"而非"真实"
- 缺乏外部事实约束

## 常见缓解

- 更大模型 / 更多数据
- RLHF 对齐

---
#to-be-updated 2026-05-08: 因 [[wiki/sources/rag_lewis_2020]] 给出"检索增强让答案显式依赖被检索段落、从而减少幻觉"的新证据，需要在「常见缓解」节加一条"检索增强（RAG）"——这是与"做大模型"正交的缓解路径。`,
  en: `---
title: "Hallucination"
type: concept
created_date: 2025-06-20
last_modified: 2026-01-10
last_modified_by: LLM
confidence: high
source_count: 4
---

# Hallucination

When a language model produces content that **sounds fluent but is factually wrong**.

## Causes

- Long-tail facts not covered by parametric memory
- The training objective rewards "fluency," not "truth"
- No external factual grounding

## Common mitigations

- Bigger models / more data
- RLHF alignment

---
#to-be-updated 2026-05-08: Because [[wiki/sources/rag_lewis_2020]] provides new evidence that "retrieval augmentation makes the answer explicitly depend on retrieved passages, thereby reducing hallucination," the "Common mitigations" section needs an entry "retrieval augmentation (RAG)" — a path orthogonal to "make the model bigger."`,
};

export const step7: StepData = {
  id: 7,
  titleKey: "learn.step.7.title",
  whyKey: "learn.step.7.why",
  whatNoteKey: "learn.cmd.note.edit",
  focusAnchors: ["h-2-3-d4b201", "p-8-1be4a3"],
  results: [
    {
      kind: "diff",
      before: seqBefore,
      after: seqAfter,
      pseudoPath: "wiki/concepts/seq2seq.md",
    },
    {
      kind: "diff",
      before: halBefore,
      after: halAfter,
      pseudoPath: "wiki/concepts/hallucination.md",
    },
  ],
  concepts: [
    { termKey: "learn.concept.to_be_updated.title", bodyKey: "learn.concept.to_be_updated.body" },
  ],
};
