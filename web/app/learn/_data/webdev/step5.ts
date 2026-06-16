import "server-only";
import type { StepData } from "../types";

const sourceSummaryContent = `---
title: "RFC: React Server Components（论文摘要）"
type: source_summary
created_date: 2026-05-08
last_modified: 2026-05-08
last_modified_by: LLM
status: draft
confidence: high
source_count: 1
sources:
  - "[[raw/articles/_learn_demo/react_server_components_rfc]]"
tags:
  - react
  - server-components
  - architecture
  - bundle-optimization
---

# RFC: React Server Components（论文摘要）

> **来源**：[[raw/articles/_learn_demo/react_server_components_rfc]] —— Meta React Core Team, 2020-12 首发 / 2023 stable（教学演示节选）

## 核心论点

1. **零打包成本的服务端组件**：Server Component **永不进客户端 bundle**，只在服务端运行、把渲染结果以**可恢复树格式**流式发送到客户端 [[raw/articles/_learn_demo/react_server_components_rfc#^p-2-bf914e]]。

2. **三痛点的系统性回答**：现代 React 应用经历 **bundle size / network waterfall / data fetching ergonomics** 三类相互绞缠的痛点，单独优化任何一项都会让其他两项变差。RSC 是对该三角约束的系统性回答 [[raw/articles/_learn_demo/react_server_components_rfc#^p-4-9c3f81]]。

3. **数据访问移到组件内**：async server component 可以直接 \`await\` 数据库 / 文件系统 / 远程 API，**消除 \`useEffect + useState + loading state + error state\` 四件套**。错误由 Suspense / Error Boundary 处理，loading 由 React streaming 处理 [[raw/articles/_learn_demo/react_server_components_rfc#^c-15-9bc2d1]][[raw/articles/_learn_demo/react_server_components_rfc#^p-16-d4a91c]]。

4. **RSC ≠ SSR**：SSR 是「把客户端 JS 提前在服务端跑一遍以加快首屏」（仍要 hydrate 整树）；RSC 是「让一部分组件根本不进客户端」。两者解决不同问题，完全可以共存 [[raw/articles/_learn_demo/react_server_components_rfc#^p-25-aa6f12]][[raw/articles/_learn_demo/react_server_components_rfc#^p-27-b471c0]]。

## 关键规则

**Server 与 Client 两态模型的核心边界**：

| 维度 | Server Component | Client Component |
|---|---|---|
| 标记 | 默认（无标记） | 文件顶部 \`"use client"\` |
| Hooks | ❌ 不能用 | ✅ |
| 后端库 | ✅ 可 import db / fs / 密钥 | ❌ 会进 bundle |
| 进 bundle | ❌ 永远不进 | ✅ |

数据来自原文 [[raw/articles/_learn_demo/react_server_components_rfc#^t-18-bc02d4]]。

**两条核心交互规则**：

- **规则一**：Server 可以渲染 Client，但 **Client 不能 import Server**；Client 可以通过 \`children\` ReactNode prop 接收 Server 渲染的元素 —— 这是"server 包 client 包 server"的混合模式 [[raw/articles/_learn_demo/react_server_components_rfc#^p-19-7a4e08]]
- **规则二**：Server Component 不能用任何浏览器 API（useState / useEffect / window / 事件处理）。输出必须是 React 元素的纯函数，**没有自身的运行时状态** [[raw/articles/_learn_demo/react_server_components_rfc#^p-20-c8d427]]

## 三大硬约束（与对应新能力）

| 约束 | 新能力 |
|---|---|
| Server Component 没有 state / effects | 可以是 \`async function\`，直接 \`await\` 任意 Promise |
| 跨边界 props 必须 JSON-serializable | 可以传 ReactNode（children）实现任意嵌套 |
| 模块边界即组件边界 | bundler 可在打包阶段**完全裁掉** Server Component 的依赖图 |

数据来自原文 [[raw/articles/_learn_demo/react_server_components_rfc#^p-29-bc7e02]] 到 [[raw/articles/_learn_demo/react_server_components_rfc#^p-34-9e7402]] 三段。

## 与已有知识的关系

> [!WARNING] 知识更新冲突 — 2026-05-08
> **旧观点**：[[wiki/concepts/rendering_strategies]] 当前的「SSR 已经能解决 bundle size 问题」隐含论断
> **新证据**：本文表明 SSR 仍然要 hydrate 整棵树到客户端，**不减小 bundle**——只有 RSC 才真正不进 bundle [[raw/articles/_learn_demo/react_server_components_rfc#^p-3-7a8d12]]
> **LLM 判断**：旧论断应改为 "SSR 优化首帧时间，不优化 bundle size；RSC 优化 bundle size，不替代 SSR——两者正交、可共存"
> **状态**：⏳ 待人类判别

- 与 [[wiki/concepts/server_component]] 关联：本文是该概念页的**奠基来源**，需要把"两态模型"的精确边界补全
- 与 [[wiki/concepts/data_fetching]] 关联：本文范式改变 React 数据读取的默认模式
- 与 [[wiki/concepts/component_model]] 关联：本文引入"Server/Client 两态模型"，是组件模型演进的关键节点
`;

export const step5: StepData = {
  id: 5,
  titleKey: "learn.step.5.title",
  whyKey: "learn.step.5.why",
  whatNoteKey: "learn.cmd.note.write",
  focusAnchors: [
    "p-2-bf914e",
    "p-4-9c3f81",
    "c-15-9bc2d1",
    "p-19-7a4e08",
    "t-18-bc02d4",
  ],
  results: [
    {
      kind: "markdown",
      content: sourceSummaryContent,
      pseudoPath: "wiki/sources/react_server_components_rfc.md",
    },
  ],
  concepts: [
    { termKey: "learn.concept.source_summary.title", bodyKey: "learn.concept.source_summary.body" },
    { termKey: "learn.concept.frontmatter.title", bodyKey: "learn.concept.frontmatter.body" },
    { termKey: "learn.concept.wikilink.title", bodyKey: "learn.concept.wikilink.body" },
  ],
};
