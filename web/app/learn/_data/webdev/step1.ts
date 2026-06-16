import "server-only";
import type { StepData } from "../types";

const articleExcerpt = `---
title: "RFC: React Server Components"
authors: "Joseph Savona, Andrew Clark, Sebastian Markbåge, Lauren Tan, Dan Abramov"
org: "Meta (React Core Team)"
created: 2026-05-08
---

# RFC: React Server Components ^h-1-1-d27e80

我们提出一个为现代 UI 应用提供"**零打包成本服务端组件**"的新架构。它让开发者把组件树分成两部分：一部分**只在服务端运行、永不发送到浏览器**（Server Components），另一部分**像今天的 React 组件那样在浏览器运行**（Client Components）。 ^p-1-c30a8f

## Motivation ^h-2-2-bd420f

现代 React 应用经历了三类典型痛点 —— **bundle size**、**network waterfall**、**data fetching ergonomics** —— 它们彼此交织，单独优化任何一项都会让其他两项更糟。RSC 是对这一三角约束的系统性回答。 ^p-4-9c3f81
`;

const outlineJsonExcerpt = `\`\`\`json
{
  "doc_path": "raw/articles/_learn_demo/react_server_components_rfc.md",
  "doc_chars": 6920,
  "doc_paragraphs": 43,
  "generated_at": "2026-05-08T11:02:14",
  "sections": [
    {
      "level": 1, "seq": 1, "anchor": "h-1-1-d27e80",
      "title": "RFC: React Server Components",
      "line": 10, "char_start": 0, "char_end": 6920,
      "children": [
        { "level": 2, "seq": 1, "anchor": "h-2-1-3e7b04", "title": "Summary" },
        {
          "level": 2, "seq": 2, "anchor": "h-2-2-bd420f", "title": "Motivation",
          "children": [
            { "level": 3, "seq": 1, "anchor": "h-3-1-d8a07c", "title": "Bundle Size" },
            { "level": 3, "seq": 2, "anchor": "h-3-2-4a08eb", "title": "Network Waterfall" },
            { "level": 3, "seq": 3, "anchor": "h-3-3-9c701f", "title": "Data Fetching Ergonomics" }
          ]
        },
        {
          "level": 2, "seq": 3, "anchor": "h-2-3-b94e02", "title": "Architecture",
          "children": [
            { "level": 3, "seq": 4, "anchor": "h-3-4-aa3018", "title": "Server Components vs Client Components" },
            { "level": 3, "seq": 5, "anchor": "h-3-5-1d8a90", "title": "Component Tree Serialization" }
          ]
        },
        { "level": 2, "seq": 4, "anchor": "h-2-4-2f3a8b", "title": "Comparison with SSR" },
        { "level": 2, "seq": 5, "anchor": "h-2-5-c08a91", "title": "Constraints and Capabilities" },
        { "level": 2, "seq": 6, "anchor": "h-2-6-58c708", "title": "FAQ" }
      ]
    }
  ]
}
\`\`\``;

export const step1: StepData = {
  id: 1,
  titleKey: "learn.step.1.title",
  whyKey: "learn.step.1.why",
  whatCommand: "python scripts/convert.py",
  whatNoteKey: "learn.cmd.note.convert",
  focusAnchors: ["h-1-1-d27e80", "p-1-c30a8f"],
  results: [
    {
      kind: "markdown",
      content: articleExcerpt,
      pseudoPath: "raw/articles/_learn_demo/react_server_components_rfc.md",
    },
    {
      kind: "markdown",
      content: outlineJsonExcerpt,
      pseudoPath: "raw/articles/_learn_demo/react_server_components_rfc.outline.json",
    },
  ],
  concepts: [
    { termKey: "learn.concept.markdown.title", bodyKey: "learn.concept.markdown.body" },
    { termKey: "learn.concept.anchor.title", bodyKey: "learn.concept.anchor.body" },
  ],
};
