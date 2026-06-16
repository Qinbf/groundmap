"""i18n 翻译表同步 + anchor 正则 drift 守护测试。

两组守护，都属于"跨语言 / 跨实现一致性"约束：

1. TestI18nKeysSync — web/lib/i18n.ts 的 TRANSLATIONS.zh 与 .en 必须**同 key 集合**。
   CLAUDE.md「Web 管理台国际化方案 → 不可违反」要求：任何新 key 必须 zh/en 两边都加。
   注释说"i18n.ts TS 类型会强约束"，但 TranslationKey = keyof TRANSLATIONS.zh —— 只约束
   "用 t() 时 key 必须在 zh 里有"，**不**约束 en 一定补齐（en 缺 key 只会运行时 fallback
   到 zh，TS 不报错）。所以需要本测试做真正的双向同步守护。

2. TestAnchorRegexDrift — convert.py 生成的锚点样本，必须能被 web 侧的三处 anchor 正则
   （markdown.ts 的 INLINE_ANCHOR_RE、markdown-render.ts 的 TRAILING_ANCHOR_RE）正确解析。
   三处近似正则共存、无 drift 测试 → 这里针对真实样本断言它们都能匹配，防未来一边改坏。

仿 test_k_helpers.py 的 TestRelationTypesSync / TestWikilinkRegexSync：解析 TS 源文件的
字面量、与 Python 侧 / 彼此比对，纯文本解析不执行 TS。
"""

import re
from pathlib import Path

import pytest


PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


def _read_ts(rel: str) -> str:
    p = PROJECT_ROOT / rel
    if not p.exists():
        pytest.skip(f"找不到 {rel}，跳过同步检查")
    return p.read_text(encoding="utf-8")


def _strip_line_comments(text: str) -> str:
    """去掉 // 行注释——避免注释里的 "xxx": 误判为 key。
    （i18n.ts 的 value 里不含裸 // ——都是中英文/界面词，安全。）"""
    return re.sub(r"//[^\n]*", "", text)


def _extract_locale_block(text: str, locale: str) -> str:
    """从 TRANSLATIONS = { zh: {...}, en: {...} } as const 中切出某 locale 的对象体。

    用大括号配平定位，避免被 value 里的 `}`/`{`（如本项目没有，但稳妥）误切。
    返回 `{ ... }` 内部那段（不含最外层花括号）。
    """
    # 定位 `<locale>: {`
    m = re.search(rf"\b{re.escape(locale)}\s*:\s*\{{", text)
    assert m, f"在 i18n.ts 中找不到 TRANSLATIONS.{locale} 块"
    start = m.end() - 1  # 指向开 `{`
    depth = 0
    for i in range(start, len(text)):
        ch = text[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start + 1 : i]
    raise AssertionError(f"TRANSLATIONS.{locale} 块大括号未配平")


def _extract_keys(block: str) -> set:
    """抽出对象体里所有 "key": ... 的 key（key 一律是双引号字符串字面量）。"""
    no_comments = _strip_line_comments(block)
    # 行首（去缩进后）的  "some.key":  —— 限定冒号紧跟，避免抓到 value 里的引号串
    return set(re.findall(r'"([^"\n]+)"\s*:', no_comments))


class TestI18nKeysSync:
    """守 CLAUDE.md i18n「zh 与 en 必须同步」不变量。"""

    def test_zh_en_key_sets_identical(self):
        text = _read_ts("web/lib/i18n.ts")
        zh_block = _extract_locale_block(text, "zh")
        en_block = _extract_locale_block(text, "en")
        zh_keys = _extract_keys(zh_block)
        en_keys = _extract_keys(en_block)

        # sanity：两边都不该是空（解析没抓瞎）
        assert zh_keys, "解析 TRANSLATIONS.zh 得到 0 个 key —— 解析逻辑可能坏了"
        assert en_keys, "解析 TRANSLATIONS.en 得到 0 个 key —— 解析逻辑可能坏了"

        only_zh = sorted(zh_keys - en_keys)
        only_en = sorted(en_keys - zh_keys)
        assert zh_keys == en_keys, (
            "web/lib/i18n.ts 的 TRANSLATIONS.zh 与 .en key 集合不一致：\n"
            f"  仅在 zh: {only_zh}\n"
            f"  仅在 en: {only_en}\n"
            "任何新 key 必须 zh / en 两边都加（CLAUDE.md i18n「不可违反」）。"
        )


class TestAnchorRegexDrift:
    """守 convert.py 生成的锚点 ↔ web 解析正则 无 drift。

    针对 convert.py 实际会生成的锚点样本，断言 web 侧两处正则都能匹配。
    """

    # convert.py 锚点格式（见 CLAUDE.md「锚点格式」）：
    #   Heading: ^h-{level}-{seq}-{hash6}
    #   Para:    ^p-{seq}-{hash6}
    #   Table:   ^t-{seq}-{hash6}
    #   Code:    ^c-{seq}-{hash6}
    #   Figure:  ^f-{seq}-{hash6}
    # 另兼容手写 fallback（hash 段为含 - 的语义化命名）。
    SAMPLE_ANCHORS = [
        "h-2-3-a3f2c1",
        "h-1-1-abcdef",
        "p-12-7d8e9a",
        "t-5-0a1b2c",
        "c-7-deadbe",
        "f-9-001122",
        # 手写 fallback：hash 段含 -
        "h-2-3-ri-domains",
        "p-4-multi-word-name",
    ]

    def _extract_ts_regex(self, rel: str, const_name: str) -> str:
        """从 TS 源抓 `const <name> = /<pattern>/<flags>;` 的 pattern。"""
        text = _read_ts(rel)
        m = re.search(
            rf"\b(?:export\s+)?const\s+{re.escape(const_name)}\s*=\s*/(.+?)/[gimsuy]*\s*;",
            text,
        )
        assert m, f"在 {rel} 中找不到 {const_name} 定义"
        return m.group(1)

    def test_inline_anchor_re_matches_samples(self):
        """markdown.ts 的 INLINE_ANCHOR_RE 必须匹配每个锚点样本（前导空格 + ^前缀）。"""
        pattern = self._extract_ts_regex("web/lib/markdown.ts", "INLINE_ANCHOR_RE")
        # TS 正则与 Python 在这些字符类 / 量词上同义，可直接编译
        rx = re.compile(pattern)
        for anchor in self.SAMPLE_ANCHORS:
            text = f"正文内容 ^{anchor}"
            assert rx.search(text), (
                f"INLINE_ANCHOR_RE 匹配不到 convert.py 锚点样本 '^{anchor}'：\n"
                f"  pattern: {pattern}\n"
                "convert.py 锚点格式或 web 正则发生 drift。"
            )

    def test_trailing_anchor_re_matches_samples(self):
        """markdown-render.ts 的 TRAILING_ANCHOR_RE 必须从行末抽出锚点 + 前置文本。"""
        pattern = self._extract_ts_regex(
            "web/lib/markdown-render.ts", "TRAILING_ANCHOR_RE"
        )
        rx = re.compile(pattern)
        for anchor in self.SAMPLE_ANCHORS:
            text = f"实验结果 ^{anchor}"
            m = rx.match(text)
            assert m, (
                f"TRAILING_ANCHOR_RE 匹配不到 convert.py 锚点样本 '^{anchor}'：\n"
                f"  pattern: {pattern}\n"
                "convert.py 锚点格式或 web 正则发生 drift。"
            )
            assert m.group(1) == "实验结果", (
                f"TRAILING_ANCHOR_RE 抽取的前置文本错误：期望 '实验结果'，得到 {m.group(1)!r}"
            )
            assert m.group(2) == anchor, (
                f"TRAILING_ANCHOR_RE 抽取的 anchor 错误：期望 {anchor!r}，得到 {m.group(2)!r}"
            )

    def test_non_anchor_text_not_matched(self):
        """负样本：普通行末文本不应被 TRAILING_ANCHOR_RE 误判为锚点。"""
        pattern = self._extract_ts_regex(
            "web/lib/markdown-render.ts", "TRAILING_ANCHOR_RE"
        )
        rx = re.compile(pattern)
        for text in ["普通段落没有锚点", "见 ^x-1-2-3 这种非法前缀", "价格 ^p-abc（缺序号）"]:
            assert not rx.match(text), (
                f"TRAILING_ANCHOR_RE 误把非锚点文本当锚点：{text!r}"
            )
