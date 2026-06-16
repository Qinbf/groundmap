import "server-only";
import type { StepData } from "../types";

const mocBefore = `## 近期更新 ^h-2-4-7c12bd

- 2026-04-30: 新增 [[wiki/concepts/htmx]] 与 [[wiki/sources/htmx_official_intro]]
- 2026-04-15: lint W15 — [[wiki/concepts/css_modules]] 升 reviewed
- 2026-04-02: 新增 [[wiki/sources/dan_abramov_use_effect]]

## 核心概念 ^h-2-5-d2c1ea

- [[wiki/concepts/server_component]]
- [[wiki/concepts/component_model]]
- [[wiki/concepts/data_fetching]]
- [[wiki/concepts/rendering_strategies]]
- [[wiki/concepts/bundle_optimization]]
- [[wiki/concepts/file_routing]]
- [[wiki/concepts/css_modules]]
- [[wiki/concepts/htmx]]`;

const mocAfter = `## 近期更新 ^h-2-4-7c12bd

- 2026-05-08: ingest — 新增 [[wiki/sources/react_server_components_rfc]]，重写 [[wiki/concepts/server_component]] 加入两态模型 + 三条交互规则，[[wiki/concepts/data_fetching]] 加 RSC 范式节，[[wiki/concepts/rendering_strategies]] 加 RSC 行（含 1 处冲突标注），[[wiki/concepts/component_model]] 与 [[wiki/concepts/bundle_optimization]] 标 #to-be-updated
- 2026-04-30: 新增 [[wiki/concepts/htmx]] 与 [[wiki/sources/htmx_official_intro]]
- 2026-04-15: lint W15 — [[wiki/concepts/css_modules]] 升 reviewed
- 2026-04-02: 新增 [[wiki/sources/dan_abramov_use_effect]]

## 核心概念 ^h-2-5-d2c1ea

- [[wiki/concepts/server_component]] ← **重写为两态模型**
- [[wiki/concepts/component_model]]
- [[wiki/concepts/data_fetching]]
- [[wiki/concepts/rendering_strategies]]
- [[wiki/concepts/bundle_optimization]]
- [[wiki/concepts/file_routing]]
- [[wiki/concepts/css_modules]]
- [[wiki/concepts/htmx]]`;

export const step8: StepData = {
  id: 8,
  titleKey: "learn.step.8.title",
  whyKey: "learn.step.8.why",
  whatNoteKey: "learn.cmd.note.edit",
  focusAnchors: [],
  results: [
    { kind: "diff", before: mocBefore, after: mocAfter, pseudoPath: "wiki/indexes/web_dev_index.md" },
  ],
  concepts: [
    { termKey: "learn.concept.moc.title", bodyKey: "learn.concept.moc.body" },
  ],
};
