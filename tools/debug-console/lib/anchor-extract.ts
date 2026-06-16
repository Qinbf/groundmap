/**
 * 从 ReactMarkdown children 末尾抽取 trailing anchor（^h-/^p-/^t-/^c-/^f-）。
 *
 * 移植自 web/lib/markdown-render.ts —— 设计完全同步，让两边渲染一致。
 *
 * 用例：
 *   "## 实验结果 ^h-2-3-a3f2c1"  →  text: "实验结果", anchor: "h-2-3-a3f2c1"
 *   "数据 95.3%。 ^p-12-7d8e9a" →  text: "数据 95.3%。", anchor: "p-12-7d8e9a"
 */
import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

const TRAILING_ANCHOR_RE = /^(.*?)[ \t]+\^([hpcft]-\d+(?:-\d+)?-[a-z0-9]+(?:-\d+)?)\s*$/;

export function extractTrailingAnchor(children: ReactNode): {
  displayChildren: ReactNode;
  id?: string;
} {
  if (children == null) return { displayChildren: children };

  if (typeof children === "string") {
    const m = children.match(TRAILING_ANCHOR_RE);
    if (m) return { displayChildren: m[1], id: m[2] };
    return { displayChildren: children };
  }

  if (Array.isArray(children)) {
    if (children.length === 0) return { displayChildren: children };
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      if (child == null || child === false || child === "") continue;
      const result = extractTrailingAnchor(child);
      if (result.id != null) {
        const newChildren = [...children];
        newChildren[i] = result.displayChildren;
        return { displayChildren: newChildren, id: result.id };
      }
      return { displayChildren: children };
    }
    return { displayChildren: children };
  }

  if (isValidElement(children)) {
    const el = children as ReactElement<{ children?: ReactNode }>;
    const inner = el.props?.children;
    if (inner == null) return { displayChildren: children };
    const innerArray = Children.toArray(inner);
    const result = extractTrailingAnchor(innerArray);
    if (result.id == null) return { displayChildren: children };
    return {
      displayChildren: cloneElement(el, undefined, result.displayChildren),
      id: result.id,
    };
  }

  return { displayChildren: children };
}
