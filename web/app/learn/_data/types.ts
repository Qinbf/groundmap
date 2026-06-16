import type { TranslationKey } from "@/lib/i18n";

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

export interface MarkdownResult {
  kind: "markdown";
  /** 字面 markdown 内容（不翻译，原样渲染） */
  content: string;
  /** 可选 caption，i18n key（翻译） */
  captionKey?: TranslationKey;
  /** 可选展示路径（如 "wiki/sources/foo.md"，不翻译） */
  pseudoPath?: string;
}

export interface DiffResult {
  kind: "diff";
  before: string;
  after: string;
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
  message: string;
  files: CommitFile[];
  /** 可选 caption，i18n key（翻译） */
  captionKey?: TranslationKey;
}

export interface SearchHit {
  path: string;
  score: number;
  preview: string;
}

export interface SearchResultBlock {
  kind: "search-result";
  query: string;
  hits: SearchHit[];
}

export interface OutlineCliResult {
  kind: "outline-cli";
  /** k.py outline 的字面 CLI 输出 */
  content: string;
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

export type SampleId = "research" | "webdev";

export interface SampleMeta {
  id: SampleId;
  labelKey: TranslationKey;
  subtitleKey: TranslationKey;
  /** 该样例对应 raw/ 中假想文件路径（演示用，不翻译） */
  pseudoRawPath: string;
}
