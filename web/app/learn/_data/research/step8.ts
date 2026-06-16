import "server-only";
import type { StepData } from "../types";

const mocBefore = `## 近期更新 ^h-2-3-deb736

- 2026-04-22: 新增 [[wiki/concepts/batch_normalization]]
- 2026-04-08: lint W14 — [[wiki/concepts/dropout]] 升 reviewed
- 2026-03-30: 新增 [[wiki/sources/he2015_resnet]]，更新 [[wiki/concepts/residual_connection]]

## 核心概念 ^h-2-4-9c2f81

- [[wiki/concepts/backpropagation]]
- [[wiki/concepts/gradient_descent]]
- [[wiki/concepts/attention_mechanism]]
- [[wiki/concepts/sequence_modeling]]
- [[wiki/concepts/encoder_decoder]]
- [[wiki/concepts/lstm]]
- [[wiki/concepts/residual_connection]]`;

const mocAfter = `## 近期更新 ^h-2-3-deb736

- 2026-05-08: ingest — 新增 [[wiki/sources/attention_is_all_you_need]]，新建 [[wiki/concepts/transformer]] 与 [[wiki/concepts/positional_encoding]]，更新 [[wiki/concepts/attention_mechanism]] 与 [[wiki/concepts/sequence_modeling]]（含 1 处冲突标注），[[wiki/concepts/encoder_decoder]] 与 [[wiki/concepts/lstm]] 标 #to-be-updated
- 2026-04-22: 新增 [[wiki/concepts/batch_normalization]]
- 2026-04-08: lint W14 — [[wiki/concepts/dropout]] 升 reviewed
- 2026-03-30: 新增 [[wiki/sources/he2015_resnet]]，更新 [[wiki/concepts/residual_connection]]

## 核心概念 ^h-2-4-9c2f81

- [[wiki/concepts/backpropagation]]
- [[wiki/concepts/gradient_descent]]
- [[wiki/concepts/attention_mechanism]]
- [[wiki/concepts/sequence_modeling]]
- [[wiki/concepts/encoder_decoder]]
- [[wiki/concepts/lstm]]
- [[wiki/concepts/transformer]] ← 新增
- [[wiki/concepts/positional_encoding]] ← 新增
- [[wiki/concepts/residual_connection]]`;

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
      pseudoPath: "wiki/indexes/deep_learning_index.md",
    },
  ],
  concepts: [
    { termKey: "learn.concept.moc.title", bodyKey: "learn.concept.moc.body" },
  ],
};
