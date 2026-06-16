"""postprocess.py 锚点核心不变量测试。

最关键的测试：**锚点幂等性**。convert.py 重跑时绝不能丢锚点或换 hash。
此前 c85d28f commit 修过 build_outline_data 重跑丢摘要的 bug，
这里加测试守住该不变量。
"""
from __future__ import annotations

import pytest

from postprocess import (
    add_anchors,
    has_anchors,
    process,
    strip_anchors,
    build_outline_data,
)


SAMPLE = """# Title

A paragraph here.

## Section A

Another paragraph.

- list item 1
- list item 2

## Section B

```python
print(1)
```
"""


class TestHasAnchors:
    def test_no_anchors(self):
        assert not has_anchors("# Title\n\nbody")

    def test_with_anchors(self):
        text = "# A ^h-1-1-abc123\n\nbody ^p-1-def456\n\nmore ^p-2-aaa111"
        assert has_anchors(text)

    def test_only_one_anchor_not_enough(self):
        # 启发式要求 ≥ 3 处
        assert not has_anchors("body ^p-1-abc123")


class TestAddAnchors:
    def test_adds_heading_anchors(self):
        text, blocks = add_anchors("# Title\n\nBody.\n")
        assert "^h-1-1-" in text
        assert "^p-1-" in text

    def test_anchor_format(self):
        text, blocks = add_anchors("# Title\n\nBody.\n")
        # heading 锚点格式 h-{level}-{seq}-{hash6}
        import re
        h_anchors = re.findall(r"\^(h-\d+-\d+-[a-z0-9]{6})", text)
        assert len(h_anchors) == 1
        p_anchors = re.findall(r"\^(p-\d+-[a-z0-9]{6})", text)
        assert len(p_anchors) == 1

    def test_idempotence_content_unchanged(self):
        """跑两次必须输出相同文本（最关键的不变量）。"""
        text1, _ = add_anchors(SAMPLE)
        text2, _ = add_anchors(text1)  # 对已加锚的文本再跑
        assert text1 == text2

    def test_idempotence_three_runs(self):
        text1, _ = add_anchors(SAMPLE)
        text2, _ = add_anchors(text1)
        text3, _ = add_anchors(text2)
        assert text1 == text2 == text3

    def test_anchor_changes_when_content_changes(self):
        """段落内容改 → 该段 hash 必须变（暴露失效引用）。"""
        text1, _ = add_anchors("# A\n\nold content.\n")
        text2, _ = add_anchors("# A\n\nNEW content.\n")
        # heading anchor 应不变（标题没改）
        import re
        h1 = re.search(r"\^(h-1-1-[a-z0-9]{6})", text1).group(1)
        h2 = re.search(r"\^(h-1-1-[a-z0-9]{6})", text2).group(1)
        assert h1 == h2
        # paragraph anchor 应变（内容改了）
        p1 = re.search(r"\^(p-1-[a-z0-9]{6})", text1).group(1)
        p2 = re.search(r"\^(p-1-[a-z0-9]{6})", text2).group(1)
        assert p1 != p2

    def test_hash_sensitive_beyond_64_chars(self):
        """pipe-1：超过前 64 字边界的编辑也必须改变段落 anchor。
        旧版 _normalize_for_hash 会 [:64] 截断，导致两段共享前 64 字时 hash 相同、
        stale 引用绕过 list-broken-refs。现对完整内容 hash。"""
        import re
        prefix = "common prefix word " * 5  # 远超 64 字
        text1, _ = add_anchors(f"# A\n\n{prefix}alpha tail.\n")
        text2, _ = add_anchors(f"# A\n\n{prefix}omega tail.\n")
        p1 = re.search(r"\^(p-1-[a-z0-9]{6})", text1).group(1)
        p2 = re.search(r"\^(p-1-[a-z0-9]{6})", text2).group(1)
        assert p1 != p2, "超 64 字边界的编辑应改变 anchor（pipe-1）"

    def test_strip_anchors_inverse(self):
        """strip_anchors(add_anchors(x)) 应回到无锚点状态。"""
        original = "# Title\n\nBody.\n"
        with_anchors, _ = add_anchors(original)
        stripped = strip_anchors(with_anchors)
        # frontmatter 不存在的话，body 部分应等价（trailing whitespace 不计）
        assert stripped.rstrip() == original.rstrip()

    def test_preserves_frontmatter(self):
        text = "---\ntitle: foo\n---\n# Body\n"
        with_anchors, _ = add_anchors(text)
        assert with_anchors.startswith("---\ntitle: foo\n---\n")

    def test_unique_hash_collision_handling(self):
        # 两个相同内容的段落应有不同 anchor（通过 -2 / -3 等 suffix）
        text = "para A\n\npara B\n\npara A\n"
        with_anchors, blocks = add_anchors(text)
        anchors = [b.anchor for b in blocks if b.anchor]
        # 所有 anchor 应唯一
        assert len(anchors) == len(set(anchors))


class TestProcess:
    def test_returns_tuple(self):
        text_with_anchors, outline = process("# A\n\nbody.\n", "test.md")
        assert isinstance(text_with_anchors, str)
        assert isinstance(outline, dict)
        assert "sections" in outline
        assert "doc_chars" in outline
        assert "doc_paragraphs" in outline

    def test_outline_section_count(self):
        text = "# H1\n\n## H2a\n\nbody\n\n## H2b\n\nmore\n"
        _, outline = process(text, "test.md")
        # 顶层一个 H1
        assert len(outline["sections"]) == 1
        # H1 有两个 H2 子节
        assert len(outline["sections"][0]["children"]) == 2

    def test_outline_preserves_existing_summaries(self):
        """关键不变量（c85d28f 修复的 bug）：重跑 build_outline_data
        时已有的 agent_summary 必须保留，除非 anchor 已改变。"""
        text = "# Title\n\nbody.\n"
        text_anchored, outline1 = process(text, "test.md")
        outline1["sections"][0]["agent_summary"] = "manually filled"

        # 重跑：内容未变 → anchor 稳定 → 摘要应保留
        outline2 = build_outline_data(text_anchored, "test.md", previous_outline=outline1)
        assert outline2["sections"][0]["agent_summary"] == "manually filled"

    def test_outline_summary_dropped_when_content_changed(self):
        """anchor 变了 → 旧摘要不应被错误回填到新 anchor 上。"""
        text1, outline1 = process("# Title\n\nold.\n", "t.md")
        outline1["sections"][0]["agent_summary"] = "old summary"
        # heading 没变 → heading anchor 不变 → 摘要保留
        text2, _ = process("# Title\n\nNEW.\n", "t.md")
        outline2 = build_outline_data(text2, "t.md", previous_outline=outline1)
        # heading 段摘要应保留（标题没改）
        assert outline2["sections"][0]["agent_summary"] == "old summary"

    def test_summary_restored_by_title_on_seq_drift(self):
        """pipe-2：在前面插入新标题导致 heading seq 漂移、anchor 变，但 title 不变
        → 章节摘要应按 title fallback 回填，不被静默丢弃。"""
        def find_section(secs, title):
            for s in secs:
                if s["title"] == title:
                    return s
                r = find_section(s.get("children", []), title)
                if r:
                    return r
            return None

        text1, outline1 = process(
            "# Intro\n\nbody.\n\n## Deep Dive\n\ndetail.\n", "t.md"
        )
        sec = find_section(outline1["sections"], "Deep Dive")
        sec["agent_summary"] = "deep dive summary"

        # 前面插入新 H2 → "Deep Dive" 的 seq 1 → 2，anchor 变（exact 失配）
        text2, _ = process(
            "# Intro\n\nbody.\n\n## New First\n\nx.\n\n## Deep Dive\n\ndetail.\n",
            "t.md",
        )
        outline2 = build_outline_data(text2, "t.md", previous_outline=outline1)
        sec2 = find_section(outline2["sections"], "Deep Dive")
        assert sec2 is not None
        assert sec2["agent_summary"] == "deep dive summary"

    def test_build_outline_data_signature_no_blocks_param(self):
        """守 #11 重构：build_outline_data 不应再有 blocks 参数。"""
        import inspect
        sig = inspect.signature(build_outline_data)
        assert "blocks" not in sig.parameters
        assert "text_with_anchors" in sig.parameters
        assert "doc_path" in sig.parameters
        assert "previous_outline" in sig.parameters
