#!/usr/bin/env python
"""
知识库 CLI - scripts/k.py
=================================

提供 Claude Code 内置工具（Read / Grep / Glob）做不到的结构化查询：
search / list-pages / list-orphans / list-conflicts / list-to-update /
backlinks / outlinks / health / validate-frontmatter

所有命令支持 --json 输出供 LLM / 脚本解析。

依赖: pip install python-frontmatter
"""

import argparse
import json
import os
import re
import sys
import tempfile
from collections import namedtuple
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path


def _atomic_write_text(target: Path, content: str, encoding: str = "utf-8") -> None:
    """write-then-rename 原子写：先写到同目录的临时文件再 os.replace 重命名。
    保证别的进程读 target 时只能看到完整旧内容或完整新内容，不会读到半截。

    Windows 兼容：当目标文件被另一进程持 read handle（如 web server 正在 readFile）
    时，os.replace 会抛 PermissionError [WinError 5]。重试 3 次（50ms 间隔）。
    最终失败时**保留临时文件**让用户可手动 mv 收拾，而不是删了重写——避免数据丢失。
    """
    import time as _time

    target.parent.mkdir(parents=True, exist_ok=True)
    tmp_fd, tmp_path = tempfile.mkstemp(
        dir=str(target.parent),
        prefix=f".{target.name}.",
        suffix=".tmp",
    )
    try:
        with os.fdopen(tmp_fd, "w", encoding=encoding, newline="") as f:
            f.write(content)
    except Exception:
        # 写 tmp 都失败 → 直接清理 + 抛
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise

    # rename 阶段：Windows 锁竞争重试
    last_exc: Exception | None = None
    for attempt in range(3):
        try:
            os.replace(tmp_path, str(target))
            return
        except PermissionError as e:
            last_exc = e
            _time.sleep(0.05)
    # 3 次都失败：清理 tmp（避免污染 git status），给 stderr 明确提示让用户重试
    try:
        os.unlink(tmp_path)
    except OSError:
        # 实在删不掉 → 提示用户清理路径
        print(
            f"[_atomic_write_text] 警告：临时文件无法清理：{tmp_path} "
            f"（可能仍被进程持有；请重启相关进程后手动 rm）",
            file=sys.stderr,
        )
    print(
        f"[_atomic_write_text] os.replace 失败 3 次（目标 {target} 可能被另一进程持锁）；"
        f"请稍后重试，或重启占用该文件的进程",
        file=sys.stderr,
    )
    if last_exc is not None:
        raise last_exc

# 让 Windows 终端也能正确输出中文
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

try:
    import frontmatter
except ImportError:
    print(
        "错误：需要安装 python-frontmatter\n  pip install python-frontmatter",
        file=sys.stderr,
    )
    sys.exit(1)

# 让 section_parser / postprocess 可被 import（与 k.py 同目录）
sys.path.insert(0, str(Path(__file__).resolve().parent))
from section_parser import ANCHOR_TAIL_RE, split_blocks
from postprocess import build_outline_data


# ============================================================
# 配置
# ============================================================

ENGINE_ROOT = Path(__file__).resolve().parent.parent
# 数据根：默认 = 引擎根（代码与数据同库，向后兼容）。设环境变量 KB_ROOT 指向某个独立项目的
# 数据目录（含 workspaces/），即可让一份引擎服务多个项目——与 web/lib/kb.ts 的 KB_ROOT 同义。
_KB_ROOT_ENV = os.environ.get("KB_ROOT")
DATA_ROOT = Path(_KB_ROOT_ENV).expanduser().resolve() if _KB_ROOT_ENV else ENGINE_ROOT
PROJECT_ROOT = DATA_ROOT
WIKI_DIR = PROJECT_ROOT / "wiki"
RAW_DIR = PROJECT_ROOT / "raw"

# Wiki 双链正则。
# **同步约束**：必须与 web/lib/markdown.ts 的 WIKILINK_RE 字面一致
# （仅差 JS 端的 /.../g flag 与 Python r-string 包装）。
# 修改时两处同步更新，并跑 scripts/tests/test_k_helpers.py 的
# TestWikilinkRegexSync 守住 drift。
WIKILINK_RE = re.compile(r"\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]")
TO_BE_UPDATED_RE = re.compile(r"(?<!\w)#to-be-updated(?!\w)")

# 类型化关系图谱（v0.4b）：[[target|RELATION_TYPE]] 的标准关系白名单。
# 判别规则：[[X|Y]] 第三组 Y 完整匹配白名单中某条 → 关系类型；其他（含中文、
# 空格、小写、未知大写词如 "RFC"）→ 显示别名。白名单外的全大写词**不**视为
# 关系，避免把任意全大写词误判。
# **同步约束**：必须与 web/lib/markdown.ts 的 RELATION_TYPES 字面一致；
# TestRelationTypesSync 守住 drift。
RELATION_TYPES = frozenset({
    "SUPPORTS",        # A 支持 B 的论断
    "REFUTES",         # A 反驳 B 的论断
    "EXTENDS",         # A 在 B 的基础上延伸
    "IS_A",            # A 是 B 的一种
    "PART_OF",         # A 是 B 的组成部分
    "ALTERNATIVE_TO",  # A 是 B 的替代方案
    "CITES",           # A 引用 B（一般文献引用）
})
# 冲突块起始行标记："> [!WARNING] 知识更新冲突 …"。
# 块体由 find_conflicts 逐行收集（见其实现）——以 > 开头或空行的连续行都算同一
# callout，直到遇到既非 > 开头也非空行的"真内容"行才结束。这样含空行的多段
# callout 也能被完整捕获（旧的单条正则会被块内空行截断）。
CONFLICT_START_RE = re.compile(r"^>\s*\[!WARNING\]\s*知识更新冲突")

# 围栏代码块 ```...``` 与行内代码 `...`，用于在扫描标签 / 链接时剥离
FENCED_CODE_RE = re.compile(r"```[\s\S]*?```")
INLINE_CODE_RE = re.compile(r"`[^`\n]*`")


def mask_code_spans(text: str) -> str:
    """把 markdown 代码（围栏 + 行内）替换成等长空白，保留字符偏移与行号；
    用于扫描标签 / 链接时跳过代码内字面提及。"""
    def _blank(m: re.Match) -> str:
        # 保留换行（围栏代码块多行），其余字符替换为空格——保证 len 不变
        return "".join("\n" if ch == "\n" else " " for ch in m.group(0))
    text = FENCED_CODE_RE.sub(_blank, text)
    text = INLINE_CODE_RE.sub(_blank, text)
    return text


# JS / TS 注释 — 用于在扫描 web/ 硬编码字符串时剥除注释内的字面提及
JS_COMMENT_RE = re.compile(r"//[^\n]*|/\*[\s\S]*?\*/")


def mask_js_comments(text: str) -> str:
    """把 JS/TS 注释（// 单行 + /* */ 多行）替换为等长空白，保留偏移与行号。"""
    def _blank(m: re.Match) -> str:
        return "".join("\n" if ch == "\n" else " " for ch in m.group(0))
    return JS_COMMENT_RE.sub(_blank, text)


# JSX 表达式容器 {…}（最内层无嵌套花括号、且不跨行的一段），用于在扫 JSX 文本时剥除。
# **不跨行**是关键：JSX 文本里的内联插值（如 `共 {n} 条`）都在同一行；而函数体 / 对象
# 字面量这类 JS 代码块的 `{ … }` 横跨多行，且**包含**我们想扫的 JSX 文本——若把它们也
# 掩掉，`return <button>保存修改</button>;` 整段会被一起抹平导致漏报。故 `[^{}\n]*` 仅吃单行。
INNERMOST_BRACE_RE = re.compile(r"\{[^{}\n]*\}")


def mask_jsx_expressions(text: str) -> str:
    """把 JSX 的单行 {…} 表达式替换为等长空白（保留偏移与行号），从最内层反复剥到无嵌套。

    用途：硬编码中文混排被 `{...}` 表达式打断时（如 `<span>共 {n} 条</span>`），
    JSX_TEXT_CN_RE 的字符类排除了 `{` `}` 导致跨表达式的中文文本漏报。先把
    `{n}` / `{t("x")}` 等掩成空白，剩余的 `共  条` 才能被整体捕获。

    合法的 `{t("key")}` 被掩成空白本就是期望——它不是硬编码，不该报警，且掩码后
    不会引入新的中文，故不影响判定。

    只吃单行 {…}：多行的 JS 代码块（函数体 / 对象字面量）不掩——它们包含 JSX 文本
    本身，掩掉会抹平整段导致漏报。"""
    def _blank(m: re.Match) -> str:
        return "".join("\n" if ch == "\n" else " " for ch in m.group(0))
    prev = None
    # 反复替换最内层 {…}，直到不再变化（处理嵌套表达式）
    while prev != text:
        prev = text
        text = INNERMOST_BRACE_RE.sub(_blank, text)
    return text


# ============================================================
# Page 数据结构
# ============================================================

def _as_str_list(v) -> list:
    """YAML 字段可能是 list 或单字符串；都规范化为字符串列表。

    如果用户写 `tags: foo` 而非 `tags: [foo]`，python-frontmatter 返回字符串。
    旧逻辑 `list(meta.get("tags") or [])` 会把字符串拆成字符列表（"foo" → ['f','o','o']），
    导致 tag 过滤静默错乱。这里统一兜底。
    """
    if v is None:
        return []
    if isinstance(v, list):
        return [str(x) for x in v]
    if isinstance(v, str):
        return [v] if v.strip() else []
    return [str(v)]


@dataclass
class Page:
    path: str               # 相对项目根的 POSIX 路径
    title: str
    type: str
    status: str
    confidence: str
    last_modified: str
    last_modified_by: str
    tags: list
    sources: list
    source_count: int
    raw_content: str

    @classmethod
    def from_file(cls, file_path: Path):
        try:
            post = frontmatter.load(file_path)
        except Exception:
            return None

        meta = post.metadata
        rel_path = str(file_path.relative_to(PROJECT_ROOT)).replace("\\", "/")

        return cls(
            path=rel_path,
            title=str(meta.get("title", file_path.stem) or file_path.stem),
            type=str(meta.get("type", "unknown") or "unknown"),
            status=str(meta.get("status", "draft") or "draft"),
            confidence=str(meta.get("confidence", "medium") or "medium"),
            last_modified=str(meta.get("last_modified", "") or ""),
            last_modified_by=str(meta.get("last_modified_by", "unknown") or "unknown"),
            tags=_as_str_list(meta.get("tags")),
            sources=_as_str_list(meta.get("sources")),
            source_count=int(meta.get("source_count") or 0),
            raw_content=post.content,
        )


# ============================================================
# 加载 + 链接图
# ============================================================

def load_all_wiki_pages():
    pages = []
    if not WIKI_DIR.exists():
        return pages

    for md_file in WIKI_DIR.rglob("*.md"):
        if md_file.name.startswith("."):
            continue
        # 跳过模板
        if "_templates" in md_file.parts:
            continue
        page = Page.from_file(md_file)
        if page:
            pages.append(page)
    return pages


Wikilink = namedtuple("Wikilink", ["target", "anchor", "alias", "relation"])


def split_alias_or_relation(third_group):
    """把 [[X|Y]] 第三组 Y 判别为 (alias, relation_type)。

    Y 完整匹配 RELATION_TYPES 白名单 → 关系；其他 → 别名。
    返回 (alias_or_none, relation_or_none) — 二者互斥。
    """
    if third_group is None:
        return (None, None)
    stripped = third_group.strip()
    if stripped in RELATION_TYPES:
        return (None, stripped)
    return (third_group, None)


def parse_wikilinks(content):
    """返回 [Wikilink(target, anchor, alias, relation), ...]

    Wikilink 是 namedtuple，既支持 link.target 具名访问，也支持 4-tuple 解构。
    alias 与 relation 互斥（最多一个非 None）；纯 [[X]] 两者都为 None。
    """
    out = []
    for m in WIKILINK_RE.finditer(content):
        alias, relation = split_alias_or_relation(m.group(3))
        out.append(Wikilink(
            target=m.group(1),
            anchor=m.group(2),
            alias=alias,
            relation=relation,
        ))
    return out


def normalize_link_target(target):
    """规范化链接目标：补 .md 后缀；去前后空格"""
    target = target.strip()
    if not target.endswith(".md"):
        target = target + ".md"
    return target


def build_link_graph(pages):
    """
    返回反向链接图：{被链接的页面 path: {链接它的源页 path, ...}}
    命中策略：完整路径 > basename

    自引用排除：页面 [[自己]] 不计入入链——与 web/lib/kb-service.ts 的 getBacklinks
    口径保持一致；否则"健康度报告说没问题但点进去看才发现实际是孤儿"会出现。
    """
    backlinks = {}
    page_paths = {p.path for p in pages}
    page_basenames = {Path(p).stem: p for p in page_paths}

    for page in pages:
        # 剥离代码块 / 行内代码——代码示例里的 [[link]] 不是真实引用
        for link in parse_wikilinks(mask_code_spans(page.raw_content)):
            target_norm = normalize_link_target(link.target)
            if target_norm in page_paths:
                if target_norm == page.path:
                    continue  # self-link 不算入链
                backlinks.setdefault(target_norm, set()).add(page.path)
                continue
            stem = Path(target_norm).stem
            if stem in page_basenames:
                resolved = page_basenames[stem]
                if resolved == page.path:
                    continue
                backlinks.setdefault(resolved, set()).add(page.path)

    return backlinks


def _is_exempt(page) -> bool:
    """统一豁免判定：status==deprecated 或 路径落在 _archive 归档区。

    用途：source-issues / bare-claims / index-mismatches 三类"质量论断型"
    lint 对已废弃 / 已归档的历史内容不应报警（它们本就是"不再维护"的状态）。

    **注意**：broken-source-link 与 conflicts 不走本豁免——前者是结构缺陷
    （链接指向不存在的文件，无论页面死活都该暴露），后者是未决冲突
    （deprecated 页里挂着待人类判别的冲突仍需被看见）。
    """
    if getattr(page, "status", None) == "deprecated":
        return True
    if "_archive" in page.path:
        return True
    return False


# ============================================================
# 搜索
# ============================================================

def search_pages(query, pages, limit=20):
    """关键词搜索：标题命中 ×5、正文命中 ×1，按总分降序"""
    query_lower = query.lower()
    terms = [t for t in query_lower.split() if t]
    if not terms:
        return []

    results = []
    for page in pages:
        title_lower = page.title.lower()
        content_lower = page.raw_content.lower()

        score = 0
        for term in terms:
            score += title_lower.count(term) * 5
            score += content_lower.count(term)

        if score > 0:
            snippet = ""
            for term in terms:
                idx = content_lower.find(term)
                if idx >= 0:
                    start = max(0, idx - 60)
                    end = min(len(content_lower), idx + 120)
                    snippet = page.raw_content[start:end].replace("\n", " ").strip()
                    if start > 0:
                        snippet = "..." + snippet
                    if end < len(content_lower):
                        snippet = snippet + "..."
                    break

            results.append({
                "path": page.path,
                "title": page.title,
                "type": page.type,
                "status": page.status,
                "score": score,
                "snippet": snippet,
            })

    results.sort(key=lambda x: -x["score"])
    return results[:limit]


# ============================================================
# 列表查询
# ============================================================

def filter_pages(pages, filters):
    out = []
    for p in pages:
        ok = True
        for key, val in filters.items():
            if val is None:
                continue
            if key == "type" and p.type != val:
                ok = False
            elif key == "status" and p.status != val:
                ok = False
            elif key == "confidence" and p.confidence != val:
                ok = False
            elif key == "tag" and val not in p.tags:
                ok = False
            elif key == "modified_by" and p.last_modified_by != val:
                ok = False
        if ok:
            out.append(p)
    return out


def find_orphans(pages, backlinks):
    out = []
    for p in pages:
        # 跳过根索引（它本身是最顶层）
        if p.path == "wiki/root_index.md":
            continue
        # deprecated 页面没人引用是天经地义的（已被废弃），不算孤儿
        if p.status == "deprecated":
            continue
        if p.path not in backlinks or len(backlinks[p.path]) == 0:
            out.append(p)
    return out


def find_conflicts(pages):
    out = []
    for p in pages:
        # 跳过反引号 / 围栏代码——周报、运维文档讨论冲突格式不应触发。
        # mask_code_spans 保留行结构（仅把代码字符替换为空格），故掩码后的行与
        # 原文行一一对应：用掩码行判定 / 起始匹配，用原文行还原 block 文本。
        scan_lines = mask_code_spans(p.raw_content).split("\n")
        raw_lines = p.raw_content.split("\n")
        i = 0
        n = len(scan_lines)
        while i < n:
            if not CONFLICT_START_RE.match(scan_lines[i]):
                i += 1
                continue
            # 命中起始行：逐行收集"以 > 开头 或 空行"的连续行，直到真内容行
            start = i
            j = i + 1
            while j < n:
                s = scan_lines[j]
                if s.startswith(">") or s.strip() == "":
                    j += 1
                    continue
                break
            # 还原 block：从原文取 [start, j) 行，去掉尾部空行
            block_lines = raw_lines[start:j]
            while block_lines and block_lines[-1].strip() == "":
                block_lines.pop()
            out.append({
                "path": p.path,
                "title": p.title,
                "block": "\n".join(block_lines).strip(),
                "line": start + 1,
            })
            # 从块结束处继续（避免把同一块重复匹配）
            i = max(j, start + 1)
    return out


def find_to_update(pages):
    out = []
    for p in pages:
        # deprecated 页面带 #to-be-updated 也无意义
        if p.status == "deprecated":
            continue
        # 跳过反引号包裹的字面提及——周报、运维文档讨论这个标签时不应触发
        if TO_BE_UPDATED_RE.search(mask_code_spans(p.raw_content)):
            out.append({
                "path": p.path,
                "title": p.title,
                "type": p.type,
                "last_modified": p.last_modified,
            })
    return out


# ============================================================
# 反向 / 出向链接
# ============================================================

def get_backlinks(target_path, pages):
    target_path = target_path.replace("\\", "/").lstrip("./")
    target_stem = Path(target_path).stem

    out = []
    for p in pages:
        # self-link 不算反向链接（与 web/lib/kb-service.ts.getBacklinks 一致）
        if p.path == target_path:
            continue
        # 在掩码后的内容上扫描（剥离代码块/行内代码里的示例链接）；
        # mask_code_spans 保留字符偏移与行号，故 context / line 仍取自原文。
        scan_text = mask_code_spans(p.raw_content)
        for m in WIKILINK_RE.finditer(scan_text):
            link_target = m.group(1)
            link_target_norm = normalize_link_target(link_target)
            link_stem = Path(link_target_norm).stem

            hit = (link_target_norm == target_path) or (link_stem == target_stem)
            if not hit:
                continue

            start = max(0, m.start() - 60)
            end = min(len(p.raw_content), m.end() + 60)
            context = p.raw_content[start:end].replace("\n", " ").strip()
            line = p.raw_content[: m.start()].count("\n") + 1

            alias, relation = split_alias_or_relation(m.group(3))
            out.append({
                "from_path": p.path,
                "from_title": p.title,
                "anchor": m.group(2),
                "alias": alias,
                "relation": relation,
                "context": context,
                "line": line,
            })
    return out


def get_outlinks(source_path, pages):
    source_path = source_path.replace("\\", "/").lstrip("./")
    source_page = next((p for p in pages if p.path == source_path), None)
    if not source_page:
        return []

    out = []
    for m in WIKILINK_RE.finditer(source_page.raw_content):
        target = m.group(1)
        line = source_page.raw_content[: m.start()].count("\n") + 1
        alias, relation = split_alias_or_relation(m.group(3))
        out.append({
            "target": normalize_link_target(target),
            "anchor": m.group(2),
            "alias": alias,
            "relation": relation,
            "line": line,
        })
    return out


# ============================================================
# 关系类型 lint（v0.4b 图谱）
# ============================================================

# 形如关系类型但需要白名单验证：全大写 ASCII，含下划线 或 长度 ≥ 5。
# 这条规则把 [[X|RFC]] / [[X|API]] 等短缩写排除（高概率是用户当 alias 用），
# 但能捕捉 [[X|SUPPORTS]] / [[X|IS_A]] / 拼写错误如 [[X|SUPORTS]]。
_RELATION_SHAPED_RE = re.compile(r"^[A-Z][A-Z_]+$")


def _looks_like_relation(third_group: str) -> bool:
    """启发式：看起来像关系类型（用以判断是否要校验白名单）。"""
    if third_group is None:
        return False
    stripped = third_group.strip()
    if not _RELATION_SHAPED_RE.match(stripped):
        return False
    return "_" in stripped or len(stripped) >= 5


def build_graph_data(
    pages,
    backlinks,
    *,
    filter_type: str | None = None,
    filter_tag: str | None = None,
    include_archive: bool = False,
) -> dict:
    """构造 wiki 链接图谱 JSON。

    返回 {nodes: [...], edges: [...]} ：
      - 节点字段 path / title / type / status / tags / inbound_count / outbound_count
      - 边字段   from / to / link_type / anchor?

    link_type 取值：白名单关系（SUPPORTS / REFUTES / ...）或 'REFERENCES'（默认）。
    self-link 排除（与 build_link_graph / getBacklinks 一致）。
    归档区 (wiki/_archive_*) 默认排除——历史快照不应主导图谱视觉。
    """
    # ---- 过滤节点集 ----
    def page_visible(p: Page) -> bool:
        if not include_archive and "_archive" in p.path:
            return False
        if filter_type and p.type != filter_type:
            return False
        if filter_tag and filter_tag not in p.tags:
            return False
        return True

    visible_pages = [p for p in pages if page_visible(p)]
    visible_paths = {p.path for p in visible_pages}
    # 基名 → 全路径（用于无前缀的 [[basename]] 链接解析）
    visible_basenames = {Path(p.path).stem: p.path for p in visible_pages}

    # 入度计数（基于过滤后子图）——用 backlinks 全量再交集
    inbound_count: dict[str, int] = {}
    outbound_count: dict[str, int] = {}

    edges: list[dict] = []
    seen_edges: set[tuple[str, str, str, str]] = set()  # (from, to, link_type, anchor)

    for page in visible_pages:
        for link in parse_wikilinks(page.raw_content):
            target_norm = normalize_link_target(link.target)
            # 解析 target：先看完整路径，再 fallback basename
            if target_norm in visible_paths:
                resolved = target_norm
            else:
                stem = Path(target_norm).stem
                resolved = visible_basenames.get(stem)
            if resolved is None:
                continue
            if resolved == page.path:
                continue  # self-link 排除
            link_type = link.relation or "REFERENCES"
            anchor = link.anchor or ""
            dedup_key = (page.path, resolved, link_type, anchor)
            if dedup_key in seen_edges:
                continue
            seen_edges.add(dedup_key)
            edges.append({
                "from": page.path,
                "to": resolved,
                "link_type": link_type,
                **({"anchor": anchor} if anchor else {}),
            })
            outbound_count[page.path] = outbound_count.get(page.path, 0) + 1
            inbound_count[resolved] = inbound_count.get(resolved, 0) + 1

    nodes = [{
        "path": p.path,
        "title": p.title,
        "type": p.type,
        "status": p.status,
        "tags": p.tags,
        "inbound_count": inbound_count.get(p.path, 0),
        "outbound_count": outbound_count.get(p.path, 0),
    } for p in visible_pages]

    return {"nodes": nodes, "edges": edges}


def list_relation_issues(pages) -> list[dict]:
    """扫所有 wikilinks，找出"看起来像关系类型但不在 RELATION_TYPES 白名单"的引用。

    典型场景：
      - 拼写错误：[[X|SUPORTS]]、[[X|EXTNDS]]
      - 用了非标准关系：[[X|IMPLEMENTS]]、[[X|CONTRADICTS]]

    短缩写（长度 < 5 且无下划线，如 RFC / API）不会触发——它们更可能是别名。
    归档区 (wiki/_archive_*) 不检查。
    """
    out = []
    for page in pages:
        if "_archive" in page.path:
            continue
        scan_text = mask_code_spans(page.raw_content)
        for m in WIKILINK_RE.finditer(scan_text):
            third = m.group(3)
            if not _looks_like_relation(third):
                continue
            stripped = third.strip()
            if stripped in RELATION_TYPES:
                continue
            line = page.raw_content[: m.start()].count("\n") + 1
            out.append({
                "path": page.path,
                "title": page.title,
                "line": line,
                "raw": m.group(0),
                "bad_relation": stripped,
                "suggestion": (
                    f"{stripped!r} 不在标准关系白名单 {sorted(RELATION_TYPES)}。"
                    f"如果是关系类型：改为白名单中某条；"
                    f"如果本意是显示别名：改为小写 / 中文 / 加空格让其不再形似关系。"
                ),
            })
    return out


# ========== 关系词频次失衡扫描（list-relation-balance） ==========
# 扫全库 wiki 页：单一关系词（如 ALTERNATIVE_TO）出现频次 / 总关系词数 > threshold
# → 报警（防 LLM 在不确定时偷懒用最弱关系词）
# 与 list-relation-issues 正交：后者查"拼写错 / 非标准词"，本 lint 查"频次失衡"。

def list_relation_balance(pages, *, min_total: int = 5, threshold: float = 0.30) -> list[dict]:
    """扫全库 wikilinks：单一关系词频次 / 总关系引用 > threshold 则报警。

    Args:
      min_total: 关系词总数 < 此值不报警（避免小样本噪声；5 个关系词以下说明 wiki
                 还在早期，单一关系词主导是正常起步阶段，不是失衡）
      threshold: 单关系词占比阈值（默认 0.30 = 30%）

    不计入：归档区（_is_exempt）、代码块（mask_code_spans）。
    只算 7 个白名单关系词（RELATION_TYPES）；非标准词由 list-relation-issues 报。
    """
    from collections import Counter
    counts: Counter = Counter()
    for page in pages:
        if _is_exempt(page):
            continue
        scan_text = mask_code_spans(page.raw_content)
        for m in WIKILINK_RE.finditer(scan_text):
            _, relation = split_alias_or_relation(m.group(3))
            if relation:
                counts[relation] += 1
    total = sum(counts.values())
    if total <= min_total:
        return []
    out = []
    for relation, n in counts.most_common():
        ratio = n / total
        if ratio > threshold:
            out.append({
                "relation": relation,
                "count": n,
                "ratio": round(ratio, 4),
                "threshold": threshold,
                "total_relations": total,
                "suggestion": _relation_balance_suggestion(relation, ratio),
            })
    return out


def _relation_balance_suggestion(relation: str, ratio: float) -> str:
    """对每个超阈值关系词给具体到「可能偷懒」的方向，避免笼统说『复查』。

    落到 7 个关系词各自的语义边界（与 .claude/skills/kb-ingest/SKILL.md
    「关系词决策树」对齐）。"""
    suggestions = {
        "ALTERNATIVE_TO":
            "占比偏高：很多『与 X 类似 / 同期工作 / 对照』被错标为 ALTERNATIVE_TO；"
            "考虑改为 EXTENDS（同源增量）或 SUPPORTS（同方向佐证）",
        "PART_OF":
            "占比偏高：很多『相关于 / 涉及 / 在 X 主题下』被错标为 PART_OF；"
            "PART_OF 应是 A 没 B 不成立（强组成关系）；其他用 EXTENDS / CITES",
        "EXTENDS":
            "占比偏高：把『对照 / 同期工作』错标为 EXTENDS；"
            "EXTENDS 应是 A 在 B 基础上做增量（同团队 / 直接引 B 的方法）",
        "SUPPORTS":
            "占比偏高：把『也讨论了类似主题 / 印证』错标为 SUPPORTS；"
            "SUPPORTS 应是 A 提供 B 论断的直接证据（数据 / 定理 / 实验）",
        "REFUTES":
            "占比偏高：把『批评 / 不完全同意』错标为 REFUTES；"
            "REFUTES 应是 A 直接反证 B 的核心论断（不是细节修正）",
        "IS_A":
            "占比偏高：把『相关概念』错标为 IS_A；"
            "IS_A 应是严格 taxonomy（X 是一种 Y、满足 Y 的所有必要条件）",
        "CITES":
            "占比偏高：把默认 REFERENCES（[[X]] plain）改为 CITES 应是作者"
            "显式做了文献引用的场景；很多标注其实该走默认 REFERENCES",
    }
    return suggestions.get(
        relation,
        f"占比 {ratio:.0%} 偏高：复查这些 [[?|{relation}]] 是否真的符合该关系语义",
    )


# ========== 隐含关系扫描（list-implicit-relations） ==========
# 扫「plain wikilink + 判断/立场动词」段落——plain wikilink 丢语义信息
# （图谱只染 REFERENCES 灰边，不显示立场），应改成 [[?|RELATION]]
# 词表覆盖中英文强信号词；首次接入为 warning，不阻 commit

# 中文强信号词（直接 substring 匹配）；英文词用 \b 词边界 + IGNORECASE
_IMPLICIT_RELATION_VERBS_ZH = {
    "反驳", "支持", "延伸", "扩展", "属于", "组成", "替代", "代替",
    "对应", "领先", "落后", "超过", "弱于", "强于", "关键", "基础",
    "前提", "挑战", "对照", "类似", "反对", "印证", "证实", "证伪",
    "支撑",
}
_IMPLICIT_RELATION_VERBS_EN = {
    "supports", "refutes", "extends", "alternative",
    "supersedes", "based on", "builds on", "contrasts", "outperforms",
}
_IMPLICIT_VERB_EN_RE = re.compile(
    r"\b(?:" + "|".join(re.escape(w) for w in _IMPLICIT_RELATION_VERBS_EN) + r")\b",
    re.IGNORECASE,
)


def _body_after_first_h2(content: str) -> str:
    """返回第一个 H2 (`## `) 行开始的内容；用于跳过 source_summary 顶部元信息块。

    没有 H2 时返回原文（fallback：全文扫一遍，可能有少量误报可接受）。"""
    lines = content.split("\n")
    for i, line in enumerate(lines):
        if line.startswith("## "):
            return "\n".join(lines[i:])
    return content


def _is_self_link(page_path: str, normalized_target: str) -> bool:
    """plain wikilink 目标是否指向同一文件（自链）——自链不应报警。"""
    target = normalized_target.replace(".md", "")
    page = page_path.replace(".md", "")
    return target == page or target == page.split("/")[-1]


def list_implicit_relations(pages) -> list[dict]:
    """扫 plain wikilink（alias / 无 RELATION）+ 判断/立场动词，提示应补 RELATION。

    跳过：raw 链接（走 anchor 编号）、已合规的 RELATION 链接、自链、
    归档区 / index / stub 标签、callout、表格行、代码块、source_summary
    顶部元信息块（用 _body_after_first_h2 切）。

    词表故意收窄：模糊词（"也"、"用"、"用 X 来"）会大量误报，不收。
    首次接入建议只报警（不接 commit 钩子），看 1-2 周真实命中后再调阈值。
    """
    out = []
    for page in pages:
        if _is_exempt(page):
            continue
        if page.type in BARE_CLAIMS_SKIP_TYPES:
            continue
        # 跳过 source_summary 顶部元信息块（第一个 H2 之前）
        body = _body_after_first_h2(page.raw_content)
        for blk in split_blocks(body):
            if blk.kind not in ("paragraph", "list", "blockquote"):
                continue
            scan_text = mask_code_spans(blk.text)
            if CALLOUT_RE.search(scan_text):
                continue
            if scan_text.lstrip().startswith("|"):
                continue
            # 找 plain wikilink（不扫已合规的 RELATION 链接 + raw 链接 + 自链）
            plain_links: list[str] = []
            for m in WIKILINK_RE.finditer(scan_text):
                target = m.group(1) or ""
                if target.startswith("raw/"):
                    continue
                _, relation = split_alias_or_relation(m.group(3))
                if relation:
                    continue  # 已合规
                normalized = normalize_link_target(target)
                if _is_self_link(page.path, normalized):
                    continue
                plain_links.append(m.group(0))
            if not plain_links:
                continue
            # 找判断动词
            matched_verbs: list[str] = []
            for v in _IMPLICIT_RELATION_VERBS_ZH:
                if v in scan_text:
                    matched_verbs.append(v)
            for m in _IMPLICIT_VERB_EN_RE.finditer(scan_text):
                matched_verbs.append(m.group(0).lower())
            if not matched_verbs:
                continue
            preview = re.sub(r"\s+", " ", scan_text).strip()
            if len(preview) > 200:
                preview = preview[:200] + "…"
            out.append({
                "path": page.path,
                "title": page.title,
                "type": page.type,
                "line": blk.line_start,
                "preview": preview,
                "matched_verbs": list(dict.fromkeys(matched_verbs)),
                "plain_wikilinks": list(dict.fromkeys(plain_links)),
            })
    return out


# ============================================================
# 健康度
# ============================================================

def health_report(pages, backlinks):
    orphans = find_orphans(pages, backlinks)
    conflicts = find_conflicts(pages)
    to_update = find_to_update(pages)
    low_confidence = [p for p in pages if p.confidence == "low"]
    broken_refs = list_broken_refs(pages)
    # 拆 reason，让 lint 知道往哪个方向治：
    #   - raw 文件不存在    → 去补真实 raw 文件并跑 convert.py
    #   - anchor 不存在     → 去 reflow 引用：用 find-anchor 反查新 anchor
    broken_refs_by_reason = {}
    for ref in broken_refs:
        broken_refs_by_reason[ref["reason"]] = broken_refs_by_reason.get(ref["reason"], 0) + 1
    unsummarized = list_unsummarized_sections(pages)
    bare_claims = list_bare_claims(pages)
    coarse_citations = list_coarse_citations(pages)
    index_mismatches = list_index_count_mismatches(pages)
    source_issues = list_source_count_issues(pages)
    status_issues = list_status_issues(pages)
    relation_issues = list_relation_issues(pages)
    relation_balance_issues = list_relation_balance(pages)
    implicit_relations = list_implicit_relations(pages)
    i18n_violations = list_i18n_violations()

    today = datetime.now().date()
    stale = []
    for p in pages:
        if p.status != "draft" or not p.last_modified:
            continue
        try:
            modified_date = datetime.strptime(p.last_modified, "%Y-%m-%d").date()
            if (today - modified_date).days > 30:
                stale.append(p)
        except (ValueError, TypeError):
            continue

    by_type = {}
    by_status = {}
    by_confidence = {}
    for p in pages:
        by_type[p.type] = by_type.get(p.type, 0) + 1
        by_status[p.status] = by_status.get(p.status, 0) + 1
        by_confidence[p.confidence] = by_confidence.get(p.confidence, 0) + 1

    return {
        "total_pages": len(pages),
        "by_type": by_type,
        "by_status": by_status,
        "by_confidence": by_confidence,
        "orphans_count": len(orphans),
        "conflicts_count": len(conflicts),
        "to_update_count": len(to_update),
        "low_confidence_count": len(low_confidence),
        "stale_drafts_count": len(stale),
        "broken_refs_count": len(broken_refs),
        "broken_refs_by_reason": broken_refs_by_reason,
        "unsummarized_sections_count": len(unsummarized),
        "bare_claims_count": len(bare_claims),
        "coarse_citations_count": len(coarse_citations),
        "index_count_mismatches_count": len(index_mismatches),
        "source_issues_count": len(source_issues),
        "status_issues_count": len(status_issues),
        "relation_issues_count": len(relation_issues),
        "relation_balance_issues_count": len(relation_balance_issues),
        "implicit_relations_count": len(implicit_relations),
        "i18n_violations_count": len(i18n_violations),
        "last_check": today.isoformat(),
    }


# ============================================================
# Frontmatter 校验
# ============================================================

REQUIRED_FIELDS = [
    "title", "type", "created_date", "last_modified",
    "last_modified_by", "status", "confidence",
    "source_count", "sources", "tags",
]
VALID_TYPES = {"entity", "concept", "source_summary", "analysis", "comparison", "index"}
VALID_STATUS = {"draft", "reviewed", "deprecated"}
VALID_CONFIDENCE = {"high", "medium", "low"}
VALID_MODIFIED_BY = {"LLM", "Human"}


def _expand_braces(pattern: str) -> list[str]:
    """Brace expansion。

    支持：单层 brace，可在同一 pattern 出现多个并列。
      wiki/concepts/{rlhf,dpo}  → [wiki/concepts/rlhf, wiki/concepts/dpo]
      {a,b}/{x,y}               → [a/x, a/y, b/x, b/y]

    **不支持嵌套 brace**（如 `{x,{a,b}}`）。嵌套场景产出可能含重复，
    实际 scope 字段也无嵌套需求；要嵌套时请展开成多个并列 pattern
    并用顶层逗号分隔。
    """
    m = re.search(r"\{([^{}]+)\}", pattern)
    if not m:
        return [pattern]
    options = [o.strip() for o in m.group(1).split(",")]
    prefix = pattern[: m.start()]
    suffix = pattern[m.end():]
    out = []
    for opt in options:
        out.extend(_expand_braces(prefix + opt + suffix))
    return out


def _split_scope_top_level(scope: str) -> list[str]:
    """按逗号 split scope，但忽略 `{}` 内的逗号。
    例：'wiki/concepts/*, wiki/entities/{a,b}' →
        ['wiki/concepts/*', 'wiki/entities/{a,b}']
    """
    parts: list[str] = []
    depth = 0
    cur: list[str] = []
    for ch in scope:
        if ch == "{":
            depth += 1
            cur.append(ch)
        elif ch == "}":
            depth = max(0, depth - 1)
            cur.append(ch)
        elif ch == "," and depth == 0:
            parts.append("".join(cur).strip())
            cur = []
        else:
            cur.append(ch)
    if cur:
        parts.append("".join(cur).strip())
    return [p for p in parts if p]


def _glob_scope_to_paths(scope: str) -> set[str]:
    """index 页 frontmatter 的 scope 字段 → 实际匹配的 wiki .md 路径集合。

    支持：
      wiki/concepts/*               目录下直接 .md
      wiki/**                       递归所有 .md
      wiki/concepts/{rlhf,dpo}      brace 展开 + 自动补 .md
      wiki/foo, wiki/bar/*          多 pattern 逗号分隔
      wiki/concepts/transformer.md  显式单文件

    自动跳过：_templates/、隐藏文件。
    """
    paths: set[str] = set()
    parts = _split_scope_top_level(scope)
    for part in parts:
        for expanded in _expand_braces(part):
            if expanded.endswith("/**"):
                pattern = expanded + "/*.md"
            elif expanded.endswith("/*"):
                pattern = expanded + ".md"
            elif expanded.endswith(".md"):
                pattern = expanded
            else:
                # 既无 .md 也无通配 — 当单文件试，找不到当目录扫
                if (PROJECT_ROOT / (expanded + ".md")).exists():
                    pattern = expanded + ".md"
                else:
                    pattern = expanded + "/*.md"
            for p in PROJECT_ROOT.glob(pattern):
                if not p.is_file() or p.suffix != ".md":
                    continue
                if p.name.startswith("."):
                    continue
                if "_templates" in p.parts:
                    continue
                paths.add(str(p.relative_to(PROJECT_ROOT)).replace("\\", "/"))
    return paths


def list_index_count_mismatches(pages) -> list[dict]:
    """扫所有 type=index 页：scope 实际匹配数 vs 写死的 page_count 不等 → 列出。

    page_count 语义：该索引覆盖的页面数量。drift 通常意味着新加的页面没被加进
    索引、或者旧页面已 deprecate 但 page_count 没改。
    """
    out = []
    for page in pages:
        if page.type != "index":
            continue
        # deprecated / 归档区的索引页不强制 page_count 对账（_is_exempt）
        if _is_exempt(page):
            continue
        try:
            post = frontmatter.load(PROJECT_ROOT / page.path)
        except Exception:
            continue
        scope = post.metadata.get("scope")
        declared = post.metadata.get("page_count")
        if not scope or declared is None:
            continue
        try:
            declared_int = int(declared)
        except (TypeError, ValueError):
            continue
        actual_paths = _glob_scope_to_paths(str(scope))
        # 把 index 页自身从 scope 中排除（避免 wiki/** 把 root_index.md 自己算进去）
        actual_paths.discard(page.path)
        if len(actual_paths) != declared_int:
            out.append({
                "path": page.path,
                "title": page.title,
                "scope": str(scope),
                "declared_page_count": declared_int,
                "actual_count": len(actual_paths),
                "delta": len(actual_paths) - declared_int,
            })
    return out


def _resolve_source_entry(src: str) -> tuple[bool, str | None]:
    """解析 sources[] 里的一条字符串（典型如 "[[wiki/sources/X]]" 或 "[[raw/papers/X]]"），
    返回 (target_file_exists, resolved_md_path)。

    非 wikilink 字符串（纯文本 caption 等）返回 (True, None) — 无法校验，跳过。
    """
    links = parse_wikilinks(src)
    if not links:
        return True, None
    target_norm = normalize_link_target(links[0].target)
    full_path = PROJECT_ROOT / target_norm
    return full_path.exists(), target_norm


def _has_block_citation(content: str) -> bool:
    """检查文本是否含"块级引用"——即足以把论断 ground 到 raw 的引用形式：
    - [[raw/...]]（任意，有/无 anchor）
    - 任意带 ^anchor 的 wikilink（[[wiki/sources/X#^p-N-...]] 也算）
    其他形式（如 [[wiki/concepts/Y]] 无 anchor 的内部交叉引用）不算块级。

    先 mask_code_spans 剥离代码块 / 行内代码——代码示例里的 [[raw/...]] 不能
    被当作真实的论断溯源（否则 declared-but-uncited 会漏报）。
    """
    for link in parse_wikilinks(mask_code_spans(content)):
        if link.target.startswith("raw/"):
            return True
        if link.anchor and link.anchor.startswith("^"):
            return True
    return False


def list_source_count_issues(pages) -> list[dict]:
    """扫所有 wiki 页，六类问题：

    1. count-mismatch — source_count 字段 ≠ sources 数组长度
    2. missing-source — type ∈ CLAIM_TYPES 且 source_count == 0 但未标 stub
    3. analysis-undersourced — type ∈ {analysis, comparison} 且 source_count < 2 但未标 stub
       （跨文档综合的本质就是综合多个来源，至少 2 个）
    4. source-summary-mismatch — type=source_summary 但 source_count != 1
    5. broken-source-link — sources 数组中某条链接目标文件不存在
    6. declared-but-uncited — type ∈ CLAIM_TYPES 且 source_count > 0
       但正文没有任何 [[raw/...]] / [[*#^*]] 块级引用
       （frontmatter 声明了 source 但正文论断没真的 anchor 到它——属于语义层缺陷）

    豁免（_is_exempt：status==deprecated 或 _archive 归档区）：
      - 论断型质量规则（1/2/3/4/6）跳过——废弃 / 归档内容不再强制 source 完整性。
      - **broken-source-link（Rule 5）不走 deprecated 豁免**——链接指向不存在的文件
        是结构缺陷，无论页面死活都该暴露；仅 _archive 归档区（历史快照）跳过它。

    type=index (MOC) 不参与论断检查，只做 broken-source-link 兜底（虽然 MOC 通常 sources=[]）。
    """
    CLAIM_TYPES = {"concept", "entity", "analysis", "comparison"}
    COMPOUND_TYPES = {"analysis", "comparison"}  # 跨文档综合：至少 2 个 source
    STUB_TAGS = {"to-be-updated", "stub"}

    issues = []
    for page in pages:
        actual_len = len(page.sources)

        # Rule 5: broken-source-link（结构缺陷，不走 deprecated 豁免）。
        # 仅 _archive 归档区（历史快照）跳过——其余包括 deprecated 仍检查。
        if "_archive" not in page.path:
            for src in page.sources:
                exists, resolved = _resolve_source_entry(src)
                if resolved and not exists:
                    issues.append({
                        "path": page.path,
                        "title": page.title,
                        "type": page.type,
                        "issue_type": "broken-source-link",
                        "declared_count": page.source_count,
                        "actual_len": actual_len,
                        "detail": f"sources 中 {src!r} → 解析为 {resolved}，文件不存在",
                        "suggestion": "检查路径拼写；如果文件被归档/重命名，更新链接目标；如果尚未 ingest，移出 sources 数组",
                    })

        # 论断型质量规则（1/2/3/4/6）：deprecated / 归档区豁免
        if _is_exempt(page):
            continue

        # Rule 1: count-mismatch（gate — 不一致先修这个，避免后续规则误报）
        if page.source_count != actual_len:
            issues.append({
                "path": page.path,
                "title": page.title,
                "type": page.type,
                "issue_type": "count-mismatch",
                "declared_count": page.source_count,
                "actual_len": actual_len,
                "detail": "",
                "suggestion": f"改 source_count: {actual_len} 或修正 sources 数组",
            })
            continue

        tag_set = {t.lower() for t in page.tags}
        is_stub = bool(tag_set & STUB_TAGS)

        # Rule 4: source-summary-mismatch
        if page.type == "source_summary":
            if page.source_count != 1:
                issues.append({
                    "path": page.path,
                    "title": page.title,
                    "type": page.type,
                    "issue_type": "source-summary-mismatch",
                    "declared_count": page.source_count,
                    "actual_len": actual_len,
                    "detail": "",
                    "suggestion": "source_summary 应绑定恰好 1 个 raw 来源；如确实多来源汇总，改用 type=analysis",
                })
            continue  # source_summary 不参与下面的论断型规则

        # index 类型：只做 broken-source-link（已在上方），跳过论断检查
        if page.type == "index":
            continue

        # 以下规则仅对论断型（concept / entity / analysis / comparison）
        if page.type not in CLAIM_TYPES:
            continue

        # Rule 2: missing-source（source_count == 0）
        if page.source_count == 0:
            if not is_stub:
                issues.append({
                    "path": page.path,
                    "title": page.title,
                    "type": page.type,
                    "issue_type": "missing-source",
                    "declared_count": 0,
                    "actual_len": 0,
                    "detail": "",
                    "suggestion": "补充 source（ingest 一个 raw 并加入 sources 数组），或加 #to-be-updated / stub 标签明示未完成",
                })
            # source_count == 0 → 不需要做 Rule 3 / 6 检查
            continue

        # Rule 3: analysis-undersourced（compound 类型需 ≥ 2 个 source）
        if page.type in COMPOUND_TYPES and page.source_count < 2 and not is_stub:
            issues.append({
                "path": page.path,
                "title": page.title,
                "type": page.type,
                "issue_type": "analysis-undersourced",
                "declared_count": page.source_count,
                "actual_len": actual_len,
                "detail": f"{page.type} 类型只有 {page.source_count} 个 source，按设计应 ≥ 2",
                "suggestion": "补 1+ 个额外 source（跨文档综合的本质就是综合多个来源），或加 #to-be-updated / stub 标签",
            })

        # Rule 6: declared-but-uncited（声明了 sources 但正文无块级引用）
        if not _has_block_citation(page.raw_content):
            issues.append({
                "path": page.path,
                "title": page.title,
                "type": page.type,
                "issue_type": "declared-but-uncited",
                "declared_count": page.source_count,
                "actual_len": actual_len,
                "detail": f"frontmatter 声明 source_count: {page.source_count} 但正文无 [[raw/...]] 或 [[*#^*]] 块级引用",
                "suggestion": "在论断段落补 [[raw/<file>#^<anchor>]] 或 [[wiki/sources/<X>#^<anchor>]] 引用；用 k.py find-anchor 反查 anchor",
            })

    return issues


def validate_frontmatter(file_path):
    errors = []
    warnings = []

    try:
        post = frontmatter.load(file_path)
    except Exception as e:
        return {"valid": False, "errors": [f"无法解析文件: {e}"], "warnings": []}

    meta = post.metadata

    for field_name in REQUIRED_FIELDS:
        if field_name not in meta:
            errors.append(f"缺少必填字段: {field_name}")

    if meta.get("type") not in VALID_TYPES:
        errors.append(f"非法 type: {meta.get('type')!r}（合法: {sorted(VALID_TYPES)}）")

    if meta.get("status") not in VALID_STATUS:
        errors.append(f"非法 status: {meta.get('status')!r}（合法: {sorted(VALID_STATUS)}）")

    if meta.get("confidence") not in VALID_CONFIDENCE:
        errors.append(f"非法 confidence: {meta.get('confidence')!r}（合法: {sorted(VALID_CONFIDENCE)}）")

    if meta.get("last_modified_by") not in VALID_MODIFIED_BY:
        errors.append(
            f"非法 last_modified_by: {meta.get('last_modified_by')!r}（合法: {sorted(VALID_MODIFIED_BY)}）"
        )

    # 日期字段必须是 YYYY-MM-DD 格式
    # python-frontmatter 把 YAML 的 ISO 日期解析为 datetime.date 对象，
    # 也接受字符串；下面对两者都检查。
    for date_field in ("created_date", "last_modified"):
        v = meta.get(date_field)
        if v is None or v == "":
            continue
        if isinstance(v, (datetime, )):
            v = v.date().isoformat()
        elif hasattr(v, "isoformat") and not isinstance(v, str):
            try:
                v = v.isoformat()
            except Exception:
                pass
        if isinstance(v, str):
            try:
                datetime.strptime(v, "%Y-%m-%d")
            except ValueError:
                warnings.append(f"{date_field} 格式不合规（期望 YYYY-MM-DD）：{v!r}")
        else:
            warnings.append(f"{date_field} 类型异常（期望日期字符串）：{type(v).__name__}")

    if meta.get("type") == "index":
        if "scope" not in meta:
            errors.append("type=index 需要 scope 字段")
        if "page_count" not in meta:
            errors.append("type=index 需要 page_count 字段")
        # page_count 与 scope 实际匹配数对账（warning，不阻塞 valid）
        if meta.get("scope") and meta.get("page_count") is not None:
            try:
                declared = int(meta["page_count"])
                actual_paths = _glob_scope_to_paths(str(meta["scope"]))
                # 排除索引页自身
                try:
                    self_rel = str(Path(file_path).resolve().relative_to(PROJECT_ROOT)).replace("\\", "/")
                    actual_paths.discard(self_rel)
                except ValueError:
                    pass
                actual = len(actual_paths)
                if actual != declared:
                    warnings.append(
                        f"page_count drift: 声明 {declared}，scope 实际匹配 {actual}（差 {actual - declared:+d}）"
                        f"——可能新加的页面未列入索引，或旧页面 deprecate 后 page_count 未更新"
                    )
            except (TypeError, ValueError):
                pass

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "metadata": dict(meta),
    }


# ============================================================
# 章节大纲 / 段落级读取（v0.3 — 引用基础设施）
# ============================================================

ANCHOR_RE_INLINE = re.compile(r"\^([hpcft]-\d+(?:-\d+)?-[a-z0-9]+(?:-\d+)?)")
RAW_REF_PREFIX_RE = re.compile(r"^raw/", re.IGNORECASE)

# ========== 裸论断扫描（list-bare-claims） ==========
# "实质性数据论断"模式：高信号、低噪音
# 命中即视为"段落里有具体数据"，进一步检查该段是否提供来源支撑
#
# Negative lookbehind 用 (?<![\dA-Za-z])：前面不能是数字或字母——
# 否则 "B2B" / "B2C" 的 "2B"、"2C" 等会被 BMK 量级正则误匹配；
# 量级单位 [BMK] 必须紧跟在独立数字 token 之后（如"175B 参数"），不能是
# 字母-数字-字母这种缩写形式中的字母前缀。
NUMERIC_CLAIM_PATTERNS = [
    re.compile(r"(?<!\d)\d+(?:\.\d+)?\s*%"),                                                       # 百分比 95.3%
    re.compile(r"(?<![\dA-Za-z])\d+(?:\.\d+)?\s*[BMK](?=\s|参数|个|条|tokens?|\b)"),               # 量级 175B
    re.compile(r"(?<!\d)\d+(?:\.\d+)?\s*[xX](?=\s|倍|\b)"),                                        # 倍数 10x
    re.compile(r"\$\s*\d+(?:[,\d]*)(?:\.\d+)?\s*[KMB]?"),                                          # 金额（匹配整个，含千分逗号 / 后缀 K/M/B）
    re.compile(r"\b(?:19|20)\d{2}\s*年"),                                                          # 年份 2026 年
    re.compile(r"\d+(?:\.\d+)?\s*(?:BLEU|F1|EM|ROUGE|MAUVE|MMLU|HumanEval|GSM8K|HellaSwag|ARC|MATH|SOTA)\b"),  # NLP 指标
]
# 段落已含任一即视为"有来源支撑"：
#   - [[raw/...]]      直接溯源
#   - [[wiki/sources/...]]  经 source_summary 中介（合法）
#   - [需要来源]       显式占位
REFERENCE_SUPPORT_RE = re.compile(r"\[\[raw/|\[\[wiki/sources/|\[需要来源\]")

# 整页 raw 引用（无 #^anchor、无 |别名）vs 块级 raw 引用（含 #^）——
# 用于 list-coarse-citations：论断只挂整页引用、未精确到块时报「引用粒度不足」。
RAW_PAGE_CITE_RE = re.compile(r"\[\[raw/[^\]\|#]+\]\]")
RAW_BLOCK_CITE_RE = re.compile(r"\[\[raw/[^\]]*#\^")

# 跳过 callout / 表格行：典型 false positive 来源
# - [!WARNING] / [!NOTE] / [!TIP] 等 callout 多为 recap 性质，原引用在外围段
# - 以 | 开头的"表格行"被块切分器错分到 paragraph 时，往往 cell 里全是数字而引用在表格前的段落
CALLOUT_RE = re.compile(r">\s*\[!(?:WARNING|NOTE|TIP|IMPORTANT|CAUTION)\]", re.IGNORECASE)

# 这些类型的页面跳过"裸论断"扫描（导航 / lint 报告 / 模板）
BARE_CLAIMS_SKIP_TYPES = {"index"}
BARE_CLAIMS_SKIP_TAGS = {"lint", "周报", "demo-data"}


def _to_rel_posix(path: Path) -> str:
    """绝对路径 → 项目根相对的 POSIX。不在项目内时返回原 str。"""
    try:
        return str(path.relative_to(PROJECT_ROOT)).replace("\\", "/")
    except ValueError:
        return str(path)


def _safe_join_under_root(rel: str) -> Path | None:
    """把"看起来像项目内相对路径"的字符串安全拼到 PROJECT_ROOT 下。

    用途：当 wiki 内容里的 [[link]] 目标拼接到磁盘路径时，必须防止
    `[[raw/../etc/passwd]]` 这种越界——我们扫描时会试图打开它检查存在性，
    虽然内容不会回到响应里，但仍是越界 fs 访问。

    返回 None 表示拒绝（绝对路径 / 越界 / 空）。否则返回 PROJECT_ROOT 下的
    绝对路径。**只校验路径合法性，不要求文件必须存在。**
    """
    if not isinstance(rel, str) or not rel:
        return None
    if Path(rel).is_absolute():
        return None
    candidate = (PROJECT_ROOT / rel).resolve()
    try:
        candidate.relative_to(PROJECT_ROOT.resolve())
    except ValueError:
        return None
    return candidate


def strip_workspace_prefix(arg: str) -> str:
    """容错：把误带的 `workspaces/<当前ws>/` 前缀剥掉。

    convert.py 的 `--dir` 用仓库根相对路径（`workspaces/<ws>/raw/...`），而
    k.py 的路径参数相对**当前 workspace**（`raw/...`）——两套口径新手极易混用，
    混用时会拼出 `workspaces/<ws>/workspaces/<ws>/...` 的双重路径错误。

    规则：
      - 前缀指向**当前激活** workspace → 自动剥掉，并在 stderr 提示；
      - 前缀指向**另一个真实存在的** workspace → 抛 ValueError，提示改用
        `--workspace <那个库>`（静默剥掉会读错库）；
      - 其他情况原样返回。
    """
    norm = arg.replace("\\", "/").lstrip("./")
    parts = norm.split("/")
    if len(parts) < 3 or parts[0] != "workspaces":
        return arg
    if PROJECT_ROOT.parent.name != "workspaces":
        return arg  # 未激活 workspace（如引擎根直跑），不做猜测
    active = PROJECT_ROOT.name
    target_ws, rest = parts[1], "/".join(parts[2:])
    if target_ws == active:
        print(
            f"提示: k.py 的路径相对当前 workspace（{active}），"
            f"已自动剥掉前缀 workspaces/{active}/",
            file=sys.stderr,
        )
        return rest
    if (PROJECT_ROOT.parent / target_ws).is_dir():
        raise ValueError(
            f"路径指向另一个 workspace {target_ws!r}（当前是 {active!r}）。"
            f"请改用：python scripts/k.py --workspace {target_ws} <子命令> {rest}"
        )
    return arg


def resolve_doc_path(arg: str) -> Path:
    """把用户传入的路径解析为绝对路径。支持相对项目根的路径，缺 .md 时自动补。

    安全约束：
      - 解析后的路径必须落在 PROJECT_ROOT 内——拒绝绝对路径以及含 ../
        回到 PROJECT_ROOT 之外的相对路径，防止 web 端 ?path= 触发的路径遍历。
      - 拒绝 my_thoughts/ 下的目标——人类专属区不可被读路径（outline / blocks /
        read-section / read-block 等）暴露内容（CLAUDE.md：my_thoughts 只读且不暴露）。
        允许 wiki/ 与 raw/。
    """
    if Path(arg).is_absolute():
        raise ValueError(f"路径越界（拒绝绝对路径）：{arg}")
    arg = strip_workspace_prefix(arg)
    p = (PROJECT_ROOT / arg).resolve()
    try:
        rel = p.relative_to(PROJECT_ROOT.resolve())
    except ValueError:
        raise ValueError(f"路径越界（必须在 PROJECT_ROOT 内）：{arg}")
    # my_thoughts 人类专属区：不可读不暴露（即便 ../ 绕进来也挡）
    if rel.parts and rel.parts[0] == "my_thoughts":
        raise ValueError(f"human-only 区不可读（my_thoughts 人类专属）：{arg}")
    if not p.exists() and p.suffix == "":
        candidate = p.with_suffix(".md")
        if candidate.exists():
            return candidate
    return p


def load_or_build_outline(md_path: Path) -> dict:
    """优先读 .outline.json；缺失、损坏或**已过期**时现场基于当前 .md 内容重建（不写盘）。

    过期判定：outline 的 doc_chars 与 md 实际字符数不符。wiki 页被直接编辑后
    outline.json 不会自动再生，旧 char_start/char_end 切当前文本必然错位——
    此时丢弃盘上缓存、按当前内容重建。

    注意：重建**不**合并旧缓存的 agent_summary——heading 锚点的 hash 只对标题
    文本计算，整页换主题而标题未变（「目录」「快速导航」等通用标题）时锚点不变，
    合并会把旧主题的摘要复活到新内容上。过期缓存的一切内容均视为不可信。
    """
    outline_path = md_path.with_suffix(".outline.json")
    disk_outline: dict | None = None
    if outline_path.exists():
        try:
            disk_outline = json.loads(outline_path.read_text(encoding="utf-8"))
        except Exception:
            # 损坏的缓存按「缺失」处理：md 还在就能现场重建，不让一个坏文件卡死读路径
            disk_outline = None
    if not md_path.exists():
        if disk_outline is not None:
            return disk_outline
        raise FileNotFoundError(str(md_path))
    text = md_path.read_text(encoding="utf-8")
    if disk_outline is not None and disk_outline.get("doc_chars") == len(text):
        return disk_outline
    return build_outline_data(text, _to_rel_posix(md_path))


def parse_blocks_with_anchors(md_path: Path) -> list:
    """读取 md 文件，切分块，把块末尾已有的锚点回填到 block.anchor。"""
    text = md_path.read_text(encoding="utf-8")
    # 跳过 frontmatter
    from section_parser import strip_frontmatter
    _fm, body = strip_frontmatter(text)
    blocks = split_blocks(body)
    for blk in blocks:
        if blk.kind == "hr":
            continue
        m = re.search(r"\^([hpcft]-\d+(?:-\d+)?-[a-z0-9]+(?:-\d+)?)\s*$", blk.text)
        if m:
            blk.anchor = m.group(1)
    return blocks


def find_section_in_outline(sections: list[dict], anchor_or_title: str) -> dict | None:
    """在嵌套 sections 里递归查找：先按 anchor 精确匹配，再按 title 精确匹配。"""
    target = anchor_or_title.lstrip("^")
    target_title_norm = re.sub(r"\s+", " ", anchor_or_title.strip().lower())
    # 第一遍：按 anchor
    def by_anchor(secs):
        for s in secs:
            if s.get("anchor") == target:
                return s
            r = by_anchor(s.get("children", []))
            if r:
                return r
        return None
    hit = by_anchor(sections)
    if hit:
        return hit
    # 第二遍：按 title
    def by_title(secs):
        for s in secs:
            t = re.sub(r"\s+", " ", (s.get("title") or "").strip().lower())
            if t == target_title_norm:
                return s
            r = by_title(s.get("children", []))
            if r:
                return r
        return None
    return by_title(sections)


def read_section(md_path: Path, anchor_or_title: str) -> dict:
    """根据 anchor 或 title 取出整段 H 段（到下一同级 heading 之前）。"""
    outline = load_or_build_outline(md_path)
    sec = find_section_in_outline(outline["sections"], anchor_or_title)
    if not sec:
        raise LookupError(f"未找到 anchor 或标题: {anchor_or_title}")
    text = md_path.read_text(encoding="utf-8")
    body = text[sec["char_start"]:sec["char_end"]]
    return {
        "path": _to_rel_posix(md_path),
        "anchor": sec["anchor"],
        "title": sec["title"],
        "level": sec["level"],
        "line": sec["line"],
        "char_start": sec["char_start"],
        "char_end": sec["char_end"],
        "preview": sec.get("preview", ""),
        "agent_summary": sec.get("agent_summary"),
        "content": body,
    }


def read_block(md_path: Path, anchor: str) -> dict:
    """根据 ^p-/^t-/^c-/^f- anchor 取出单个 block 原文。"""
    target = anchor.lstrip("^")
    blocks = parse_blocks_with_anchors(md_path)
    for blk in blocks:
        if blk.anchor == target:
            text = ANCHOR_TAIL_RE.sub("", blk.text).rstrip()
            return {
                "path": _to_rel_posix(md_path),
                "anchor": target,
                "kind": blk.kind,
                "line_start": blk.line_start,
                "line_end": blk.line_end,
                "content": text,
            }
    raise LookupError(f"未找到 anchor: {anchor}")


def list_all_blocks(md_path: Path) -> dict:
    """返回文档所有 block 的扁平列表 + 顶部统计。

    每个 block 含：
      anchor, kind (heading/paragraph/list/blockquote/table/code/figure),
      level/title (仅 heading), line_start, line_end, char_start, char_end,
      char_count, owning_section_anchor (最深包含此 block 的 H 段；heading 自身为 None),
      preview (paragraph/list 等截 120 字), agent_summary (仅 heading 取自 outline.json).
    """
    if not md_path.exists():
        raise FileNotFoundError(str(md_path))

    text = md_path.read_text(encoding="utf-8")
    from section_parser import strip_frontmatter as _sf
    fm, body = _sf(text)
    fm_offset = len(fm)

    blocks = split_blocks(body)
    # 调整字符偏移到完整文件坐标
    for blk in blocks:
        blk.char_start += fm_offset
        blk.char_end += fm_offset
        if blk.kind == "hr":
            continue
        m = re.search(r"\^([hpcft]-\d+(?:-\d+)?-[a-z0-9]+(?:-\d+)?)\s*$", blk.text)
        if m:
            blk.anchor = m.group(1)

    # 拉 outline 以便给 heading 块挂 agent_summary，并构建 heading anchor → 自身节点 map
    try:
        outline = load_or_build_outline(md_path)
    except Exception:
        outline = {"sections": []}

    summary_by_anchor: dict[str, str] = {}
    heading_intervals: list[tuple[int, int, str, int]] = []  # (start, end, anchor, level)

    def walk(secs):
        for s in secs:
            anc = s.get("anchor")
            if anc:
                if s.get("agent_summary"):
                    summary_by_anchor[anc] = s["agent_summary"]
                heading_intervals.append((
                    int(s.get("char_start", 0)),
                    int(s.get("char_end", 0)),
                    anc,
                    int(s.get("level", 1)),
                ))
            walk(s.get("children", []))

    walk(outline.get("sections", []))

    # 给每个 block 找 owning section（包含它且 level 最深的 H 节点）
    def find_owner(start: int, end: int, self_anchor: str | None) -> str | None:
        best: tuple[int, str] | None = None  # (level, anchor)
        for h_start, h_end, h_anchor, h_level in heading_intervals:
            if h_anchor == self_anchor:
                continue  # heading 自己不当作 owner
            if h_start <= start < h_end:
                if best is None or h_level > best[0]:
                    best = (h_level, h_anchor)
        return best[1] if best else None

    out_blocks: list[dict] = []
    counts: dict[str, int] = {}

    for blk in blocks:
        if blk.kind == "hr":
            continue
        text_clean = ANCHOR_TAIL_RE.sub("", blk.text).rstrip()
        preview = re.sub(r"\s+", " ", text_clean)[:120]
        is_heading = blk.kind == "heading"
        owning = find_owner(blk.char_start, blk.char_end, blk.anchor)

        item: dict = {
            "anchor": blk.anchor,
            "kind": blk.kind,
            "line_start": blk.line_start,
            "line_end": blk.line_end,
            "char_start": blk.char_start,
            "char_end": blk.char_end,
            "char_count": blk.char_end - blk.char_start,
            "owning_section_anchor": owning,
            "preview": preview,    # 一行截断，给摘要场景用
            "text": text_clean,    # 完整原文（已剥离行尾锚点尾巴）
        }
        if is_heading:
            item["level"] = blk.level
            item["title"] = blk.title
            item["agent_summary"] = summary_by_anchor.get(blk.anchor or "")
        out_blocks.append(item)
        counts[blk.kind] = counts.get(blk.kind, 0) + 1

    return {
        "doc_path": _to_rel_posix(md_path),
        "doc_chars": len(text),
        "block_count": len(out_blocks),
        "by_kind": counts,
        "blocks": out_blocks,
    }


def find_anchor(md_path: Path, snippet: str, limit: int = 10) -> list[dict]:
    """在 md 中找包含 snippet 的块，返回 anchor + 上下文。"""
    blocks = parse_blocks_with_anchors(md_path)
    snippet_lower = snippet.lower().strip()
    if not snippet_lower:
        return []
    out = []
    for blk in blocks:
        if not blk.anchor:
            continue
        if snippet_lower in blk.text.lower():
            preview = ANCHOR_TAIL_RE.sub("", blk.text).strip()
            preview = re.sub(r"\s+", " ", preview)[:200]
            out.append({
                "anchor": blk.anchor,
                "kind": blk.kind,
                "line_start": blk.line_start,
                "preview": preview,
            })
            if len(out) >= limit:
                break
    return out


def annotate_section(md_path: Path, anchor: str, summary: str) -> dict:
    """把 agent_summary 写入对应 section 并保存 .outline.json。

    经 load_or_build_outline 取**新鲜**大纲（盘上缓存过期时现场重建），
    再原子写回——保证 annotate 的锚点视图与 `k.py outline` 展示的一致，
    且写回后盘上缓存重新变为新鲜。
    """
    outline = load_or_build_outline(md_path)
    outline_path = md_path.with_suffix(".outline.json")
    target = anchor.lstrip("^")

    def walk(secs):
        for s in secs:
            if s.get("anchor") == target:
                s["agent_summary"] = summary
                return s
            r = walk(s.get("children", []))
            if r:
                return r
        return None

    sec = walk(outline["sections"])
    if not sec:
        raise LookupError(f"outline 里没有 anchor: {anchor}")
    # 原子写：避免 web 端正在读 .outline.json 时拿到半截 JSON
    _atomic_write_text(
        outline_path,
        json.dumps(outline, ensure_ascii=False, indent=2),
    )
    return {
        "path": _to_rel_posix(md_path),
        "anchor": target,
        "title": sec.get("title", ""),
        "agent_summary": summary,
    }


def _collect_anchors_in_md(md_path: Path) -> set[str]:
    """提取 md 文件中所有锚点 id（heading + paragraph 等所有类型）。"""
    if not md_path.exists():
        return set()
    text = md_path.read_text(encoding="utf-8")
    return set(ANCHOR_RE_INLINE.findall(text))


WIKI_REF_PREFIX_RE = re.compile(r"^wiki/", re.IGNORECASE)


def list_broken_refs(pages) -> list[dict]:
    """扫描 wiki/ 所有页面里带 ^anchor 的双链，列出失效的引用。

    覆盖两类目标：
      - [[raw/...#^anchor]]   — raw 文件不存在 / anchor 不存在（raw 有 outline，但
        anchor 集合直接从 .md 扫，与 wiki 同路）
      - [[wiki/...#^anchor]]  — wiki 文件不存在 / anchor 不存在（wiki 页无 outline.json，
        用 _collect_anchors_in_md 直扫目标 .md 的锚点集合判断）

    无 ^anchor 的纯页面链接（[[wiki/concepts/X]]）不在此检查——那属于孤儿 / 出链
    维度，由 list-orphans / outlinks 覆盖。
    """
    out = []
    # 目标 .md 路径（rel）→ 其锚点集合，避免重复扫盘
    anchor_cache: dict[str, set[str]] = {}

    for page in pages:
        # 跳过反引号包裹的字面占位（如周报里写 `[[raw/...#^anchor]]` 当格式示例）
        scan_text = mask_code_spans(page.raw_content)
        for m in WIKILINK_RE.finditer(scan_text):
            target = m.group(1)
            anchor = m.group(2)
            if not anchor or not anchor.startswith("^"):
                continue
            target_norm = normalize_link_target(target)
            is_raw = bool(RAW_REF_PREFIX_RE.match(target_norm))
            is_wiki = bool(WIKI_REF_PREFIX_RE.match(target_norm))
            if not is_raw and not is_wiki:
                continue
            # 拒绝越界目标（[[raw/../etc/passwd]]）——既不打开也不报告
            doc_path = _safe_join_under_root(target_norm)
            if doc_path is None:
                continue
            anchor_id = anchor.lstrip("^")
            line = page.raw_content[: m.start()].count("\n") + 1
            kind_label = "raw" if is_raw else "wiki"
            reason = None
            if not doc_path.exists():
                reason = f"{kind_label} 文件不存在"
            else:
                if target_norm not in anchor_cache:
                    anchor_cache[target_norm] = _collect_anchors_in_md(doc_path)
                if anchor_id not in anchor_cache[target_norm]:
                    reason = "anchor 不存在"
            if reason:
                out.append({
                    "from_path": page.path,
                    "from_title": page.title,
                    "line": line,
                    "target": target_norm,
                    "anchor": anchor_id,
                    "reason": reason,
                })
    return out


def _collect_section_summary_index(raw_path_rel: str) -> dict[str, dict] | None:
    """读 raw 的 .outline.json，递归收集所有 heading section 的元信息。
    返回 {anchor: {title, level, agent_summary}} 或 None（outline 文件不存在 / 路径越界）。"""
    raw_path = _safe_join_under_root(raw_path_rel)
    if raw_path is None or not raw_path.exists():
        return None
    outline_path = raw_path.with_suffix(".outline.json")
    if not outline_path.exists():
        return None
    try:
        outline = json.loads(outline_path.read_text(encoding="utf-8"))
    except Exception:
        return None
    out: dict[str, dict] = {}

    def walk(secs):
        for s in secs:
            anc = s.get("anchor")
            if anc:
                out[anc] = {
                    "title": s.get("title", ""),
                    "level": s.get("level", 0),
                    "agent_summary": s.get("agent_summary"),
                }
            walk(s.get("children", []))

    walk(outline.get("sections", []))
    return out


def list_bare_claims(pages) -> list[dict]:
    """扫 wiki paragraph / list / blockquote 块：含具体数字（百分比 / 量级 /
    NLP 指标 / 年份 / 金额 / 倍数）但**不**含 [[raw/...]] 引用、也**不**含
    [需要来源] 占位 → 列入"裸论断"。

    跳过：
      - deprecated 页 / _archive 归档区（_is_exempt：论断完整性不再强制，避免对历史快照报警）
      - type=index 页（主要是导航）
      - frontmatter tags 含 lint / 周报 / demo-data 的页面
      - heading / table / code / hr / figure 块（论断主要在叙述段）
    """
    out = []
    for page in pages:
        # deprecated / 归档区：论断完整性不再强制
        if _is_exempt(page):
            continue
        if page.type in BARE_CLAIMS_SKIP_TYPES:
            continue
        if any(t in BARE_CLAIMS_SKIP_TAGS for t in page.tags):
            continue
        # stub 页（含 to-be-updated / stub 标签）的元描述类数字（如"37.8K 字符"
        # 描述 raw 文件长度）多属于 stub 自我说明而非论断，跳过减少噪声
        if any(t in {"to-be-updated", "stub"} for t in page.tags):
            continue
        # split_blocks 是基于无 frontmatter 的 body 操作；Page.raw_content
        # 已经是 frontmatter 之后的内容，直接切。
        blocks = split_blocks(page.raw_content)
        for blk in blocks:
            if blk.kind not in ("paragraph", "list", "blockquote"):
                continue
            block_text = ANCHOR_TAIL_RE.sub("", blk.text)
            # 跳过 callout（>[!WARNING] 等）—— recap 性质，原引用在外围段落
            if CALLOUT_RE.search(block_text):
                continue
            # 跳过表格行（被块切分器错分到 paragraph 时，开头是 |）
            if block_text.lstrip().startswith("|"):
                continue
            # 段内行内代码 `...`（以及万一混入的围栏）里的数字 / [[link]] 是字面示例，
            # 不该被当真实论断或真实引用。在 ANCHOR_TAIL_RE.sub 之后再套代码掩码：
            # mask_code_spans 保留偏移，仅扫描用 scan_text，preview 仍取原文。
            scan_text = mask_code_spans(block_text)
            hits = []
            for pat in NUMERIC_CLAIM_PATTERNS:
                hits.extend(m.group().strip() for m in pat.finditer(scan_text))
            if not hits:
                continue
            if REFERENCE_SUPPORT_RE.search(scan_text):
                continue
            # 去重，保持顺序
            hits = list(dict.fromkeys(hits))
            preview = re.sub(r"\s+", " ", block_text).strip()
            if len(preview) > 200:
                preview = preview[:200] + "…"
            out.append({
                "path": page.path,
                "title": page.title,
                "type": page.type,
                "line": blk.line_start,
                "matched": hits,
                "preview": preview,
            })
    return out


def list_coarse_citations(pages) -> list[dict]:
    """扫 wiki paragraph / list / blockquote 块：含具体数字论断、且**只挂整页
    `[[raw/X]]` 引用、未精确到块级 `[[raw/X#^anchor]]`** → 列入「引用粒度不足」。

    与 list_bare_claims 互补：bare = 有数字但无任何 raw 引用；coarse = 有数字 + 有
    raw 引用但只到整页。块级 anchor 才能精确溯源、且渲染论文式 [n] 上标。
    任一块级 `#^` 引用即视为合规、不报；无任何整页引用的归 bare-claims、不在此报。

    跳过同 list_bare_claims（deprecated / 归档 / index / lint·stub 标签 /
    callout / 表格行 / 代码内字面）。
    """
    out = []
    for page in pages:
        if _is_exempt(page):
            continue
        if page.type in BARE_CLAIMS_SKIP_TYPES:
            continue
        if any(t in BARE_CLAIMS_SKIP_TAGS for t in page.tags):
            continue
        if any(t in {"to-be-updated", "stub"} for t in page.tags):
            continue
        for blk in split_blocks(page.raw_content):
            if blk.kind not in ("paragraph", "list", "blockquote"):
                continue
            block_text = ANCHOR_TAIL_RE.sub("", blk.text)
            if CALLOUT_RE.search(block_text):
                continue
            if block_text.lstrip().startswith("|"):
                continue
            scan_text = mask_code_spans(block_text)
            hits = []
            for pat in NUMERIC_CLAIM_PATTERNS:
                hits.extend(m.group().strip() for m in pat.finditer(scan_text))
            if not hits:
                continue
            # 已含块级引用 → 合规；无整页引用 → 属 bare-claims 范畴，不在此报
            if RAW_BLOCK_CITE_RE.search(scan_text):
                continue
            if not RAW_PAGE_CITE_RE.search(scan_text):
                continue
            hits = list(dict.fromkeys(hits))
            coarse_refs = list(dict.fromkeys(RAW_PAGE_CITE_RE.findall(scan_text)))
            preview = re.sub(r"\s+", " ", block_text).strip()
            if len(preview) > 200:
                preview = preview[:200] + "…"
            out.append({
                "path": page.path,
                "title": page.title,
                "type": page.type,
                "line": blk.line_start,
                "matched": hits,
                "coarse_refs": coarse_refs,
                "preview": preview,
            })
    return out


def list_status_issues(pages) -> list[dict]:
    """扫 `status: reviewed` 但 `last_modified_by != Human` 的页面：
    reviewed（"已审阅"）语义 = 人类审阅过；LLM 自己写入的页面不该自称已审，
    应保持 `draft`，由人类审阅后才改成 `reviewed` + `last_modified_by: Human`。
    跳过 deprecated / 归档区（_is_exempt）。
    """
    out = []
    for page in pages:
        if _is_exempt(page):
            continue
        if page.status == "reviewed" and page.last_modified_by != "Human":
            out.append({
                "path": page.path,
                "title": page.title,
                "type": page.type,
                "status": page.status,
                "last_modified_by": page.last_modified_by,
            })
    return out


def fmt_status_issues(items: list[dict]):
    if not items:
        print("✅ 没有发现 status 矛盾（reviewed 均由人类 Human 设置）")
        return
    print(f"⚠️  发现 {len(items)} 处 status 矛盾（标 reviewed 但 last_modified_by 非 Human）：\n")
    print("    （reviewed=「已审阅」应由人类审阅后设置；LLM 写入的页面应为 draft）\n")
    for it in items:
        print(f"  {it['path']}  ({it['title']}, {it['type']}) — status={it['status']}, by={it['last_modified_by']}")
    print("\n    修复: 改回 status: draft（或人类审阅后把 last_modified_by 改为 Human）")
    print()


def fmt_relation_balance(items: list[dict]):
    if not items:
        print("✅ 关系词频次均衡（无单一关系词占比 > 30%）")
        return
    print(f"⚠️  发现 {len(items)} 个关系词占比过高（> 30% 阈值）：\n")
    print(f"    （标准关系白名单：{sorted(RELATION_TYPES)}）\n")
    for it in items:
        pct = it["ratio"] * 100
        print(f"  {it['relation']}: {it['count']}/{it['total_relations']} = {pct:.0f}% (阈值 {it['threshold']:.0%})")
        print(f"    建议: {it['suggestion']}")
        print()


def fmt_implicit_relations(items: list[dict]):
    if not items:
        print("✅ 没有发现隐含关系（plain wikilink 配判断/立场动词的段落都已加 RELATION）")
        return
    print(f"⚠️  发现 {len(items)} 处隐含关系（plain wikilink + 判断动词，应改 [[?|RELATION]]）：\n")
    print("    （判断词: " + "、".join(sorted(_IMPLICIT_RELATION_VERBS_ZH)) + "）\n")
    for it in items:
        print(f"  {it['path']}:{it['line']}  ({it['title']}, {it['type']})")
        print(f"    判断词: {', '.join(it['matched_verbs'])}")
        print(f"    plain wikilink: {' '.join(it['plain_wikilinks'])}")
        print(f"    片段: {it['preview']}")
        print()


# ========== i18n 硬编码扫描（list-i18n-violations） ==========
# 扫 web/ 下的 .tsx 文件，找硬编码的中文 UI 字符串。
# CLAUDE.md "Web 管理台国际化方案" 明文禁止：
#   "不允许在组件里写硬编码的中文 / 英文 UI 字符串
#    （除非是 markdown 内容本身的渲染）"
# 但之前没有自动 lint，禁令形同虚设。本扫描器作为守门员。

# 中文字符范围（含汉字）
CN_CHAR = r"一-鿿"
# JSX 文本节点：>...内容...< （单行内）
JSX_TEXT_CN_RE = re.compile(rf">([^<>{{}}\n]*[{CN_CHAR}][^<>{{}}\n]*)<")
# UI 相关 JSX 属性的字符串值含中文（白名单几个最常见的 UI 属性）
JSX_ATTR_CN_RE = re.compile(
    rf'\b(aria-label|placeholder|title|alt|label)\s*=\s*'
    rf'(["\'])([^"\'\n]*[{CN_CHAR}][^"\'\n]*)\2'
)
# ARIA 属性硬编码英文（不限于中文）：aria-label / aria-roledescription / aria-description
# 这两个 ARIA 属性值是给 AT 读出来的"显示文案"，必须 i18n 化。
# 故意不扫 placeholder/title/alt 的英文——会有大量误报（如 type="text" 与代码标识符）
JSX_ATTR_ENGLISH_ARIA_RE = re.compile(
    r'\b(aria-label|aria-roledescription|aria-description)\s*=\s*'
    r'(["\'])([A-Za-z][A-Za-z0-9 _\-]*[A-Za-z])\2'
)

# 跳过的文件（自身就是 i18n 基建——翻译表 / Provider；其他组件包括 LocaleSwitcher
# 都必须通过 t() / useT() 调用翻译表，不允许硬编码字面量）
I18N_SKIP_FILE_NAMES = {
    "i18n.ts",
    "i18n-client.tsx",
}
# 跳过的目录（API 响应不是 UI 显示层；node_modules / .next 是构建产物）
I18N_SKIP_DIR_PARTS = {"node_modules", ".next", "api"}


def list_i18n_violations(web_dir: Path | None = None) -> list[dict]:
    """扫 web/ 下 .tsx，找硬编码中文（JSX text + UI 属性）。

    跳过：
      - node_modules / .next / web/app/api/（API 响应不是 UI）
      - i18n.ts / i18n-client.tsx（基建自身）
      - // 单行 + /* */ 多行注释（用 mask_js_comments 剥除）

    JSX 文本扫描前先 mask_jsx_expressions 剥除 {…} 表达式——否则被 `{n}` /
    `{t("x")}` 打断的混排硬编码中文（如 `<span>共 {n} 条</span>`）会漏报。
    """
    if web_dir is None:
        web_dir = ENGINE_ROOT / "web"
    out = []
    if not web_dir.exists():
        return out

    for tsx in sorted(web_dir.rglob("*.tsx")):
        if tsx.name in I18N_SKIP_FILE_NAMES:
            continue
        if any(part in I18N_SKIP_DIR_PARTS for part in tsx.parts):
            continue
        try:
            text = tsx.read_text(encoding="utf-8")
        except Exception:
            continue
        cleaned = mask_js_comments(text)
        # JSX 文本扫描用「再剥 {…} 表达式」的版本（k-6）；属性扫描仍用 cleaned
        # （属性值是 "…" 字符串字面量，不含跨表达式打断问题）。两者均保留偏移，行号一致。
        cleaned_text_scan = mask_jsx_expressions(cleaned)
        try:
            rel = str(tsx.relative_to(ENGINE_ROOT)).replace("\\", "/")
        except ValueError:
            # tsx 不在 PROJECT_ROOT 下（测试场景）— 用文件名兜底
            rel = str(tsx).replace("\\", "/")

        for m in JSX_TEXT_CN_RE.finditer(cleaned_text_scan):
            content = m.group(1).strip()
            if not content:
                continue
            line = cleaned_text_scan[: m.start()].count("\n") + 1
            out.append({
                "path": rel,
                "line": line,
                "kind": "jsx_text",
                "text": content,
            })
        for m in JSX_ATTR_CN_RE.finditer(cleaned):
            attr = m.group(1)
            content = m.group(3)
            line = cleaned[: m.start()].count("\n") + 1
            out.append({
                "path": rel,
                "line": line,
                "kind": f"attr:{attr}",
                "text": content,
            })
        # ARIA 属性硬编码英文文案（影响屏幕阅读器，必须 i18n）
        for m in JSX_ATTR_ENGLISH_ARIA_RE.finditer(cleaned):
            attr = m.group(1)
            content = m.group(3)
            line = cleaned[: m.start()].count("\n") + 1
            out.append({
                "path": rel,
                "line": line,
                "kind": f"attr_en:{attr}",
                "text": content,
            })
    return out


def list_unsummarized_sections(pages) -> list[dict]:
    """扫 wiki 中 [[raw/...#^h-...]] 形式的章节级引用，列出对应 raw outline 里
    agent_summary 为 null 的章节（即被引用却没回填摘要）。

    去重：同一 (raw, anchor) 只列一次，但带上所有引用方供溯源。
    """
    section_index_cache: dict[str, dict[str, dict] | None] = {}
    # key: (raw_target, anchor_id)；value: {title, level, refs:[(from_path, from_title, line)]}
    aggregated: dict[tuple[str, str], dict] = {}

    for page in pages:
        for m in WIKILINK_RE.finditer(page.raw_content):
            target = m.group(1)
            anchor = m.group(2)
            if not anchor or not anchor.startswith("^"):
                continue
            anchor_id = anchor.lstrip("^")
            # 仅关心 heading 锚点（^h-...）
            if not anchor_id.startswith("h-"):
                continue
            target_norm = normalize_link_target(target)
            if not RAW_REF_PREFIX_RE.match(target_norm):
                continue
            if target_norm not in section_index_cache:
                section_index_cache[target_norm] = _collect_section_summary_index(target_norm)
            sec_idx = section_index_cache[target_norm]
            if sec_idx is None:
                continue  # raw 或 outline 不存在，由 list_broken_refs 处理
            sec = sec_idx.get(anchor_id)
            if not sec:
                continue  # anchor 不存在，由 list_broken_refs 处理
            if sec.get("agent_summary"):
                continue  # 已有摘要，跳过

            line = page.raw_content[: m.start()].count("\n") + 1
            key = (target_norm, anchor_id)
            entry = aggregated.setdefault(key, {
                "target": target_norm,
                "anchor": anchor_id,
                "title": sec.get("title", ""),
                "level": sec.get("level", 0),
                "refs": [],
            })
            entry["refs"].append({
                "from_path": page.path,
                "from_title": page.title,
                "line": line,
            })

    return list(aggregated.values())


# ============================================================
# 输出格式化（人类可读）
# ============================================================

def output_json(data):
    print(json.dumps(data, ensure_ascii=False, indent=2, default=str))


def fmt_search_results(results):
    if not results:
        print("（无结果）")
        return
    print(f"找到 {len(results)} 条匹配：\n")
    for i, r in enumerate(results, 1):
        print(f"{i}. [{r['type']}] {r['title']}  (score={r['score']})")
        print(f"   path: {r['path']}")
        if r.get("snippet"):
            print(f"   snippet: {r['snippet']}")
        print()


def fmt_page_list(pages):
    if not pages:
        print("（空）")
        return
    print(f"页面列表（{len(pages)} 条）：\n")
    for p in pages:
        print(f"  [{p.type:14}] [{p.status:10}] {p.title:40}  →  {p.path}")


def fmt_orphans(orphans):
    if not orphans:
        print("✅ 没有孤儿页面")
        return
    print(f"⚠️  发现 {len(orphans)} 个孤儿页面（无入链）：\n")
    for p in orphans:
        print(f"  [{p.type}] {p.title}  →  {p.path}")


def fmt_conflicts(conflicts):
    if not conflicts:
        print("✅ 没有未决冲突")
        return
    print(f"⚠️  发现 {len(conflicts)} 处冲突标注：\n")
    for c in conflicts:
        print(f"  {c['path']}:{c['line']}  ({c['title']})")
        print("  --- 冲突块 ---")
        for line in c["block"].split("\n"):
            print(f"    {line}")
        print()


def fmt_to_update(items):
    if not items:
        print("✅ 没有 #to-be-updated 积压")
        return
    print(f"⏳ {len(items)} 个页面带 #to-be-updated 标签：\n")
    for it in items:
        last = it.get("last_modified") or "?"
        print(f"  [{it['type']}] {it['title']}  (last: {last})  →  {it['path']}")


def fmt_backlinks(links):
    if not links:
        print("✅ 没有反向链接")
        return
    print(f"反向链接（{len(links)} 条）：\n")
    for l in links:
        anchor = f"#{l['anchor']}" if l["anchor"] else ""
        alias = f" 别名: {l['alias']}" if l["alias"] else ""
        print(f"  {l['from_path']}:{l['line']}  ({l['from_title']}){anchor}{alias}")
        print(f"    上下文: {l['context']}")
        print()


def fmt_outlinks(links):
    if not links:
        print("（无出向链接）")
        return
    print(f"出向链接（{len(links)} 条）：\n")
    for l in links:
        anchor = f"#{l['anchor']}" if l["anchor"] else ""
        alias = f" 别名: {l['alias']}" if l["alias"] else ""
        print(f"  → {l['target']}{anchor}{alias}  (line {l['line']})")


def fmt_health(report):
    print("=" * 50)
    print("知识库健康度报告")
    print("=" * 50)
    print(f"总页面数: {report['total_pages']}")
    print()
    print("按类型分布:")
    for t, n in sorted(report["by_type"].items()):
        print(f"  {t:20} {n}")
    print()
    print("按 status 分布:")
    for s, n in sorted(report["by_status"].items()):
        print(f"  {s:20} {n}")
    print()
    print("按 confidence 分布:")
    for c, n in sorted(report["by_confidence"].items()):
        print(f"  {c:20} {n}")
    print()

    def status_line(label, n):
        icon = "✅" if n == 0 else "⚠️ "
        print(f"  {icon} {label:32} {n}")

    print("健康指标:")
    status_line("孤儿页面（无入链）", report["orphans_count"])
    status_line("未决冲突", report["conflicts_count"])
    status_line("#to-be-updated 积压", report["to_update_count"])
    status_line("低 confidence 页面", report["low_confidence_count"])
    status_line("Stale draft（>30 天未改）", report["stale_drafts_count"])
    status_line("失效引用（broken refs）", report.get("broken_refs_count", 0))
    # 拆 broken_refs by reason，方便定位治法
    by_reason = report.get("broken_refs_by_reason") or {}
    if by_reason:
        for reason, n in sorted(by_reason.items()):
            print(f"     ├─ {reason:30} {n}")
    status_line("被引用但缺章节摘要", report.get("unsummarized_sections_count", 0))
    status_line("裸论断（含数字但无引用支撑）", report.get("bare_claims_count", 0))
    status_line("论断仅整页引用（应升块级 anchor）", report.get("coarse_citations_count", 0))
    status_line("索引 page_count 与 scope 不一致", report.get("index_count_mismatches_count", 0))
    status_line("source_count 与 sources 数组不一致 / 论断页缺 source", report.get("source_issues_count", 0))
    status_line("status=reviewed 但非人类审阅（last_modified_by≠Human）", report.get("status_issues_count", 0))
    status_line("Web 硬编码中文（违反 i18n）", report.get("i18n_violations_count", 0))
    print()
    print(f"检查时间: {report['last_check']}")


def fmt_validate(result, file_path):
    warnings = result.get("warnings") or []
    if result["valid"] and not warnings:
        print(f"✅ {file_path} frontmatter 合规")
        return
    if result["valid"]:
        print(f"⚠️  {file_path} frontmatter 合规但有警告：")
    else:
        print(f"❌ {file_path} frontmatter 不合规：")
        for err in result["errors"]:
            print(f"   - {err}")
    for w in warnings:
        print(f"   ⚠ {w}")


def fmt_source_issues(items: list[dict]):
    """六类问题分组打印——每类有不同修复方向，分开看更清晰。"""
    if not items:
        print("✅ 所有页面 source_count / sources 数组 / 正文引用 / analysis-comparison 类型最低 source 要求均合规")
        return
    by_type = {}
    for it in items:
        by_type.setdefault(it["issue_type"], []).append(it)
    titles = {
        "count-mismatch": "source_count 字段值与 sources 数组长度不一致",
        "missing-source": "论断型页面 source_count=0 但未标 #to-be-updated/stub",
        "analysis-undersourced": "analysis/comparison 类型需 source_count ≥ 2（跨文档综合需 ≥ 2 个来源）",
        "source-summary-mismatch": "source_summary 应绑定恰好 1 个 raw 来源",
        "broken-source-link": "sources 数组中的链接目标文件不存在",
        "declared-but-uncited": "声明了 sources 但正文无 anchor 级引用（[[raw/...]] / [[*#^*]]）",
    }
    total = len(items)
    print(f"⚠️  发现 {total} 处 source_count 问题：\n")
    # 按 issue_type 顺序固定输出，便于人眼扫读
    ordering = (
        "count-mismatch",
        "missing-source",
        "analysis-undersourced",
        "source-summary-mismatch",
        "broken-source-link",
        "declared-but-uncited",
    )
    for key in ordering:
        group = by_type.get(key)
        if not group:
            continue
        print(f"━━ {titles[key]}（{len(group)} 处）━━\n")
        for it in group:
            print(f"  [{it['type']}] {it['path']}  ({it['title']})")
            print(f"    声明 source_count: {it['declared_count']}  vs  实际 sources[] 长度: {it['actual_len']}")
            if it.get("detail"):
                print(f"    详情: {it['detail']}")
            print(f"    修复: {it['suggestion']}")
            print()


def fmt_index_mismatches(items: list[dict]):
    if not items:
        print("✅ 所有 index 页 page_count 与 scope 实际匹配数一致")
        return
    print(f"⚠️  {len(items)} 个 index 页 page_count 与 scope 不一致：\n")
    for it in items:
        delta_sign = "+" if it["delta"] > 0 else ""
        print(f"  {it['path']}  ({it['title']})")
        print(f"    scope:    {it['scope']}")
        print(f"    声明:     page_count: {it['declared_page_count']}")
        print(f"    实际:     {it['actual_count']}（差 {delta_sign}{it['delta']}）")
        if it["delta"] > 0:
            print(f"    建议:     索引漏列了 {it['delta']} 个页面，去补链接 + 改 page_count")
        else:
            print(f"    建议:     scope 多算了 {-it['delta']} 个，可能 deprecate 后未更新 page_count，或 scope 写宽了")
        print()


def fmt_outline(outline: dict):
    print(f"文档: {outline.get('doc_path', '?')}")
    print(
        f"字符数: {outline.get('doc_chars', 0)} | "
        f"段数: {outline.get('doc_paragraphs', 0)} | "
        f"生成于: {outline.get('generated_at', '?')}"
    )
    print()

    def walk(secs, depth=0):
        for s in secs:
            indent = "  " * depth
            heading_marker = "#" * s["level"]
            anchor = s.get("anchor", "")
            chars = s.get("char_end", 0) - s.get("char_start", 0)
            print(f"{indent}{heading_marker} {s['title']}  [^{anchor}]  (line {s['line']}, {chars} 字符)")
            summary = s.get("agent_summary") or s.get("preview") or ""
            tag = "(LLM)" if s.get("agent_summary") else "(预览)"
            if summary:
                # 截到 120 字
                summary = summary if len(summary) <= 120 else summary[:120] + "…"
                print(f"{indent}  └─ {tag} {summary}")
            walk(s.get("children", []), depth + 1)

    if not outline.get("sections"):
        print("（文档无 heading，无章节树）")
    else:
        walk(outline["sections"])


def fmt_section(sec: dict):
    print(f"路径: {sec['path']}")
    print(f"标题: {sec['title']}  [^{sec['anchor']}]  (level {sec['level']}, line {sec['line']})")
    print(f"字符范围: {sec['char_start']}-{sec['char_end']}  ({sec['char_end']-sec['char_start']} 字符)")
    if sec.get("agent_summary"):
        print(f"摘要(LLM): {sec['agent_summary']}")
    elif sec.get("preview"):
        print(f"预览: {sec['preview']}")
    print()
    print("-" * 60)
    print(sec["content"])


def fmt_block(blk: dict):
    print(f"路径: {blk['path']}")
    print(f"锚点: ^{blk['anchor']}  类型: {blk['kind']}  行: {blk['line_start']}-{blk['line_end']}")
    print()
    print("-" * 60)
    print(blk["content"])


def fmt_blocks(data: dict):
    print(f"文档: {data.get('doc_path', '?')}")
    print(f"字符: {data.get('doc_chars', 0)} | Block: {data.get('block_count', 0)}")
    by_kind = data.get("by_kind", {}) or {}
    if by_kind:
        kind_order = ["heading", "paragraph", "list", "blockquote", "table", "code", "figure"]
        parts = [f"{k} {by_kind[k]}" for k in kind_order if k in by_kind]
        print("类型分布: " + " · ".join(parts))
    print()
    for i, b in enumerate(data.get("blocks", []), 1):
        anchor = b.get("anchor") or "(no-anchor)"
        kind = b.get("kind", "?")
        if kind == "heading":
            tag = f"H{b.get('level', '?')}"
            title = b.get("title", "")
            summary = b.get("agent_summary") or "(无摘要)"
            print(f"#{i:3} [{tag:5}] ^{anchor:25}  {title}  ({b.get('char_count', 0)} 字符)")
            print(f"      └─ {summary[:120]}")
        else:
            owner = b.get("owning_section_anchor") or "-"
            print(f"#{i:3} [{kind:10}] ^{anchor:25}  ↳ ^{owner}  line {b.get('line_start')}  ({b.get('char_count', 0)} 字符)")
            preview = b.get("preview", "")
            if preview:
                print(f"      {preview}")
        print()


def fmt_find_anchor(results: list[dict]):
    if not results:
        print("（无匹配）")
        return
    print(f"找到 {len(results)} 个匹配块：\n")
    for r in results:
        print(f"  [^{r['anchor']}]  ({r['kind']}, line {r['line_start']})")
        print(f"    {r['preview']}")
        print()


def fmt_annotate(result: dict):
    print(f"✅ 已写入 agent_summary")
    print(f"  路径: {result['path']}")
    print(f"  锚点: ^{result['anchor']}  ({result['title']})")
    print(f"  摘要: {result['agent_summary']}")


def fmt_broken_refs(items: list[dict]):
    if not items:
        print("✅ 没有失效的 raw 引用")
        return
    print(f"⚠️  发现 {len(items)} 处失效引用：\n")
    for it in items:
        print(f"  {it['from_path']}:{it['line']}  ({it['from_title']})")
        print(f"    → [[{it['target']}#^{it['anchor']}]]  原因: {it['reason']}")
        print()


def fmt_unsummarized(items: list[dict]):
    if not items:
        print("✅ 所有被 wiki 引用的章节都已回填 agent_summary")
        return
    print(f"⚠️  {len(items)} 个被引用的章节缺 agent_summary：\n")
    print("    （ingest 流程要求每个被精读 / 引用的 H 段都跑 annotate-section，"
          "详见 CLAUDE.md Ingest 流程）\n")
    for it in items:
        marker = "#" * (it.get("level") or 2)
        print(f"  {marker} {it['title']}  [^{it['anchor']}]")
        print(f"    raw: {it['target']}")
        print(f"    被引用 {len(it['refs'])} 次：")
        for r in it["refs"][:3]:
            print(f"      - {r['from_path']}:{r['line']}  ({r['from_title']})")
        if len(it["refs"]) > 3:
            print(f"      ... 还有 {len(it['refs']) - 3} 处")
        print(f"    修复: python scripts/k.py annotate-section {it['target']} {it['anchor']} \"<一两句概括>\"")
        print()


def fmt_i18n_violations(items: list[dict]):
    if not items:
        print("✅ 没有发现 web/ 下硬编码的中文 UI 字符串")
        return
    print(f"⚠️  发现 {len(items)} 处硬编码中文（违反 CLAUDE.md i18n 规则）：\n")
    print("    （CLAUDE.md \"Web 管理台国际化方案\"：UI 字符串必须走 t() / useT()，"
          "硬编码会让英文用户看不懂）\n")
    for it in items:
        print(f"  {it['path']}:{it['line']}  [{it['kind']}]")
        print(f"    硬编码: {it['text']!r}")
        print(f"    修复:   在 web/lib/i18n.ts 加 key + 用 t(\"key\", locale) 或 useT()(\"key\")")
        print()


def fmt_relation_issues(items: list[dict]):
    if not items:
        print("✅ 没有发现非标准关系类型（[[X|RELATION]] 都在白名单中）")
        return
    print(f"⚠️  发现 {len(items)} 处非标准关系类型：\n")
    print(f"    （标准关系白名单：{sorted(RELATION_TYPES)}）\n")
    for it in items:
        print(f"  {it['path']}:{it['line']}  ({it['title']})")
        print(f"    引用: {it['raw']}")
        print(f"    问题: {it['bad_relation']!r} 不在白名单")
        print(f"    修复: {it['suggestion']}")
        print()


def fmt_graph(data: dict):
    nodes = data.get("nodes", [])
    edges = data.get("edges", [])
    print(f"📊 wiki 链接图谱：{len(nodes)} 节点 · {len(edges)} 边\n")
    by_type: dict[str, int] = {}
    for n in nodes:
        by_type[n["type"]] = by_type.get(n["type"], 0) + 1
    print("  节点分布:")
    for t, c in sorted(by_type.items(), key=lambda x: -x[1]):
        print(f"    {t:20s} {c}")
    by_rel: dict[str, int] = {}
    for e in edges:
        by_rel[e["link_type"]] = by_rel.get(e["link_type"], 0) + 1
    print("\n  边分布:")
    for r, c in sorted(by_rel.items(), key=lambda x: -x[1]):
        print(f"    {r:20s} {c}")
    print("\n  （JSON 详情请加 --json）")


def fmt_bare_claims(items: list[dict]):
    if not items:
        print("✅ 没有发现裸论断（含数字但无 [[raw/...]] 或 [需要来源] 支撑的段落）")
        return
    print(f"⚠️  发现 {len(items)} 处裸论断：\n")
    print("    （含具体数字 / 百分比 / 量级 / NLP 指标 / 年份 / 金额 / 倍数，"
          "但段落里既无 [[raw/...]] 引用，也无 [需要来源] 占位）\n")
    for it in items:
        print(f"  {it['path']}:{it['line']}  ({it['title']}, {it['type']})")
        print(f"    数字: {', '.join(it['matched'])}")
        print(f"    片段: {it['preview']}")
        print(f"    修复: 给该段落补 [[raw/<file>#^<anchor>]] 引用，或加 [需要来源] 标记")
        print()


def fmt_coarse_citations(items: list[dict]):
    if not items:
        print("✅ 没有发现引用粒度不足（论断仅挂整页 [[raw/X]]、未到块级 #^anchor）")
        return
    print(f"⚠️  发现 {len(items)} 处引用粒度不足：\n")
    print("    （段落含数字论断，且只挂整页 [[raw/X]] 引用，未精确到块级 [[raw/X#^anchor]]；"
          "块级 anchor 才能精确溯源 / 渲染 [n] 上标）\n")
    for it in items:
        print(f"  {it['path']}:{it['line']}  ({it['title']}, {it['type']})")
        print(f"    数字: {', '.join(it['matched'])}")
        print(f"    整页引用: {', '.join(it.get('coarse_refs', []))}")
        print(f"    片段: {it['preview']}")
        print(f"    修复: 用 k.py find-anchor 在 raw 里定位该论断所在块，升级为 [[raw/<file>#^<anchor>]]")
        print()


# ============================================================
# new-workspace 脚手架
# ============================================================

# workspace 名：小写字母/数字开头，其余允许小写字母/数字/-/_。
# 与 Web 端 cookie / KB_WORKSPACE 的解析口径一致（目录名直用）。
WORKSPACE_NAME_RE = re.compile(r"^[a-z0-9][a-z0-9_-]*$")

# 脚手架目录骨架——与 demo workspace（smb-ecommerce 等）结构一致；
# raw/ 整体被 .gitignore 排除（版权/隐私），exports/my_thoughts 留 .gitkeep 保结构。
_WORKSPACE_SKELETON = (
    "wiki/sources",
    "wiki/concepts",
    "wiki/entities",
    "wiki/analyses",
    "wiki/indexes",
    "raw/articles",
    "raw/papers",
    "exports",
    "my_thoughts",
)


def create_workspace(name: str) -> dict:
    """在 DATA_ROOT/workspaces/ 下创建一个新的空知识库骨架。

    生成：标准目录结构 + wiki/root_index.md（标准 frontmatter 的空根索引）
    + log.md（首条 human 日志）。不碰已存在的 workspace（直接拒绝）。
    返回创建摘要 dict（给 --json 输出用）。
    """
    if not WORKSPACE_NAME_RE.match(name or ""):
        raise ValueError(
            f"非法 workspace 名 {name!r}——只允许小写字母/数字/连字符/下划线，"
            f"且以字母或数字开头（如 my-research）"
        )
    ws = DATA_ROOT / "workspaces" / name
    if ws.exists():
        raise ValueError(f"workspace 已存在: {ws}")

    today = datetime.now().strftime("%Y-%m-%d")
    for sub_dir in _WORKSPACE_SKELETON:
        (ws / sub_dir).mkdir(parents=True)
    for keep in ("exports", "my_thoughts", "raw/articles", "raw/papers"):
        (ws / keep / ".gitkeep").write_text("", encoding="utf-8")

    root_index = f"""---
title: "知识库根索引 — {name}"
type: index
created_date: {today}
last_modified: {today}
last_modified_by: Human
status: draft
confidence: high
source_count: 0
sources: []
tags:
  - root
scope: "wiki/concepts/*, wiki/entities/*, wiki/sources/*, wiki/indexes/*, wiki/analyses/*"
page_count: 0
---

# 根索引 — {name}

> 这是一个新建的空知识库。第一次 ingest 之后，由 agent 在下方「领域目录」表中登记子索引（MOC），查询时从这里下钻。

## 领域目录

| 领域 | 子索引 | 页面数 | 最近更新 |
|------|--------|--------|----------|

## 近期更新

（暂无——把第一份资料放进 `raw/articles/` 或 `raw/papers/`，跑 `convert.py` 后让 agent ingest 即可。）
"""
    (ws / "wiki" / "root_index.md").write_text(root_index, encoding="utf-8")

    log_md = (
        f"# 操作日志 — {name}\n\n"
        f"## [{today}] human | 创建 workspace\n"
        f"- 由 `python scripts/k.py new-workspace {name}` 脚手架生成\n"
    )
    (ws / "log.md").write_text(log_md, encoding="utf-8")

    return {
        "created": True,
        "name": name,
        "path": str(ws),
        "dirs": list(_WORKSPACE_SKELETON),
        "files": ["wiki/root_index.md", "log.md"],
    }


def fmt_new_workspace(result: dict) -> None:
    name = result["name"]
    print(f"✅ 已创建 workspace {name!r}: {result['path']}")
    print()
    print("下一步：")
    print(f"  1. 把原始资料（HTML/PDF/Word/Markdown）放进 workspaces/{name}/raw/articles/ 或 raw/papers/")
    print(f"  2. python scripts/convert.py --workspace {name}        # 转 markdown + 自动加锚点")
    print(f"  3. 让 AI agent 执行摄入（如在 Claude Code 里说「把 raw/... 摄入到 {name} 知识库」或用 /kb-ingest）")
    print(f"  4. python scripts/k.py --workspace {name} health       # 体检")
    print(f"  Web 端：cd web && KB_WORKSPACE={name} npm run dev      # 或在顶栏 workspace 切换器里切换")


# ============================================================
# CLI
# ============================================================

def _main_impl():
    parser = argparse.ArgumentParser(
        prog="k",
        description="知识库 CLI - 提供内置工具做不到的结构化查询",
    )
    parser.add_argument(
        "--json", action="store_true",
        help="输出 JSON 格式（给 LLM/脚本用）",
    )
    parser.add_argument(
        "--workspace", dest="workspace", default=None,
        help="指定工作区名称（在 workspaces/ 下查找）。"
             "默认会自动选择第一个存在的 workspace；如果没有则报错并提示运行 `k.py new-workspace <name>` 创建。",
    )

    # 共享 parent：让 --json 在子命令后面也能用
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument(
        "--json", action="store_true", dest="json_sub",
        help="输出 JSON 格式（给 LLM/脚本用）",
    )

    sub = parser.add_subparsers(dest="cmd", required=True)

    p_search = sub.add_parser("search", help="跨 wiki 关键词搜索", parents=[common])
    p_search.add_argument("query")
    p_search.add_argument("--limit", type=int, default=20)

    p_list = sub.add_parser("list-pages", help="按 frontmatter 字段过滤页面", parents=[common])
    p_list.add_argument("--type", dest="filter_type")
    p_list.add_argument("--status", dest="filter_status")
    p_list.add_argument("--confidence", dest="filter_conf")
    p_list.add_argument("--tag", dest="filter_tag")
    p_list.add_argument("--modified-by", dest="filter_by")

    sub.add_parser("list-orphans", help="找无入链的孤儿页面", parents=[common])
    sub.add_parser("list-conflicts", help="找带冲突标注的页面", parents=[common])
    sub.add_parser("list-to-update", help="找带 #to-be-updated 的页面", parents=[common])

    p_back = sub.add_parser("backlinks", help="查询某页的反向链接", parents=[common])
    p_back.add_argument("path", help="目标页面路径，相对项目根")

    p_out = sub.add_parser("outlinks", help="查询某页的出向链接", parents=[common])
    p_out.add_argument("path", help="源页面路径，相对项目根")

    sub.add_parser("health", help="综合健康度报告", parents=[common])

    p_val = sub.add_parser("validate-frontmatter", help="校验 frontmatter", parents=[common])
    p_val.add_argument("path", help="要校验的文件路径")

    p_outline = sub.add_parser("outline", help="显示文档章节大纲（含 preview / agent_summary）", parents=[common])
    p_outline.add_argument("path", help="md 文件路径（相对项目根）")

    p_rs = sub.add_parser("read-section", help="按 anchor 或标题读取整个 H 段", parents=[common])
    p_rs.add_argument("path", help="md 文件路径")
    p_rs.add_argument("anchor_or_title", help="anchor（如 h-2-3-abc123，可加 ^ 前缀）或标题文本")

    p_rb = sub.add_parser("read-block", help="按 anchor 读取单个块（^p-/^t-/^c-/^f-）", parents=[common])
    p_rb.add_argument("path", help="md 文件路径")
    p_rb.add_argument("anchor", help="块锚点（如 p-12-7d8e9a，可加 ^ 前缀）")

    p_blocks = sub.add_parser("blocks", help="列出文档所有 block（含 anchor / 类型 / 所属章节 / preview）", parents=[common])
    p_blocks.add_argument("path", help="md 文件路径（相对项目根）")

    p_fa = sub.add_parser("find-anchor", help="根据文本片段在文档中反查 anchor", parents=[common])
    p_fa.add_argument("path", help="md 文件路径")
    p_fa.add_argument("snippet", help="要查找的文本片段")
    p_fa.add_argument("--limit", type=int, default=10)

    p_ann = sub.add_parser("annotate-section", help="给 section 写入 agent_summary（写到 .outline.json）", parents=[common])
    p_ann.add_argument("path", help="md 文件路径")
    p_ann.add_argument("anchor", help="目标 section 的 heading anchor")
    p_ann.add_argument("summary", help="摘要文本（一两句话）")

    sub.add_parser("list-broken-refs", help="扫描 wiki/ 中失效的 [[raw/...#^anchor]] 引用", parents=[common])
    sub.add_parser("list-unsummarized", help="扫描被 wiki 章节引用但 outline.json 中 agent_summary 为 null 的章节", parents=[common])
    sub.add_parser("list-bare-claims", help="扫描含数字 / 百分比 / NLP 指标但无 [[raw/...]] 或 [需要来源] 支撑的段落", parents=[common])
    sub.add_parser("list-coarse-citations", help="扫描含数字论断但只挂整页 [[raw/X]]、未到块级 [[raw/X#^anchor]] 的段落（引用粒度不足）", parents=[common])
    sub.add_parser("list-index-mismatches", help="扫描 type=index 页：page_count 字段与 scope 实际匹配数不一致的", parents=[common])
    sub.add_parser("list-source-issues", help="扫描 source_count 与 sources 数组不一致 / 论断页缺 source 不标 #to-be-updated 等问题", parents=[common])
    sub.add_parser("list-status-issues", help="扫描 status=reviewed 但 last_modified_by≠Human 的矛盾页（LLM 写入页自称已审阅）", parents=[common])
    sub.add_parser("list-relation-issues", help="扫描 [[X|RELATION]] 中非标准关系类型词（拼写错误 / 未在白名单）", parents=[common])
    sub.add_parser("list-relation-balance", help="扫描关系词频次失衡：单一关系词占比 > 30%% 报警（防 LLM 偷懒用最弱关系词）", parents=[common])
    sub.add_parser("list-implicit-relations", help="扫描 plain wikilink + 判断/立场动词的段落（应改 [[?|RELATION]] 给图谱染色）", parents=[common])
    sub.add_parser("list-i18n-violations", help="扫描 web/ 下 .tsx 中硬编码的中文 UI 字符串（应走 t() / useT()）", parents=[common])

    p_new = sub.add_parser(
        "new-workspace",
        help="脚手架：在 workspaces/ 下创建一个新的空知识库（标准目录 + 根索引 + log.md）",
        parents=[common],
    )
    p_new.add_argument("name", help="新 workspace 名（小写字母/数字/-/_，如 my-research）")

    p_graph = sub.add_parser(
        "graph",
        help="输出 wiki 链接图谱（节点 + 边）的 JSON——给 web 端 /graph 与外部可视化用",
        parents=[common],
    )
    p_graph.add_argument("--type", dest="g_type", help="按节点 type 过滤（concept/entity/...）")
    p_graph.add_argument("--tag", dest="g_tag", help="按 tag 过滤")
    p_graph.add_argument(
        "--include-archive", action="store_true",
        help="包含 wiki/_archive_* 归档区（默认排除）",
    )

    args = parser.parse_args()
    # 合并：父级 --json 或子级 --json 任意为 True 即输出 JSON
    args.json = bool(getattr(args, "json", False)) or bool(getattr(args, "json_sub", False))

    # new-workspace 在 workspace 校验**之前**短路处理：它创建的是尚不存在的
    # workspace，且不应依赖默认 workspace 存在（KB_ROOT 指向的全新项目里没有
    # smb-ecommerce，默认校验会把它挡死）。
    if args.cmd == "new-workspace":
        result = create_workspace(args.name)
        if args.json:
            output_json(result)
        else:
            fmt_new_workspace(result)
        return

    # 根据 --workspace 切换 PROJECT_ROOT。
    # k-5 安全约束：ws_root 必须是 workspaces/ 下的真实目录——
    # 既挡 `../` 穿越（如 --workspace ../../etc），也挡不存在的工作区名。
    global PROJECT_ROOT, WIKI_DIR, RAW_DIR

    # 计算有效 workspace 列表（用于 fallback + 错误信息）
    workspaces_root = (DATA_ROOT / "workspaces").resolve()
    valid_workspaces: list[str] = []
    if workspaces_root.is_dir():
        valid_workspaces = [
            d.name for d in sorted(workspaces_root.iterdir())
            if d.is_dir() and not d.name.startswith(".")
        ]

    # 没指定 workspace 时：自动选第一个存在的；没有则报错
    if not args.workspace:
        if not valid_workspaces:
            print(
                f"错误: 没有可用的 workspace（workspaces/ 为空或不存在）。"
                + f"\n  请先创建 workspace: python scripts/k.py new-workspace <name>"
                + (f"\n  （数据根: {workspaces_root}）"),
                file=sys.stderr,
            )
            sys.exit(2)
        args.workspace = valid_workspaces[0]
        if len(valid_workspaces) > 1:
            print(
                f"[info] 未指定 --workspace，自动使用 '{args.workspace}'"
                + f"（共有 {len(valid_workspaces)} 个 workspace；用 --workspace 切换）",
                file=sys.stderr,
            )

    if args.workspace:
        if not workspaces_root.is_dir():
            print(
                f"错误: 数据根下没有 workspaces/ 目录: {workspaces_root}"
                + (f"（KB_ROOT={_KB_ROOT_ENV}）" if _KB_ROOT_ENV else "（未设 KB_ROOT，默认用引擎根）"),
                file=sys.stderr,
            )
            sys.exit(2)
        ws_root = (workspaces_root / args.workspace).resolve()
        valid = [
            d.name for d in sorted(workspaces_root.iterdir())
            if d.is_dir() and not d.name.startswith(".")
        ] if workspaces_root.is_dir() else []
        if not ws_root.is_dir() or ws_root.parent != workspaces_root:
            print(
                f"错误: 非法 --workspace {args.workspace!r}（必须是 workspaces/ 下的目录）。"
                f"有效工作区: {valid}",
                file=sys.stderr,
            )
            sys.exit(2)
        PROJECT_ROOT = ws_root
        WIKI_DIR = PROJECT_ROOT / "wiki"
        RAW_DIR = PROJECT_ROOT / "raw"

    pages = load_all_wiki_pages()

    if args.cmd == "search":
        results = search_pages(args.query, pages, args.limit)
        if args.json:
            output_json(results)
        else:
            fmt_search_results(results)

    elif args.cmd == "list-pages":
        filters = {
            "type": args.filter_type,
            "status": args.filter_status,
            "confidence": args.filter_conf,
            "tag": args.filter_tag,
            "modified_by": args.filter_by,
        }
        filtered = filter_pages(pages, filters)
        if args.json:
            output_json([asdict(p) for p in filtered])
        else:
            fmt_page_list(filtered)

    elif args.cmd == "list-orphans":
        backlinks = build_link_graph(pages)
        orphans = find_orphans(pages, backlinks)
        if args.json:
            output_json([asdict(p) for p in orphans])
        else:
            fmt_orphans(orphans)

    elif args.cmd == "list-conflicts":
        conflicts = find_conflicts(pages)
        if args.json:
            output_json(conflicts)
        else:
            fmt_conflicts(conflicts)

    elif args.cmd == "list-to-update":
        items = find_to_update(pages)
        if args.json:
            output_json(items)
        else:
            fmt_to_update(items)

    elif args.cmd == "backlinks":
        links = get_backlinks(strip_workspace_prefix(args.path), pages)
        if args.json:
            output_json(links)
        else:
            fmt_backlinks(links)

    elif args.cmd == "outlinks":
        links = get_outlinks(strip_workspace_prefix(args.path), pages)
        if args.json:
            output_json(links)
        else:
            fmt_outlinks(links)

    elif args.cmd == "health":
        backlinks = build_link_graph(pages)
        report = health_report(pages, backlinks)
        if args.json:
            output_json(report)
        else:
            fmt_health(report)

    elif args.cmd == "validate-frontmatter":
        # 与 outline / read-section / blocks 等命令统一走 resolve_doc_path——
        # 后者带越界校验（拒绝 `..` 出 PROJECT_ROOT、拒绝绝对路径），
        # 防止 web `/api/validate?path=...` 探测项目外文件
        path = resolve_doc_path(args.path)
        result = validate_frontmatter(path)
        # 先把结果正常打印（web/api/validate 依赖 stdout 的 JSON body），
        # 再以退出码反映校验结果——非法时 exit 1，让 CI / git hook 能当闸门拦下。
        if args.json:
            output_json(result)
        else:
            fmt_validate(result, args.path)
        if not result.get("valid", False):
            sys.exit(1)

    elif args.cmd == "outline":
        md_path = resolve_doc_path(args.path)
        try:
            outline = load_or_build_outline(md_path)
        except FileNotFoundError:
            print(f"错误: 文件不存在: {md_path}", file=sys.stderr)
            sys.exit(2)
        if args.json:
            output_json(outline)
        else:
            fmt_outline(outline)

    elif args.cmd == "read-section":
        md_path = resolve_doc_path(args.path)
        try:
            sec = read_section(md_path, args.anchor_or_title)
        except (FileNotFoundError, LookupError) as e:
            print(f"错误: {e}", file=sys.stderr)
            sys.exit(2)
        if args.json:
            output_json(sec)
        else:
            fmt_section(sec)

    elif args.cmd == "read-block":
        md_path = resolve_doc_path(args.path)
        try:
            blk = read_block(md_path, args.anchor)
        except (FileNotFoundError, LookupError) as e:
            print(f"错误: {e}", file=sys.stderr)
            sys.exit(2)
        if args.json:
            output_json(blk)
        else:
            fmt_block(blk)

    elif args.cmd == "blocks":
        md_path = resolve_doc_path(args.path)
        try:
            data = list_all_blocks(md_path)
        except FileNotFoundError as e:
            print(f"错误: 文件不存在: {e}", file=sys.stderr)
            sys.exit(2)
        if args.json:
            output_json(data)
        else:
            fmt_blocks(data)

    elif args.cmd == "find-anchor":
        md_path = resolve_doc_path(args.path)
        if not md_path.exists():
            print(f"错误: 文件不存在: {md_path}", file=sys.stderr)
            sys.exit(2)
        results = find_anchor(md_path, args.snippet, args.limit)
        if args.json:
            output_json(results)
        else:
            fmt_find_anchor(results)

    elif args.cmd == "annotate-section":
        md_path = resolve_doc_path(args.path)
        try:
            result = annotate_section(md_path, args.anchor, args.summary)
        except (FileNotFoundError, LookupError) as e:
            print(f"错误: {e}", file=sys.stderr)
            sys.exit(2)
        if args.json:
            output_json(result)
        else:
            fmt_annotate(result)

    elif args.cmd == "list-broken-refs":
        items = list_broken_refs(pages)
        if args.json:
            output_json(items)
        else:
            fmt_broken_refs(items)

    elif args.cmd == "list-unsummarized":
        items = list_unsummarized_sections(pages)
        if args.json:
            output_json(items)
        else:
            fmt_unsummarized(items)

    elif args.cmd == "list-bare-claims":
        items = list_bare_claims(pages)
        if args.json:
            output_json(items)
        else:
            fmt_bare_claims(items)

    elif args.cmd == "list-coarse-citations":
        items = list_coarse_citations(pages)
        if args.json:
            output_json(items)
        else:
            fmt_coarse_citations(items)

    elif args.cmd == "list-index-mismatches":
        items = list_index_count_mismatches(pages)
        if args.json:
            output_json(items)
        else:
            fmt_index_mismatches(items)

    elif args.cmd == "list-source-issues":
        items = list_source_count_issues(pages)
        if args.json:
            output_json(items)
        else:
            fmt_source_issues(items)

    elif args.cmd == "list-status-issues":
        items = list_status_issues(pages)
        if args.json:
            output_json(items)
        else:
            fmt_status_issues(items)

    elif args.cmd == "list-i18n-violations":
        items = list_i18n_violations()
        if args.json:
            output_json(items)
        else:
            fmt_i18n_violations(items)

    elif args.cmd == "list-relation-issues":
        items = list_relation_issues(pages)
        if args.json:
            output_json(items)
        else:
            fmt_relation_issues(items)

    elif args.cmd == "list-relation-balance":
        items = list_relation_balance(pages)
        if args.json:
            output_json(items)
        else:
            fmt_relation_balance(items)

    elif args.cmd == "list-implicit-relations":
        items = list_implicit_relations(pages)
        if args.json:
            output_json(items)
        else:
            fmt_implicit_relations(items)

    elif args.cmd == "graph":
        backlinks = build_link_graph(pages)
        data = build_graph_data(
            pages,
            backlinks,
            filter_type=args.g_type,
            filter_tag=args.g_tag,
            include_archive=args.include_archive,
        )
        if args.json:
            output_json(data)
        else:
            fmt_graph(data)


def main():
    """外层入口：把 resolve_doc_path 抛的 ValueError（路径越界 / 拒绝绝对路径 /
    my_thoughts 人类专属区）统一翻译为 exit 2，与其他错误路径（文件不存在 exit 2）
    一致，而不是吐 traceback 给调用方（web/CI）。
    """
    try:
        _main_impl()
    except ValueError as e:
        print(f"错误: {e}", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
