"""
Markdown 结构解析层
==================

把 markdown 切分为块（heading / paragraph / list / blockquote / table / code / figure / hr）
并基于 heading 树构建嵌套章节大纲。供 postprocess.py 加锚点和 k.py outline / read-section 复用。

不依赖任何外部 markdown 库——纯正则实现，避免引入新依赖。
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List, Optional


HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$")
HR_RE = re.compile(r"^[-*_]{3,}\s*$")
FENCE_RE = re.compile(r"^(```|~~~)")
LIST_RE = re.compile(r"^\s*(?:[-*+]|\d+\.)\s+")
TABLE_LINE_RE = re.compile(r"^\s*\|")
FIGURE_RE = re.compile(r"^!\[.*?\]\(.*?\)\s*$")
FRONTMATTER_RE = re.compile(r"\A---\r?\n.*?\r?\n---\r?\n", re.DOTALL)
# 锚点字符类：必须与 postprocess.py 的 ANCHOR_DETECT_RE / ANCHOR_STRIP_RE / KIND_LETTER 同步
# （都只生成 h/p/c/t/f）。
# 修改时同步两处，并跑 scripts/tests/ 下的锚点相关测试。
ANCHOR_TAIL_RE = re.compile(r"\s+\^[hpcft]-\d+(?:-\d+)?-[a-z0-9]+(?:-\d+)?\s*$")


@dataclass
class Block:
    kind: str
    text: str
    line_start: int
    line_end: int
    char_start: int
    char_end: int
    level: Optional[int] = None
    title: Optional[str] = None
    anchor: Optional[str] = None


@dataclass
class Section:
    level: int
    seq: int
    anchor: str
    title: str
    line: int
    char_start: int
    char_end: int
    preview: str
    agent_summary: Optional[str] = None
    children: List["Section"] = field(default_factory=list)


def strip_frontmatter(text: str) -> tuple[str, str]:
    """返回 (frontmatter 块, 剩余正文)。无 frontmatter 时第一项为空串。"""
    m = FRONTMATTER_RE.match(text)
    if m:
        return m.group(0), text[m.end():]
    return "", text


def _line_starts(text: str) -> list[int]:
    """每行起始字符偏移。lines[i] 起始于 starts[i]。"""
    starts = [0]
    for i, ch in enumerate(text):
        if ch == "\n":
            starts.append(i + 1)
    return starts


def _classify_lines(lines: list[str]) -> list[str]:
    """逐行分类：blank / heading / hr / fence / text / fence-mid。"""
    out = []
    in_fence = False
    fence_marker = None
    for line in lines:
        if in_fence:
            if fence_marker and line.startswith(fence_marker):
                out.append("fence-end")
                in_fence = False
                fence_marker = None
            else:
                out.append("fence-mid")
            continue
        m = FENCE_RE.match(line)
        if m:
            out.append("fence-start")
            in_fence = True
            fence_marker = m.group(1)
            continue
        stripped = line.strip()
        if not stripped:
            out.append("blank")
        elif HEADING_RE.match(line):
            out.append("heading")
        elif HR_RE.match(stripped):
            out.append("hr")
        else:
            out.append("text")
    return out


def split_blocks(text: str) -> list[Block]:
    """
    把 markdown 切分为块列表。
    - heading / hr / code 各自单独成块
    - 连续 text 行（无空行间隔）合成一个块；进一步根据首行特征分类为 paragraph / list / blockquote / table / figure
    - blank 行只作分隔符，不进入块
    """
    if not text:
        return []
    lines = text.split("\n")
    n = len(lines)
    starts = _line_starts(text)
    classes = _classify_lines(lines)
    text_len = len(text)

    def line_char_end(idx: int) -> int:
        # idx 行末字符偏移（不含换行符）
        if idx < n - 1:
            return starts[idx + 1] - 1
        return text_len

    blocks: list[Block] = []
    i = 0
    while i < n:
        c = classes[i]
        if c == "blank":
            i += 1
            continue
        if c == "heading":
            line = lines[i]
            m = HEADING_RE.match(line)
            level = len(m.group(1))
            title = m.group(2).strip()
            # 标题文本可能已经带 anchor（重复处理时），剥离
            title = ANCHOR_TAIL_RE.sub("", title).strip()
            blocks.append(Block(
                kind="heading",
                text=line,
                line_start=i + 1,
                line_end=i + 1,
                char_start=starts[i],
                char_end=line_char_end(i),
                level=level,
                title=title,
            ))
            i += 1
            continue
        if c == "hr":
            line = lines[i]
            blocks.append(Block(
                kind="hr",
                text=line,
                line_start=i + 1,
                line_end=i + 1,
                char_start=starts[i],
                char_end=line_char_end(i),
            ))
            i += 1
            continue
        if c == "fence-start":
            j = i + 1
            while j < n and classes[j] != "fence-end":
                j += 1
            end = j if j < n else n - 1
            block_text = "\n".join(lines[i:end + 1])
            blocks.append(Block(
                kind="code",
                text=block_text,
                line_start=i + 1,
                line_end=end + 1,
                char_start=starts[i],
                char_end=line_char_end(end),
            ))
            i = end + 1
            continue
        if c == "text":
            j = i + 1
            while j < n and classes[j] == "text":
                j += 1
            block_lines = lines[i:j]
            first = block_lines[0]
            first_stripped = first.strip()
            non_empty = [l for l in block_lines if l.strip()]

            if non_empty and all(TABLE_LINE_RE.match(l) for l in non_empty):
                kind = "table"
            elif LIST_RE.match(first):
                kind = "list"
            elif first_stripped.startswith(">"):
                kind = "blockquote"
            elif len(block_lines) == 1 and FIGURE_RE.match(first_stripped):
                kind = "figure"
            else:
                kind = "paragraph"

            blocks.append(Block(
                kind=kind,
                text="\n".join(block_lines),
                line_start=i + 1,
                line_end=j,
                char_start=starts[i],
                char_end=line_char_end(j - 1),
            ))
            i = j
            continue
        # fence-mid / fence-end 不应作为块起点（前面已被 fence-start 吞掉）
        i += 1
    return blocks


def _strip_anchor_from_text(s: str) -> str:
    """去掉文本末尾的 `^x-...` 锚点（用于生成 preview / 重生成时识别原标题）。"""
    return ANCHOR_TAIL_RE.sub("", s).rstrip()


def _clean_preview(text: str) -> str:
    """从段落原文提取干净的预览文字：去 markdown 标记、压空白、截 200 字。"""
    s = _strip_anchor_from_text(text)
    # 去常见 inline markdown 标记
    s = re.sub(r"`+([^`]+)`+", r"\1", s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"\1", s)
    s = re.sub(r"\*([^*]+)\*", r"\1", s)
    s = re.sub(r"__([^_]+)__", r"\1", s)
    s = re.sub(r"_([^_]+)_", r"\1", s)
    s = re.sub(r"~~([^~]+)~~", r"\1", s)
    # 链接 / 图片 → 取文字部分
    s = re.sub(r"!\[([^\]]*)\]\([^\)]*\)", r"\1", s)
    s = re.sub(r"\[([^\]]+)\]\([^\)]*\)", r"\1", s)
    # 双链
    s = re.sub(r"\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]", r"\1", s)
    # 列表 / 引用 / heading 前缀
    s = re.sub(r"^\s*(?:[-*+]|\d+\.)\s+", "", s, flags=re.MULTILINE)
    s = re.sub(r"^\s*>\s?", "", s, flags=re.MULTILINE)
    s = re.sub(r"^\s*#{1,6}\s+", "", s, flags=re.MULTILINE)
    # 压缩空白
    s = re.sub(r"\s+", " ", s).strip()
    if len(s) > 200:
        s = s[:200]
    return s


def build_outline(blocks: list[Block], total_chars: int) -> dict:
    """
    基于 blocks 构建嵌套章节大纲。
    - 每个 heading 作为一个 section
    - section.char_end = 下一个 level <= 自己 level 的 heading 的 char_start，或 total_chars
    - section.preview = section 内第一个 paragraph/blockquote/list 块的清洗文本（200 字内）
    - sections 按 heading 出现顺序嵌套构建
    """
    headings = [b for b in blocks if b.kind == "heading"]
    paragraph_like_kinds = {"paragraph", "list", "blockquote", "table", "code", "figure"}
    paragraphs_count = sum(1 for b in blocks if b.kind in paragraph_like_kinds)

    sections: list[Section] = []
    stack: list[Section] = []
    seq_by_level: dict[int, int] = {}

    # preview 候选：仅取 paragraph / list / blockquote 三种（最像描述性内容）
    preview_candidate_kinds = {"paragraph", "list", "blockquote"}

    for i, h in enumerate(headings):
        # 找下一个 level <= 当前 level 的 heading 作为本节边界
        end_char = total_chars
        for j in range(i + 1, len(headings)):
            if headings[j].level <= h.level:
                end_char = headings[j].char_start
                break

        # 在本节范围内找首个 paragraph-ish 块作为 preview
        preview_text = ""
        for b in blocks:
            if b.kind == "heading":
                continue
            if b.char_start <= h.char_end:
                continue
            if b.char_start >= end_char:
                break
            if b.kind in preview_candidate_kinds:
                preview_text = _clean_preview(b.text)
                if preview_text:
                    break

        seq_by_level[h.level] = seq_by_level.get(h.level, 0) + 1
        sec = Section(
            level=h.level,
            seq=seq_by_level[h.level],
            anchor=h.anchor or "",
            title=h.title or "",
            line=h.line_start,
            char_start=h.char_start,
            char_end=end_char,
            preview=preview_text,
            agent_summary=None,
            children=[],
        )

        while stack and stack[-1].level >= h.level:
            stack.pop()
        if stack:
            stack[-1].children.append(sec)
        else:
            sections.append(sec)
        stack.append(sec)

    return {
        "sections": sections,
        "paragraphs_count": paragraphs_count,
    }


def section_to_dict(sec: Section) -> dict:
    return {
        "level": sec.level,
        "seq": sec.seq,
        "anchor": sec.anchor,
        "title": sec.title,
        "line": sec.line,
        "char_start": sec.char_start,
        "char_end": sec.char_end,
        "preview": sec.preview,
        "agent_summary": sec.agent_summary,
        "children": [section_to_dict(c) for c in sec.children],
    }


def flatten_sections(sections: list[Section]) -> list[Section]:
    """深度优先扁平化所有 sections。"""
    out: list[Section] = []
    def walk(s: Section):
        out.append(s)
        for c in s.children:
            walk(c)
    for s in sections:
        walk(s)
    return out


def find_section_by_anchor(sections: list[Section], anchor: str) -> Optional[Section]:
    target = anchor.lstrip("^")
    for s in flatten_sections(sections):
        if s.anchor == target:
            return s
    return None


def find_section_by_title(sections: list[Section], title: str) -> Optional[Section]:
    """模糊：标题完全相等（去空白、忽略大小写）"""
    norm = re.sub(r"\s+", " ", title.strip().lower())
    for s in flatten_sections(sections):
        s_norm = re.sub(r"\s+", " ", (s.title or "").strip().lower())
        if s_norm == norm:
            return s
    return None
