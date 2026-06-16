"""KB_ROOT 解耦：让一份引擎服务"引擎目录之外"的独立项目数据目录。

`DATA_ROOT` 在 import k 时就解析（读 KB_ROOT 环境变量），所以这里用**子进程**
（每次全新进程 + 干净环境）测真实 CLI 行为，而非 import 后改全局。
与 web/lib/kb.ts 的 KB_ROOT 同义：KB_ROOT 指向含 workspaces/ 的数据根。
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

K_PY = Path(__file__).resolve().parent.parent / "k.py"

PAGE_MD = """---
title: "Widget 概念"
type: concept
created_date: 2026-05-29
last_modified: 2026-05-29
last_modified_by: Human
status: draft
confidence: medium
source_count: 0
sources: []
tags: [stub]
---

# Widget

一个用于验证 KB_ROOT 的测试概念。
"""


def _run(args, kb_root=None):
    env = dict(os.environ)
    if kb_root is not None:
        env["KB_ROOT"] = str(kb_root)
    else:
        env.pop("KB_ROOT", None)
    return subprocess.run(
        [sys.executable, str(K_PY), *args],
        capture_output=True,
        text=True,
        env=env,
    )


def _make_external_project(root: Path):
    """在 root 下搭一个 workspaces/proj 数据目录（root 即"项目数据根"）。"""
    concepts = root / "workspaces" / "proj" / "wiki" / "concepts"
    concepts.mkdir(parents=True)
    (concepts / "widget.md").write_text(PAGE_MD, encoding="utf-8")


def test_kb_root_points_engine_at_external_project(tmp_path):
    _make_external_project(tmp_path)
    r = _run(["--workspace", "proj", "health", "--json"], kb_root=tmp_path)
    assert r.returncode == 0, r.stderr
    data = json.loads(r.stdout)
    assert data["total_pages"] == 1
    assert data["by_type"].get("concept") == 1


def test_kb_root_search_reads_external_data(tmp_path):
    _make_external_project(tmp_path)
    r = _run(["--workspace", "proj", "search", "Widget"], kb_root=tmp_path)
    assert r.returncode == 0, r.stderr
    assert "Widget" in r.stdout


def test_kb_root_missing_workspaces_errors_clearly(tmp_path):
    # KB_ROOT 指向一个没有 workspaces/ 子目录的路径 → exit 2 + 清晰报错
    r = _run(["--workspace", "proj", "health"], kb_root=tmp_path)
    assert r.returncode == 2
    assert "workspaces/" in r.stderr
