"""发布前修复的回归守护测试。

四组守护，对应 2026-06 发布前审查确认的缺陷修复，防止未来漂移回坏状态：

1. TestWebGitCwdGuard — web/lib/git.ts 的 git 子进程 cwd 必须是 workspaceRoot()。
   历史缺陷：cwd 用 projectRoot()（引擎根），而调用方传的是 workspace 相对路径
   （wiki/...），文件实际在 workspaces/<ws>/ 下 → git add pathspec 解析不到，
   web 端「编辑保存 / 冲突一键决议 / commit API」全链路 100% 失败。
   仿 test_i18n_sync.py：纯文本解析 TS 源，不执行。

2. TestPreCommitHookGuard — scripts/hooks/pre-commit 的保护正则必须同时覆盖
   旧顶层 raw|my_thoughts/ 与现行 workspaces/<name>/raw|my_thoughts/ 布局。
   历史缺陷：正则只匹配旧顶层路径，对 workspaces 布局完全失效（死防线）。
   做法：从 hook 源文件提取 grep -E 模式，用真实 grep 对样本路径断言。

3. TestSettingsDenyGuard — .claude/settings.json 的 deny 必须含 workspaces
   变体的 Write/Edit 拒绝模式（CLAUDE.md 核心原则 5 的 agent 层落地）。

4. TestOutlineFreshness — k.py load_or_build_outline 必须按 doc_chars 判
   outline.json 新鲜度：过期（md 被编辑后未再生）→ 丢弃缓存现场重建；
   新鲜 → 用盘上缓存；重建时 anchor 仍稳定的 agent_summary 保留。
   历史缺陷：盘上存在即直接采用，过期偏移切当前文本返回错位内容。
"""

import json
import re
import subprocess
from pathlib import Path

import pytest


PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


def _read(rel: str) -> str:
    p = PROJECT_ROOT / rel
    if not p.exists():
        pytest.skip(f"找不到 {rel}，跳过守护检查")
    return p.read_text(encoding="utf-8")


class TestWebGitCwdGuard:
    def test_spawn_cwd_is_workspace_root(self):
        src = _read("web/lib/git.ts")
        assert re.search(r"spawn\(\s*\"git\"[^)]*cwd:\s*workspaceRoot\(\)", src), (
            "web/lib/git.ts 的 git 子进程 cwd 必须是 workspaceRoot()——"
            "调用方传 workspace 相对路径（wiki/...），以引擎根为 cwd 时 "
            "git add pathspec 解析不到文件，web 写入+commit 链路整体失败"
        )

    def test_no_project_root_cwd(self):
        src = _read("web/lib/git.ts")
        assert "projectRoot()" not in src, (
            "web/lib/git.ts 不应再以 projectRoot() 为 git cwd（见上一条守护的缺陷说明）"
        )


class TestPreCommitHookGuard:
    """从 hook 源提取 grep -E 模式，对样本路径跑真实 grep 断言行为。"""

    BLOCKED = [
        "raw/a.pdf",
        "raw/a.md",  # 现行口径：raw 派生物也不入库（版权与隐私）
        "my_thoughts/x.md",
        "workspaces/smb-ecommerce/raw/x.pdf",
        "workspaces/smb-ecommerce/raw/x.md",
        "workspaces/any-name/my_thoughts/note.md",
    ]
    ALLOWED = [
        "wiki/concepts/a.md",
        "workspaces/smb-ecommerce/wiki/a.md",
        "workspaces/smb-ecommerce/log.md",
        "scripts/k.py",
        "rawhide/readme.md",  # 前缀相似但不在保护区
    ]

    def _extract_pattern(self) -> str:
        src = _read("scripts/hooks/pre-commit")
        m = re.search(r"grep -E '([^']+)'", src)
        assert m, "pre-commit hook 里找不到 grep -E '<pattern>' 保护正则"
        return m.group(1)

    def _grep(self, pattern: str, lines: list[str]) -> list[str]:
        proc = subprocess.run(
            ["grep", "-E", pattern],
            input="\n".join(lines) + "\n",
            capture_output=True,
            text=True,
        )
        return [l for l in proc.stdout.splitlines() if l]

    def test_blocks_both_layouts(self):
        pattern = self._extract_pattern()
        hits = self._grep(pattern, self.BLOCKED)
        assert hits == self.BLOCKED, (
            f"pre-commit 保护正则漏拦：{set(self.BLOCKED) - set(hits)}（必须同时覆盖"
            "旧顶层与 workspaces/<name>/ 两种布局的 raw|my_thoughts）"
        )

    def test_passes_normal_paths(self):
        pattern = self._extract_pattern()
        hits = self._grep(pattern, self.ALLOWED)
        assert hits == [], f"pre-commit 保护正则误伤正常路径：{hits}"

    def test_installed_hook_in_sync(self):
        """已安装的 .git/hooks/pre-commit 必须与 scripts/hooks/ 源一致（防改了源忘了重装）。"""
        installed = PROJECT_ROOT / ".git" / "hooks" / "pre-commit"
        if not installed.exists():
            pytest.skip("本地未安装 pre-commit hook（fresh clone 下属正常）")
        assert installed.read_text(encoding="utf-8") == _read("scripts/hooks/pre-commit"), (
            "已安装的 .git/hooks/pre-commit 与 scripts/hooks/pre-commit 不一致——"
            "请重跑 bash scripts/install_hooks.sh"
        )

    def _run_hook_e2e(self, tmp_path, rel_path: str) -> int:
        """在临时 git 仓库装上真实 hook、stage 一个文件、跑 hook，返回退出码。

        端到端覆盖纯正则测试抓不到的层：git 自身对非 ASCII 文件名的 quotepath
        转义输出。返回非 0 = 被拦截。
        """
        import os

        hook_src = (PROJECT_ROOT / "scripts" / "hooks" / "pre-commit").read_text(encoding="utf-8")
        repo = tmp_path / "repo"
        repo.mkdir()
        subprocess.run(["git", "init", "-q"], cwd=repo, check=True)
        subprocess.run(["git", "config", "user.email", "t@example.com"], cwd=repo, check=True)
        subprocess.run(["git", "config", "user.name", "t"], cwd=repo, check=True)
        target = repo / rel_path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text("x", encoding="utf-8")
        subprocess.run(["git", "add", "-f", "--", rel_path], cwd=repo, check=True)
        hook_file = repo / ".git" / "hooks" / "pre-commit"
        hook_file.write_text(hook_src, encoding="utf-8")
        os.chmod(hook_file, 0o755)
        proc = subprocess.run(
            ["git", "commit", "-q", "-m", "test"], cwd=repo, capture_output=True, text=True
        )
        return proc.returncode

    def test_e2e_blocks_ascii_raw(self, tmp_path):
        assert self._run_hook_e2e(tmp_path, "workspaces/x/raw/a.pdf") != 0, (
            "hook 应拦截 workspaces/<ws>/raw/ 下的强制提交"
        )

    def test_e2e_blocks_non_ascii_raw(self, tmp_path):
        # git 默认 quotepath=true 会把中文名转义成 "\\345..." 带行首引号，
        # 击穿 ^ 锚定正则——中文知识库的高概率场景，必须守住
        assert self._run_hook_e2e(tmp_path, "workspaces/x/raw/报告.pdf") != 0, (
            "hook 对非 ASCII 文件名失效（quotepath 引号转义击穿 ^ 锚定）"
        )

    def test_e2e_allows_wiki(self, tmp_path):
        assert self._run_hook_e2e(tmp_path, "workspaces/x/wiki/页面.md") == 0, (
            "hook 不应拦截 wiki/ 下的正常提交（含非 ASCII 名）"
        )

    def test_no_stale_commit_editmsg_exemption(self):
        """hook 不得再有读 .git/COMMIT_EDITMSG 做 human: 豁免的**代码**——
        pre-commit 阶段拿到的是上一次 commit 的残留，按它放行是漏洞。
        （注释里提及 COMMIT_EDITMSG 解释「为何不用」是允许的，只看非注释代码行。）"""
        src = _read("scripts/hooks/pre-commit")
        code_lines = [l for l in src.splitlines() if not l.lstrip().startswith("#")]
        offending = [l for l in code_lines if "COMMIT_EDITMSG" in l]
        assert not offending, (
            f"pre-commit 仍有读取 COMMIT_EDITMSG 的代码（豁免应走 --no-verify）：{offending}"
        )


class TestSettingsDenyGuard:
    REQUIRED = [
        # workspaces 布局
        "Write(workspaces/*/raw/**)",
        "Edit(workspaces/*/raw/**)",
        "Write(workspaces/*/my_thoughts/**)",
        "Edit(workspaces/*/my_thoughts/**)",
        # **/ 任意层级变体——deny 模式以 session cwd 为基准，从子目录启动时
        # workspaces/*/... 这类锚定相对模式会失配，**/raw/** 才不依赖启动目录
        "Write(**/raw/**)",
        "Edit(**/raw/**)",
        "Write(**/my_thoughts/**)",
        "Edit(**/my_thoughts/**)",
        # rm -f 单独成路——rm -rf/-r/-f 各自的 glob 不互相覆盖
        "Bash(rm -f workspaces/*/raw*)",
        "Bash(rm -f workspaces/*/my_thoughts*)",
    ]

    def test_deny_covers_workspaces_layout(self):
        settings = json.loads(_read(".claude/settings.json"))
        deny = set(settings.get("permissions", {}).get("deny", []))
        missing = [p for p in self.REQUIRED if p not in deny]
        assert not missing, (
            f".claude/settings.json deny 缺少必要的写保护模式：{missing}"
            "（CLAUDE.md 核心原则 5：写 raw/my_thoughts 必须是 deny）"
        )


class TestMirrorSync:
    """CLAUDE.md ↔ AGENTS.md 与 .claude/skills ↔ .agents/skills 镜像逐字一致守护。

    允许的差异（与 CLAUDE.md 头部声明一致）：
      - Claude Code ↔ Codex（agent 名）
      - .claude/skills/ ↔ .agents/skills/（技能目录）
      - 入口文件指称 CLAUDE.md ↔ AGENTS.md 互换
    做法：把两侧文本按上述规则归一化为中性 token 后必须完全相等。
    """

    @staticmethod
    def _normalize(text: str) -> str:
        text = text.replace("Claude Code", "⟨AGENT⟩").replace("Codex", "⟨AGENT⟩")
        text = text.replace(".claude/skills", "⟨SKILLS⟩").replace(".agents/skills", "⟨SKILLS⟩")
        text = text.replace("CLAUDE.md", "⟨SPEC⟩").replace("AGENTS.md", "⟨SPEC⟩")
        return text

    def test_claude_agents_mirror(self):
        a = self._normalize(_read("CLAUDE.md"))
        b = self._normalize(_read("AGENTS.md"))
        assert a == b, (
            "CLAUDE.md 与 AGENTS.md 归一化后不一致——镜像漂移，改任一文件时必须同步另一份"
        )

    def test_skills_mirror(self):
        src_root = PROJECT_ROOT / ".claude" / "skills"
        dst_root = PROJECT_ROOT / ".agents" / "skills"
        if not src_root.is_dir() or not dst_root.is_dir():
            pytest.skip("skills 目录不存在，跳过镜像检查")
        src_names = sorted(p.name for p in src_root.iterdir() if p.is_dir())
        dst_names = sorted(p.name for p in dst_root.iterdir() if p.is_dir())
        assert src_names and src_names == dst_names, (
            f".claude/skills 与 .agents/skills 的 skill 集合不一致：{src_names} vs {dst_names}"
        )

        def rel_files(root: Path) -> set:
            return {p.relative_to(root) for p in root.rglob("*") if p.is_file()}

        # 双向文件集相等——单向遍历不会发现 .agents 里凭空多出的文件
        src_files, dst_files = rel_files(src_root), rel_files(dst_root)
        assert src_files == dst_files, (
            f"skills 镜像文件集不一致：仅 .claude 有 {src_files - dst_files}；"
            f"仅 .agents 有 {dst_files - src_files}"
        )
        for rel in sorted(src_files):
            assert self._normalize((src_root / rel).read_text(encoding="utf-8")) == self._normalize(
                (dst_root / rel).read_text(encoding="utf-8")
            ), f"skills 镜像漂移：{rel}（改任一侧时必须同步另一侧）"


class TestOutlineFreshness:
    """load_or_build_outline 的 doc_chars 新鲜度守卫（功能测试，tmp_path 下进行）。"""

    MD = (
        "---\ntitle: t\n---\n\n"
        "# 主标题 ^h-1-1-aaaaaa\n\n"
        "## 第一节 ^h-2-1-bbbbbb\n\n"
        "第一节内容。 ^p-1-cccccc\n\n"
        "## 第二节 ^h-2-2-dddddd\n\n"
        "第二节内容。 ^p-2-eeeeee\n"
    )

    def _write_pair(self, tmp_path, md_text: str, outline: dict | None):
        md = tmp_path / "page.md"
        md.write_text(md_text, encoding="utf-8")
        if outline is not None:
            md.with_suffix(".outline.json").write_text(
                json.dumps(outline, ensure_ascii=False), encoding="utf-8"
            )
        return md

    def test_fresh_outline_used_as_is(self, tmp_path):
        import k

        sentinel = {
            "doc_path": "page.md",
            "doc_chars": len(self.MD),  # 与 md 一致 → 新鲜
            "sections": [{"title": "盘上缓存哨兵", "anchor": "h-1-1-aaaaaa",
                          "level": 1, "line": 1, "char_start": 0,
                          "char_end": 5, "children": []}],
        }
        md = self._write_pair(tmp_path, self.MD, sentinel)
        out = k.load_or_build_outline(md)
        assert out["sections"][0]["title"] == "盘上缓存哨兵", "新鲜 outline 应直接采用盘上缓存"

    def test_stale_outline_rebuilt(self, tmp_path):
        import k

        stale = {
            "doc_path": "page.md",
            "doc_chars": len(self.MD) - 100,  # 与 md 不符 → 过期
            "sections": [{"title": "过期旧标题", "anchor": "h-9-9-zzzzzz",
                          "level": 1, "line": 1, "char_start": 0,
                          "char_end": 5, "children": []}],
        }
        md = self._write_pair(tmp_path, self.MD, stale)
        out = k.load_or_build_outline(md)
        titles = [s["title"] for s in out["sections"]]
        assert "过期旧标题" not in titles, "过期 outline 必须被丢弃重建，不得沿用旧 sections"
        assert out["doc_chars"] == len(self.MD), "重建后的 doc_chars 应与当前 md 一致"
        assert any("主标题" in t for t in titles), "重建结果应反映当前 md 的真实标题"

    def test_stale_rebuild_drops_summaries(self, tmp_path):
        """过期缓存的 agent_summary 不得复活到重建结果。

        heading 锚点的 hash 只对标题文本计算，整页换主题而标题不变（「目录」「快速
        导航」等通用标题）时锚点不变——若按 anchor 合并旧摘要，会把旧主题的摘要套到
        新内容上。过期 ⇒ 缓存整体不可信，重建一律不合并。
        """
        import k
        from postprocess import build_outline_data

        real = build_outline_data(self.MD, "page.md")

        def annotate(secs):
            for s in secs:
                if s["title"] == "第一节":
                    s["agent_summary"] = "旧主题的陈旧摘要"
                annotate(s.get("children", []))

        annotate(real["sections"])
        # 追加内容使 doc_chars 失配（模拟页面被编辑、outline 未再生）
        edited = self.MD + "\n## 新增节 ^h-2-3-ffffff\n\n新增内容。 ^p-3-gggggg\n"
        md = self._write_pair(tmp_path, edited, real)
        out = k.load_or_build_outline(md)

        summaries: list[str | None] = []

        def collect(secs):
            for s in secs:
                summaries.append(s.get("agent_summary"))
                collect(s.get("children", []))

        collect(out["sections"])
        assert all(s is None for s in summaries), (
            f"过期缓存的 agent_summary 不应被复活到重建结果，实得：{summaries}"
        )

    def test_corrupt_outline_rebuilds_not_raises(self, tmp_path):
        """损坏的 outline.json 按『缓存缺失』处理：md 完好就现场重建，不让坏文件卡死读路径。"""
        import k

        md = tmp_path / "page.md"
        md.write_text(self.MD, encoding="utf-8")
        md.with_suffix(".outline.json").write_text("{broken json!!", encoding="utf-8")
        out = k.load_or_build_outline(md)  # 不应抛 RuntimeError
        assert any("主标题" in s["title"] for s in out["sections"])

    def test_annotate_goes_through_freshness_guard(self, tmp_path):
        """annotate_section 写路径经新鲜度守卫：盘上 outline 过期时按当前 md 的新锚点工作。"""
        import k
        from postprocess import build_outline_data

        # 盘上放一份过期 outline（旧锚点、doc_chars 不符）
        stale = {
            "doc_path": "page.md",
            "doc_chars": len(self.MD) - 50,
            "sections": [{"title": "旧节", "anchor": "h-9-9-zzzzzz",
                          "level": 2, "line": 1, "char_start": 0,
                          "char_end": 5, "children": []}],
        }
        md = self._write_pair(tmp_path, self.MD, stale)
        # 用当前 md 的真实锚点 annotate——若不经守卫会 LookupError（旧 outline 无此锚点）
        res = k.annotate_section(md, "^h-2-1-bbbbbb", "第一节摘要")
        assert res["agent_summary"] == "第一节摘要"
        # 写回后盘上 outline 变新鲜，且摘要可被读到
        out = k.load_or_build_outline(md)
        found = []

        def collect(secs):
            for s in secs:
                if s.get("anchor") == "h-2-1-bbbbbb":
                    found.append(s.get("agent_summary"))
                collect(s.get("children", []))

        collect(out["sections"])
        assert found == ["第一节摘要"]

    def test_missing_outline_builds_from_md(self, tmp_path):
        import k

        md = self._write_pair(tmp_path, self.MD, None)
        out = k.load_or_build_outline(md)
        assert any("主标题" in s["title"] for s in out["sections"])
