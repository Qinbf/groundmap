/**
 * 知识库读取服务边界（Knowledge Base read service）
 *
 * 所有 page / API / component 对**wiki 内容**的读取（页面元数据、完整页面、
 * 反链、出链、检查存在性）必须经过本模块。
 *
 * 当前实现：fs 扫描 + markdown 解析（O(N) 全库扫，适合 < 千文档）
 * 未来实现：SQLite (.cache/index.db) 增量索引 + FTS5 全文，调用方 0 改动
 *
 * 例外（允许直接用 lib/kb.ts 原语的场景）：
 *   - raw/ 资产文件读写（不是 markdown 页面）
 *   - 写路径（writeFile）—— 暂未抽象，等接 SQLite 写时再统一
 *   - lib/kb-service.ts 内部实现
 */
import path from "node:path";
import {
  fileExists as _fileExists,
  readFile as _readFile,
  listMarkdownFiles as _listMarkdownFiles,
  isReadableDir,
} from "./kb";
import {
  parseMarkdown,
  parseWikilinks,
  normalizeLinkTarget,
  snippet,
  type PageFrontmatter,
  type ParsedPage,
} from "./markdown";

export type { PageFrontmatter, ParsedPage };

// ============================================================
// 类型
// ============================================================

/** 列表 / tree 视图用的轻量元数据 */
export interface PageMeta {
  path: string;
  title: string;
  type: string;
  status: string;
  confidence: string;
  last_modified: string;
  tags: string[];
}

/** 完整页面（含 raw + 解析后 frontmatter/content） */
export interface PageFull {
  path: string;
  meta: PageMeta;
  frontmatter: PageFrontmatter;
  content: string;
  raw: string;
}

/** 按 type 分组 + flat 列表 */
export interface PageTree {
  total: number;
  groups: Record<string, PageMeta[]>;
  flat: PageMeta[];
}

export interface BacklinkHit {
  from_path: string;
  anchor: string | null;
  alias: string | null;
  context: string;
  line: number;
}

export interface OutlinkHit {
  target: string;
  anchor: string | null;
  alias: string | null;
  line: number;
}

// ============================================================
// 内部工具
// ============================================================

const DEFAULT_DIRS = ["wiki"];
// my_thoughts/ 是人类专属区，agent 只读；web 端**不应该**返回该目录的文件名清单
// （即使内容不读，路径名本身也是隐私泄漏）。如果将来确实需要 server-side 访问
// my_thoughts，请走专门的 server-only helper，不通过 listPages。
const ALLOWED_DIRS = new Set(["wiki", "raw"]);

function normalizePath(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\.?\/+/, "");
}

/** raw/ 与 my_thoughts/ 下的文件用专门的虚拟 type，区别于 wiki schema 的真实 type */
function fallbackTypeByPath(p: string): string {
  if (p.startsWith("raw/")) return "raw_source";
  if (p.startsWith("my_thoughts/")) return "human_only";
  return "unknown";
}

/** YAML 字段可能是 "foo"（字符串）或 ["foo", "bar"]（列表）；都规范化为字符串数组。
 *  如果用户在 YAML 写 `tags: foo`，python-frontmatter / gray-matter 会给出字符串而非数组——
 *  下游 .some(...) / 标签匹配会出错。这里强制转为数组兜底。
 */
function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x));
  if (typeof v === "string" && v.trim()) return [v];
  return [];
}

function metaFromFrontmatter(p: string, fm: PageFrontmatter): PageMeta {
  return {
    path: p,
    title: String(fm.title || p.split("/").pop() || p),
    type: String(fm.type || fallbackTypeByPath(p)),
    status: String(fm.status || "draft"),
    confidence: String(fm.confidence || "medium"),
    last_modified: String(fm.last_modified || ""),
    tags: asStringArray(fm.tags),
  };
}

function placeholderMeta(p: string): PageMeta {
  return {
    path: p,
    title: p.split("/").pop() || p,
    type: fallbackTypeByPath(p),
    status: "draft",
    confidence: "medium",
    last_modified: "",
    tags: [],
  };
}

// ============================================================
// 公共 API
// ============================================================

/** wiki/raw 下的某 md 文件是否存在。
 *  读侧白名单：`my_thoughts/` 等非可读区即便文件真实存在也返回 false——
 *  对外表现为"不存在"，调用方据此返回 404，不泄露路径是否存在。 */
export async function pageExists(relPath: string): Promise<boolean> {
  if (!isReadableDir(relPath)) return false;
  return _fileExists(relPath);
}

/** 读单页 raw 字符串（保留 frontmatter）。不存在 / 非可读区抛错。 */
export async function getPageRaw(relPath: string): Promise<string> {
  if (!isReadableDir(relPath)) {
    // 与"文件不存在"对齐：非可读区不暴露路径是否存在
    throw new Error(`ENOENT: ${relPath}`);
  }
  return _readFile(relPath);
}

/** 读完整页面 —— meta + frontmatter + content + raw。不存在 / 非可读区返回 null。
 *  非可读区（如 my_thoughts/）一律按"不存在"处理，调用方返回 404。 */
export async function getPage(relPath: string): Promise<PageFull | null> {
  if (!isReadableDir(relPath)) return null;
  if (!(await _fileExists(relPath))) return null;
  const raw = await _readFile(relPath);
  const parsed = parseMarkdown(raw);
  return {
    path: relPath,
    meta: metaFromFrontmatter(relPath, parsed.frontmatter),
    frontmatter: parsed.frontmatter,
    content: parsed.content,
    raw,
  };
}

/**
 * 列出页面元数据。
 * @param dirs 默认 ["wiki"]，可包含 "raw" / "my_thoughts"，其它值会被过滤。
 *
 * 损坏的 frontmatter 不抛错——用占位条目占住位置，便于 UI 仍能展示文件名。
 */
export async function listPages(dirs: string[] = DEFAULT_DIRS): Promise<PageMeta[]> {
  const filtered = dirs.filter((d) => ALLOWED_DIRS.has(d));
  const targets = filtered.length > 0 ? filtered : DEFAULT_DIRS;
  const out: PageMeta[] = [];
  for (const dir of targets) {
    const files = await _listMarkdownFiles(dir);
    for (const filePath of files) {
      try {
        const raw = await _readFile(filePath);
        const { frontmatter } = parseMarkdown(raw);
        out.push(metaFromFrontmatter(filePath, frontmatter));
      } catch {
        out.push(placeholderMeta(filePath));
      }
    }
  }
  return out;
}

/** 树视图：按 type 分组 + flat 列表 + 总数。 */
export async function getPageTree(dirs?: string[]): Promise<PageTree> {
  const flat = await listPages(dirs);
  const groups: Record<string, PageMeta[]> = {};
  for (const m of flat) {
    (groups[m.type] = groups[m.type] || []).push(m);
  }
  return { total: flat.length, groups, flat };
}

/** 反向链接：扫 wiki/ 全库找谁引用了 targetPath。 */
export async function getBacklinks(targetPath: string): Promise<BacklinkHit[]> {
  const normalized = normalizePath(targetPath);
  const targetStem = path.basename(normalized, ".md");

  const allFiles = await _listMarkdownFiles("wiki");
  const hits: BacklinkHit[] = [];

  for (const filePath of allFiles) {
    if (filePath === normalized) continue;
    let content: string;
    try {
      content = await _readFile(filePath);
    } catch {
      continue;
    }
    const links = parseWikilinks(content);
    for (const link of links) {
      const linkNorm = normalizeLinkTarget(link.target);
      const linkStem = path.basename(linkNorm, ".md");
      const matched = linkNorm === normalized || linkStem === targetStem;
      if (!matched) continue;
      const lineNumber = content.slice(0, link.start).split("\n").length;
      hits.push({
        from_path: filePath,
        anchor: link.anchor,
        alias: link.alias,
        context: snippet(content, link.start, link.end, 60),
        line: lineNumber,
      });
    }
  }
  return hits;
}

/** 出向链接：sourcePath 页面里发出的所有 [[link]]。
 *  非可读区（如 my_thoughts/）按"无出链"处理——不读取其内容。 */
export async function getOutlinks(sourcePath: string): Promise<OutlinkHit[]> {
  const normalized = normalizePath(sourcePath);
  if (!isReadableDir(normalized)) return [];
  if (!(await _fileExists(normalized))) return [];
  const content = await _readFile(normalized);
  const links = parseWikilinks(content);
  return links.map((l) => ({
    target: normalizeLinkTarget(l.target),
    anchor: l.anchor,
    alias: l.alias,
    line: content.slice(0, l.start).split("\n").length,
  }));
}
