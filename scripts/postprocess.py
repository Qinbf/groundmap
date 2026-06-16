"""
markitdown 输出后处理：自动加锚点 + 生成 outline.json
====================================================

- `add_anchors(text)`：给 markdown 加 ^h-/^p-/^t-/^c-/^f- 锚点（混合 hash + seq 编号）
- `build_outline_data(text_with_anchors, doc_path)`：构建 outline.json 数据
- `process(text)`：一站式 — 返回 (含锚点文本, outline_data)
- `has_anchors(text)`：检测是否已加过锚点（幂等性判断）

设计要点：
- 锚点格式：`^{kind}-{seq}-{hash6}`（heading 多一个 level：`^h-{level}-{seq}-{hash6}`）
- hash 算法：md5(归一化内容)[:6]，让内容微调时锚点自动失效
- seq 让人扫一眼就知文档第几节/段
- 同 hash 撞车时追加 -2/-3 保唯一
"""

from __future__ import annotations

import hashlib
import re
from datetime import date

from section_parser import (
    Block,
    build_outline,
    section_to_dict,
    split_blocks,
    strip_frontmatter,
)


KIND_LETTER = {
    "heading": "h",
    "paragraph": "p",
    "list": "p",
    "blockquote": "p",
    "table": "t",
    "code": "c",
    "figure": "f",
}

ANCHOR_DETECT_RE = re.compile(
    r"\s\^[hpcft]-\d+(?:-\d+)?-[a-z0-9]+(?:-\d+)?(?=\s|$)",
    re.MULTILINE,
)

# 用于剥离一行末尾追加的锚点（注意：要保留前导空白以外的内容）
ANCHOR_STRIP_RE = re.compile(
    r"[ \t]+\^[hpcft]-\d+(?:-\d+)?-[a-z0-9]+(?:-\d+)?(?=\s|$)",
)


def strip_anchors(text: str) -> str:
    """从文本中剥离所有由 add_anchors 添加的锚点尾巴，恢复原始内容。"""
    return ANCHOR_STRIP_RE.sub("", text)


def _normalize_for_hash(s: str) -> str:
    """生成 hash 用的归一化文本：去 markdown 标记、压空白。

    pipe-1：旧版会 `[:64]` 截断——导致超过 64 字边界的关键数字 / 论断被编辑时
    归一化文本不变、hash6 与锚点都不变，`k.py list-broken-refs` 这条安全网兜不住
    stale 引用。现改为对**完整**归一化内容做 hash，任意位置的实质编辑都会改变 hash6。"""
    s = re.sub(r"`+", "", s)
    s = re.sub(r"\*+", "", s)
    s = re.sub(r"_+", "", s)
    s = re.sub(r"~+", "", s)
    s = re.sub(r"#+", "", s)
    s = re.sub(r">+", "", s)
    s = re.sub(r"!\[([^\]]*)\]\([^\)]*\)", r"\1", s)
    s = re.sub(r"\[([^\]]+)\]\([^\)]*\)", r"\1", s)
    s = re.sub(r"[\[\]\(\)\|]", "", s)
    s = re.sub(r"\s+", " ", s).strip().lower()
    return s


def _md5_6(s: str) -> str:
    return hashlib.md5(s.encode("utf-8")).hexdigest()[:6]


def has_anchors(text: str) -> bool:
    """启发式：文本中有 ≥3 处形如 ` ^h-2-1-abcdef` / ` ^p-12-7d8e9a` 的尾巴 → 视为已加锚。"""
    matches = ANCHOR_DETECT_RE.findall(text)
    return len(matches) >= 3


def add_anchors(text: str) -> tuple[str, list[Block]]:
    """
    给 text 加锚点。返回 (新文本, 已填充 anchor 字段的 blocks 列表)。

    幂等：先剥离已有锚点，按当前内容重新计算 → 内容未变时输出与原文完全一致；
    内容微调时该段 hash 自动变（暴露失效引用）。
    """
    fm, body = strip_frontmatter(text)
    body_plain = strip_anchors(body)
    blocks = split_blocks(body_plain)

    # 分配 anchor
    h_seq_by_level: dict[int, int] = {}
    para_seq = 0
    used: set[str] = set()

    def make_unique(base: str) -> str:
        if base not in used:
            used.add(base)
            return base
        for k in range(2, 1000):
            cand = f"{base}-{k}"
            if cand not in used:
                used.add(cand)
                return cand
        return base + "-x"

    for blk in blocks:
        if blk.kind == "hr":
            continue
        if blk.kind == "heading":
            lvl = blk.level or 1
            h_seq_by_level[lvl] = h_seq_by_level.get(lvl, 0) + 1
            seq = h_seq_by_level[lvl]
            h6 = _md5_6(_normalize_for_hash(blk.title or ""))
            blk.anchor = make_unique(f"h-{lvl}-{seq}-{h6}")
        else:
            para_seq += 1
            letter = KIND_LETTER.get(blk.kind, "p")
            h6 = _md5_6(_normalize_for_hash(blk.text))
            blk.anchor = make_unique(f"{letter}-{para_seq}-{h6}")

    # 在剥离锚点后的 body 上从后往前插入新锚点（避免 offset 漂移）
    out = body_plain
    for blk in reversed(blocks):
        if not blk.anchor:
            continue
        insert_pos = blk.char_end
        anchor_str = f" ^{blk.anchor}"
        out = out[:insert_pos] + anchor_str + out[insert_pos:]

    return fm + out, blocks


def _norm_title(t: str) -> str:
    """归一化标题文本：压空白 + 转小写，用于跨 re-convert 的 title 级匹配。"""
    return re.sub(r"\s+", " ", (t or "")).strip().lower()


def _collect_summaries(sections: list[dict]) -> list[dict]:
    """递归收集旧 outline 中所有非空 agent_summary。

    返回 list[{anchor, title, summary}]——供 _restore_summaries 做
    anchor → title 多级匹配（pipe-2）。"""
    out: list[dict] = []

    def walk(secs):
        for s in secs:
            anc = s.get("anchor")
            summary = s.get("agent_summary")
            if anc and summary:
                out.append({
                    "anchor": anc,
                    "title": _norm_title(s.get("title", "")),
                    "summary": summary,
                })
            walk(s.get("children", []))

    walk(sections)
    return out


def _restore_summaries(sections: list[dict], old_summaries: list[dict]) -> int:
    """把旧摘要写回新 sections，返回回填条数。

    pipe-2：先按 anchor 精确匹配；失配再按归一化 title 匹配。heading 锚点形如
    `h-{level}-{seq}-{hash}` 含全局 seq，在文档前部插入新段 / 新标题会让后续所有
    heading 的 seq 漂移、anchor 变，但其 title 稳定——title fallback 让人工经
    annotate-section 回填的章节摘要不被静默丢弃。agent_summary 只存在 heading
    section 上（title 非空），故 title 匹配天然只作用于章节摘要，不会误配段落。
    每条旧摘要至多被消费一次（首个未消费目标优先），避免同名标题相互串号。"""
    by_anchor: dict[str, list[dict]] = {}
    by_title: dict[str, list[dict]] = {}
    for e in old_summaries:
        by_anchor.setdefault(e["anchor"], []).append(e)
        if e["title"]:
            by_title.setdefault(e["title"], []).append(e)

    consumed: set[int] = set()

    def take(bucket: dict[str, list[dict]], key: str | None) -> str | None:
        if not key:
            return None
        for e in bucket.get(key, []):
            if id(e) not in consumed:
                consumed.add(id(e))
                return e["summary"]
        return None

    restored = 0

    def walk(secs):
        nonlocal restored
        for s in secs:
            if not s.get("agent_summary"):
                summ = take(by_anchor, s.get("anchor"))
                if summ is None:
                    summ = take(by_title, _norm_title(s.get("title", "")))
                if summ:
                    s["agent_summary"] = summ
                    restored += 1
            walk(s.get("children", []))

    walk(sections)
    return restored


_BLOCK_ANCHOR_TAIL_RE = re.compile(
    r"\^([hpcft]-\d+(?:-\d+)?-[a-z0-9]+(?:-\d+)?)\s*$"
)


def build_outline_data(
    text_with_anchors: str,
    doc_path: str,
    *,
    previous_outline: dict | None = None,
) -> dict:
    """
    基于已加锚点的 markdown 文本构建 outline.json 数据结构。

    输入约定：text_with_anchors 应当已经被 add_anchors 处理过（每个块末尾
    带 ` ^h-/^p-/...` 锚点）。本函数只切一次块，从行末回填 anchor，构建
    嵌套 section 树。

    若提供 previous_outline，会按 anchor（失配再按 title）把旧 agent_summary 合并进
    新 outline——见 _restore_summaries。

    **谁会传 previous_outline（口径说明）**：只有 convert.py 的 raw re-convert 路径
    传它，处理对象是**不可变的 raw 源**（CLAUDE.md 视 raw 为事实来源，仅当源文件真
    改才重转，且增量转换跳过未变文件，故 re-convert 罕见）。k.py 的 wiki 读路径
    （load_or_build_outline）**不传** previous_outline——wiki 页可被 agent/人直接
    频繁编辑、整页换主题的风险高，过期即整体丢弃不合并。两条路径口径不同是**按对象
    特性的有意取舍**，非疏忽。
    已知残留：heading 锚点 hash 仅基于标题文本（见 :121），故"同标题换正文"在
    re-convert 路径仍可能复活旧摘要；因 raw 不可变 + 重转罕见，该残留风险低、接受。

    注：早期版本曾要求传入 add_anchors 返回的 blocks 列表，但实测 blocks
    的 char_start/char_end 是基于"加锚前 body"的偏移，加锚后会漂移；保留
    blocks 参数反而误导。本函数现在只接受 text_with_anchors，单次切块即可。
    """
    fm, body = strip_frontmatter(text_with_anchors)
    fm_offset = len(fm)

    # 切块 + 从行末回填 anchor（一次切块，一次扫描，无重复工作）
    parsed_blocks = split_blocks(body)
    for blk in parsed_blocks:
        if blk.kind == "hr":
            continue
        m = _BLOCK_ANCHOR_TAIL_RE.search(blk.text)
        if m:
            blk.anchor = m.group(1)
        # body 偏移 → 完整文件偏移
        blk.char_start += fm_offset
        blk.char_end += fm_offset

    total_chars = len(text_with_anchors)
    outline = build_outline(parsed_blocks, total_chars)
    sections_dicts = [section_to_dict(s) for s in outline["sections"]]

    if previous_outline:
        old_summaries = _collect_summaries(previous_outline.get("sections", []))
        if old_summaries:
            _restore_summaries(sections_dicts, old_summaries)

    return {
        "doc_path": doc_path,
        "doc_chars": total_chars,
        "doc_paragraphs": outline["paragraphs_count"],
        "generated_at": date.today().isoformat(),
        "sections": sections_dicts,
    }


def process(text: str, doc_path: str, previous_outline: dict | None = None) -> tuple[str, dict]:
    """
    一站式：text → (含锚点文本, outline 字典)
    幂等：text 已含锚点时仅重建 outline，不重复加锚。
    若提供 previous_outline，新 outline 会保留同 anchor 的 agent_summary。
    """
    text_with_anchors, _blocks = add_anchors(text)
    outline_data = build_outline_data(
        text_with_anchors, doc_path, previous_outline=previous_outline
    )
    return text_with_anchors, outline_data
