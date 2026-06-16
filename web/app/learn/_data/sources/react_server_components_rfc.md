---
title: "RFC: React Server Components"
authors: "Joseph Savona, Andrew Clark, Sebastian Markbåge, Lauren Tan, Dan Abramov"
org: "Meta (React Core Team)"
created: 2026-05-08
note: |
  本文为 /learn 教学演示页所用样例 —— React Server Components RFC（Meta, 2020-12 首发，2023 进入 stable）
  的「教学演示版」节选改编，非原文逐字。保留 RFC 的核心动机、架构图示、与 SSR 的对比、约束三件套
  与 FAQ，省略了内部协议细节与逐版本演进史。锚点（^h-/^p-/^c-/^t-）按 convert.py 风格手工生成，
  hash6 部分为演示捏造。
---

# RFC: React Server Components ^h-1-1-d27e80

我们提出一个为现代 UI 应用提供"**零打包成本（zero-bundle-size）服务端组件**"的新架构。它让开发者把组件树分成两部分：一部分**只在服务端运行、永不发送到浏览器**（Server Components），另一部分**像今天的 React 组件那样在浏览器运行**（Client Components）。两者可以在同一棵树里自由嵌套，但不能跨过类型边界 import。本 RFC 描述其目标、约束与心智模型。 ^p-1-c30a8f

## Summary ^h-2-1-3e7b04

**React Server Components (RSC)** 是一种新的 React 组件类型，它们**永远不会被打包进客户端 JS bundle**，只在服务端运行、把渲染结果以一种**特殊的可恢复格式（serializable component tree）**流式发送到客户端。这让我们既能**继续使用 React 的组件模型**，又能享受传统服务端模板（如 PHP、Rails view）的优点：**直接访问后端、零客户端依赖、自动按路由 code-split**。 ^p-2-bf914e

与服务端渲染（SSR）不同，**RSC 不只是把第一帧 HTML 提前渲染**。它真正改变了**哪些组件在哪里运行**：服务端组件**根本就不会"再水合"（rehydrate）到客户端**，因此**它们引用的库、计算、数据访问代码完全不进客户端 bundle**。 ^p-3-7a8d12

## Motivation ^h-2-2-bd420f

现代 React 应用经历了三类典型痛点 —— **bundle size**、**network waterfall**、**data fetching ergonomics** —— 它们彼此交织，单独优化任何一项都会让其他两项更糟。RSC 是对这一三角约束的系统性回答。 ^p-4-9c3f81

### Bundle Size ^h-3-1-d8a07c

随着应用增长，**客户端 JS bundle 不可避免地变大**。即便用了 code-splitting，也只是把"大 bundle"拆成"很多个小 bundle，但合起来仍然很大"。每多一个第三方依赖（Markdown 解析器、日期库、syntax highlighter）就是一份**永久增加的下载与解析成本**，且对最终用户**毫无可见价值** —— 它们的输出对每个访客都是相同的。 ^p-5-bd72e3

举个例子：用 `marked` + `sanitize-html` 在客户端渲染一段 Markdown，要把 ~100KB 的 JS 推到每个访客的浏览器里。但**这段 Markdown 在服务端就能渲染好** —— 客户端只需要一份渲染后的 HTML 片段。这就是 RSC 想解决的"客户端为静态计算付费"的浪费。 ^p-6-43c701

```jsx
// Before: 100KB JS shipped to every visitor
import marked from "marked";
import sanitizeHtml from "sanitize-html";

function NoteRenderer({ markdown }) {
  return <div dangerouslySetInnerHTML={{
    __html: sanitizeHtml(marked(markdown))
  }} />;
}
``` ^c-7-2d8a16

```jsx
// After (RSC): 0KB JS, rendered on the server
import marked from "marked";
import sanitizeHtml from "sanitize-html";

async function NoteRenderer({ markdown }) {
  return <div dangerouslySetInnerHTML={{
    __html: sanitizeHtml(marked(markdown))
  }} />;
}
``` ^c-8-d2380e

代码几乎一样 —— 关键区别是后者**不带 `"use client"` 标记**，所以默认是 Server Component，**永不进客户端 bundle**。 ^p-9-7a4d28

### Network Waterfall ^h-3-2-4a08eb

在传统的 React + REST/GraphQL 架构里，**数据请求只能在组件挂载后发起**（或在路由层提前发起，但需要预先知道每个组件要什么）。这导致一个常见模式：组件 A 渲染 → 触发 fetch A → A 数据回来 → 渲染子组件 B → 触发 fetch B → ...。**串行 fetch 形成 waterfall**，首屏时间随组件深度线性增长。 ^p-10-c8b317

RSC 通过让组件**在服务端直接 `await` 数据**消除了这个问题：因为组件运行在同一个 Node.js 进程里（甚至同一个事件循环里），**多个组件的数据请求可以自然并发**，且数据源就在同一台机器上 —— **网络延迟从两次（client→server→DB）压缩到一次（server→DB）**。 ^p-11-bf8240

### Data Fetching Ergonomics ^h-3-3-9c701f

`useEffect` + `useState` + `loading state` + `error state` 这四件套是当代 React 应用最重复的样板代码。一个简单的"从 API 拿数据然后显示"场景在客户端要写： ^p-12-87a6e1

```jsx
// Before: client-side fetch
function PostList() {
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    fetch("/api/posts")
      .then(r => r.json())
      .then(setPosts)
      .catch(setError);
  }, []);
  if (error) return <p>Error</p>;
  if (!posts) return <p>Loading...</p>;
  return <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>;
}
``` ^c-13-3c70a8

RSC 把它简化成： ^p-14-5d9018

```jsx
// After (RSC): async server component
async function PostList() {
  const posts = await db.post.findMany();
  return <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>;
}
``` ^c-15-9bc2d1

**没有 useEffect、没有 loading state、没有 useState、没有 fetch endpoint 设计** —— 数据库调用就在组件里。错误由 Suspense / Error Boundary 处理，loading 由 React 的 streaming 机制处理。 ^p-16-d4a91c

## Architecture ^h-2-3-b94e02

RSC 把 React 组件树**切成两种节点**，它们在不同位置运行，但在一棵树里自由嵌套： ^p-17-2bf01e

### Server Components vs Client Components ^h-3-4-aa3018

| 维度 | Server Component | Client Component |
|---|---|---|
| 标记方式 | 默认（无标记）/ `.server.js`（旧 RFC） | 文件顶部 `"use client"` |
| 运行位置 | Node.js 服务端 | 浏览器（也可在 SSR 中预渲染） |
| 能用 hooks | ❌（包括 useState / useEffect） | ✅ |
| 能 import 后端库 | ✅（db、fs、process.env、密钥） | ❌（会进 bundle） |
| 能 import 客户端组件 | ✅ | ❌ 不能 import server component |
| 进入客户端 bundle | ❌ 永远不进 | ✅ 进 |
| 适合做 | 数据读取、Markdown 渲染、静态展示 | 交互、动画、表单 | ^t-18-bc02d4

**关键规则一**：Server Component **可以**渲染 Client Component；Client Component **不能** import Server Component。但 Client Component **可以**接收 Server Component 作为 `children` prop 传下来 —— 这是"server 包裹 client"的混合模式，本 RFC 的核心组合武器。 ^p-19-7a4e08

**关键规则二**：Server Component **不能用任何只在浏览器存在的 API**（useState / useEffect / window / document / 事件处理）。它们的输出必须是 React 元素的纯函数，**没有自身的运行时状态**。需要状态的部分一律下放到 Client Component。 ^p-20-c8d427

### Component Tree Serialization ^h-3-5-1d8a90

服务端渲染 Server Component 时，React **不输出 HTML 字符串**，而输出一种**特殊的可恢复树格式**，包含： ^p-21-90bc41

```
- 已渲染的 React 元素（Server Component 自身已经"消失"，留下其输出）
- Client Component 的"占位符引用"（module reference + props）
- Suspense 边界
- 元数据（streaming 顺序、缓存提示）
``` ^c-22-7b81d6

客户端拿到这棵树后，**用与水合 SSR HTML 不同的方式**重建 React 元素：服务端发来的部分**不需要客户端的代码就能展示**，因为它们已经是渲染后的元素；只有 Client Component 占位符位置才会被对应客户端代码"激活"。 ^p-23-4ae6c0

**导航时这棵树可以增量更新** —— 服务器只重新计算变化的部分，客户端组件的本地 state（如表单输入、滚动位置）**不会因为导航而丢失**，因为它们的实例并没有重建。 ^p-24-58be91

## Comparison with SSR ^h-2-4-2f3a8b

RSC **不是 SSR 的替代品** —— 它们解决不同的问题，且两者完全可以共存（事实上 Next.js App Router 同时用了二者）。 ^p-25-aa6f12

| 维度 | SSR | RSC |
|---|---|---|
| 主要目的 | 加快首帧 + 改善 SEO | **减小 bundle + 简化数据读取** |
| 客户端 JS 是否包含组件 | **是**（要 hydrate） | **不**（Server Component 不进 bundle） |
| 状态保持 | 整树 hydrate 后由 React 接管 | Client Component 维持自身 state，Server Component 不存在 state |
| 路由间增量更新 | 通常整页刷新 / 客户端路由全量重渲染 | **服务端增量更新树，保留 Client Component state** |
| 数据访问 | 通常在 getServerSideProps / loader 里 | **在组件内 await，自然并发** | ^t-26-3d80b7

简短地说：**SSR 是"把客户端 JS 提前在服务端跑一遍以加快首屏"**；**RSC 是"让一部分组件根本不进客户端"**。SSR 让你看得更快，RSC 让你下载更少 + 写起来更舒服。 ^p-27-b471c0

## Constraints and Capabilities ^h-2-5-c08a91

RSC 引入了几个**硬约束**与对应的**新能力**，必须配套理解： ^p-28-7d3b81

**约束 1：Server Component 没有 state、没有 effects** ^p-29-bc7e02

无法用 `useState` / `useEffect` / `useReducer` / `useContext` 的客户端形式。**新能力**：可以是 `async function`，直接 `await` 任意 Promise（数据库、文件系统、远程 API）。 ^p-30-7adf08

**约束 2：Props 必须是可序列化的** ^p-31-3a08bd

从 Server Component 传给 Client Component 的 props 必须是 JSON-serializable 的（外加 ReactNode 与少数特殊类型）。**不能传函数、Date 对象、Map / Set、类实例**。**新能力**：可以传 `children` 作为 ReactNode —— 这样 server component 渲染的元素可以作为 client component 的子节点，**实现"server 包 client 包 server"的任意嵌套**。 ^p-32-bd5e90

**约束 3：模块边界即组件边界** ^p-33-c7f418

一个模块要么整个是 Server，要么整个是 Client（由 `"use client"` 决定）。**不能在一个 Client Component 里 import 一个 Server Component 来直接渲染** —— 必须通过 props 接受它作为 ReactNode。**新能力**：bundler（如 webpack / Turbopack）可以在打包阶段**完全裁掉**所有 Server Component 文件，连依赖图分析都不用进入客户端 bundle。 ^p-34-9e7402

## FAQ ^h-2-6-58c708

**Q: RSC 会取代客户端组件吗？** ^p-35-4d8920

**不会**。任何需要交互、动画、本地状态、订阅浏览器事件的组件都必须是 Client Component。RSC 是**增量补充**而非替代。一个典型应用大致是"页面骨架 + 数据展示用 Server Component，按钮 / 输入框 / 实时更新用 Client Component"。 ^p-36-78a01d

**Q: 这是不是又一个 isomorphic / universal 渲染思路？** ^p-37-91cdbe

不是。Isomorphic 的核心假设是"同一份代码在服务端和客户端都能跑" —— RSC 反其道而行之，**强调一份代码只能在一处跑**。`"use client"` 边界把混合（mistake-prone）的 universal 模型变成显式的**两态**模型，**编译器能验证边界正确**。 ^p-38-2a3c70

**Q: 与 GraphQL / tRPC 相比呢？** ^p-39-9d3c01

GraphQL / tRPC 让客户端**能用类型安全的方式调用服务端**，但**客户端 - 服务端的网络往返依然存在**。RSC 直接消除往返：**在 Server Component 里就是服务端**，没有什么需要序列化的"调用" —— 你就是在执行后端代码。但 RSC 不取代 GraphQL —— Client Component 仍然需要某种方式向服务端发起请求（如 server actions / GraphQL endpoint）。 ^p-40-c7b231

**Q: 这与 PHP / Rails 那种古典服务端渲染有何不同？** ^p-41-3b08aa

PHP / Rails 输出**字符串模板**，每次导航整页刷新，**客户端不维持任何状态**。RSC 输出的是**可恢复的 React 树**，可以增量更新，**客户端 state 在 server 重新渲染时不丢失**。可以理解为"PHP 的简洁 + React 的可组合性 + 现代浏览器的导航能力"的合并。 ^p-42-d72e91

完整规范、参考实现与 demo 请见 https://github.com/reactjs/rfcs/pull/188。 ^p-43-7e0d12
