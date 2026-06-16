import "server-only";
import type { StepData } from "../types";

const recallMechanismMarkdown = `## 为什么要搜多次？召回兜底的 4 层机制

只靠 \`k.py search\` 的字面 substring 匹配（标题 ×5 + 正文 ×1）会漏掉**语义相近但用词不同**的内容——比如 RFC 用「Server Component」，老 wiki 页用「服务端渲染组件」/「不水合组件」，字面 search 命中不到。系统通过 4 层机制对冲：

| 层 | 机制 | 在本步的体现 |
|---|---|---|
| ① **多 query 自决** | AI 同时搜多个相关 term + 已知同义词，三角覆盖互补 | 上方 whatCommand：同时搜 "Server Component" / "data fetching" / "SSR rendering"，互相补漏 |
| ② **backlinks/outlinks 扩散** | 命中页 → 反查引用关系 → 拉到关联页 | 命中 \`server_component.md\` 后调 \`k.py backlinks\` / \`outlinks\`，顺藤摸到 \`rendering_strategies.md\` / \`component_model.md\` 等关联页（即使没 search 命中） |
| ③ **MOC 结构性回链** | MOC 列出该领域所有重要页面，命中 MOC 后能拿到完整列表 | 第 8 步要更新 [[wiki/indexes/web_dev_index]]——它本质就是「补字面召回漏洞」的备用网，下次同领域 query 通过 MOC 召回 |
| ④ **agent 语义二次判断** | 召回页用 \`read-section\` 轻读，AI 自己判断是否相关 | 即使关键词错配、回来的页不那么准，AI 读完页面内容能补救——这是 \`知识库不内嵌 LLM、但流程依赖外部 agent\` 的根本原因 |

### 为什么不直接上 embedding 召回？

CLAUDE.md 原则 4「严禁 embedding」是刻意取舍：

- 引入 embedding = 切片粒度 + 向量库 + 模型版本一致性 + 持续维护成本
- 在「完整页面优先」（原则 3）前提下，**LLM 自身的语义理解能在阅读时补足 BM25 召回的精度劣势**
- 用召回率换**简单性 / 可解释性 / 长期维护性**——代价是依赖 agent 多次搜 + MOC 兜底来逼近高召回
`;

const synthesisMarkdown = `## AI 综合判断

> **这是 AI 的内部分析。第 5 步会作为 source_summary 的一个独立 H2 节固化下来，便于日后审计或在 web 端覆盖。**

### 核心价值

相对于现有 wiki，本文带来四个新点：

- **新组件类型**：Server Component 与 Client Component 的形式化定义——一份代码"在哪运行"由文件顶部 \`"use client"\` 决定，不是混合 universal 模型
- **新硬约束**：①Server Component 没有 state / effects；②props 必须 JSON-serializable（或 ReactNode）；③Client 不能 import Server，只能通过 ReactNode prop 接收
- **新对比依据**：RSC vs SSR 的精确区分——SSR 加快首帧 + hydrate；RSC **让一部分组件根本不进客户端 bundle**
- **新解析心智模型**：服务端发的不是 HTML 字符串，而是"可恢复的 React 组件树 + client 占位符引用"

### 关联

- [[wiki/concepts/server_component]] — 直接相关，本文是该概念的奠基 RFC，需要把"组件类型形式化定义"补全
- [[wiki/concepts/data_fetching]] — 直接相关，本文的「在组件内 await」模式彻底改变数据读取范式，需要重写主流方法节
- [[wiki/concepts/rendering_strategies]] — 直接相关，本文证据要求把 SSR 和 RSC 的区别讲清楚（之前一直被混为一谈）
- [[wiki/concepts/component_model]] — 间接相关，本文引入"Server/Client 两态模型"，补充到组件模型演进史中
- [[wiki/concepts/bundle_optimization]] — 间接相关，本文给出"zero-bundle-size 服务端组件"这条新优化路径

### 冲突

- 与 [[wiki/concepts/rendering_strategies]] 当前的「SSR 已经能解决 bundle size 问题」隐含论断不一致——本文表明 SSR 仍然要 hydrate 整棵树到客户端，不减小 bundle，**只有 RSC 才真正不进 bundle**。第 5 步在 source_summary 用 \`> [!WARNING]\` 冲突标注块记录，留待 lint / 人工决议。
`;

export const step3: StepData = {
  id: 3,
  titleKey: "learn.step.3.title",
  whyKey: "learn.step.3.why",
  whatCommand: `python scripts/k.py search "Server Component" --json
python scripts/k.py search "data fetching" --json
python scripts/k.py search "SSR rendering" --json
# 对每个 hit ≥ 2 的页面调 read-section 轻读 H1 段`,
  whatNoteKey: "learn.cmd.note.search",
  focusAnchors: ["h-2-4-2f3a8b", "p-2-bf914e", "p-3-7a8d12"],
  results: [
    {
      kind: "search-result",
      query: "Server Component",
      hits: [
        {
          // query 切成 ["server", "component"]
          // title "Server Component" → server×5 + component×5 = 10
          // body "server" ~20 次 + "component" ~28 次 → score = 10 + 48 = 58
          path: "wiki/concepts/server_component.md",
          score: 58,
          preview: "Server Component 是 React 在 2020 年提出的一种新组件类型，目标是把一部分计算永久留在服务端，但当时 wiki 页只描述了「能在服务端运行」这一表面…",
        },
        {
          // title "前端渲染策略" → 不含 server / component → 0
          // body "server" ~6 次 + "component" ~5 次 → score = 0 + 11 = 11
          path: "wiki/concepts/rendering_strategies.md",
          score: 11,
          preview: "前端渲染策略对比：CSR（客户端）/ SSR（服务端渲染 HTML 再 hydrate）/ SSG（构建时生成）/ ISR（增量再生）…",
        },
      ],
    },
    {
      kind: "search-result",
      query: "data fetching",
      hits: [
        {
          // title "数据读取 Data Fetching" → data×5 + fetching×5 = 10
          // body "data" ~15 次 + "fetching" ~12 次 → score = 10 + 27 = 37
          path: "wiki/concepts/data_fetching.md",
          score: 37,
          preview: "React 应用的数据读取方式以 useEffect + useState 组合为主，配合 SWR / React Query 等库做缓存与重试…",
        },
      ],
    },
    {
      kind: "markdown",
      content: recallMechanismMarkdown,
      captionKey: "learn.caption.recall_mechanism",
    },
    {
      kind: "markdown",
      content: synthesisMarkdown,
      captionKey: "learn.caption.synthesis_internal",
    },
  ],
};
