"""section_parser.py 的核心功能测试。

覆盖：strip_frontmatter / split_blocks 对各种 markdown 结构的切分准确性。
"""
from __future__ import annotations

import pytest

from section_parser import (
    split_blocks,
    strip_frontmatter,
    build_outline,
    find_section_by_anchor,
    find_section_by_title,
)


class TestStripFrontmatter:
    def test_no_frontmatter(self):
        text = "# Title\n\nbody"
        fm, body = strip_frontmatter(text)
        assert fm == ""
        assert body == text

    def test_with_frontmatter(self):
        text = "---\ntitle: foo\n---\n# Body\n"
        fm, body = strip_frontmatter(text)
        assert fm.startswith("---")
        assert fm.endswith("---\n")
        assert body == "# Body\n"

    def test_frontmatter_crlf(self):
        # Windows 换行也要支持
        text = "---\r\ntitle: foo\r\n---\r\n# Body\r\n"
        fm, body = strip_frontmatter(text)
        assert "title: foo" in fm
        assert body.startswith("# Body")


class TestSplitBlocks:
    def test_empty(self):
        assert split_blocks("") == []

    def test_single_heading(self):
        blocks = split_blocks("# Title\n")
        assert len(blocks) == 1
        assert blocks[0].kind == "heading"
        assert blocks[0].level == 1
        assert blocks[0].title == "Title"

    def test_heading_levels(self):
        blocks = split_blocks("# A\n\n## B\n\n### C\n")
        assert [b.kind for b in blocks] == ["heading", "heading", "heading"]
        assert [b.level for b in blocks] == [1, 2, 3]

    def test_paragraph(self):
        blocks = split_blocks("Just a paragraph.\n")
        assert len(blocks) == 1
        assert blocks[0].kind == "paragraph"

    def test_list(self):
        blocks = split_blocks("- one\n- two\n")
        assert len(blocks) == 1
        assert blocks[0].kind == "list"

    def test_blockquote(self):
        blocks = split_blocks("> quoted\n> more\n")
        assert len(blocks) == 1
        assert blocks[0].kind == "blockquote"

    def test_code_fence(self):
        blocks = split_blocks("```python\nprint(1)\n```\n")
        assert len(blocks) == 1
        assert blocks[0].kind == "code"

    def test_code_fence_with_heading_inside_not_recognized(self):
        # 围栏内的 # 不应被识别为 heading
        blocks = split_blocks("```\n# not heading\n```\n")
        assert len(blocks) == 1
        assert blocks[0].kind == "code"

    def test_table(self):
        text = "| a | b |\n|---|---|\n| 1 | 2 |\n"
        blocks = split_blocks(text)
        assert len(blocks) == 1
        assert blocks[0].kind == "table"

    def test_figure(self):
        blocks = split_blocks("![caption](image.png)\n")
        assert len(blocks) == 1
        assert blocks[0].kind == "figure"

    def test_hr(self):
        blocks = split_blocks("---\n")
        assert len(blocks) == 1
        assert blocks[0].kind == "hr"

    def test_mixed(self):
        text = "# Title\n\nIntro paragraph.\n\n## Section\n\n- item 1\n- item 2\n"
        blocks = split_blocks(text)
        kinds = [b.kind for b in blocks]
        assert kinds == ["heading", "paragraph", "heading", "list"]

    def test_char_offsets_align(self):
        # split_blocks 报的 char_start/char_end 必须能切出原文
        text = "# Title\n\nBody text.\n"
        blocks = split_blocks(text)
        for b in blocks:
            assert text[b.char_start : b.char_end + 1].strip() == b.text.strip() or \
                   text[b.char_start : b.char_end].strip() == b.text.strip()


class TestBuildOutline:
    def test_nested_sections(self):
        text = "# H1\n\n## H2a\n\n### H3\n\n## H2b\n"
        blocks = split_blocks(text)
        # 给 heading 分配 anchor 让 outline 能识别
        for i, b in enumerate(blocks):
            if b.kind == "heading":
                b.anchor = f"h-{b.level}-{i}-test{i:02d}"
        outline = build_outline(blocks, len(text))
        sections = outline["sections"]
        assert len(sections) == 1  # 一个顶层 H1
        h1 = sections[0]
        assert h1.title == "H1"
        assert len(h1.children) == 2  # H2a, H2b
        assert h1.children[0].title == "H2a"
        assert len(h1.children[0].children) == 1  # H3
        assert h1.children[1].title == "H2b"

    def test_find_section_by_anchor(self):
        text = "# H1\n\n## H2\n"
        blocks = split_blocks(text)
        for i, b in enumerate(blocks):
            if b.kind == "heading":
                b.anchor = f"h-{b.level}-{i}-abc"
        outline = build_outline(blocks, len(text))
        sec = find_section_by_anchor(outline["sections"], "h-2-1-abc")
        assert sec is not None
        assert sec.title == "H2"

    def test_find_section_by_title_case_insensitive(self):
        text = "# Hello World\n"
        blocks = split_blocks(text)
        for b in blocks:
            if b.kind == "heading":
                b.anchor = "h-1-1-test"
        outline = build_outline(blocks, len(text))
        sec = find_section_by_title(outline["sections"], "hello world")
        assert sec is not None
        sec = find_section_by_title(outline["sections"], "HELLO  WORLD")  # 多空格
        assert sec is not None
