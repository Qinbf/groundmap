import "server-only";
import type { StepData } from "../types";

const outlineCliOutput = `文档: raw/articles/_learn_demo/react_server_components_rfc.md
字符数: 6920 | 段数: 43 | 生成于: 2026-05-08

# RFC: React Server Components  [^h-1-1-d27e80]  (line 10, 6920 字符)
  └─ (预览) 我们提出一个为现代 UI 应用提供"零打包成本服务端组件"的新架构。它让开发者把组件树分成两部分。
  ## Summary  [^h-2-1-3e7b04]  (line 16, 540 字符)
    └─ (预览) React Server Components 是一种新的 React 组件类型，永远不会被打包进客户端 JS bundle，只在服务端运行。
  ## Motivation  [^h-2-2-bd420f]  (line 22, 2680 字符)
    └─ (预览) 现代 React 应用经历了三类典型痛点 —— bundle size、network waterfall、data fetching ergonomics。
    ### Bundle Size  [^h-3-1-d8a07c]  (line 28, 920 字符)
      └─ (预览) 随着应用增长，客户端 JS bundle 不可避免地变大。即便用了 code-splitting，也只是把大 bundle 拆成很多小 bundle。
    ### Network Waterfall  [^h-3-2-4a08eb]  (line 50, 612 字符)
      └─ (预览) 在传统的 React + REST/GraphQL 架构里，数据请求只能在组件挂载后发起，导致组件 A → fetch A → 渲染 B → fetch B 串行。
    ### Data Fetching Ergonomics  [^h-3-3-9c701f]  (line 60, 1148 字符)
      └─ (预览) useEffect + useState + loading state + error state 这四件套是当代 React 应用最重复的样板代码。
  ## Architecture  [^h-2-3-b94e02]  (line 88, 1820 字符)
    └─ (预览) RSC 把 React 组件树切成两种节点，它们在不同位置运行，但在一棵树里自由嵌套。
    ### Server Components vs Client Components  [^h-3-4-aa3018]  (line 92, 1060 字符)
      └─ (预览) Server Component 默认无标记、运行在 Node.js 服务端、不能用 hooks；Client Component 需 "use client"、运行在浏览器。
    ### Component Tree Serialization  [^h-3-5-1d8a90]  (line 116, 720 字符)
      └─ (预览) 服务端渲染 Server Component 时，React 不输出 HTML 字符串，而输出一种特殊的可恢复树格式。
  ## Comparison with SSR  [^h-2-4-2f3a8b]  (line 132, 720 字符)
    └─ (预览) RSC 不是 SSR 的替代品 —— 它们解决不同的问题，且两者完全可以共存（Next.js App Router 同时用了二者）。
  ## Constraints and Capabilities  [^h-2-5-c08a91]  (line 142, 880 字符)
    └─ (预览) RSC 引入了几个硬约束与对应的新能力：①Server 没有 state/effects；②props 必须可序列化；③模块边界即组件边界。
  ## FAQ  [^h-2-6-58c708]  (line 158, 1240 字符)
    └─ (预览) Q: RSC 会取代客户端组件吗？不会，任何需要交互、动画、本地状态、订阅浏览器事件的组件都必须是 Client Component。

✓ 文档 6920 字符（约 3500 中文字 < 3 万），分级为 ① 短文——一次 Read 全文，进入第 3 步。
  · 注：上面每个 H 段的「(预览)」是 outline 自动从该段首段截取的前 120 字预览；
    AI 在第 2 步就能基于「标题 + 字符数 + 首段预览」做整体判断，不是只看光秃秃的标题。
  · 原始 GitHub PR #188 含数千条讨论 + 多版本演进，若全部 ingest 会落入 ③ 档（整本书规模）。`;

const tierExplanationMarkdown = `## 三档分级（按中文字符等价；英文 × 0.5 估算）

| 档 | 字数 | 策略 | 本样例 |
|---|---|---|---|
| ① **短文** | < 3 万 | 一次 Read 全文 | ✅ 命中 |
| ② **中长文** | 3 - 15 万 | 按 H1 切块、每块 ≤3 万分段读，每段读完 \`annotate-section\` 精排摘要 | — |
| ③ **整本书规模** | > 15 万 | TOC 扫全 + AI 决定深读章节；**全部章节登记**到「章节深度登记」表（深读 / 扫读 / 跳过），扫读章节保留 partial re-ingest 升级路径 | — |

### 第 ③ 档的「章节深度登记」长这样

> 假设要 ingest 完整版的「React 内部实现技术专著」（演示用，非本样例）：

| Anchor | 原标题 | 深度 | 备注 |
|---|---|---|---|
| ^h-2-1-... | RFC 主提案 | ✓ 深读 | 完整 anchor 引用 |
| ^h-2-2-... | 设计动机 | ✓ 深读 | 与现有 wiki 概念重叠 |
| ^h-2-3-... | 协议细节 | ⊙ 扫读 | 仅基于 outline preview，**未来 query 命中可触发 partial re-ingest 升级** |
| ^h-2-4-... | 历史版本演进 | ⊙ 扫读 |  |
| ^h-2-5-... | 附录：未采纳的替代方案 | × 跳过 | 历史副产物 |

> 「⊙ 扫读」的章节**不是丢弃**，是延后处理——后续 query 或 lint 流程命中时可触发深化。`;

export const step2: StepData = {
  id: 2,
  titleKey: "learn.step.2.title",
  whyKey: "learn.step.2.why",
  whatCommand: "python scripts/k.py outline raw/articles/_learn_demo/react_server_components_rfc.md",
  whatNoteKey: "learn.cmd.note.outline",
  focusAnchors: [
    "h-2-1-3e7b04",
    "h-2-2-bd420f",
    "h-2-3-b94e02",
    "h-2-4-2f3a8b",
    "h-2-5-c08a91",
    "h-2-6-58c708",
  ],
  results: [
    { kind: "outline-cli", content: outlineCliOutput },
    {
      kind: "markdown",
      content: tierExplanationMarkdown,
      captionKey: "learn.caption.tier_table",
    },
  ],
};
