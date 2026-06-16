import "server-only";
import type { StepData } from "../types";

const scBefore = `---
title: "Server Component"
type: concept
created_date: 2025-09-15
last_modified: 2026-02-28
source_count: 2
---

# Server Component

Server Component 是 React 在 2020 年提出的一种新组件类型，目标是把一部分计算永久留在服务端。优点：

- 减少客户端 JS bundle
- 直接访问后端资源（数据库、文件系统）

## 限制

- 不能使用 useState / useEffect / 事件处理
- 不能 import 浏览器专属 API`;

const scAfter = `---
title: "Server Component"
type: concept
created_date: 2025-09-15
last_modified: 2026-05-08
source_count: 3
---

# Server Component

Server Component 是 React 在 2020 年通过 [[wiki/sources/react_server_components_rfc]] 提出的一种新组件类型，**永不进客户端 JS bundle**，只在服务端运行，把渲染结果以可恢复树格式流式发送到客户端 [[wiki/sources/react_server_components_rfc#^p-2-bf914e]]。

## 两态组件模型

| 维度 | Server Component | Client Component |
|---|---|---|
| 标记 | 默认（无标记） | 文件顶部 \`"use client"\` |
| 运行位置 | Node.js 服务端 | 浏览器（也可 SSR 预渲染） |
| Hooks | ❌ | ✅ |
| 可 import 后端库 | ✅ db / fs / 密钥 | ❌ 会进 bundle |
| 进客户端 bundle | ❌ | ✅ |

数据来源 [[wiki/sources/react_server_components_rfc#^t-18-bc02d4]]。

## 核心交互规则

**规则一**：Server 可以渲染 Client，但 **Client 不能 import Server**。Client 可以通过 \`children\` ReactNode prop 接收 Server 渲染的元素 —— 这是"server 包 client 包 server"任意嵌套的关键 [[wiki/sources/react_server_components_rfc#^p-19-7a4e08]]。

**规则二**：Server Component 不能用任何浏览器 API（useState / useEffect / window / 事件处理）。输出必须是 React 元素的纯函数，**没有自身的运行时状态**。需要状态的部分一律下放到 Client Component [[wiki/sources/react_server_components_rfc#^p-20-c8d427]]。

**规则三**：跨边界的 props 必须 JSON-serializable（外加 ReactNode 与少数特殊类型）—— 不能传函数、Date、Map、类实例 [[wiki/sources/react_server_components_rfc#^p-31-3a08bd]]。

## 与 SSR 的关系

**不互斥**。SSR 优化首帧时间（提前在服务端渲染 HTML，客户端 hydrate 后接管）；RSC 优化 bundle size（让一部分组件根本不进客户端）。Next.js App Router 同时使用二者 [[wiki/sources/react_server_components_rfc#^p-27-b471c0]]。`;

const dfBefore = `---
title: "数据读取 Data Fetching"
type: concept
created_date: 2025-08-10
last_modified: 2026-01-30
source_count: 3
---

# 数据读取

React 应用从服务端获取数据的方式。

## 主流方法

- **useEffect + fetch**：在组件挂载后请求数据
- **SWR / React Query**：第三方库做缓存、重试、deduplication
- **Server-side props**（Next.js Pages Router）：在路由层提前 fetch，作为 props 传给组件

## 常见问题

- **Waterfall**：嵌套组件各自 fetch，导致请求串行
- **加载状态样板**：每个 fetch 都要写 loading / error / data 三态`;

const dfAfter = `---
title: "数据读取 Data Fetching"
type: concept
created_date: 2025-08-10
last_modified: 2026-05-08
source_count: 4
---

# 数据读取

React 应用从服务端获取数据的方式。

## 主流方法（按时代演进）

**2018-2020 客户端 fetch 时代**：

- **useEffect + fetch**：在组件挂载后请求数据
- **SWR / React Query**：第三方库做缓存、重试、deduplication
- **Server-side props**（Next.js Pages Router）：在路由层提前 fetch，作为 props 传给组件

**2020+ RSC 时代**：[[wiki/sources/react_server_components_rfc]] 提出 **async server component** —— 组件本身可以是 async function，直接 \`await\` 任意 Promise（数据库、文件系统、远程 API）[[wiki/sources/react_server_components_rfc#^c-15-9bc2d1]]：

\`\`\`jsx
async function PostList() {
  const posts = await db.post.findMany();
  return <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>;
}
\`\`\`

**没有 useEffect、没有 loading state、没有 fetch endpoint 设计**——错误由 Suspense / Error Boundary 处理，loading 由 React streaming 机制处理 [[wiki/sources/react_server_components_rfc#^p-16-d4a91c]]。

## 常见问题（已重新评估）

- ~~**Waterfall**~~：在 RSC 范式下，**多组件数据请求自然并发**——因为运行在同一个 Node.js 事件循环里，且数据源就在本机，**网络延迟从两次（client→server→DB）压缩到一次（server→DB）** [[wiki/sources/react_server_components_rfc#^p-11-bf8240]]
- ~~**加载状态样板**~~：四件套（useEffect / useState / loading / error）在 RSC 范式下消失
- **新问题**：跨 Server/Client 边界的 props 必须 JSON-serializable —— 不能传函数 / Date / Map / 类实例`;

const rsBefore = `---
title: "前端渲染策略"
type: concept
created_date: 2025-06-25
last_modified: 2026-02-08
source_count: 2
---

# 前端渲染策略

| 策略 | 简称 | 描述 |
|---|---|---|
| 客户端渲染 | CSR | 浏览器下载 JS 后再渲染 DOM |
| 服务端渲染 | SSR | 服务端渲染 HTML 字符串，客户端 hydrate 接管 |
| 静态生成 | SSG | 构建时预渲染全部页面 |
| 增量再生 | ISR | 类似 SSG 但按需重新生成 |

## SSR 的优点

加快首屏 + 改善 SEO + 减少初始 bundle size`;

const rsAfter = `---
title: "前端渲染策略"
type: concept
created_date: 2025-06-25
last_modified: 2026-05-08
source_count: 3
---

# 前端渲染策略

| 策略 | 简称 | 描述 | 客户端 bundle |
|---|---|---|---|
| 客户端渲染 | CSR | 浏览器下载 JS 后再渲染 DOM | 全部 |
| 服务端渲染 | SSR | 服务端渲染 HTML 字符串，客户端 hydrate 接管 | **全部**（要 hydrate） |
| 静态生成 | SSG | 构建时预渲染全部页面 | 全部 |
| 增量再生 | ISR | 类似 SSG 但按需重新生成 | 全部 |
| Server Components | RSC | 服务端运行，永不 hydrate | **仅 Client Component 部分** |

## SSR vs RSC（关键区分）

> 之前一直被混为一谈。澄清自 [[wiki/sources/react_server_components_rfc]]：

- **SSR 加快首帧**：把客户端 JS 提前在服务端跑一遍以渲染 HTML，**仍要把组件全部 hydrate 到客户端**——bundle size 不变 [[wiki/sources/react_server_components_rfc#^p-3-7a8d12]]
- **RSC 减小 bundle**：让一部分组件根本不进客户端 JS bundle——服务端发的是**可恢复树**而非 HTML，Server Component 永不水合 [[wiki/sources/react_server_components_rfc#^p-2-bf914e]]
- **两者正交、可共存**：Next.js App Router 同时使用 SSR（HTML 首帧）+ RSC（bundle 优化）[[wiki/sources/react_server_components_rfc#^p-27-b471c0]]

简短地说：**SSR 让你看得更快，RSC 让你下载更少 + 写起来更舒服**。`;

export const step6: StepData = {
  id: 6,
  titleKey: "learn.step.6.title",
  whyKey: "learn.step.6.why",
  whatNoteKey: "learn.cmd.note.edit",
  focusAnchors: [
    "p-2-bf914e",
    "p-11-bf8240",
    "p-19-7a4e08",
    "p-27-b471c0",
    "t-18-bc02d4",
  ],
  results: [
    { kind: "diff", before: scBefore, after: scAfter, pseudoPath: "wiki/concepts/server_component.md" },
    { kind: "diff", before: dfBefore, after: dfAfter, pseudoPath: "wiki/concepts/data_fetching.md" },
    { kind: "diff", before: rsBefore, after: rsAfter, pseudoPath: "wiki/concepts/rendering_strategies.md" },
  ],
};
