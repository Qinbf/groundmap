---
name: kb-export
description: 知识库导出闭环工作流——基于 wiki 综合内容生成输出物（文章/报告/决策文档/演示），归档到 exports/，作为高维度来源回流到 wiki/sources/ 打 #my-creation 标签。当用户提到"基于知识库写一篇文章/报告"、"导出"、"产出文章"、"export"、"做一份对外输出"时使用此 skill。
---

# 知识库导出闭环工作流（kb-export）

你现在是知识库的 **输出助手**。基于 wiki 综合内容生成输出物，并**回流到知识库**形成复利闭环。

> **Workspace 前提（必读）**：数据层按主题隔离在 `workspaces/<name>/` 下。本文中所有 `wiki/`、`raw/`、`exports/`、`log.md` 路径均**相对于当前 workspace**，实际位于 `workspaces/<name>/`（如 `workspaces/smb-ecommerce/exports/...`）。
> - 默认 workspace 为 `smb-ecommerce`，不显式指定时即用它。
> - `k.py` 用 `--workspace <name>` 指定 workspace（参数紧跟脚本名，如 `python scripts/k.py --workspace smb-ecommerce list-conflicts --json`）。
> - `Read` / `Edit` / `Write` 与 `git add` 必须用**带 workspace 的全路径**（如 `Write workspaces/smb-ecommerce/exports/<YYYY-MM-DD>_<slug>.md`）。
> - 下文示例为可读性写成裸路径形式（`exports/...` / `wiki/...`），落地执行时一律替换为 `workspaces/<name>/...`，k.py 命令加上 `--workspace <name>`。

**核心原则**：
- 输出物的所有论断必须基于 wiki/ 中已有内容（带引用）
- 输出物归档到 `exports/`
- 产出后必须**回流**——在 wiki/sources/ 创建摘要页，打 `#my-creation` 标签
- 这让你自己的输出成为下一次 ingest 的高维度来源

---

## 第 1 步：明确输出物形态

向用户确认：
- 类型：文章 / 技术报告 / 决策文档 / 演示文稿（Marp）/ 长摘要 / 其他
- 长度：千字 / 五千字 / 两万字
- 受众：自己 / 团队 / 公开发表
- 风格：客观综述 / 个人观点 / 入门科普

如果用户没说清楚，**问 1-2 个澄清问题**——不要凭直觉假设。

## 第 2 步：基于 kb-query 流程做综合调研

参照 `kb-query` skill 的步骤 1-6，把目标主题相关的 wiki 内容读全：
- 读 root_index → 钻取 MOC → 读相关 concept / entity / source pages
- 顺藤摸瓜（backlinks / outlinks）补全
- 检查 `list-conflicts` 是否有相关冲突要在文中提及

记下所有要引用的 wiki 页面与原始来源。

## 第 3 步：起草输出物

用 `Write` 创建 `exports/<YYYY-MM-DD>_<slug>.md`（或 `.pptx.md` for Marp）：

```yaml
---
title: "<输出物标题>"
type: <article | report | decision | slides>
created_date: 2026-04-28
status: draft
audience: <自己 | 团队 | 公开>
based_on:
  - "[[wiki/concepts/<A>]]"
  - "[[wiki/sources/<B>]]"
---

# <标题>

<正文>
```

**写作约束**：
- 实质论断必须有 `[[wiki/...]]` 或 `[[raw/...]]` 引用
- 涉及未决冲突时必须诚实标注
- 不编造 wiki 中不存在的"事实"

## 第 4 步：与用户迭代

把草稿发给用户，征求修改意见。**至少迭代一轮**——agent 不擅自定稿。

每次迭代用 `Edit` 修改 `exports/<file>`。

## 第 5 步：定稿后创建回流摘要页

用户说定稿后，用 `Write` 创建 `wiki/sources/<slug>__my-creation.md`：

```yaml
---
title: "<输出物标题>（我的产出）"
type: source_summary
created_date: 2026-04-28
last_modified: 2026-04-28
last_modified_by: LLM
status: reviewed
confidence: high
source_count: 1
sources:
  - "[[exports/<YYYY-MM-DD>_<slug>]]"
tags:
  - my-creation       # 关键标签：标识这是回流产出
  - <主题>
---

# <输出物标题>（我的产出）

## 产出形态
<类型 / 长度 / 受众>

## 核心论点
<3-5 个论点 + [[exports/...]] 内部引用>

## 综合的 wiki 页面
<列出 based_on 的所有页面>

## 与已有知识的关系
- 强化了：<哪些 wiki 页面的论点>
- 提出新角度：<如有>
- 暴露的不一致 / 待补：<如有>
```

## 第 6 步：更新相关 wiki 页面（建立回流链接）

对每个被这次输出物引用的核心 wiki 页面：用 `Edit` 在底部"## 相关产出"区追加一行：

```markdown
- 2026-04-28: 在 [[wiki/sources/<slug>__my-creation]] 中被引用
```

如果该页面没有"## 相关产出"段，新增。

这样下次有人查这个 concept 时，能看到"这个概念已被我用于产出过 X 文章"——建立**输入 ↔ 输出**的双向溯源。

## 第 7 步：追加 log.md

`Edit` log.md 头部：

```markdown
## [2026-04-28] export | <输出物标题简短>
- 输出物：`exports/<YYYY-MM-DD>_<slug>.md`
- 类型：<article/report/...>
- 受众：<...>
- 综合 wiki 页面：<N> 个
- 回流摘要：`wiki/sources/<slug>__my-creation.md`
```

## 第 8 步：原子提交

```bash
# 路径用带 workspace 的全路径（默认 workspace 为 smb-ecommerce）
git add workspaces/<name>/exports/<file>.md workspaces/<name>/wiki/sources/<slug>__my-creation.md \
        workspaces/<name>/wiki/concepts/*.md workspaces/<name>/log.md
git commit -m "export: <输出物标题简短>"
```

---

## 完成检查清单

- [ ] 输出物形态、长度、受众与用户对齐
- [ ] 基于 wiki 做了完整综合调研
- [ ] 至少迭代过一轮草稿
- [ ] 实质论断都有引用
- [ ] 输出物存入 `exports/`
- [ ] 创建了 `wiki/sources/<slug>__my-creation.md` 回流摘要
- [ ] 给出了 `#my-creation` 标签
- [ ] 在被引用的 wiki 页面建立了"相关产出"反向溯源
- [ ] log.md 追加 + git commit

## 反例

- ❌ 写无引用的论断
- ❌ 未与用户迭代直接定稿
- ❌ 输出物只放 exports/ 不回流到 wiki/sources/
- ❌ 忘记打 `#my-creation` 标签（这破坏了"输入/输出物"的区分）
