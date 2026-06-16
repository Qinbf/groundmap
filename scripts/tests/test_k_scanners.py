"""k.py 健康度扫描器测试（在临时知识库上跑）。

覆盖：list_bare_claims / list_broken_refs / list_index_count_mismatches /
find_orphans / find_to_update / find_conflicts。
"""
from __future__ import annotations

from pathlib import Path

import pytest

import k
from conftest import write_md, standard_fm


# ============================================================
# list_bare_claims
# ============================================================

class TestListBareClaims:
    def test_empty_kb_no_hits(self, fake_kb):
        pages = k.load_all_wiki_pages()
        assert k.list_bare_claims(pages) == []

    def test_paragraph_with_percentage_no_ref(self, fake_kb):
        write_md(
            fake_kb / "wiki" / "concepts" / "p1.md",
            standard_fm(),
            "# X\n\n准确率达到 95.3% 是个突破。\n",
        )
        pages = k.load_all_wiki_pages()
        items = k.list_bare_claims(pages)
        assert len(items) == 1
        assert "95.3%" in items[0]["matched"]

    def test_paragraph_with_raw_ref_skipped(self, fake_kb):
        write_md(
            fake_kb / "wiki" / "concepts" / "p1.md",
            standard_fm(),
            "# X\n\n准确率达到 95.3% [[raw/papers/foo#^p-1-abc]]。\n",
        )
        pages = k.load_all_wiki_pages()
        items = k.list_bare_claims(pages)
        assert items == []

    def test_paragraph_with_wiki_sources_ref_skipped(self, fake_kb):
        # [[wiki/sources/...]] 也算合法支撑（中介层）
        write_md(
            fake_kb / "wiki" / "concepts" / "p1.md",
            standard_fm(),
            "# X\n\n参数 175B 见 [[wiki/sources/foo]]。\n",
        )
        pages = k.load_all_wiki_pages()
        items = k.list_bare_claims(pages)
        assert items == []

    def test_paragraph_with_need_source_marker_skipped(self, fake_kb):
        write_md(
            fake_kb / "wiki" / "concepts" / "p1.md",
            standard_fm(),
            "# X\n\n准确率 95.3% [需要来源]。\n",
        )
        pages = k.load_all_wiki_pages()
        items = k.list_bare_claims(pages)
        assert items == []

    def test_index_pages_skipped(self, fake_kb):
        fm = standard_fm(type="index")
        fm["scope"] = "wiki/**"
        fm["page_count"] = 0
        write_md(
            fake_kb / "wiki" / "indexes" / "ix.md",
            fm,
            "# Index\n\n2017 年起 30+ 个页面.\n",
        )
        pages = k.load_all_wiki_pages()
        items = k.list_bare_claims(pages)
        assert items == []

    def test_lint_tag_pages_skipped(self, fake_kb):
        fm = standard_fm(type="analysis")
        fm["tags"] = ["lint", "周报"]
        write_md(
            fake_kb / "wiki" / "analyses" / "weekly.md",
            fm,
            "# 周报\n\n本周 30 个页面，5 处冲突。\n",
        )
        pages = k.load_all_wiki_pages()
        items = k.list_bare_claims(pages)
        assert items == []

    def test_demo_data_tag_pages_skipped(self, fake_kb):
        fm = standard_fm(type="source_summary")
        fm["tags"] = ["demo-data"]
        write_md(
            fake_kb / "wiki" / "sources" / "demo.md",
            fm,
            "# Demo\n\n准确率 95% 数据是假的.\n",
        )
        pages = k.load_all_wiki_pages()
        items = k.list_bare_claims(pages)
        assert items == []

    def test_year_pattern(self, fake_kb):
        write_md(
            fake_kb / "wiki" / "concepts" / "p.md",
            standard_fm(),
            "# X\n\nAnthropic 2022 年提出宪法 AI。\n",
        )
        pages = k.load_all_wiki_pages()
        items = k.list_bare_claims(pages)
        assert len(items) == 1
        assert any("2022 年" in m for m in items[0]["matched"])

    def test_param_size_pattern(self, fake_kb):
        write_md(
            fake_kb / "wiki" / "concepts" / "p.md",
            standard_fm(),
            "# X\n\nGPT-3 有 175B 参数。\n",
        )
        pages = k.load_all_wiki_pages()
        items = k.list_bare_claims(pages)
        assert len(items) == 1
        assert "175B" in items[0]["matched"][0]


# ============================================================
# list_broken_refs
# ============================================================

class TestListBrokenRefs:
    def test_no_refs(self, fake_kb):
        write_md(
            fake_kb / "wiki" / "concepts" / "p.md",
            standard_fm(),
            "# X\n\nbody.\n",
        )
        assert k.list_broken_refs(k.load_all_wiki_pages()) == []

    def test_raw_file_missing(self, fake_kb):
        write_md(
            fake_kb / "wiki" / "concepts" / "p.md",
            standard_fm(),
            "# X\n\nClaim [[raw/papers/foo#^p-1-abc]].\n",
        )
        items = k.list_broken_refs(k.load_all_wiki_pages())
        assert len(items) == 1
        assert items[0]["reason"] == "raw 文件不存在"
        assert items[0]["target"] == "raw/papers/foo.md"
        assert items[0]["anchor"] == "p-1-abc"

    def test_anchor_missing(self, fake_kb):
        # raw 文件存在，但锚点不存在
        raw = fake_kb / "raw" / "papers" / "foo.md"
        raw.write_text("# Title ^h-1-1-aaaaaa\n\nbody ^p-1-bbbbbb\n", encoding="utf-8")
        write_md(
            fake_kb / "wiki" / "concepts" / "p.md",
            standard_fm(),
            "# X\n\nClaim [[raw/papers/foo#^p-99-zzzzzz]].\n",
        )
        items = k.list_broken_refs(k.load_all_wiki_pages())
        assert len(items) == 1
        assert items[0]["reason"] == "anchor 不存在"

    def test_anchor_present(self, fake_kb):
        raw = fake_kb / "raw" / "papers" / "foo.md"
        raw.write_text("# Title ^h-1-1-aaaaaa\n\nbody ^p-1-bbbbbb\n", encoding="utf-8")
        write_md(
            fake_kb / "wiki" / "concepts" / "p.md",
            standard_fm(),
            "# X\n\nClaim [[raw/papers/foo#^p-1-bbbbbb]].\n",
        )
        items = k.list_broken_refs(k.load_all_wiki_pages())
        assert items == []

    def test_wiki_internal_broken_ref_checked(self, fake_kb):
        # k-3：wiki -> wiki 的 ^anchor 失效现在也会被检出（目标文件不存在）
        write_md(
            fake_kb / "wiki" / "concepts" / "p.md",
            standard_fm(),
            "# X\n\n[[wiki/concepts/nonexistent#^p-1-abc]].\n",
        )
        items = k.list_broken_refs(k.load_all_wiki_pages())
        assert len(items) == 1
        assert items[0]["from_path"] == "wiki/concepts/p.md"
        assert "nonexistent" in items[0]["target"]
        assert items[0]["reason"] == "wiki 文件不存在"

    def test_wiki_internal_pure_pagelink_ok(self, fake_kb):
        # 无 ^anchor 的纯页面链接（指向不存在文件）不在 broken-refs 范围（属孤儿/出链维度）
        write_md(
            fake_kb / "wiki" / "concepts" / "src.md",
            standard_fm(),
            "# Src\n\n[[wiki/concepts/whatever]].\n",
        )
        items = k.list_broken_refs(k.load_all_wiki_pages())
        assert items == []


# ============================================================
# list_index_count_mismatches
# ============================================================

class TestListIndexCountMismatches:
    def test_no_indexes(self, fake_kb):
        assert k.list_index_count_mismatches(k.load_all_wiki_pages()) == []

    def test_aligned_index(self, fake_kb):
        (fake_kb / "wiki" / "concepts" / "a.md").write_text("x", encoding="utf-8")
        (fake_kb / "wiki" / "concepts" / "b.md").write_text("x", encoding="utf-8")
        fm = standard_fm(type="index")
        fm["scope"] = "wiki/concepts/*"
        fm["page_count"] = 2
        write_md(fake_kb / "wiki" / "indexes" / "ix.md", fm, "body.\n")
        assert k.list_index_count_mismatches(k.load_all_wiki_pages()) == []

    def test_drift_positive_delta(self, fake_kb):
        # scope 实际多于声明
        for n in ["a", "b", "c"]:
            (fake_kb / "wiki" / "concepts" / f"{n}.md").write_text("x", encoding="utf-8")
        fm = standard_fm(type="index")
        fm["scope"] = "wiki/concepts/*"
        fm["page_count"] = 1
        write_md(fake_kb / "wiki" / "indexes" / "ix.md", fm, "body.\n")
        items = k.list_index_count_mismatches(k.load_all_wiki_pages())
        assert len(items) == 1
        assert items[0]["declared_page_count"] == 1
        assert items[0]["actual_count"] == 3
        assert items[0]["delta"] == 2

    def test_self_excluded(self, fake_kb):
        # 索引自身不应被算进 scope
        fm = standard_fm(type="index")
        fm["scope"] = "wiki/**"
        # 只有这一个 index 文件，scope 排除自己后应得 0
        fm["page_count"] = 0
        write_md(fake_kb / "wiki" / "indexes" / "ix.md", fm, "body.\n")
        items = k.list_index_count_mismatches(k.load_all_wiki_pages())
        assert items == []  # actual=0, declared=0 → 不算 drift


# ============================================================
# find_orphans / find_to_update / find_conflicts
# ============================================================

class TestFindOrphans:
    def test_orphan_when_no_inlinks(self, fake_kb):
        write_md(fake_kb / "wiki" / "concepts" / "lone.md", standard_fm(), "body.\n")
        pages = k.load_all_wiki_pages()
        backlinks = k.build_link_graph(pages)
        orphans = k.find_orphans(pages, backlinks)
        # lone 是孤儿
        assert any(o.path == "wiki/concepts/lone.md" for o in orphans)

    def test_root_index_excluded(self, fake_kb):
        # root_index.md 即使没人 link 也不算孤儿
        fm = standard_fm(type="index")
        fm["scope"] = "wiki/**"
        fm["page_count"] = 0
        write_md(fake_kb / "wiki" / "root_index.md", fm, "body.\n")
        pages = k.load_all_wiki_pages()
        backlinks = k.build_link_graph(pages)
        orphans = k.find_orphans(pages, backlinks)
        assert all(o.path != "wiki/root_index.md" for o in orphans)

    def test_not_orphan_when_linked(self, fake_kb):
        write_md(fake_kb / "wiki" / "concepts" / "a.md", standard_fm(), "body.\n")
        write_md(
            fake_kb / "wiki" / "concepts" / "b.md",
            standard_fm(),
            "see [[wiki/concepts/a]]\n",
        )
        pages = k.load_all_wiki_pages()
        backlinks = k.build_link_graph(pages)
        orphans = k.find_orphans(pages, backlinks)
        # a 不是孤儿（b 链接它）；b 是孤儿
        a_paths = [o.path for o in orphans]
        assert "wiki/concepts/a.md" not in a_paths
        assert "wiki/concepts/b.md" in a_paths


class TestFindToUpdate:
    def test_detects_tag(self, fake_kb):
        write_md(
            fake_kb / "wiki" / "concepts" / "p.md",
            standard_fm(),
            "# X\n\nbody.\n\n#to-be-updated 2026-05-03: needs work\n",
        )
        items = k.find_to_update(k.load_all_wiki_pages())
        assert len(items) == 1
        assert items[0]["path"] == "wiki/concepts/p.md"

    def test_no_tag_no_match(self, fake_kb):
        write_md(
            fake_kb / "wiki" / "concepts" / "p.md",
            standard_fm(),
            "# X\n\nbody.\n",
        )
        assert k.find_to_update(k.load_all_wiki_pages()) == []

    def test_excludes_deprecated(self, fake_kb):
        # deprecated 页面就算带 #to-be-updated 也不应再列入积压
        write_md(
            fake_kb / "wiki" / "concepts" / "old.md",
            standard_fm(status="deprecated"),
            "# X\n\nbody.\n\n#to-be-updated 2026-05-03: legacy\n",
        )
        assert k.find_to_update(k.load_all_wiki_pages()) == []

    def test_skips_fenced_code_block(self, fake_kb):
        # 周报里讨论 #to-be-updated 写法（用代码块），不应触发误报
        write_md(
            fake_kb / "wiki" / "concepts" / "doc.md",
            standard_fm(),
            "# X\n\n示例:\n\n```\n#to-be-updated YYYY-MM-DD: 说明\n```\n",
        )
        assert k.find_to_update(k.load_all_wiki_pages()) == []


class TestListI18nViolations:
    def _make_web(self, root: Path):
        web = root / "web"
        (web / "components").mkdir(parents=True)
        (web / "lib").mkdir(parents=True)
        (web / "app" / "api").mkdir(parents=True)
        return web

    def test_no_violations_in_clean_file(self, fake_kb):
        web = self._make_web(fake_kb)
        (web / "components" / "Good.tsx").write_text(
            'import {useT} from "x";\n'
            'export function Good() {\n'
            '  const t = useT();\n'
            '  return <span>{t("hello.world")}</span>;\n'
            '}\n',
            encoding="utf-8",
        )
        items = k.list_i18n_violations(web)
        assert items == []

    def test_jsx_text_chinese_caught(self, fake_kb):
        web = self._make_web(fake_kb)
        (web / "components" / "Bad.tsx").write_text(
            'export function Bad() {\n'
            '  return <button>保存修改</button>;\n'
            '}\n',
            encoding="utf-8",
        )
        items = k.list_i18n_violations(web)
        assert len(items) == 1
        assert items[0]["kind"] == "jsx_text"
        assert items[0]["text"] == "保存修改"

    def test_attr_chinese_caught(self, fake_kb):
        web = self._make_web(fake_kb)
        (web / "components" / "Bad.tsx").write_text(
            'export function Bad() {\n'
            '  return <input placeholder="输入查询" />;\n'
            '}\n',
            encoding="utf-8",
        )
        items = k.list_i18n_violations(web)
        assert len(items) == 1
        assert items[0]["kind"] == "attr:placeholder"
        assert items[0]["text"] == "输入查询"

    def test_aria_label_attr_caught(self, fake_kb):
        web = self._make_web(fake_kb)
        (web / "components" / "Bad.tsx").write_text(
            '<button aria-label="关闭对话框" />\n',
            encoding="utf-8",
        )
        items = k.list_i18n_violations(web)
        assert any(it["kind"] == "attr:aria-label" for it in items)

    def test_comment_chinese_skipped(self, fake_kb):
        web = self._make_web(fake_kb)
        (web / "components" / "Comm.tsx").write_text(
            '// 这是单行注释里的中文，不应被捕获\n'
            '/* 多行注释\n   也含中文\n   都跳过 */\n'
            'export function X() { return <div>{label}</div>; }\n',
            encoding="utf-8",
        )
        items = k.list_i18n_violations(web)
        assert items == []

    def test_t_call_argument_skipped(self, fake_kb):
        # t("...") / useT()("...") 内的字符串是合法 i18n key，不算违规
        # （我们的扫描器只看 JSX text 与白名单 UI 属性，不扫所有 string literal，
        # 所以 t("中文键") 这种字符串本身就不在扫描范围内）
        web = self._make_web(fake_kb)
        (web / "components" / "T.tsx").write_text(
            'export function T() { return <span>{t("某个键")}</span>; }\n',
            encoding="utf-8",
        )
        items = k.list_i18n_violations(web)
        assert items == []

    def test_i18n_skip_files(self, fake_kb):
        web = self._make_web(fake_kb)
        # i18n.ts / i18n-client.tsx 在白名单中（基建自身，包含翻译表字面量）
        # 注：LocaleSwitcher 不再豁免——它现在通过 t() / useT() 走翻译表
        (web / "lib" / "i18n.ts").mkdir(parents=True, exist_ok=True) if False else None
        i18n_dir = web / "lib"
        i18n_dir.mkdir(parents=True, exist_ok=True)
        (i18n_dir / "i18n.ts").write_text(
            'export const T = { zh: { x: "中" }, en: { x: "X" } };\n',
            encoding="utf-8",
        )
        items = k.list_i18n_violations(web)
        assert items == []

    def test_api_dir_skipped(self, fake_kb):
        web = self._make_web(fake_kb)
        # web/app/api/ 是 API 路由，response 不是 UI 显示层
        (web / "app" / "api" / "route.tsx").write_text(
            'return <div>缺少参数</div>;\n',
            encoding="utf-8",
        )
        items = k.list_i18n_violations(web)
        assert items == []


class TestFindConflicts:
    def test_detects_warning_block(self, fake_kb):
        body = (
            "# X\n\n"
            "> [!WARNING] 知识更新冲突 — 2026-05-03\n"
            "> **旧观点**：A 准确率 89%\n"
            "> **新证据**：A 仅 82%\n"
            "> **状态**：⏳ 待人类判别\n"
        )
        write_md(fake_kb / "wiki" / "concepts" / "p.md", standard_fm(), body)
        items = k.find_conflicts(k.load_all_wiki_pages())
        assert len(items) == 1
        assert items[0]["path"] == "wiki/concepts/p.md"
        assert "知识更新冲突" in items[0]["block"]

    def test_no_warning_no_match(self, fake_kb):
        write_md(
            fake_kb / "wiki" / "concepts" / "p.md",
            standard_fm(),
            "# X\n\nbody.\n",
        )
        assert k.find_conflicts(k.load_all_wiki_pages()) == []

    def test_skips_fenced_code_block(self, fake_kb):
        # 周报里讨论冲突标注格式（代码块包起来），不应识别为真冲突
        body = (
            "# 模板示例\n\n"
            "标准冲突写法:\n\n"
            "```\n"
            "> [!WARNING] 知识更新冲突 — YYYY-MM-DD\n"
            "> **旧观点**: ...\n"
            "> **新证据**: ...\n"
            "```\n"
        )
        write_md(fake_kb / "wiki" / "concepts" / "doc.md", standard_fm(), body)
        assert k.find_conflicts(k.load_all_wiki_pages()) == []


class TestFindOrphansDeprecated:
    def test_excludes_deprecated_orphan(self, fake_kb):
        # deprecated 页面无入链是合理的，不应列入孤儿
        write_md(
            fake_kb / "wiki" / "concepts" / "old.md",
            standard_fm(status="deprecated"),
            "# old\n\nbody.\n",
        )
        write_md(
            fake_kb / "wiki" / "concepts" / "fresh.md",
            standard_fm(),
            "# fresh\n\nbody.\n",
        )
        pages = k.load_all_wiki_pages()
        backlinks = k.build_link_graph(pages)
        orphans = k.find_orphans(pages, backlinks)
        orphan_paths = [o.path for o in orphans]
        assert "wiki/concepts/old.md" not in orphan_paths
        assert "wiki/concepts/fresh.md" in orphan_paths
