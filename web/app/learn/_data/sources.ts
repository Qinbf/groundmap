import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { Locale } from "@/lib/i18n";

/**
 * 教学样例的"原始文件"内容读取器（server-only）。
 *
 * 文件存在 web/app/learn/_data/sources/*.md，由 server component 在 render 时
 * 调用本函数读取，再以 string 形式序列化传给 client component。
 *
 * 不放在 raw/ 下是因为 CLAUDE.md 规定 raw/ 是绝对只读区，
 * 而且这些是教学固化数据，不参与真实 ingest 流程——它们 PRETEND 自己在
 * raw/articles/_learn_demo/ 下，UI 也以那个伪路径展示给用户看。
 */

const SOURCE_DIR = path.join(process.cwd(), "app", "learn", "_data", "sources");

const cache = new Map<string, string>();

export function getSourceMarkdown(name: string): string {
  if (cache.has(name)) return cache.get(name)!;
  const file = path.join(SOURCE_DIR, `${name}.md`);
  const content = fs.readFileSync(file, "utf-8");
  cache.set(name, content);
  return content;
}

/**
 * 按 locale 取样例原文：en 优先读 `${baseName}.en.md`，不存在则回退中文 `${baseName}.md`。
 * 让左栏原文（RawDocPane）也能随界面语言切换中英文，而非只有中文。
 * 锚点编号在中英两版必须一致，否则 focusAnchors 高亮会失配。
 */
export function getLocalizedSourceMarkdown(baseName: string, locale: Locale): string {
  if (locale === "en") {
    const enFile = path.join(SOURCE_DIR, `${baseName}.en.md`);
    if (fs.existsSync(enFile)) return getSourceMarkdown(`${baseName}.en`);
  }
  return getSourceMarkdown(baseName);
}

// 教学页单样例：一份 RAG 奠基论文 (Lewis et al. 2020) 做载体演示 ingest 全流程。
export const SOURCE_FILES = {
  research: "rag_lewis_2020",
} as const;

/** 假想 raw 路径（仅用于在 UI 中展示给用户看，不真的存在） */
export const PSEUDO_RAW_PATHS = {
  research: "raw/papers/_learn_demo/rag_lewis_2020.md",
} as const;
