import type { TranslationKey, Locale } from "@/lib/i18n";

/**
 * /learn 教学演示页的数据 schema。
 *
 * 一个样例 = 10 个 StepData；切换样例时整组数据替换。
 *
 * 设计要点：
 * - titleKey / whyKey 等 i18n key 走翻译；命令字符串、markdown 产物保持原文不翻译
 *   （与 lib/i18n.ts 注释定的边界一致）
 * - results 是 discriminated union，按 kind 渲染不同视觉
 */

export type ResultKind =
  | "markdown"
  | "diff"
  | "commit"
  | "search-result"
  | "outline-cli";

/**
 * 教学 fixture 的可本地化文本：纯 string = 仅中文（向后兼容回退）；
 * { zh, en } = 双语，按当前 locale 选取。演示样例内容（论文原文、产物预览等）
 * 用它做到随界面语言切换中英文，而非只有中文。
 */
export type Localized = string | { zh: string; en: string };

/** 按 locale 取出 Localized 文本；纯 string 或缺 en 时回退到中文。 */
export function pickLocale(v: Localized, locale: Locale): string {
  if (typeof v === "string") return v;
  return v[locale] ?? v.zh;
}

export interface MarkdownResult {
  kind: "markdown";
  /** 字面 markdown 内容（可双语，随 locale 切换） */
  content: Localized;
  /** 可选 caption，i18n key（翻译） */
  captionKey?: TranslationKey;
  /** 可选展示路径（如 "wiki/sources/foo.md"，不翻译） */
  pseudoPath?: string;
}

export interface DiffResult {
  kind: "diff";
  before: Localized;
  after: Localized;
  pseudoPath?: string;
  captionKey?: TranslationKey;
}

/** commit 涉及文件的改动种类（UI 渲染为 i18n 徽章，见 learn.commit.* keys） */
export type CommitChangeKind = "created" | "modified" | "tagged" | "log";

export interface CommitFile {
  /** 文件路径（不翻译） */
  path: string;
  changeKind: CommitChangeKind;
}

export interface CommitResult {
  kind: "commit";
  hash: string;
  message: Localized;
  files: CommitFile[];
  /** 可选 caption，i18n key（翻译） */
  captionKey?: TranslationKey;
}

export interface SearchHit {
  path: string;
  score: number;
  preview: Localized;
}

export interface SearchResultBlock {
  kind: "search-result";
  query: Localized;
  hits: SearchHit[];
}

export interface OutlineCliResult {
  kind: "outline-cli";
  /** k.py outline 的字面 CLI 输出（可双语，随 locale 切换） */
  content: Localized;
}

export type Result =
  | MarkdownResult
  | DiffResult
  | CommitResult
  | SearchResultBlock
  | OutlineCliResult;

export interface ConceptHint {
  termKey: TranslationKey;
  bodyKey: TranslationKey;
}

export interface StepData {
  /** 1..10 */
  id: number;
  titleKey: TranslationKey;
  whyKey: TranslationKey;
  /** 命令字面字符串（如 `python scripts/k.py outline raw/foo.md`），不翻译 */
  whatCommand?: string;
  /** 命令旁的中文注释 i18n key */
  whatNoteKey?: TranslationKey;
  /** 通常 1-2 个 result，按顺序竖排 */
  results: Result[];
  /** 本步内可能出现的概念提示，挂在 Why 区文末 */
  concepts?: ConceptHint[];
  /**
   * 该步主要"作用于"的 raw 文档段落锚点列表（如 ["h-2-1-d3a91b", "p-7-3b8e64"]）。
   * 驱动左栏 RawDocPane 的段落高亮 + 滚到视区。
   * 不写或空数组表示这一步不直接对应 raw 段落（如第 9/10 步：写 log / commit）。
   */
  focusAnchors?: string[];
}

// 教学页现为单样例（RAG 奠基论文）；SampleId 保留为单成员联合，便于将来需要时再加样例。
export type SampleId = "research";

export interface SampleMeta {
  id: SampleId;
  labelKey: TranslationKey;
  subtitleKey: TranslationKey;
  /** 该样例对应 raw/ 中假想文件路径（演示用，不翻译） */
  pseudoRawPath: string;
}
