"use client";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { ANCHOR_COMPONENTS_BARE } from "@/lib/anchor-refs";
import { normalizeBlockAnchors } from "@/lib/markdown-render";

/**
 * 小型 markdown 渲染器，供 hover preview / block 卡片等"局部 markdown"场景复用。
 *
 * 与 PageRenderer 的差异：
 * - hover preview 是**只读展示**，所有链接降级为 `<span>`：
 *   - 防 `[xxx](javascript:alert(1))` XSS（虽然 react-markdown 默认拦了，多一道险）
 *   - 防 `[xxx](mailto:foo)` 在 hover 里能直接点开邮件客户端的怪 UX
 *   - 防 `[xxx](kb://...)` 渲染成无效协议链接
 * - 使用 `ANCHOR_COMPONENTS_BARE`：只剥离 trailing anchor 的视觉文本，**不**输出 id、
 *   **不**渲染 [n] 上标。原因：
 *   - BlocksTable 一页可能同时渲染 50 个 MiniMarkdown，各自包 Provider 会出现满屏
 *     局部 [1]，且每个段都会拿到 HTML id，跨实例间 id 重复破坏 hash 跳转
 *   - 弹窗预览里 [n] 编号与主页面 PageRenderer 编号不一致，反而让用户混淆
 *   - 隐藏 anchor 文本（原 ANCHOR_TAIL_RE 删除的行为）是 MiniMarkdown 的最低需求
 * - 用 prose 排版（保持表格/列表/代码块的 markdown 语义可读）
 */

const REMARK_PLUGINS = [remarkGfm];

// 所有 URL 都返回空字符串 → react-markdown 不渲染 href
const NO_URL = (): string => "";

// 链接降级为带下划线的 span，保留视觉提示但不可点击
const COMPONENTS: Components = {
  ...ANCHOR_COMPONENTS_BARE,
  a({ children }) {
    return (
      <span className="underline decoration-dotted decoration-muted-foreground/40 underline-offset-2">
        {children}
      </span>
    );
  },
  // 表格在窄 popover（~28rem）里默认会被 prose 压缩到容器宽度，多列 CJK 表格被挤成
  // 「每格一两个汉字竖排」的不可读状态。包一层 overflow-x-auto 让表格按内容自然宽度
  // 横向滚动，单元格不再被腰斩。
  table({ children }) {
    return (
      <div className="overflow-x-auto">
        <table className="w-max max-w-none">{children}</table>
      </div>
    );
  },
};

interface MiniMarkdownProps {
  content: string;
  className?: string;
}

export function MiniMarkdown({ content, className }: MiniMarkdownProps) {
  return (
    <div
      className={
        "prose prose-sm dark:prose-invert max-w-none " +
        "prose-p:my-1 prose-headings:my-1.5 prose-li:my-0.5 " +
        "prose-table:my-1 prose-pre:my-1 prose-blockquote:my-1 " +
        (className || "")
      }
    >
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        urlTransform={NO_URL}
        components={COMPONENTS}
      >
        {normalizeBlockAnchors(content)}
      </ReactMarkdown>
    </div>
  );
}
