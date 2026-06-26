import "server-only";

/**
 * /learn 数据聚合层。
 *
 * Last synced with .claude/skills/kb-ingest/SKILL.md @ 2026-05-11
 *
 * 单样例（教学只用一个最普适的例子——论文是"放进知识库"最典型的文档类型）：
 *   - research: Retrieval-Augmented Generation (Lewis et al., 2020) —— RAG 奠基论文 ingest 演示
 *
 * 如果修改了 ingest 流程（步骤数 / step 含义 / focusAnchors 语义），请同步检查 _data/research/*，
 * 并更新对应 raw md 文件 _data/sources/rag_lewis_2020.md（锚点编号需保持一致，否则 RawDocPane 高亮会失效）。
 */

export { getResearchSteps, RESEARCH_META } from "./research";
export type { StepData, Result, SampleId, SampleMeta, ConceptHint } from "./types";
