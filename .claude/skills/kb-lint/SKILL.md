---
name: kb-lint
description: 知识库周度健康检查工作流——处理 #to-be-updated 积压、补孤儿页面、复核冲突、抽查事实一致性、补缺失概念、生成周报到 wiki/analyses/。当用户提到"健康检查"、"周报"、"lint 知识库"、"清理积压"、"知识库体检"时使用此 skill。
---

# 知识库周度健康检查工作流（kb-lint）

你现在是知识库的 **运维专家**。系统性地检查所有健康度问题，处理积压，把状态摆正。

> **Workspace 前提（必读）**：数据层按主题隔离在 `workspaces/<name>/` 下。本文中所有 `wiki/`、`raw/`、`exports/`、`log.md` 路径均**相对于当前 workspace**，实际位于 `workspaces/<name>/`（如 `workspaces/smb-ecommerce/wiki/analyses/...`）。
> - 默认 workspace 为 `smb-ecommerce`，不显式指定时即用它。
> - `k.py` 用 `--workspace <name>` 指定 workspace（参数紧跟脚本名，如 `python scripts/k.py --workspace smb-ecommerce health --json`）。
> - `Read` / `Edit` / `Write` 与 `git add` 必须用**带 workspace 的全路径**（如 `Write workspaces/smb-ecommerce/wiki/analyses/周报-YYYY-WXX.md`）。
> - 例外：`list-i18n-violations` 扫的是引擎根的 `web/` 目录（i18n 是引擎级通用代码，不属于任何 workspace 数据层），与 workspace 无关。
> - 下文示例为可读性写成裸路径形式（`wiki/...` / `raw/...`），落地执行时一律替换为 `workspaces/<name>/...`，k.py 命令加上 `--workspace <name>`。

**核心原则**：
- 先看全局健康度，再决定优先处理什么
- 处理 = 实际改写文件（追加内容、删除标签、修正引用），不只是"列出问题"
- 周报必须产出，归档到 `wiki/analyses/周报-YYYY-WXX.md`

---

## 第 1 步：拉取健康度全景

```bash
python scripts/k.py health --json
```

逐项记下健康度指标（以 `health --json` 的实际输出为准，下面是当前各指标含义；指标数量随工具演进可能增减，**不要写死"几个数字"**）：
- 总页面数（`total_pages`）
- 孤儿页面数（`orphans_count`）
- 未决冲突数（`conflicts_count`）
- `#to-be-updated` 积压数（`to_update_count`）
- 低 confidence 页面数（`low_confidence_count`）
- Stale draft 数（`stale_drafts_count`，>30 天未改的 draft）
- 失效引用数（`broken_refs_count`，`[[raw/...#^anchor]]` 命不中；`broken_refs_by_reason` 进一步拆 "raw 文件不存在" / "anchor 不存在" 两种治法）
- 被引用但缺章节摘要（`unsummarized_sections_count`，被 wiki 章节引用但 outline.json 中 `agent_summary` 为 null 的章节）
- 裸论断（`bare_claims_count`，含数字但无引用支撑的段落）
- 索引 page_count drift（`index_count_mismatches_count`，type=index 页声明的 page_count 与 scope 实际匹配数不等）
- **source_count 一致性问题（`source_issues_count`，六类：count-mismatch / missing-source / analysis-undersourced / source-summary-mismatch / broken-source-link / declared-but-uncited — 详见 CLAUDE.md "source_count 字段约定" 与本文第 6d 步）**
- **关系类型问题（`relation_issues_count`，`[[X|RELATION]]` 中非标准关系类型词——拼写错误 / 未在白名单，详见 CLAUDE.md "关系类型语法"）**
- **Web i18n 违规（`i18n_violations_count`，web/ 下硬编码中文 UI 字符串，违反 CLAUDE.md "Web 管理台国际化方案"）**

## 第 2 步：处理 `#to-be-updated` 积压

```bash
python scripts/k.py list-to-update --json
```

**对每条 to-be-updated**：

1. `Read` 该页面，看底部的 `#to-be-updated` 标签注释（哪个来源触发的）
2. `Read` 触发来源（通常是 `wiki/sources/<X>.md`）
3. 判断：
   - 来源信息是否影响本页核心论断？
   - 应该更新哪些段落？
4. 用 `Edit`：
   - 在相关段落集成新信息（带引用）
   - 删除底部的 `#to-be-updated` 注释
   - 更新 frontmatter 的 `last_modified`、`source_count`、`sources`

**如果某条 to-be-updated 实际上不需要更新**（评估后发现来源对本页无影响）：
- 删除 `#to-be-updated` 标签
- 在 log.md 记一条 "lint: 评估后判定 X 无需更新"

## 第 3 步：处理孤儿页面

```bash
python scripts/k.py list-orphans --json
```

**对每个孤儿**，判断 4 种情况：

| 情况 | 处理 |
|---|---|
| 应该被某个 MOC 索引列出 | `Edit` 对应的 `wiki/indexes/<X>_index.md` 加链接 |
| 应该被某个相关页面引用 | `Edit` 那个页面加 `[[<orphan>]]` |
| 是过时内容、无需保留 | `Edit` frontmatter 改 `status: deprecated`（不真删！） |
| 确实是新独立主题、还没人引用 | 暂时保留，加到下一次相关 ingest 时建立链接 |

## 第 4 步：复核冲突

```bash
python scripts/k.py list-conflicts --json
```

**对每个冲突**：
1. 看冲突块内容（旧观点 vs 新证据 vs LLM 判断）
2. 评估：是否有新的来源能解决？是否需要做更深入的分析？
3. **不要替用户决定**——冲突的最终判别属于人类
4. 如果该冲突已经超过 30 天未决，在周报中"待人类判别"区列出，**着重提醒**

## 第 5 步：fact-check + 裸论断扫描

### 5a. 自动扫"裸论断"（含数字但无引用支撑）

```bash
python scripts/k.py list-bare-claims --json
```

判别标准：含 `\d+%` / `\d+B 参数` / `2017 年` / `28.4 BLEU` 等具体数据，但段落里既没有 `[[raw/...]]` / `[[wiki/sources/...]]` 引用，也没有 `[需要来源]` 占位。

**对每条裸论断**：
- 如果能立刻定位 raw 来源 → `Edit` 给段落补 `[[raw/<file>#^<anchor>]]`（可用 `python scripts/k.py find-anchor raw/<file>.md "<片段>"` 反查 anchor）
- 如果暂时找不到来源 → `Edit` 段落末加 `[需要来源]` 占位（CLAUDE.md 推荐的诚实标注）
- 如果数字是上下文性提及（如"2017 年"指 Transformer 提出年）而非论断 → 也加 `[需要来源]` 让占位显式化

> **目的**：把"无声的裸论断"逐步转为"有声的占位"，等真正的 raw 入库后能 grep `[需要来源]` 一次性补全。

### 5b. fact-check 抽查

随机选 3-5 个 `wiki/sources/<X>.md`，做事实抽查：

1. `Read` 摘要页
2. 找一条具体数据/论断（如"准确率 95.3%"）
3. `Read` 它引用的 `[[raw/...#^anchor]]`
4. 验证引用对应的原文是否真的支持这个数字

如果发现不一致：
- 手写 `> [!WARNING] 知识更新冲突` 块（详见 CLAUDE.md "冲突处理规范"），不要默默修正
- 在周报中列出

## 第 5c 步：partial re-ingest 升级候选检测

第 ③ 档长文档的 ⊙ 扫读章节随时间可能"应该升级"——当它在 wiki 中被高频引用却没有论证细节支撑时，就是典型升级信号。lint 流程负责**标出候选**，**不擅自升级**（升级动作由人类在 web 端触发，或下次相关 query 自然触发）。

```bash
# 列出所有 source_summary
python scripts/k.py list-pages --type=source_summary --json
```

**对每个 source_summary**：

1. `Read` 该页，找 `## 章节深度登记` H2 节（无此节即跳过——说明是第 ① / ② 档全读）
2. 对每条 ⊙ 扫读 行，提取章节 `原标题` 的关键词
3. ```bash
   python scripts/k.py search "<章节关键词>" --json
   ```
   看 wiki 中有多少页面提到该主题
4. **判定升级候选**：

   | 命中 wiki 页面数 | 含 high-confidence concept 页 | 判定 |
   |---|---|---|
   | ≥ 3 | 任意 | **强升级信号** → 周报"待升级"区列出 |
   | 1-2 | 是 | 中等信号 → 周报参考区列出 |
   | 1-2 | 否 | 弱信号 → 暂缓 |
   | 0 | — | 无需升级 |

5. 周报中"待 partial re-ingest 升级"区按上面分级列出，每条包含：
   - 摘要页 + 章节 anchor 链接（`[[wiki/sources/<X>#章节深度登记]]` + `^h-2-3-...`）
   - 章节原标题
   - 命中的 wiki 页面清单
   - 触发原因摘要

> **lint 不擅自升级**——只标候选。升级由人类决策（也可能等下一次 kb-query 命中关键词时自然触发）。

## 第 6 步：检查缺失的概念页

```bash
python scripts/k.py search "<某高频被提及的概念>" --json
```

如果某概念在多个页面被 `[[X]]` 引用但还没有独立页面（看 `list-orphans` 反过来——被引用但找不到目标）：
- 在周报中列出"待补建"
- **不要擅自创建**——人类可能已有判断

## 第 6c 步：处理 Web i18n 违规

```bash
python scripts/k.py list-i18n-violations --json
```

扫描 `web/` 下 `.tsx` 文件，找硬编码的中文 UI 字符串（`<button>中文</button>` / `placeholder="中文"` / `aria-label="中文"` 等）。CLAUDE.md "Web 管理台国际化方案" 明令所有 UI 字符串走 `t()` / `useT()`，硬编码会让英文用户看不懂。

**对每条违规**：
1. 在 `web/lib/i18n.ts` 的 `TRANSLATIONS.zh` 与 `.en` 同时加 key + 翻译（i18n.ts 的 TS 类型会强约束两边对称）
2. 把 `.tsx` 中的硬编码字符串改为：
   - Server component：`{t("key", locale)}`（locale 从 `getServerLocale()` 拿）
   - Client component：`{t("key")}`（t 来自 `useT()`）

跳过：注释中的中文、`web/app/api/` 下的 API 响应（不是 UI 层）、`i18n.ts` / `i18n-client.tsx` / `LocaleSwitcher.tsx`（基建自身允许硬编码 中/EN 切换）。

## 第 6b 步：处理索引 page_count drift

```bash
python scripts/k.py list-index-mismatches --json
```

对每个不一致：
- **delta > 0（实际多于声明）**：索引漏列了页面 → `Edit` 索引 md，把缺的 `[[页面]]` 链接补进相应分类，并把 `page_count` 改为实际数
- **delta < 0（实际少于声明）**：scope 写宽了 / 旧页面 deprecate 但 page_count 没改 → `Edit` 索引 md 重写 scope 或更新 page_count
- **特殊：root_index `wiki/**` 是否包含 root_index 自身**：本工具默认把索引页自身从 scope 中排除，因此 root_index page_count 应等于 wiki/ 下其它所有页面数

## 第 6d 步：处理 source_count 一致性问题

```bash
python scripts/k.py list-source-issues --json
```

工具会把问题分六类输出：

**count-mismatch**（`source_count` 字段值 ≠ `sources` 数组长度）：
- 一定是写错了；`Edit` 改 `source_count` 为实际数组长度

**missing-source**（论断型页面 source_count == 0 但未标 stub）：
- 判断 3 种情况：
  - 这页应该有 source（典型 concept / entity）：`Edit` ingest 一个 raw → 加 source_summary → 把链接加入 sources 数组 → 改 source_count
  - 这页**确实暂未 ingest**（占位 stub）：`Edit` frontmatter 给 tags 加 `to-be-updated` 或 `stub`，并在正文加 stub 说明节
  - 这页不该是 concept/entity（也许该是 index 或 stub 内容已废）：改 type 或 status: deprecated

**analysis-undersourced**（`analysis` / `comparison` 类型 source_count < 2 但未标 stub）：
- 跨文档综合的本质就是综合多个来源，单 source 的 "analysis" 不成立
- 处理 2 种情况：
  - 应该是 analysis 但来源不够：补 1+ 个额外 source（去 ingest 相关 raw 或在现有 wiki 中找辅证文档）
  - 实际只是单源的派生分析（不该叫 analysis）：改 type 为 `concept` 或 `comparison`，或直接合到那个唯一 source 的 source_summary 「## AI 综合判断」节

**source-summary-mismatch**（type=source_summary 但 source_count != 1）：
- source_summary 应绑定恰好 1 个 raw 文件
- 如果是 0：说明没绑 raw → 应补 ingest 或改 type
- 如果是 ≥ 2：说明这页其实是综合，应改 type=analysis 而非 source_summary

**broken-source-link**（`sources` 数组里某条链接目标文件不存在）：
- 4 种治法：
  - 路径拼写错（典型：`[[wiki/source/X]]` 漏 s）：`Edit` 改对
  - 文件被归档了：把链接更新到 `wiki/_archive_*/...` 对应位置，或者**移出 sources 数组**（因为归档区不应作为活跃来源）
  - 文件被重命名了：用 `git log -- <旧路径>` 找到新位置，更新引用
  - 文件根本没 ingest（前 ingest 占位）：移出 sources 数组 + 加 `#to-be-updated` 标签等待 ingest

**declared-but-uncited**（论断型页面声明了 sources 但正文无块级引用）：
- 这是**语义层**缺陷：frontmatter 说"我有 N 个 source"但正文论断没真的 anchor 到它们
- 修复：在论断段落补 `[[raw/<file>#^<anchor>]]` 或 `[[wiki/sources/<X>#^<anchor>]]` 引用
  - 用 `python scripts/k.py find-anchor raw/<file>.md "<原文片段>"` 反查具体段的 anchor
  - 优先用 `[[raw/...#^anchor]]`（一手出处）而非 `[[wiki/sources/X]]`（二手摘要）—— 前者引用粒度更强

## 第 6e 步：处理失效引用（broken refs）

```bash
python scripts/k.py list-broken-refs --json
```

扫描 `wiki/` 中失效的 `[[raw/...#^anchor]]` 引用（对应 health 的 `broken_refs_count`；`broken_refs_by_reason` 拆两种原因）。**按原因分治**：

| 原因 | 处理 |
|---|---|
| **raw 文件不存在**（`raw 文件不存在`） | 文件被重命名/移动：用 `git log -- <旧路径>` 找新位置，`Edit` 改对引用路径；确属未 ingest 占位：把引用改成 `[需要来源]` 并给该页加 `#to-be-updated` 等待 ingest |
| **anchor 不存在**（`anchor 不存在`） | 通常是 raw 内容微调后 hash6 重算导致 anchor 漂移。用 `python scripts/k.py find-anchor raw/<file>.md "<原文片段>"` 反查当前 anchor，`Edit` 把引用更新为新 anchor |

> 失效引用会让"溯源链断裂"——论断声称有出处但点过去是空的，是知识库可信度的直接损伤，每周必清。

## 第 6f 步：处理缺章节摘要（unsummarized sections）

```bash
python scripts/k.py list-unsummarized --json
```

列出**被 wiki 章节引用、但 `.outline.json` 中 `agent_summary` 仍为 null** 的 raw 章节（对应 health 的 `unsummarized_sections_count`）。这些是 ingest 时漏回填精排摘要的章节——被引用却没有"这节讲了什么"的索引。

**对每条**：
1. `Read` 或 `read-section` 该 raw 章节，理解其内容
2. 调 `annotate-section` 回填精排摘要（这是受控写入派生层 `agent_summary` 字段，允许且必需）：
   ```bash
   python scripts/k.py annotate-section raw/<file>.md <anchor> "本节论证..."
   ```

> annotate-section 写 `agent_summary` 是 ingest 的必经步骤；本步是对历史遗漏的补课，**不是**手改 `.outline.json` 的其它内容（那仍被禁止）。

## 第 6g 步：处理关系类型问题（relation issues）

```bash
python scripts/k.py list-relation-issues --json
```

扫描 `[[X|RELATION]]` 三段链接中**看起来像关系类型、但不在白名单**的词（对应 health 的 `relation_issues_count`；典型是拼写错误 `SUPORTS` 或用了非标准词 `IMPLEMENTS`）。白名单 7 个：`SUPPORTS` / `REFUTES` / `EXTENDS` / `IS_A` / `PART_OF` / `ALTERNATIVE_TO` / `CITES`（详见 CLAUDE.md "关系类型语法"）。

**对每条**：
1. `Read` 该页，看上下文判断作者本意是哪种标准关系
2. `Edit` 改为白名单内的正确关系词（如 `SUPORTS` → `SUPPORTS`、`IMPLEMENTS` → 视语义改 `EXTENDS` 或 `PART_OF`）
3. 若本意确实不是关系类型而是普通显示别名（中文/含空格/小写）→ 工具不会报它；若工具误报，说明它被大写无空格地写成了疑似关系词，按显示别名意图改成不触发判别的形式（如加空格或小写）

> 修对后这些边会在 `/graph` 图谱里正确染色（`SUPPORTS` 绿 / `REFUTES` 红 / …）；写错的关系词会被当成无语义别名，丢失图谱分析价值。

## 第 7 步：生成周报

确定本周序号（ISO 周）：

```bash
python -c "from datetime import date; print(f'W{date.today().isocalendar().week:02d}')"
```

`Write` `wiki/analyses/周报-YYYY-WXX.md`：

```yaml
---
title: "知识库周报 YYYY-WXX"
type: analysis
created_date: 2026-04-28
last_modified: 2026-04-28
last_modified_by: LLM
status: draft
confidence: high
source_count: 0
sources: []
tags:
  - lint
  - 周报
---

# 知识库周报 YYYY-WXX

## 健康度快照
| 指标 | 数量 |
|---|---|
| 总页面 | <N> |
| 孤儿（无入链） | <N> |
| 未决冲突 | <N> |
| `#to-be-updated` 积压 | <N> |
| 低 confidence | <N> |
| Stale draft | <N> |
| ⊙ 扫读章节待升级（强信号） | <N> |

## 本周处理
- 处理 `#to-be-updated`：<N> 条 → <列出页面>
- 修复孤儿：<N> 个 → <列出页面与处理方式>
- fact-check 通过：<N> 条
- fact-check 发现不一致：<N> 条 → <已标注冲突的页面>

## 待人类判别
<对所有未决冲突列表，每条带链接和摘要>
- [[wiki/concepts/<X>]]：<冲突摘要>

## 待 partial re-ingest 升级
<第 ③ 档长文档中 ⊙ 扫读章节的强升级候选；详见第 5c 步>
- [[wiki/sources/<X>#章节深度登记]] 的 `^h-2-3-...` "<原标题>" —— 命中 [[wiki/concepts/A]] / [[wiki/concepts/B]] / [[wiki/concepts/C]]，建议升级
- ...

## 待补建（缺失概念）
- <概念名>：被引用 N 次，建议下次相关 ingest 时建立独立页

## 反例洞察
<如有：本周发现的写法/流程问题>
```

## 第 8 步：追加 log + commit

`Edit` log.md 头部插入：

```markdown
## [2026-04-28] lint | 周度健康检查 WXX
- 处理积压：<N> 条
- 修复孤儿：<N> 个
- fact-check：<N>/<N> 通过
- 待人类判别冲突：<N> 条
- 产出：`wiki/analyses/周报-YYYY-WXX.md`
```

```bash
# 路径用带 workspace 的全路径（默认 workspace 为 smb-ecommerce）
git add workspaces/<name>/wiki/analyses/周报-*.md workspaces/<name>/wiki/concepts/*.md \
        workspaces/<name>/wiki/indexes/*.md workspaces/<name>/log.md
git commit -m "lint: 周度健康检查 WXX"
```

---

## 完成检查清单

- [ ] 跑了 health 拿到全景
- [ ] 处理了 to-be-updated 积压（或在周报中说明为什么没处理）
- [ ] 处理了孤儿页面（4 种处理方式之一）
- [ ] 复核了所有未决冲突
- [ ] 抽查了 3-5 个事实
- [ ] 扫描了 source_summary 的章节登记表，标出 partial re-ingest 升级候选
- [ ] 处理了 source_count 一致性问题（list-source-issues 六类）
- [ ] 处理了失效引用（list-broken-refs，按"raw 不存在 / anchor 不存在"分治）
- [ ] 处理了缺章节摘要（list-unsummarized，annotate-section 回填）
- [ ] 处理了关系类型问题（list-relation-issues，改到白名单内）
- [ ] 周报已写入 analyses/
- [ ] log 追加完成
- [ ] git commit 出现 `lint: ...`

## 反例

- ❌ 只列问题不处理（lint 不是审计，是执行）
- ❌ 替用户决定冲突（必须留给人类判别）
- ❌ 擅自删除页面（应改 status: deprecated）
- ❌ 跳过 fact-check（这是知识库可信度的根基）
