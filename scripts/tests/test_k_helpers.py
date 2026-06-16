"""k.py 工具函数单元测试。

覆盖：mask_code_spans / normalize_link_target / _expand_braces /
_split_scope_top_level / _glob_scope_to_paths / validate_frontmatter。

后两个依赖 PROJECT_ROOT，用 fake_kb fixture 隔离。
"""
from __future__ import annotations

from pathlib import Path

import pytest

import k
from conftest import write_md, standard_fm


# ============================================================
# mask_code_spans
# ============================================================

class TestMaskCodeSpans:
    def test_empty(self):
        assert k.mask_code_spans("") == ""

    def test_no_code(self):
        assert k.mask_code_spans("just text") == "just text"

    def test_inline_code_preserves_length(self):
        text = "before `code` after"
        out = k.mask_code_spans(text)
        assert len(out) == len(text)
        assert "code" not in out

    def test_inline_code_preserves_offsets(self):
        # 偏移必须保留以维持行号准确
        text = "x `[[a]]` y"
        out = k.mask_code_spans(text)
        assert len(out) == len(text)
        # `[[a]]` 应被掩码，但 'x' 和 'y' 保留
        assert out[0] == "x"
        assert out[-1] == "y"

    def test_fenced_code_block(self):
        text = "before\n```\n[[link]]\n```\nafter"
        out = k.mask_code_spans(text)
        assert len(out) == len(text)
        assert "before" in out
        assert "after" in out
        assert "[[link]]" not in out

    def test_fenced_preserves_newlines(self):
        # 围栏代码块内换行必须保留，否则行号会乱
        text = "a\n```\nx\ny\n```\nb"
        out = k.mask_code_spans(text)
        assert out.count("\n") == text.count("\n")


# ============================================================
# normalize_link_target
# ============================================================

class TestNormalizeLinkTarget:
    def test_adds_md_suffix(self):
        assert k.normalize_link_target("wiki/concepts/foo") == "wiki/concepts/foo.md"

    def test_keeps_md_suffix(self):
        assert k.normalize_link_target("wiki/concepts/foo.md") == "wiki/concepts/foo.md"

    def test_strips_whitespace(self):
        assert k.normalize_link_target("  wiki/foo  ") == "wiki/foo.md"


# ============================================================
# _expand_braces
# ============================================================

class TestExpandBraces:
    def test_no_braces(self):
        assert k._expand_braces("wiki/foo") == ["wiki/foo"]

    def test_single_brace(self):
        result = k._expand_braces("wiki/{a,b,c}")
        assert result == ["wiki/a", "wiki/b", "wiki/c"]

    def test_brace_with_spaces(self):
        # 选项前后空格应被去掉
        result = k._expand_braces("wiki/{a, b , c}")
        assert result == ["wiki/a", "wiki/b", "wiki/c"]

    def test_nested_braces_not_supported(self):
        # 嵌套 brace 当前实现不保证去重 — 见 _expand_braces docstring
        # 仅守住"不抛异常 + 至少包含每个原子选项"
        result = k._expand_braces("wiki/{x,{a,b}}")
        assert "wiki/x" in result
        assert "wiki/a" in result
        assert "wiki/b" in result

    def test_multiple_braces_sequential(self):
        # 多个 brace 顺序展开
        result = k._expand_braces("{a,b}/{x,y}")
        assert sorted(result) == sorted(["a/x", "a/y", "b/x", "b/y"])


# ============================================================
# _split_scope_top_level
# ============================================================

class TestSplitScopeTopLevel:
    def test_single(self):
        assert k._split_scope_top_level("wiki/concepts/*") == ["wiki/concepts/*"]

    def test_multiple_no_braces(self):
        result = k._split_scope_top_level("wiki/concepts/*, wiki/entities/*")
        assert result == ["wiki/concepts/*", "wiki/entities/*"]

    def test_brace_internal_comma_not_split(self):
        """关键 bug 修复点：scope.split(',') 会把 brace 内逗号也切，导致
        `wiki/concepts/{rlhf,dpo}` 变成 `wiki/concepts/{rlhf` + `dpo}`。
        """
        result = k._split_scope_top_level("wiki/concepts/{rlhf,dpo,tool_use}")
        assert result == ["wiki/concepts/{rlhf,dpo,tool_use}"]

    def test_mixed_brace_and_top_level(self):
        result = k._split_scope_top_level(
            "wiki/concepts/*, wiki/entities/{a,b,c}, wiki/sources/*"
        )
        assert result == [
            "wiki/concepts/*",
            "wiki/entities/{a,b,c}",
            "wiki/sources/*",
        ]

    def test_empty_segments_dropped(self):
        result = k._split_scope_top_level("wiki/a, , wiki/b")
        assert result == ["wiki/a", "wiki/b"]


# ============================================================
# _glob_scope_to_paths
# ============================================================

class TestGlobScopeToPaths:
    def _setup_files(self, root: Path):
        """在 root/wiki/ 下放几个 .md 文件供 glob 测试。"""
        for name in ["alpha", "beta", "gamma"]:
            (root / "wiki" / "concepts" / f"{name}.md").write_text("x", encoding="utf-8")
        for name in ["openai", "anthropic"]:
            (root / "wiki" / "entities" / f"{name}.md").write_text("x", encoding="utf-8")

    def test_directory_star(self, fake_kb):
        self._setup_files(fake_kb)
        paths = k._glob_scope_to_paths("wiki/concepts/*")
        assert paths == {
            "wiki/concepts/alpha.md",
            "wiki/concepts/beta.md",
            "wiki/concepts/gamma.md",
        }

    def test_recursive_double_star(self, fake_kb):
        self._setup_files(fake_kb)
        paths = k._glob_scope_to_paths("wiki/**")
        # 递归命中所有 .md
        assert "wiki/concepts/alpha.md" in paths
        assert "wiki/entities/openai.md" in paths

    def test_brace_expansion(self, fake_kb):
        self._setup_files(fake_kb)
        paths = k._glob_scope_to_paths("wiki/concepts/{alpha,beta}")
        assert paths == {
            "wiki/concepts/alpha.md",
            "wiki/concepts/beta.md",
        }

    def test_multiple_patterns(self, fake_kb):
        self._setup_files(fake_kb)
        paths = k._glob_scope_to_paths("wiki/concepts/*, wiki/entities/*")
        assert "wiki/concepts/alpha.md" in paths
        assert "wiki/entities/openai.md" in paths

    def test_explicit_md_file(self, fake_kb):
        self._setup_files(fake_kb)
        paths = k._glob_scope_to_paths("wiki/concepts/alpha.md")
        assert paths == {"wiki/concepts/alpha.md"}

    def test_skips_templates(self, fake_kb):
        self._setup_files(fake_kb)
        # 加一个 _templates 文件，应被跳过
        (fake_kb / "wiki" / "_templates").mkdir()
        (fake_kb / "wiki" / "_templates" / "tpl.md").write_text("x", encoding="utf-8")
        paths = k._glob_scope_to_paths("wiki/**")
        assert "wiki/_templates/tpl.md" not in paths


# ============================================================
# validate_frontmatter
# ============================================================

class TestWikilinkRegexSync:
    """守 #6 修复：k.py WIKILINK_RE 必须与 web/lib/markdown.ts 字面同步。

    任何一边改了正则但忘了同步另一边，本测试会失败。
    """

    def test_k_py_and_web_wikilink_regex_identical(self):
        from pathlib import Path
        import re as _re

        # 项目根 = scripts/ 的父目录（conftest.py 已把 scripts/ 加入 sys.path）
        project_root = Path(__file__).resolve().parent.parent.parent
        web_md = project_root / "web" / "lib" / "markdown.ts"
        if not web_md.exists():
            pytest.skip(f"找不到 web/lib/markdown.ts，跳过同步检查")

        text = web_md.read_text(encoding="utf-8")
        # 抓 export const WIKILINK_RE = /<pattern>/g;
        m = _re.search(
            r"export\s+const\s+WIKILINK_RE\s*=\s*/(.+?)/[gimsuy]*\s*;",
            text,
        )
        assert m, "在 web/lib/markdown.ts 中找不到 WIKILINK_RE 定义"
        web_pattern = m.group(1)

        py_pattern = k.WIKILINK_RE.pattern
        assert py_pattern == web_pattern, (
            f"k.py WIKILINK_RE 与 web/lib/markdown.ts 不一致：\n"
            f"  k.py:  {py_pattern}\n"
            f"  web:   {web_pattern}\n"
            f"任意一边改了正则必须同步另一边——见两处的 '同步约束' 注释。"
        )


class TestRelationTypesSync:
    """守 v0.4b 图谱：k.py RELATION_TYPES 必须与 web/lib/markdown.ts 字面同步。

    任何一边加 / 删 / 改了关系类型但忘了同步另一边，本测试会失败。
    """

    def test_k_py_and_web_relation_types_identical(self):
        from pathlib import Path
        import re as _re

        project_root = Path(__file__).resolve().parent.parent.parent
        web_md = project_root / "web" / "lib" / "markdown.ts"
        if not web_md.exists():
            pytest.skip("找不到 web/lib/markdown.ts，跳过同步检查")

        text = web_md.read_text(encoding="utf-8")
        # 抓 export const RELATION_TYPES = new Set<string>([ ...字符串字面值... ])
        m = _re.search(
            r"export\s+const\s+RELATION_TYPES\s*=\s*new\s+Set<string>\(\s*\[(.+?)\]\s*\)",
            text,
            _re.DOTALL,
        )
        assert m, "在 web/lib/markdown.ts 中找不到 RELATION_TYPES 定义"
        # 抽所有 "XXX" 字面值（忽略注释 // ...）
        body = _re.sub(r"//[^\n]*", "", m.group(1))
        web_types = set(_re.findall(r'"([A-Z_]+)"', body))

        py_types = set(k.RELATION_TYPES)
        assert py_types == web_types, (
            f"k.py RELATION_TYPES 与 web/lib/markdown.ts 不一致：\n"
            f"  仅在 k.py:  {sorted(py_types - web_types)}\n"
            f"  仅在 web:   {sorted(web_types - py_types)}\n"
            f"任意一边改了集合必须同步另一边——见两处的 '同步约束' 注释。"
        )


class TestSplitAliasOrRelation:
    """[[X|Y]] 第三组的别名 / 关系判别。"""

    def test_alias_chinese(self):
        alias, relation = k.split_alias_or_relation("注意力机制")
        assert alias == "注意力机制"
        assert relation is None

    def test_alias_lowercase(self):
        alias, relation = k.split_alias_or_relation("see also")
        assert alias == "see also"
        assert relation is None

    def test_relation_in_whitelist(self):
        alias, relation = k.split_alias_or_relation("SUPPORTS")
        assert alias is None
        assert relation == "SUPPORTS"

    def test_relation_with_underscore(self):
        alias, relation = k.split_alias_or_relation("IS_A")
        assert alias is None
        assert relation == "IS_A"

    def test_unknown_uppercase_is_alias(self):
        # 全大写但不在白名单 → 视为别名（不会误判 RFC / API 等缩写）
        alias, relation = k.split_alias_or_relation("RFC")
        assert alias == "RFC"
        assert relation is None

    def test_misspelled_relation_is_alias(self):
        # 拼写错误也走 alias 路径（list-relation-issues 才是真正捕捉处）
        alias, relation = k.split_alias_or_relation("SUPORTS")
        assert alias == "SUPORTS"
        assert relation is None

    def test_none(self):
        alias, relation = k.split_alias_or_relation(None)
        assert alias is None
        assert relation is None

    def test_trim_whitespace_for_relation(self):
        # 写 [[X| SUPPORTS ]] 也应识别为关系
        alias, relation = k.split_alias_or_relation(" SUPPORTS ")
        assert relation == "SUPPORTS"
        assert alias is None


class TestParseWikilinks:
    """parse_wikilinks 返回 namedtuple 的契约。"""

    def test_plain(self):
        links = k.parse_wikilinks("see [[wiki/concepts/foo]]")
        assert len(links) == 1
        link = links[0]
        assert link.target == "wiki/concepts/foo"
        assert link.anchor is None
        assert link.alias is None
        assert link.relation is None

    def test_with_alias(self):
        links = k.parse_wikilinks("see [[wiki/concepts/foo|友好名]]")
        assert links[0].alias == "友好名"
        assert links[0].relation is None

    def test_with_relation(self):
        links = k.parse_wikilinks("[[wiki/concepts/foo|SUPPORTS]]")
        assert links[0].alias is None
        assert links[0].relation == "SUPPORTS"

    def test_with_anchor_and_relation(self):
        links = k.parse_wikilinks("[[wiki/concepts/foo#^p-3-abc|REFUTES]]")
        link = links[0]
        assert link.target == "wiki/concepts/foo"
        assert link.anchor == "^p-3-abc"
        assert link.relation == "REFUTES"

    def test_supports_tuple_unpack(self):
        # 兼容性：namedtuple 仍支持 4-tuple 解构
        links = k.parse_wikilinks("[[X|SUPPORTS]]")
        target, anchor, alias, relation = links[0]
        assert target == "X"
        assert relation == "SUPPORTS"


class TestValidateFrontmatter:
    def test_valid_concept_page(self, fake_kb):
        path = fake_kb / "wiki" / "concepts" / "ok.md"
        write_md(path, standard_fm(), "# Test\n\nbody.\n")
        result = k.validate_frontmatter(path)
        assert result["valid"] is True
        assert result["errors"] == []
        # warnings 字段应存在（可空）
        assert "warnings" in result

    def test_missing_required_field(self, fake_kb):
        path = fake_kb / "wiki" / "concepts" / "bad.md"
        fm = standard_fm()
        del fm["confidence"]
        write_md(path, fm, "body.\n")
        result = k.validate_frontmatter(path)
        assert result["valid"] is False
        assert any("confidence" in e for e in result["errors"])

    def test_invalid_status_enum(self, fake_kb):
        path = fake_kb / "wiki" / "concepts" / "bad.md"
        write_md(path, standard_fm(status="published"), "body.\n")
        result = k.validate_frontmatter(path)
        assert result["valid"] is False
        assert any("status" in e for e in result["errors"])

    def test_index_requires_scope_and_page_count(self, fake_kb):
        path = fake_kb / "wiki" / "indexes" / "bad_index.md"
        write_md(path, standard_fm(type="index"), "body.\n")
        result = k.validate_frontmatter(path)
        assert result["valid"] is False
        errs = " ".join(result["errors"])
        assert "scope" in errs
        assert "page_count" in errs

    def test_index_page_count_drift_warning(self, fake_kb):
        # 建一个 index + 实际有 2 个页面但声明 page_count: 5
        (fake_kb / "wiki" / "concepts" / "a.md").write_text("x", encoding="utf-8")
        (fake_kb / "wiki" / "concepts" / "b.md").write_text("x", encoding="utf-8")
        path = fake_kb / "wiki" / "indexes" / "ix.md"
        fm = standard_fm(type="index")
        fm["scope"] = "wiki/concepts/*"
        fm["page_count"] = 5
        write_md(path, fm, "body.\n")
        result = k.validate_frontmatter(path)
        assert result["valid"] is True  # warning 不阻塞 valid
        warnings = result.get("warnings") or []
        assert len(warnings) >= 1
        assert any("page_count drift" in w for w in warnings)
        assert any("声明 5" in w and "实际匹配 2" in w for w in warnings)

    def test_index_page_count_aligned_no_warning(self, fake_kb):
        (fake_kb / "wiki" / "concepts" / "a.md").write_text("x", encoding="utf-8")
        (fake_kb / "wiki" / "concepts" / "b.md").write_text("x", encoding="utf-8")
        path = fake_kb / "wiki" / "indexes" / "ix.md"
        fm = standard_fm(type="index")
        fm["scope"] = "wiki/concepts/*"
        fm["page_count"] = 2
        write_md(path, fm, "body.\n")
        result = k.validate_frontmatter(path)
        assert result["valid"] is True
        assert not (result.get("warnings") or [])

    def test_iso_date_format_invalid_warns(self, fake_kb):
        # 用 raw 写入来避开 standard_fm 自动生成的合法日期
        path = fake_kb / "wiki" / "concepts" / "bad_date.md"
        raw = (
            "---\n"
            "title: x\n"
            "type: concept\n"
            "created_date: '昨天'\n"
            "last_modified: '2026-13-01'\n"
            "last_modified_by: LLM\n"
            "status: draft\n"
            "confidence: high\n"
            "source_count: 0\n"
            "sources: []\n"
            "tags: []\n"
            "---\n"
            "body\n"
        )
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(raw, encoding="utf-8")
        result = k.validate_frontmatter(path)
        warnings = result.get("warnings") or []
        assert any("created_date" in w for w in warnings)
        assert any("last_modified" in w for w in warnings)


# ============================================================
# resolve_doc_path / _safe_join_under_root（路径越界防护）
# ============================================================

class TestResolveDocPath:
    """安全攻面：web 端 ?path=... 直接喂 k.py，必须挡 path traversal。"""

    def test_normal_relative_path(self, fake_kb):
        target = fake_kb / "wiki" / "x.md"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text("x", encoding="utf-8")
        p = k.resolve_doc_path("wiki/x.md")
        assert p == target

    def test_auto_md_suffix(self, fake_kb):
        target = fake_kb / "wiki" / "y.md"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text("x", encoding="utf-8")
        p = k.resolve_doc_path("wiki/y")
        assert p.suffix == ".md"

    def test_dotdot_escape_blocked(self, fake_kb):
        with pytest.raises(ValueError, match="越界"):
            k.resolve_doc_path("../../etc/passwd")

    def test_absolute_path_blocked(self, fake_kb):
        with pytest.raises(ValueError, match="越界"):
            k.resolve_doc_path("/etc/passwd" if not __import__("sys").platform.startswith("win") else "C:/Windows/notepad.exe")

    def test_dotdot_inside_root_ok(self, fake_kb):
        # wiki/concepts/../sources/x.md 实际指向 wiki/sources/x.md，仍在 root 内
        target = fake_kb / "wiki" / "sources" / "ok.md"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text("x", encoding="utf-8")
        p = k.resolve_doc_path("wiki/concepts/../sources/ok.md")
        assert p.resolve() == target.resolve()


class TestSafeJoinUnderRoot:
    def test_normal(self, fake_kb):
        p = k._safe_join_under_root("raw/foo.md")
        assert p is not None
        assert p == (fake_kb / "raw" / "foo.md").resolve()

    def test_empty_rejected(self, fake_kb):
        assert k._safe_join_under_root("") is None
        assert k._safe_join_under_root(None) is None  # type: ignore[arg-type]

    def test_dotdot_rejected(self, fake_kb):
        assert k._safe_join_under_root("raw/../../etc/passwd") is None
        assert k._safe_join_under_root("../outside") is None

    def test_absolute_rejected(self, fake_kb):
        assert k._safe_join_under_root("/etc/passwd") is None

    def test_inside_dotdot_ok(self, fake_kb):
        # 拼接结果仍在 root 内 → 允许
        p = k._safe_join_under_root("raw/articles/../assets/x.png")
        assert p is not None
