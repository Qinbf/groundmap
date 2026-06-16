"""
markitdown 文档转换脚本

将 raw/ 目录中的各种文档（PDF、DOCX、PPTX、XLSX 等）转换为 Markdown 格式，
转换产物保存在原文件同目录下，供 LLM Ingest 流程使用。

用法:
    python scripts/convert.py                  # 增量转换 raw/ 下所有支持的文件
    python scripts/convert.py --force          # 强制重新转换所有文件
    python scripts/convert.py --dry-run        # 只列出待转换文件，不执行
    python scripts/convert.py --ext .pdf,.docx # 只处理指定格式
    python scripts/convert.py --dir path/to/   # 指定扫描目录

依赖:
    pip install 'markitdown[all]'
"""

import argparse
import json
import os
import sys
import tempfile
from pathlib import Path


def _atomic_write_text(target: Path, content: str, encoding: str = "utf-8") -> None:
    """write-then-rename 原子写：先写到同目录的临时文件再 os.replace 重命名。
    保证别的进程读 target 时只能看到完整旧内容或完整新内容，不会读到半截。

    Windows 兼容：目标文件被另一进程持 read handle 时 os.replace 抛 PermissionError，
    重试 3 次（50ms 间隔）；最终失败保留 tmp 文件供手动收拾。
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
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise

    last_exc: Exception | None = None
    for _ in range(3):
        try:
            os.replace(tmp_path, str(target))
            return
        except PermissionError as e:
            last_exc = e
            _time.sleep(0.05)
    # 3 次都失败：清理 tmp 避免污染 git status；给 stderr 提示重试
    try:
        os.unlink(tmp_path)
    except OSError:
        print(
            f"[_atomic_write_text] 警告：临时文件无法清理：{tmp_path}",
            file=sys.stderr,
        )
    print(
        f"[_atomic_write_text] os.replace 失败 3 次（目标 {target} 可能被另一进程持锁）；"
        f"请稍后重试",
        file=sys.stderr,
    )
    if last_exc is not None:
        raise last_exc

try:
    from markitdown import MarkItDown
except ImportError:
    print("错误: 未安装 markitdown，请运行: pip install 'markitdown[all]'")
    sys.exit(1)

# 让 postprocess 模块可被 import（与 convert.py 同目录）
sys.path.insert(0, str(Path(__file__).resolve().parent))
from postprocess import has_anchors, process as postprocess_text

SUPPORTED_EXTENSIONS = {
    # 已是 markdown：仅做 postprocess（加锚点 + 生成 outline）
    ".md",
    # 文档
    ".pdf", ".docx", ".pptx", ".xlsx", ".xls",
    # 网页与数据
    ".html", ".htm", ".csv", ".json", ".xml",
    # 电子书
    ".epub",
    # 图片
    ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".tif", ".webp",
    # 音频
    ".mp3", ".wav",
    # 邮件
    ".msg",
}


def get_project_root() -> Path:
    """获取项目根目录（scripts/ 的父目录）"""
    return Path(__file__).resolve().parent.parent


def should_convert(source: Path, force: bool) -> bool:
    """判断文件是否需要（重新）处理。
    - .md：检查是否已加锚点 && outline.json 是否存在
    - 其他：检查 .md 是否存在、mtime、outline.json 是否存在
    """
    if force:
        return True
    is_md = source.suffix.lower() == ".md"
    target_md = source if is_md else source.with_suffix(".md")
    target_outline = source.with_suffix(".outline.json")
    if not target_md.exists():
        return True
    if not target_outline.exists():
        return True
    if not is_md:
        # 非 .md：原文件 mtime 新于派生 .md → 重转
        if source.stat().st_mtime > target_md.stat().st_mtime:
            return True
    else:
        # .md：检查是否已加锚点
        try:
            if not has_anchors(source.read_text(encoding="utf-8")):
                return True
        except Exception:
            return True
    return False


def collect_files(scan_dir: Path, extensions: set[str] | None) -> list[Path]:
    """收集目录下所有待处理的文件，跳过派生产物（*.outline.json / *.outline.md）。"""
    allowed = extensions if extensions else SUPPORTED_EXTENSIONS
    files = []
    for file_path in sorted(scan_dir.rglob("*")):
        if not file_path.is_file():
            continue
        if file_path.suffix.lower() not in allowed:
            continue
        if file_path.name == ".gitkeep":
            continue
        # 跳过 convert.py 自己的派生产物（避免被再次处理）
        if file_path.stem.lower().endswith(".outline"):
            continue
        files.append(file_path)
    return files


# doc_path 的相对基准：默认项目根；--workspace 模式下由 main() 设为该 workspace 根，
# 使 outline.json 的 doc_path 保持 `raw/...`，与 wiki 里的 [[raw/...]] 引用同坐标系。
_BASE_ROOT: Path | None = None


def _project_relative_posix(path: Path) -> str:
    """把绝对路径转换成相对 base root（workspace 根 / 项目根）的 POSIX 路径，
    供 outline.json 的 doc_path 字段使用。"""
    base = _BASE_ROOT or get_project_root()
    try:
        rel = path.resolve().relative_to(base)
    except ValueError:
        return path.name
    return str(rel).replace("\\", "/")


def convert_file(md: MarkItDown, source: Path) -> tuple[bool, str]:
    """
    转换/处理单个文件。返回 (成功与否, 消息)。

    Pipeline:
      1. 非 .md：markitdown 转为 markdown 文本；.md：直接读原文
      2. postprocess.process 加锚点 + 生成 outline 数据
      3. 写 .md（仅当内容变化）+ 写 .outline.json
    """
    is_md = source.suffix.lower() == ".md"

    if is_md:
        try:
            markdown = source.read_text(encoding="utf-8")
        except Exception as e:
            return False, f"读取失败: {e}"
        target_md = source
    else:
        result = md.convert(str(source))
        markdown = result.markdown if result.markdown else ""
        if not markdown.strip():
            return False, "转换结果为空"
        target_md = source.with_suffix(".md")

    target_outline = source.with_suffix(".outline.json")
    doc_path = _project_relative_posix(target_md)

    # 读旧 outline（如果存在），让 process 保留 agent_summary
    previous_outline = None
    if target_outline.exists():
        try:
            previous_outline = json.loads(target_outline.read_text(encoding="utf-8"))
        except Exception:
            previous_outline = None

    text_with_anchors, outline_data = postprocess_text(
        markdown, doc_path, previous_outline=previous_outline
    )

    # 仅当内容变化时写 .md（保护 git 工作树）
    md_changed = (
        not target_md.exists()
        or target_md.read_text(encoding="utf-8") != text_with_anchors
    )
    if md_changed:
        _atomic_write_text(target_md, text_with_anchors)

    _atomic_write_text(
        target_outline,
        json.dumps(outline_data, ensure_ascii=False, indent=2),
    )

    sec_count = sum(_count_sections(s) for s in outline_data["sections"])
    md_msg = "新增" if md_changed else "未变"
    return True, (
        f"-> {target_md.name} ({md_msg}, {len(text_with_anchors)} 字符, "
        f"{sec_count} 章节, {outline_data['doc_paragraphs']} 段)"
    )


def _count_sections(section: dict) -> int:
    return 1 + sum(_count_sections(c) for c in section.get("children", []))


def parse_extensions(ext_str: str) -> set[str]:
    """解析用户指定的扩展名列表"""
    exts = set()
    for e in ext_str.split(","):
        e = e.strip().lower()
        if e and not e.startswith("."):
            e = "." + e
        if e:
            exts.add(e)
    return exts


def main():
    parser = argparse.ArgumentParser(
        description="将 raw/ 目录中的文档批量转换为 Markdown（基于 markitdown）"
    )
    parser.add_argument(
        "--dir",
        type=str,
        default=None,
        help="显式扫描目录路径（覆盖 --workspace）；默认按 --workspace 取 workspaces/<name>/raw/",
    )
    parser.add_argument(
        "--workspace",
        type=str,
        default=os.environ.get("KB_WORKSPACE", "smb-ecommerce"),
        help=(
            "工作区名称（在 workspaces/ 下查找），默认 smb-ecommerce；"
            "可用环境变量 KB_WORKSPACE 覆盖。--dir 显式给出时本项被忽略"
        ),
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="强制重新转换所有文件（忽略增量检查）",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="只列出待转换的文件，不执行转换",
    )
    parser.add_argument(
        "--ext",
        type=str,
        default=None,
        help="只处理指定格式，逗号分隔（如 --ext .pdf,.docx）",
    )
    args = parser.parse_args()

    # 确定扫描目录 + doc_path 基准
    global _BASE_ROOT
    # 数据根：默认 = 引擎根；设 KB_ROOT 指向独立项目的数据目录（含 workspaces/），
    # 与 k.py、web/lib/kb.ts 的 KB_ROOT 同义，让一份引擎服务多个独立项目。
    _kb_root_env = os.environ.get("KB_ROOT")
    data_root = Path(_kb_root_env).expanduser().resolve() if _kb_root_env else get_project_root()
    if args.dir:
        # 显式 --dir：doc_path 以数据根为基准
        scan_dir = Path(args.dir).resolve()
        _BASE_ROOT = data_root
    else:
        # 解析 workspace（对齐 k.py：workspaces/<name>，挡 ../ 穿越与不存在的名字）
        workspaces_root = (data_root / "workspaces").resolve()
        ws_root = (workspaces_root / args.workspace).resolve()
        valid = [
            d.name for d in sorted(workspaces_root.iterdir())
            if d.is_dir() and not d.name.startswith(".")
        ] if workspaces_root.is_dir() else []
        if not ws_root.is_dir() or ws_root.parent != workspaces_root:
            print(
                f"错误: 非法 --workspace {args.workspace!r}（必须是 workspaces/ 下的目录）。"
                f"有效工作区: {valid}"
            )
            sys.exit(2)
        scan_dir = ws_root / "raw"
        _BASE_ROOT = ws_root

    if not scan_dir.is_dir():
        print(f"错误: 目录不存在: {scan_dir}")
        sys.exit(1)

    # 沙盒：scan_dir 必须在数据根内——convert.py 会把转换产物（.md / .outline.json）
    # 写到原文件同目录，越界路径意味着可能往数据根外写文件，拒绝
    try:
        scan_dir.relative_to(data_root)
    except ValueError:
        print(f"错误: 扫描目录必须在数据根 ({data_root}) 内: {scan_dir}")
        sys.exit(1)

    # 解析扩展名过滤
    extensions = parse_extensions(args.ext) if args.ext else None
    if extensions:
        unknown = extensions - SUPPORTED_EXTENSIONS
        if unknown:
            print(f"警告: 以下格式不在已知支持列表中: {', '.join(unknown)}")

    # 收集文件
    files = collect_files(scan_dir, extensions)
    if not files:
        print(f"未找到待转换的文件（目录: {scan_dir}）")
        return

    # 筛选需要转换的文件
    to_convert = []
    skipped_uptodate = 0
    for f in files:
        if should_convert(f, args.force):
            to_convert.append(f)
        else:
            skipped_uptodate += 1

    # Dry run 模式
    if args.dry_run:
        print(f"扫描目录: {scan_dir}")
        print(f"找到 {len(files)} 个支持的文件，其中 {len(to_convert)} 个待转换，{skipped_uptodate} 个已是最新\n")
        if to_convert:
            print("待转换文件:")
            for f in to_convert:
                rel = f.relative_to(scan_dir)
                print(f"  {rel}")
        return

    # 执行转换
    print(f"扫描目录: {scan_dir}")
    print(f"待转换: {len(to_convert)} | 已是最新: {skipped_uptodate}\n")

    if not to_convert:
        print("所有文件均已是最新，无需转换。")
        return

    md = MarkItDown()
    success_count = 0
    fail_count = 0
    empty_count = 0

    for f in to_convert:
        rel = f.relative_to(scan_dir)
        print(f"  转换: {rel} ... ", end="", flush=True)
        try:
            ok, msg = convert_file(md, f)
            if ok:
                print(f"完成 {msg}")
                success_count += 1
            else:
                print(f"跳过 ({msg})")
                empty_count += 1
        except Exception as e:
            print(f"失败 ({e})")
            fail_count += 1

    # 汇总报告
    print(f"\n{'='*40}")
    print(f"转换完成:")
    print(f"  成功: {success_count}")
    if empty_count:
        print(f"  空输出: {empty_count}")
    if fail_count:
        print(f"  失败: {fail_count}")
    if skipped_uptodate:
        print(f"  已是最新: {skipped_uptodate}")

    # 推荐下一步：ingest 流程的章节阅读 + 回填摘要
    if success_count > 0:
        print()
        print("下一步（ingest 流程）:")
        print("  1. 看大纲: python scripts/k.py outline <raw_path>")
        print("  2. 按 anchor 读章节: python scripts/k.py read-section <raw_path> <anchor>")
        print('  3. 读完每个 H2/H3 立即回填摘要:')
        print('     python scripts/k.py annotate-section <raw_path> <anchor> "<一两句概括>"')
        print("     ↑ ②③ 档（分段阅读）的必经步骤；① 档短文不强制（详见 CLAUDE.md Ingest 操作流程 / docs/raw-to-wiki-流程.md §3.6）")


if __name__ == "__main__":
    main()
