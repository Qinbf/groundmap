import "server-only";
import type { StepData } from "../types";

const logEntry = `## [2026-05-08] ingest | React Server Components RFC (Meta, 2020-12 首发 / 2023 stable)

- 来源：\`raw/articles/_learn_demo/react_server_components_rfc.md\`（约 6900 字符 / 43 段 / 6 个 H2）
- 分级：① 短文（教学演示节选；完整 PR #188 + 讨论历史属于 ③ 整本书规模）
- 阅读：① 档短文一次 Read 全文（\`annotate-section\` 为 ②③ 档分段阅读的必经步骤，① 档不强制）
- 新建：[[wiki/sources/react_server_components_rfc]]（含 1 处冲突标注：SSR-vs-bundle-size 论断）
- 更新：
  - [[wiki/concepts/server_component]] 重写为两态组件模型 + 三条交互规则（含完整对照表）
  - [[wiki/concepts/data_fetching]] 加"RSC 时代 async component"节，重新评估 Waterfall / 加载样板问题
  - [[wiki/concepts/rendering_strategies]] 加 RSC 行 + SSR-vs-RSC 关键区分节
- 标记待更新：
  - [[wiki/concepts/component_model]] 待补「2020+ 两态模型」演进史节点
  - [[wiki/concepts/bundle_optimization]] 待补「Server Component」优化路径
- MOC：[[wiki/indexes/web_dev_index]] 加"近期更新"一条 + 核心概念节标记 server_component 已重写
- 验证：\`k.py list-broken-refs\` 0 处失效；新冲突待 lint 流程处理
`;

export const step9: StepData = {
  id: 9,
  titleKey: "learn.step.9.title",
  whyKey: "learn.step.9.why",
  whatNoteKey: "learn.cmd.note.edit",
  focusAnchors: [],
  results: [
    {
      kind: "markdown",
      content: logEntry,
      pseudoPath: "log.md",
      captionKey: "learn.caption.log_prepend",
    },
  ],
};
