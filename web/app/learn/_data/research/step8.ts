import "server-only";
import type { StepData } from "../types";

const mocBefore = {
  zh: `## 近期更新 ^h-2-3-deb736

- 2026-04-22: 新增 [[wiki/concepts/dense_retrieval]]
- 2026-04-08: lint W14 — [[wiki/concepts/bm25]] 升 reviewed
- 2026-03-30: 新增 [[wiki/sources/karpukhin2020_dpr]]，更新 [[wiki/concepts/open_domain_qa]]

## 核心概念 ^h-2-4-9c2f81

- [[wiki/concepts/language_model]]
- [[wiki/concepts/parametric_memory]]
- [[wiki/concepts/open_domain_qa]]
- [[wiki/concepts/dense_passage_retrieval]]
- [[wiki/concepts/seq2seq]]
- [[wiki/concepts/hallucination]]
- [[wiki/concepts/bm25]]`,
  en: `## Recent updates ^h-2-3-deb736

- 2026-04-22: added [[wiki/concepts/dense_retrieval]]
- 2026-04-08: lint W14 — [[wiki/concepts/bm25]] promoted to reviewed
- 2026-03-30: added [[wiki/sources/karpukhin2020_dpr]], updated [[wiki/concepts/open_domain_qa]]

## Core concepts ^h-2-4-9c2f81

- [[wiki/concepts/language_model]]
- [[wiki/concepts/parametric_memory]]
- [[wiki/concepts/open_domain_qa]]
- [[wiki/concepts/dense_passage_retrieval]]
- [[wiki/concepts/seq2seq]]
- [[wiki/concepts/hallucination]]
- [[wiki/concepts/bm25]]`,
};

const mocAfter = {
  zh: `## 近期更新 ^h-2-3-deb736

- 2026-05-08: ingest — 新增 [[wiki/sources/rag_lewis_2020]]，新建 [[wiki/concepts/retrieval_augmented_generation]] 与 [[wiki/concepts/dense_passage_retrieval]]，更新 [[wiki/concepts/parametric_memory]] 与 [[wiki/concepts/open_domain_qa]]（含 1 处冲突标注），[[wiki/concepts/seq2seq]] 与 [[wiki/concepts/hallucination]] 标 #to-be-updated
- 2026-04-22: 新增 [[wiki/concepts/dense_retrieval]]
- 2026-04-08: lint W14 — [[wiki/concepts/bm25]] 升 reviewed
- 2026-03-30: 新增 [[wiki/sources/karpukhin2020_dpr]]，更新 [[wiki/concepts/open_domain_qa]]

## 核心概念 ^h-2-4-9c2f81

- [[wiki/concepts/language_model]]
- [[wiki/concepts/parametric_memory]]
- [[wiki/concepts/open_domain_qa]]
- [[wiki/concepts/dense_passage_retrieval]]
- [[wiki/concepts/seq2seq]]
- [[wiki/concepts/hallucination]]
- [[wiki/concepts/retrieval_augmented_generation]] ← 新增
- [[wiki/concepts/bm25]]`,
  en: `## Recent updates ^h-2-3-deb736

- 2026-05-08: ingest — added [[wiki/sources/rag_lewis_2020]], created [[wiki/concepts/retrieval_augmented_generation]] and [[wiki/concepts/dense_passage_retrieval]], updated [[wiki/concepts/parametric_memory]] and [[wiki/concepts/open_domain_qa]] (with one conflict marker), tagged [[wiki/concepts/seq2seq]] and [[wiki/concepts/hallucination]] as #to-be-updated
- 2026-04-22: added [[wiki/concepts/dense_retrieval]]
- 2026-04-08: lint W14 — [[wiki/concepts/bm25]] promoted to reviewed
- 2026-03-30: added [[wiki/sources/karpukhin2020_dpr]], updated [[wiki/concepts/open_domain_qa]]

## Core concepts ^h-2-4-9c2f81

- [[wiki/concepts/language_model]]
- [[wiki/concepts/parametric_memory]]
- [[wiki/concepts/open_domain_qa]]
- [[wiki/concepts/dense_passage_retrieval]]
- [[wiki/concepts/seq2seq]]
- [[wiki/concepts/hallucination]]
- [[wiki/concepts/retrieval_augmented_generation]] ← new
- [[wiki/concepts/bm25]]`,
};

export const step8: StepData = {
  id: 8,
  titleKey: "learn.step.8.title",
  whyKey: "learn.step.8.why",
  whatNoteKey: "learn.cmd.note.edit",
  focusAnchors: [],
  results: [
    {
      kind: "diff",
      before: mocBefore,
      after: mocAfter,
      pseudoPath: "wiki/indexes/nlp_index.md",
    },
  ],
  concepts: [
    { termKey: "learn.concept.moc.title", bodyKey: "learn.concept.moc.body" },
  ],
};
