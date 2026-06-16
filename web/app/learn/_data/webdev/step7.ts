import "server-only";
import type { StepData } from "../types";

const cmBefore = `---
title: "React 组件模型 Component Model"
type: concept
created_date: 2025-05-22
last_modified: 2026-03-10
source_count: 3
---

# React 组件模型

React 把 UI 拆成"可组合的纯函数"。一个组件接收 props，返回 React 元素树（或 null）。

## 演进史

- **2013**：Class Components + lifecycle methods（componentDidMount 等）
- **2016**：Stateless Functional Components（无 hooks，仅 props → JSX）
- **2018**：React Hooks（函数组件 + useState / useEffect / useReducer）—— 函数组件正式取代 class

## 心智模型

组件 = 纯函数；state 与 effect 通过 hooks 显式管理；副作用在 useEffect 内执行。`;

const cmAfter = `---
title: "React 组件模型 Component Model"
type: concept
created_date: 2025-05-22
last_modified: 2026-03-10
source_count: 3
---

# React 组件模型

React 把 UI 拆成"可组合的纯函数"。一个组件接收 props，返回 React 元素树（或 null）。

## 演进史

- **2013**：Class Components + lifecycle methods（componentDidMount 等）
- **2016**：Stateless Functional Components（无 hooks，仅 props → JSX）
- **2018**：React Hooks（函数组件 + useState / useEffect / useReducer）—— 函数组件正式取代 class

## 心智模型

组件 = 纯函数；state 与 effect 通过 hooks 显式管理；副作用在 useEffect 内执行。

---
#to-be-updated 2026-05-08: 因 [[wiki/sources/react_server_components_rfc]] 引入的「Server Component / Client Component 两态模型」，需要在「演进史」节加上 2020+ 节点，并在「心智模型」节补充：组件分两种位置（server / client），位置由 \`"use client"\` 决定。`;

const boBefore = `---
title: "前端 Bundle 优化"
type: concept
created_date: 2025-04-18
last_modified: 2026-02-20
source_count: 4
---

# Bundle 优化

随着应用增长，客户端 JS bundle 不断膨胀。常见优化路径：

- **Code splitting**：按路由 / 动态 import 拆分 chunk
- **Tree shaking**：dead code elimination
- **Lazy load**：组件按需加载（React.lazy + Suspense）
- **依赖分析**：用 webpack-bundle-analyzer 找大块依赖`;

const boAfter = `---
title: "前端 Bundle 优化"
type: concept
created_date: 2025-04-18
last_modified: 2026-02-20
source_count: 4
---

# Bundle 优化

随着应用增长，客户端 JS bundle 不断膨胀。常见优化路径：

- **Code splitting**：按路由 / 动态 import 拆分 chunk
- **Tree shaking**：dead code elimination
- **Lazy load**：组件按需加载（React.lazy + Suspense）
- **依赖分析**：用 webpack-bundle-analyzer 找大块依赖

---
#to-be-updated 2026-05-08: 因 [[wiki/sources/react_server_components_rfc]] 提出的 zero-bundle-size 服务端组件，需要加入「Server Component」一条优化路径——本质是"让组件根本不进 bundle"，与上述四条都不同。`;

export const step7: StepData = {
  id: 7,
  titleKey: "learn.step.7.title",
  whyKey: "learn.step.7.why",
  whatNoteKey: "learn.cmd.note.edit",
  focusAnchors: ["h-3-1-d8a07c", "p-9-7a4d28"],
  results: [
    { kind: "diff", before: cmBefore, after: cmAfter, pseudoPath: "wiki/concepts/component_model.md" },
    { kind: "diff", before: boBefore, after: boAfter, pseudoPath: "wiki/concepts/bundle_optimization.md" },
  ],
  concepts: [
    { termKey: "learn.concept.to_be_updated.title", bodyKey: "learn.concept.to_be_updated.body" },
  ],
};
