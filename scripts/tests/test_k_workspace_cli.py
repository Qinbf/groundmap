"""k.py workspace 相关 CLI 能力测试。

覆盖：
- strip_workspace_prefix：新手把 `workspaces/<ws>/` 前缀带进 k.py 路径参数时的容错
  （当前库自动剥掉 / 跨库报错 / 无关路径原样放行）
- create_workspace：new-workspace 脚手架（目录骨架 / root_index frontmatter 合规 /
  重名拒绝 / 非法名拒绝）
"""
from __future__ import annotations

from pathlib import Path

import pytest

import k


# ============================================================
# strip_workspace_prefix
# ============================================================

@pytest.fixture
def fake_workspaces(tmp_path, monkeypatch):
    """搭 workspaces/alpha + workspaces/beta 两个库，激活 alpha。"""
    for name in ("alpha", "beta"):
        (tmp_path / "workspaces" / name / "wiki").mkdir(parents=True)
        (tmp_path / "workspaces" / name / "raw").mkdir(parents=True)
    ws = tmp_path / "workspaces" / "alpha"
    monkeypatch.setattr(k, "DATA_ROOT", tmp_path)
    monkeypatch.setattr(k, "PROJECT_ROOT", ws)
    monkeypatch.setattr(k, "WIKI_DIR", ws / "wiki")
    monkeypatch.setattr(k, "RAW_DIR", ws / "raw")
    return tmp_path


class TestStripWorkspacePrefix:
    def test_active_workspace_prefix_stripped(self, fake_workspaces, capsys):
        out = k.strip_workspace_prefix("workspaces/alpha/raw/articles/foo.md")
        assert out == "raw/articles/foo.md"
        assert "已自动剥掉" in capsys.readouterr().err

    def test_other_existing_workspace_rejected(self, fake_workspaces):
        with pytest.raises(ValueError, match="--workspace beta"):
            k.strip_workspace_prefix("workspaces/beta/wiki/root_index.md")

    def test_nonexistent_workspace_passthrough(self, fake_workspaces):
        arg = "workspaces/ghost/wiki/x.md"
        assert k.strip_workspace_prefix(arg) == arg

    def test_plain_relative_path_passthrough(self, fake_workspaces):
        assert k.strip_workspace_prefix("raw/articles/foo.md") == "raw/articles/foo.md"
        assert k.strip_workspace_prefix("wiki/root_index.md") == "wiki/root_index.md"

    def test_no_active_workspace_passthrough(self, tmp_path, monkeypatch):
        # PROJECT_ROOT 不在 workspaces/ 下（引擎根直跑）时不做猜测
        monkeypatch.setattr(k, "PROJECT_ROOT", tmp_path)
        arg = "workspaces/alpha/wiki/x.md"
        assert k.strip_workspace_prefix(arg) == arg

    def test_resolve_doc_path_integration(self, fake_workspaces):
        target = fake_workspaces / "workspaces" / "alpha" / "wiki" / "page.md"
        target.write_text("# x\n", encoding="utf-8")
        p = k.resolve_doc_path("workspaces/alpha/wiki/page.md")
        assert p == target.resolve()


# ============================================================
# create_workspace（new-workspace 脚手架）
# ============================================================

class TestCreateWorkspace:
    def test_creates_skeleton(self, tmp_path, monkeypatch):
        monkeypatch.setattr(k, "DATA_ROOT", tmp_path)
        result = k.create_workspace("my-research")
        ws = tmp_path / "workspaces" / "my-research"
        assert result["created"] is True
        for sub in k._WORKSPACE_SKELETON:
            assert (ws / sub).is_dir(), f"缺目录 {sub}"
        assert (ws / "wiki" / "root_index.md").is_file()
        assert (ws / "log.md").is_file()
        # raw/exports/my_thoughts 留 .gitkeep 保结构
        assert (ws / "exports" / ".gitkeep").is_file()
        assert (ws / "my_thoughts" / ".gitkeep").is_file()

    def test_root_index_frontmatter_valid(self, tmp_path, monkeypatch):
        monkeypatch.setattr(k, "DATA_ROOT", tmp_path)
        k.create_workspace("valid-fm")
        ws = tmp_path / "workspaces" / "valid-fm"
        monkeypatch.setattr(k, "PROJECT_ROOT", ws)
        monkeypatch.setattr(k, "WIKI_DIR", ws / "wiki")
        monkeypatch.setattr(k, "RAW_DIR", ws / "raw")
        result = k.validate_frontmatter(ws / "wiki" / "root_index.md")
        assert result["valid"], f"脚手架 root_index frontmatter 不合规: {result}"

    def test_existing_workspace_rejected(self, tmp_path, monkeypatch):
        monkeypatch.setattr(k, "DATA_ROOT", tmp_path)
        k.create_workspace("dup")
        with pytest.raises(ValueError, match="已存在"):
            k.create_workspace("dup")

    @pytest.mark.parametrize("bad", ["Bad Name", "UPPER", "-lead", "", "中文名", "a/b"])
    def test_invalid_names_rejected(self, tmp_path, monkeypatch, bad):
        monkeypatch.setattr(k, "DATA_ROOT", tmp_path)
        with pytest.raises(ValueError, match="非法 workspace 名"):
            k.create_workspace(bad)

    def test_creates_workspaces_dir_if_missing(self, tmp_path, monkeypatch):
        # KB_ROOT 指向全新项目（连 workspaces/ 都没有）也能跑通
        monkeypatch.setattr(k, "DATA_ROOT", tmp_path / "fresh-project")
        result = k.create_workspace("main")
        assert (tmp_path / "fresh-project" / "workspaces" / "main" / "wiki").is_dir()
        assert result["name"] == "main"
