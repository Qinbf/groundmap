import "server-only";
import fs from "node:fs";
import path from "node:path";

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

export const SOURCE_FILES = {
  transformer: "attention_is_all_you_need",
  rsc: "react_server_components_rfc",
} as const;

/** 假想 raw 路径（仅用于在 UI 中展示给用户看，不真的存在） */
export const PSEUDO_RAW_PATHS = {
  transformer: "raw/papers/_learn_demo/attention_is_all_you_need.md",
  rsc: "raw/articles/_learn_demo/react_server_components_rfc.md",
} as const;
