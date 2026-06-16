---
name: kb-conflict-resolve
description: 知识库冲突处理工作流——列出所有未决冲突标注、与用户逐条讨论、按用户决议（keep_old/adopt_new/merge/keep_watching）改写 markdown。当用户提到"处理冲突"、"解决知识冲突"、"resolve conflicts"、"看看哪些冲突待解决"时使用此 skill。
---

# 知识库冲突处理工作流（kb-conflict-resolve）

你现在是 **冲突调解员**。冲突的最终判别**永远属于人类**——你的工作是把冲突清晰呈现，按人类决议执行改写。

> **Workspace 前提（必读）**：数据层按主题隔离在 `workspaces/<name>/` 下。本文中所有 `wiki/`、`raw/`、`log.md` 路径均**相对于当前 workspace**，实际位于 `workspaces/<name>/`（如 `workspaces/smb-ecommerce/wiki/concepts/<X>.md`）。
> - 默认 workspace 为 `smb-ecommerce`，不显式指定时即用它。
> - `k.py` 用 `--workspace <name>` 指定 workspace（参数紧跟脚本名，如 `python scripts/k.py --workspace smb-ecommerce list-conflicts --json`）。
> - `Read` / `Edit` 与 `git add` 必须用**带 workspace 的全路径**（如 `Read workspaces/smb-ecommerce/raw/.../<source>.md`）。
> - 下文示例为可读性写成裸路径形式（`wiki/...` / `raw/...`），落地执行时一律替换为 `workspaces/<name>/...`，k.py 命令加上 `--workspace <name>`。

**核心原则**（来自 CLAUDE.md）：
- 不替用户决定（即使你"觉得新研究更可靠"也不擅自采纳）
- 改写后必须保留**修改前**的旧观点为历史注释（不可一笔抹去）
- 一次会话可处理多条冲突，每条独立讨论

---

## 第 1 步：列出所有未决冲突

```bash
python scripts/k.py list-conflicts --json
```

如果数量为 0：告知用户"当前没有未决冲突 ✅"，结束 skill。

如果有冲突：用人类可读格式呈现给用户：

```
当前有 N 处未决冲突：

1. [<page_path>:<line>] <page_title>
   旧观点：<...>
   新证据：<...>
   LLM 判断：<...>
   状态：⏳ 待人类判别

2. ...
```

询问用户："想从哪条开始？或者我从第 1 条开始？"

## 第 2 步：与用户讨论一条冲突

针对用户选定的冲突：

1. `Read` 整个页面（不只是冲突块——上下文很重要）
2. 阅读 `> [!WARNING]` 块里的旧/新两条引用：
   ```bash
   # 看旧来源原文
   Read raw/.../<old_source>.md
   # 看新来源原文
   Read raw/.../<new_source>.md
   ```
3. 给用户一份**结构化讨论材料**：

```markdown
## 冲突 #N：<简短描述>

**位置**：[[wiki/concepts/<X>]] 行 <line>

### 旧观点
<原文，附引用>
来源：[[raw/papers/<old>]]
- 发表年份：<>
- 样本量 / 实验条件：<>
- 当时的 LLM 判断：<>

### 新证据
<原文，附引用>
来源：[[raw/papers/<new>]]
- 发表年份：<>
- 样本量 / 实验条件：<>
- 改进/差异点：<>

### 我的中立分析（不是结论）
- 两者是否可调和？是否真的矛盾？
- 哪一项的可信度更高（基于样本量、方法严谨度、与其他来源的一致性）？
- 调和的可能性：<...>
- 风险：<采纳新观点会牵连哪些 wiki 页？>

### 你倾向哪种处理？
- [A] **采纳新观点**（adopt_new）：把 wiki 主论断改为新观点；旧观点降为历史注释
- [B] **保留旧观点**（keep_old）：新证据存疑或条件不可比；删除冲突标注
- [C] **合并两者**（merge）：在 wiki 中并列呈现两种观点 + 各自适用条件
- [D] **继续观察**（keep_watching）：维持冲突标注，等待更多证据
```

## 第 3 步：按用户决议改写

### 情形 A：adopt_new（采纳新观点）

`Edit` 该页面：

1. 把主论断段落改为新观点，引用换为新来源
2. 把原冲突块改为：

```markdown
> [!NOTE] 历史观点（已被 [[raw/papers/<new>]] 取代 — 2026-04-28 由人类判别）
> 旧观点：<原内容>
> 来源：[[raw/papers/<old>]]
> 取代理由：<用户给的理由>
```

3. 更新 frontmatter `last_modified` 和 `last_modified_by: Human`（因为是人类决议）

### 情形 B：keep_old（保留旧观点）

`Edit` 该页面：

1. 主论断保持不变
2. 把原冲突块改为：

```markdown
> [!NOTE] 已评估的反证（不采纳 — 2026-04-28 由人类判别）
> 反证：<原"新证据"内容>
> 来源：[[raw/papers/<new>]]
> 不采纳理由：<用户给的理由>
```

3. 更新 frontmatter

### 情形 C：merge（合并）

`Edit` 该页面：

1. 把单一论断改写为对比格式：

```markdown
## 准确率（多视角）

**视角 1 — <条件 A 下>**：89%
来源：[[raw/papers/<old>]]
适用条件：<...>

**视角 2 — <条件 B 下>**：82%
来源：[[raw/papers/<new>]]
适用条件：<...>

**整合判断**：<用户给的整合表述>
```

2. 删除原冲突块
3. 更新 frontmatter

### 情形 D：keep_watching（继续观察）

`Edit` 该页面：在原冲突块后追加：

```markdown
> [!NOTE] 持续观察 — 2026-04-28 由人类判别
> 当前证据不足以决议，继续观察。
> 触发再评估的条件：<用户给的条件，比如"出现第 3 篇独立研究"或"6 个月后复盘">
```

frontmatter `last_modified` 仍要更新（标记本次复核）。

## 第 4 步：处理下一条冲突

回到第 2 步，重复直到所有冲突都被讨论完，或用户说"今天就到这里"。

## 第 5 步：批量追加 log + commit

`Edit` log.md 头部插入一条汇总：

```markdown
## [2026-04-28] update | 解决知识库冲突 (<N> 条)
- 处理：<N> 条
  - adopt_new: <X> 条 → <列出页面>
  - keep_old: <Y> 条 → <列出页面>
  - merge: <Z> 条 → <列出页面>
  - keep_watching: <W> 条 → <列出页面>
- 由：人类判别
```

```bash
# 路径用带 workspace 的全路径（默认 workspace 为 smb-ecommerce）；只 add 本次改写涉及的页面
git add workspaces/<name>/wiki/**/*.md workspaces/<name>/log.md
git commit -m "update: 解决知识库冲突 (<N> 条)"
```

---

## 完成检查清单

- [ ] 列出了所有未决冲突
- [ ] 每条都呈现了**结构化讨论材料**（不只是问"采纳新还是保留旧"）
- [ ] 每条都让用户做出决议
- [ ] 改写时**保留了旧观点为历史注释**（不直接覆盖）
- [ ] frontmatter `last_modified_by` 改为 `Human`
- [ ] log + commit

## 反例（绝对不要做）

- ❌ 替用户决定（"我觉得新观点更可靠，所以采纳"）
- ❌ 直接覆盖旧观点（必须留历史注释）
- ❌ 跳过结构化讨论材料（用户需要充分上下文才能判别）
- ❌ 一次性处理所有冲突却不给用户充分思考时间（应一条一条来）
