import "server-only";

/**
 * /learn 数据聚合层。
 *
 * Last synced with .claude/skills/kb-ingest/SKILL.md @ 2026-05-11
 *
 * 两个样例：
 *   - research: Attention Is All You Need (Vaswani et al., 2017) —— 经典论文 ingest 演示
 *   - webdev:   React Server Components RFC (Meta, 2020) —— 框架设计文档 ingest 演示
 *
 * 如果修改了 ingest 流程（步骤数 / step 含义 / focusAnchors 语义），请同步检查 _data/research/* 与 _data/webdev/*，
 * 并更新对应 raw md 文件 _data/sources/*.md（锚点编号需保持一致，否则 RawDocPane 高亮会失效）。
 */

export { getResearchSteps, RESEARCH_META } from "./research";
export { getWebdevSteps, WEBDEV_META } from "./webdev";
export type { StepData, Result, SampleId, SampleMeta, ConceptHint } from "./types";
