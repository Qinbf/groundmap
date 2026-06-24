"""pytest 全局配置：把 scripts/ 加入 sys.path，并提供共享 fixture。

测试运行：从项目根 `python -m pytest scripts/tests/ -v`。
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

# 让测试文件能直接 `import k` / `import section_parser` / `import postprocess`
SCRIPTS_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SCRIPTS_DIR))


@pytest.fixture
def fake_kb(tmp_path, monkeypatch):
    """搭一个最小知识库目录结构在 tmp_path 下，并把 k.py 的全局
    PROJECT_ROOT / WIKI_DIR / RAW_DIR 重定向到它。

    返回 tmp_path（项目根）。测试可以直接往 wiki/ / raw/ 写文件。
    """
    import k

    (tmp_path / "wiki" / "concepts").mkdir(parents=True)
    (tmp_path / "wiki" / "entities").mkdir(parents=True)
    (tmp_path / "wiki" / "sources").mkdir(parents=True)
    (tmp_path / "wiki" / "indexes").mkdir(parents=True)
    (tmp_path / "wiki" / "analyses").mkdir(parents=True)
    (tmp_path / "raw" / "papers").mkdir(parents=True)
    (tmp_path / "raw" / "articles").mkdir(parents=True)

    monkeypatch.setattr(k, "PROJECT_ROOT", tmp_path)
    monkeypatch.setattr(k, "WIKI_DIR", tmp_path / "wiki")
    monkeypatch.setattr(k, "RAW_DIR", tmp_path / "raw")
    return tmp_path


def write_md(path: Path, frontmatter_dict: dict, body: str) -> None:
    """便捷工具：写一个标准 wiki .md 文件（含 frontmatter）。"""
    import yaml

    path.parent.mkdir(parents=True, exist_ok=True)
    fm = yaml.safe_dump(frontmatter_dict, allow_unicode=True, sort_keys=False).strip()
    path.write_text(f"---\n{fm}\n---\n\n{body}\n", encoding="utf-8")


def standard_fm(**overrides) -> dict:
    """返回一份合法的最小 frontmatter，可用 overrides 覆盖任意字段。"""
    base = {
        "title": "Test Page",
        "type": "concept",
        "created_date": "2026-05-03",
        "last_modified": "2026-05-03",
        "last_modified_by": "LLM",
        "status": "draft",
        "confidence": "medium",
        "source_count": 0,
        "sources": [],
        "tags": [],
    }
    base.update(overrides)
    return base
