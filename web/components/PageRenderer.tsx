"use client";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMemo } from "react";
import { preprocessWikiLinks, parseKbLink, extractCodeBlockAnchor } from "@/lib/markdown-render";
import {
  AnchorRegistryContext,
  ANCHOR_COMPONENTS,
  References,
  buildAnchorRegistry,
} from "@/lib/anchor-refs";
import { WikiLink } from "@/components/WikiLink";

interface PageRendererProps {
  content: string;
}

// 提到模块级：避免每次 render 新建引用，让 react-markdown 内部 memoization 生效，
// 同时减少 SSR / client hydrate 时因 props 引用差异引发的潜在 mismatch
const REMARK_PLUGINS = [remarkGfm];

/**
 * 安全的 URL 协议白名单。
 *
 * react-markdown v9 默认 urlTransform 拦截 javascript:/data:/vbscript: 等危险协议，
 * 但只允许 http/https/mailto/tel/ircs/xmpp——会把我们的 kb:// 也一并拦截。
 *
 * 解决：自己实现一个**白名单**式的 transform 而非裸返回 url——后者等于把
 * `[click](javascript:alert(1))` 直接 wire 到 `<a href="javascript:...">`。
 *
 * 安全准则：
 *   - 显式列出允许的 scheme（含 kb://）
 *   - 同时允许 fragment-only (`#x`)、相对路径 (`./...` / `../...` / `foo/bar`)
 *   - 任何形如 `xxx:yyy` 的字符串若 scheme 不在白名单 → 替换为空字符串
 *     （react-markdown 内置的 defaultUrlTransform 也是这种"返回空串"约定）
 */
const SAFE_PROTOCOL_RE = /^(https?:|mailto:|tel:|kb:)/i;
const URL_TRANSFORM = (url: string): string => {
  if (typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  // fragment-only / 相对路径：第一个 ":" 之前必含 "/" 或 "?"——否则视为协议
  const colonIdx = trimmed.indexOf(":");
  const slashIdx = trimmed.indexOf("/");
  const questionIdx = trimmed.indexOf("?");
  const hashIdx = trimmed.indexOf("#");
  // 第一个分隔字符不是 ":" → 一定是相对路径 / fragment / query，安全
  const firstSep = [slashIdx, questionIdx, hashIdx]
    .filter((i) => i !== -1)
    .reduce((a, b) => Math.min(a, b), Infinity);
  if (colonIdx === -1 || (firstSep !== Infinity && firstSep < colonIdx)) {
    return trimmed;
  }
  // 含协议：必须命中白名单
  return SAFE_PROTOCOL_RE.test(trimmed) ? trimmed : "";
};

// 合并锚点上标 components 与本组件特有的 a / code 自定义
const COMPONENTS: Components = {
  ...ANCHOR_COMPONENTS,
  a({ href, children, ...props }) {
    const kb = href ? parseKbLink(href) : null;
    if (kb) {
      return (
        <WikiLink target={kb.target} anchor={kb.anchor} relation={kb.relation}>
          {children}
        </WikiLink>
      );
    }
    // 二道防线：即使 urlTransform 失效也再过一遍同样的协议白名单
    // ——杜绝 javascript:/data: 通过自定义 a 组件回流注入
    const safeHref = href ? URL_TRANSFORM(href) : undefined;
    const isExternal = safeHref?.startsWith("http://") || safeHref?.startsWith("https://");
    return (
      <a
        href={safeHref || undefined}
        {...(isExternal && { target: "_blank", rel: "noopener noreferrer" })}
        {...props}
      >
        {children}
      </a>
    );
  },
  code({ children, className, ...props }) {
    // react-markdown v9 移除了 inline prop。需要自己判断：
    //   1) 带 language- className → 一定是 fenced code block
    //   2) children 含换行 → 即使 fenced code 不带语言也是 block
    //   3) 否则才是 inline code（单反引号 `...` 形式）
    // 之前的 `inline = !className` 错判：fenced code 不指定语言时 className 也是
    // undefined，被当成 inline 渲染，于是每行套了浅底样式与黑色 pre 容器分离。
    const childText =
      typeof children === "string"
        ? children
        : Array.isArray(children)
        ? children.join("")
        : "";
    const hasLanguage = !!className && /\blanguage-/.test(className);
    const isBlock = hasLanguage || childText.includes("\n");

    if (!isBlock) {
      // inline code：浅灰底 + 前景色字
      return (
        <code
          className="rounded bg-muted px-1 py-0.5 font-mono text-sm text-foreground"
          {...props}
        >
          {children}
        </code>
      );
    }

    // fenced code block 内的 <code>：让 pre 提供背景，code 自己只负责字色，
    // 强制透明背景 + 0 padding 防止 typography / 其它来源的样式渗入。
    // 末行若是下沉的代码块锚点（^c-...，见 relocateCodeFenceAnchors），抽成 id 让
    // [[raw/...#^c-...]] 引用能 HashScroller 跳转，并从可见代码里剥掉锚点噪音。
    const { display, id } = extractCodeBlockAnchor(childText);
    return (
      <code
        id={id}
        className={`${className ?? ""} !bg-transparent !p-0 !text-zinc-100`}
        {...props}
      >
        {display}
      </code>
    );
  },
};

/**
 * markdown 渲染器：
 * - GFM 兼容（表格、删除线、checklist）
 * - [[wiki-link]] 预处理为 kb:// 链接，自定义渲染为 WikiLink 组件
 * - 普通链接照常渲染（外部链接加 target=_blank）
 * - trailing anchor + raw wikilink 渲染为 [n] 上标 + 文末 References 区（论文样式，见 lib/anchor-refs.tsx）
 */
export function PageRenderer({ content }: PageRendererProps) {
  const processed = preprocessWikiLinks(content);
  const { registry, refs } = useMemo(
    () => buildAnchorRegistry(content, { scanWikilinks: true }),
    [content],
  );

  return (
    <article
      className={[
        "prose prose-slate dark:prose-invert max-w-none",
        "prose-headings:scroll-mt-20",
        // inline code：去掉默认反引号装饰（` ... `）
        "prose-code:before:hidden prose-code:after:hidden",
        // fenced code 代码块：显式指定深底浅字，绕过 typography CSS 变量被覆盖
        // 的不确定性。zinc-900 深底 + zinc-100 浅字，对比度高且不刺眼。
        "prose-pre:bg-zinc-900 prose-pre:text-zinc-100",
        "prose-pre:shadow-sm prose-pre:rounded-lg prose-pre:border prose-pre:border-zinc-800",
      ].join(" ")}
    >
      <AnchorRegistryContext.Provider value={registry}>
        <ReactMarkdown
          remarkPlugins={REMARK_PLUGINS}
          urlTransform={URL_TRANSFORM}
          components={COMPONENTS}
        >
          {processed}
        </ReactMarkdown>
      </AnchorRegistryContext.Provider>
      <References refs={refs} />
    </article>
  );
}
