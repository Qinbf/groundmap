---
name: kb-ingest
description: 知识库摄入工作流——把 raw/ 中的新来源转换、阅读、综合到 wiki/，更新核心节点，懒标记次要节点，原子提交。当用户提到"摄入"、"导入"、"添加论文/文章到知识库"、"ingest"、"处理新来源"时使用此 skill。
---

# 知识库摄入工作流（kb-ingest）

你现在是知识库的 **ingest 专家**。严格遵守以下 10 步流程。

> **Workspace 前提（必读）**：数据层按主题隔离在 `workspaces/<name>/` 下。本文中所有 `wiki/`、`raw/`、`exports/`、`log.md` 路径均**相对于当前 workspace**，实际位于 `workspaces/<name>/`（如 `workspaces/smb-ecommerce/wiki/...`）。
> - 默认 workspace 为 `smb-ecommerce`，不显式指定时即用它（向后兼容）。
> - `k.py` 用 `--workspace <name>` 指定 workspace（参数紧跟在脚本名后，如 `python scripts/k.py --workspace smb-ecommerce outline <raw_path>`）。
> - `convert.py` 同样支持 `--workspace <name>`（默认 `smb-ecommerce`，可被 `KB_WORKSPACE` 环境变量覆盖），默认扫 `workspaces/<name>/raw/`；`--dir <path>` 可显式指定任意目录（给出时覆盖 `--workspace`）。
> - `Read` / `Edit` / `Write` 与 `git add` 必须用**带 workspace 的全路径**（如 `workspaces/smb-ecommerce/wiki/sources/<slug>.md`）。
> - 下文示例为可读性写成裸路径形式（`raw/...` / `wiki/...`），落地执行时一律替换为 `workspaces/<name>/...`，k.py / convert.py 命令加上 `--workspace <name>`。

**先决条件**：用户已经把原始文件放入 `raw/articles/`、`raw/papers/` 或 `raw/assets/`（即 `workspaces/<name>/raw/...`）。如果用户说"摄入这个文件"但还没放进去，先提醒用户把文件放到正确位置再开始。

**核心原则**（来自 AGENTS.md，必须遵守）：
- 不修改 `raw/` 中的任何文件（只读它们）
- 所有实质性论断必须附 `[[raw/...]]` 块级引用
- 标记 `#to-be-updated` 而不是当场更新所有受影响页面
- 一次完整 ingest = 一个 git commit

---

## 第 1 步：转换为 markdown + 生成大纲

无论原始文件是 PDF / DOCX / PPTX / 网页，还是已是 `.md`：

```bash
# 指定目标 workspace（不带 --workspace 时默认 smb-ecommerce）
python scripts/convert.py --workspace <name>
```

`convert.py` 会自动：
- 把非文本格式转换为 `.md`
- 给所有 heading / paragraph / table / code / figure 加稳定锚点（`^h-`/`^p-`/`^t-`/`^c-`/`^f-`）
- 生成 `.outline.json`（章节树 + 每节首段 200 字预览）

如果只想处理某 workspace 的某个子目录，用 `--dir` 显式指定（给出时覆盖 `--workspace`）：`python scripts/convert.py --dir workspaces/<name>/raw/papers`。

## 第 2 步：看大纲，AI 自动决定阅读策略

```bash
python scripts/k.py outline raw/papers/<file>.md
```

输出会显示：总字符数、章节嵌套树、每节预览（首段抽取）。

**按字符数三档分级**（agent 自决，不询问用户）：

| 档 | 字数（中文等价） | 策略 | 综合保真度 |
|---|---|---|---|
| ① 短文 | < 30K | 一次 Read 全文 | 高 |
| ② 中长文 | 30K – 150K（论文 / 报告 / 长文） | 按 H1 切块、每块 ≤ 30K，分段 Read，每段读完调 annotate-section | 高（多步但不漏信息） |
| ③ 整本书规模 | > 150K（专著 / 法规全文 / 长篇手册） | TOC 扫全 + AI 决定深读章节；**全部章节**登记到 source_summary 章节登记表 | 中（透明声明深度差异，保留 partial re-ingest 升级路径） |

> 英文文档按 `字符数 × 0.5` 估算中文等价（英文 1 token ≈ 4 char，中文 1 token ≈ 1.5-2 char）。
> 单次 Read 严格控制在 30K 中文字符内——避免 LLM "lost in the middle" 衰减。

### 第 ① 档：短文一次读完

```bash
# Read 工具直接读全文
```
① 档不强制 `annotate-section` 分段回填（建议至少给主要 H2 回填一句摘要，非硬性）。跳过本节剩余部分，直接进入第 3 步。

### 第 ② 档：中长文分段读

按 H1 章节顺序切块（必要时合并相邻短章节凑近 30K），每块独立 Read：
```bash
python scripts/k.py read-section raw/papers/<file>.md <anchor>
```
**每段读完立刻** `annotate-section` 精排摘要：
```bash
python scripts/k.py annotate-section raw/papers/<file>.md h-2-3-abc123 "本节论证..."
```
最终综合判断（第 3 步）基于**全部章节摘要**，不丢信息。

### 第 ③ 档：长篇文档结构化深度选读

1. **TOC 全扫**（基于 outline.json，零 cost），获取所有章节标题 + preview
2. **AI 自决深度**——根据章节标题 + preview + 当前 wiki 上下文判断：
   - **✓ 深读**：摘要 / 结论 / 关键发现 / 与 wiki 概念有显著重叠的章节
   - **⊙ 扫读**：方法 / 文献综述 / 支持材料类章节，**仅基于 outline preview 形成概览级判断**
   - **× 跳过**：附录 / 致谢 / 参考文献 / 索引等元信息章节
3. 对深读章节走第 ② 档流程（read-section + annotate-section）
4. **关键**：source_summary 的「## 章节深度登记」H2 节按 anchor 列出**全部章节**（详见第 5 步模板），扫读 / 跳过的章节**保留 partial re-ingest 升级路径**（详见后文「增量深化」节）

### 精确取段（任何档都可用）

如果分析中发现需要精确取出某段（比如某个关键数据），调：
```bash
python scripts/k.py read-block raw/papers/<file>.md p-12-7d8e9a
```

## 第 3 步：基于 wiki 现状做综合判断

读完原文后，**不询问用户**——AI 自行综合"本文相对已有知识库提供了什么"。这一步是后续写作（5-7 步）的信息基础，**不能跳过**。

```bash
# 多关键词反查：看 wiki 里有哪些相关页面
python scripts/k.py search "<本文核心概念 1>" --json
python scripts/k.py search "<本文核心概念 2>" --json
python scripts/k.py search "<本文核心概念 3>" --json

# 按类型列出全部 concept 页（建立宏观坐标）
python scripts/k.py list-pages --type=concept --json
```

对每个 hit ≥ 2 的相关页面，**轻量阅读**（不必读全文，看 frontmatter + H1 后第一段即可）：

```bash
python scripts/k.py read-section <wiki/concepts/foo.md> h-1-1-<anchor>
```

综合判断三件事，第 5 步会作为 source_summary 的「## AI 综合判断」节固化下来：

1. **核心价值**：本文相比现有 wiki 提供了什么新东西？
   - 新概念（wiki 里没有的术语 / 框架）
   - 新数据（同一论点的更新数字 / 更大样本）
   - 新视角（已知论点的反对 / 修正 / 拓展）
   - 新争议（与现有论断的矛盾点）

2. **关联**：与哪些 wiki 现有页面有显著重叠？列出 `[[wiki/...]]` 链接，便于后续 backlinks 检索

3. **冲突**：与哪些已有论断存在矛盾？如有，第 5 步在 source_summary 用「冲突标注块」记录（详见 AGENTS.md「冲突处理规范」），由后续 lint 流程或人工 web 端决议

> **自动化的核心**：让 AI 写出来的摘要页"知道周围有什么"，而不是孤立地总结原文。用户随时可在 web 端审计 / 修改 / 用 conflict 工作台覆盖 AI 的判断——自动 ≠ 用户被锁外。

## 第 4 步：决定写作策略

基于第 3 步的综合判断，决定本次 ingest 的写作产物：

| 操作 | 触发条件 | 落实到哪一步 |
|---|---|---|
| **新建独立摘要页** | 核心价值显著、有独特新内容（几乎所有 ingest 都需要） | 第 5 步 |
| **更新现有概念页** | 本文对某个 wiki 概念有补充 / 修正 / 新数据 | 第 6 步（2-3 个最直接的） |
| **标记次要相关页** | 影响存在但不立即重写 | 第 7 步（贴 #to-be-updated） |
| **不操作 / 放弃 ingest** | 本文价值低 / 全部已被 wiki 覆盖 | 写日志说明，无 wiki 改动（极少见） |

通常组合：新建 1 个摘要页 + 更新 2-3 个核心概念页 + 标记 5-10 个次要页。

## 第 5 步：创建来源摘要页

用 `Write` 创建 `wiki/sources/<slug>.md`。**必须包含**：

```yaml
---
title: "原文标题"
type: source_summary
created_date: 2026-04-28      # 今天
last_modified: 2026-04-28
last_modified_by: LLM
status: draft
confidence: high               # 看你对来源可信度的判断
source_count: 1
sources:
  - "[[raw/papers/<file>]]"
tags:
  - <主题标签>
---

# <原文标题>

## 核心论点
<3-5 个论点，每个都附 anchor 引用：[[raw/papers/<file>#^h-2-3-abc123]] 或 [[raw/papers/<file>#^p-12-7d8e9a]]>

## 数据要点
<关键数据，每条附引用 — 用 ^p- 段级精确指向>

## 方法/做法
<如适用，引用方法章节 ^h-...>

## AI 综合判断（基于 wiki 现状）

### 核心价值
<本文相对已有 wiki 提供了什么新东西：新概念 / 新数据 / 新视角 / 新争议>

### 关联
<与哪些 wiki 现有页面有重叠，列 [[wiki/...]] 链接>

### 冲突
<与哪些已有论断矛盾；如有，下方追加 [!WARNING] 冲突标注块>

## 章节深度登记
<仅第 ③ 档（>150K 字符长文档）需要这一节；第 ① ② 档可省略>

| Anchor | 原标题 | 深度 | 备注 |
|---|---|---|---|
| ^h-2-1-... | 摘要 | ✓ 深读 | 已含完整 anchor 引用 |
| ^h-2-2-... | 引言 | ✓ 深读 |  |
| ^h-2-3-... | 方法 | ⊙ 扫读 | 仅基于 outline preview 概览，本次综合不深入 |
| ^h-2-4-... | 实验 | ✓ 深读 | 含数据表 ^t-... |
| ^h-2-5-... | 附录 A | × 跳过 | 元信息（参考文献清单） |

**深度状态约定**：
- ✓ **深读**：完整 read 该章节，提取了 anchor 级引用，可直接被 wiki 论断引用
- ⊙ **扫读**：仅基于 outline preview / 章节标题做概览判断，未读全文；**保留升级路径**——后续可触发 partial re-ingest 升级到深读
- × **跳过**：与 wiki 主题无关或为元信息（附录 / 致谢 / 索引），不计入价值评估，但仍登记可见，避免"消失"
```

**引用规范**：
- 优先用 anchor 形式（`#^h-...` / `#^p-...`）而非 heading 文本
- 整章/整节论证 → `^h-{level}-{seq}-{hash}`
- 关键数据/精确论断 → `^p-{seq}-{hash}`
- 不知道 anchor 时调 `python scripts/k.py find-anchor raw/papers/<file>.md "<原文片段>"` 反查

校验：

```bash
python scripts/k.py validate-frontmatter wiki/sources/<slug>.md
```

## 第 6 步：更新最核心的 2-3 个节点

用 `Edit` 更新最直接受影响的页面（通常 2-3 个）：
- 在相关 H2/H3 段落新增信息（带 `[[raw/...]]` 引用）
- 更新 frontmatter 的 `last_modified` 与 `source_count`
- 在 sources 字段加入新来源

## 第 7 步：标记次要节点为待更新

对于受影响但**不立即更新**的页面（通常 5-10 个）：

```bash
# 先列出可能受影响的
python scripts/k.py search "<相关概念>" --json
```

对每个用 `Edit` 在文件**底部**追加：

```markdown

---
#to-be-updated <YYYY-MM-DD>: 因 [[wiki/sources/<slug>]] 引入的新内容，需更新本页
```

## 第 8 步：更新 MOC（AI 自动判断领域归属）

```bash
# 列出现有所有 MOC（type=index）
python scripts/k.py list-pages --type=index --json
```

**自动判断流程**（agent 自决，不询问用户）：

1. 取 source_summary 的 `tags` 字段（第 5 步写入的）
2. 对每个 tag 反查现有 MOC：
   - 是否有 MOC 的 `scope` glob（frontmatter）命中本次相关页面路径？
   - 是否 MOC 的 title / tags 与本次 tag 重叠？
3. 决策：

| 情况 | 操作 |
|---|---|
| **匹配到现有 MOC** | 在该 MOC 的「近期更新」节追加一条："YYYY-MM-DD: ingest — 新增 [[wiki/sources/<slug>]] 与 [[wiki/concepts/...]]（一两句概括）"；更新 `last_modified` 与 `page_count` |
| **多个候选 MOC** | 选 `scope` 最窄且仍命中的那个（避免污染高层索引） |
| **没匹配到任何 MOC**（首次进入新领域） | 用 `wiki/_templates/index_template.md` 自动新建 `wiki/indexes/<tag>_index.md`：scope 设为 `wiki/concepts/<tag>*` 类似 glob，把新摘要页 + 第 6 步更新过的核心概念页都加进去；同时在 `wiki/root_index.md` 加一行入口 |

> **领域归属的可纠正性**：AI 的自动归属可能选错（比如新领域被错挂到旧 MOC）。这种错误由 lint 流程检测——`k.py list-orphans` 会标出"理论上属于某领域但孤立"的页面，人工 web 端可一键迁移。AI 不卡流程，错了可纠正。

## 第 9 步：追加 log.md

`Edit` `log.md`，在文件**头部**（最近的 `---` 后）插入：

```markdown
## [2026-04-28] ingest | <来源标题简短>
- 来源：`raw/papers/<file>.md`
- 新建：`wiki/sources/<slug>.md`、（如有）`wiki/concepts/<X>.md`
- 更新：`wiki/concepts/<A>.md`、`wiki/concepts/<B>.md`
- 标记待更新：<5-10 个文件>
- MOC：`wiki/indexes/<domain>_index.md`
- 摘要：<一两句核心收获>
```

## 第 10 步：原子提交

```bash
# 仅 add 本次操作涉及的文件，不要用 git add -A
# 注意：raw/ 及其派生产物（.md / .outline.json）默认被 .gitignore 排除（版权与隐私原因），
# 留在本地、不入库——不要 git add 任何 raw 路径（会直接报错 exit 1）
# 路径用带 workspace 的全路径（默认 workspace 为 smb-ecommerce）
git add workspaces/<name>/wiki/sources/<slug>.md workspaces/<name>/wiki/concepts/<X>.md \
        workspaces/<name>/wiki/indexes/<domain>_index.md workspaces/<name>/log.md
git commit -m "ingest: <来源标题简短>"
```

---

## 增量深化（partial re-ingest）

第 ③ 档长文档中标 ⊙ 扫读 / × 跳过 的章节，**保留升级路径**——一次 ingest 不是终点，知识可以按需深化。

**触发场景**：

1. **kb-query 流程发现需要**：query 命中扫读章节的关键词，但 source_summary 没有对应深度内容
2. **kb-lint 流程探测到**：扫读章节在 wiki 中高频被 backlink 引用，但对应内容稀薄
3. **用户主动触发**：在 web 端章节登记表上点击"升级深读"

**partial re-ingest 工作流**（agent 自动执行，不询问用户）：

1. 读取目标章节：
   ```bash
   python scripts/k.py read-section raw/papers/<file>.md <anchor>
   python scripts/k.py annotate-section raw/papers/<file>.md <anchor> "本节论证..."
   ```

2. AI 综合判断该章节相对于 wiki 现状的核心价值（同第 3 步逻辑，但仅针对此章节）

3. **更新现有 source_summary**（不新建）：
   - 在「核心论点」/「数据要点」/「方法/做法」节追加来自该章节的新论断 + anchor 引用
   - 章节登记表：⊙ 扫读 → ✓ 深读，备注栏记录升级日期与触发原因
   - frontmatter：`last_modified` 更新；可选加 `partial_ingest_count: N` 字段

4. 如有新论断影响 wiki/concepts，按第 6/7 步流程更新核心页 / 标 #to-be-updated

5. log.md 记一笔，操作类型为 `partial-ingest`：
   ```markdown
   ## [YYYY-MM-DD] partial-ingest | <来源标题> 章节升级
   - 升级章节：[[wiki/sources/<slug>#章节深度登记]] 中 `^h-2-3-...`（原标题: 方法）
   - 触发原因：query 命中关键词「<X>」但原扫读未深入
   - 新增论断：<一两句概括>
   ```

6. git commit `partial-ingest: <来源> 升级 <章节>`

> partial re-ingest 是 ingest 流程的延伸，不是替代。它确保「扫读」是**延后处理**而不是「永久放弃」——这是知识库可演化的关键。

---

## 完成检查清单

- [ ] `convert.py` 已对原始文件生成 `.md` + `.outline.json`
- [ ] 中长文档（≥30K 字符，即第 ②/③ 档）通过 `outline` → `read-section` 路线分段读取，不是 Read 全文
- [ ] 关键章节已 `annotate-section` 回填精排摘要（②③ 档必经；① 档建议性、非硬性）
- [ ] 摘要页 frontmatter 完整且 `validate-frontmatter` 通过
- [ ] 所有实质性论断都有 `[[raw/...#^h-...]]` 或 `[[raw/...#^p-...]]` anchor 引用，没有"裸论断"，没有用 heading 文本作引用
- [ ] `python scripts/k.py list-broken-refs` 没有新增失效引用
- [ ] 核心节点（2-3 个）已立即更新
- [ ] 次要节点已标记 `#to-be-updated`
- [ ] MOC 索引已更新
- [ ] log.md 追加了完整条目
- [ ] git commit 出现在 `git log` 第一条
- [ ] commit 包含本次 ingest 的所有应入库文件（wiki 改动 + log.md；raw/ 及其派生 .md/.outline.json 默认被 .gitignore 排除、留在本地），没有无关改动

## 错误恢复

如果中途出错：
- 不要 partial commit
- 用 `git status` 查看当前修改
- 必要时用 `git checkout <file>` 撤回单个文件
- 整体撤回未 commit 的修改：与用户确认后用 `git stash` 暂存

## 反例（绝对不要做）

- ❌ 修改 `raw/` 中的**原始文件**（pdf/docx/...）。`raw/**/*.md` 与 `*.outline.json` 是 convert.py 派生物，agent **不要用 Read/Edit/Write 手动改它们**；手改了下次 convert 会被覆盖。
  - **唯一例外**：`k.py annotate-section` 会把精排摘要写入 `.outline.json` 的 `agent_summary` 字段——这是 ②③ 档（分段阅读）ingest 的必经步骤，**允许且必须做**；① 档短文不强制（建议至少给主要 H2 回填一句摘要，非硬性）。区别在于：annotate-section 是通过 k.py 受控写入派生层的特定字段，convert.py 会保留它；而手动 Edit/Write 改 `.md` / `.outline.json` 的其它内容才是被禁止的
- ❌ 对 ≥30K 字符的中长文档（第 ②/③ 档）强行 Read 全文（会爆上下文、触发"lost in the middle"衰减）—— 必须走 `outline → read-section` 路线，单次 Read 严格 ≤30K 中文字符
- ❌ 用 heading 文本作引用（如 `[[raw/foo#方法]]`）—— 必须用 anchor 形式 `[[raw/foo#^h-2-1-abc123]]`
- ❌ 写实质性论断而不附 anchor 级引用
- ❌ 一次性更新所有受影响页面（应懒更新，标记 `#to-be-updated`）
- ❌ 用 `git add -A` 或 `git add .`（可能误提交无关文件）
- ❌ 跳过第 3 步直接进 5-7 步（缺了 wiki 上下文，写出来的摘要页"不知道周围有什么"，会重复造轮子或漏掉冲突）
- ❌ 第 3 / 8 步去问用户「这次核心价值是什么」「该建哪个 MOC」（这两步明确改为 agent 自决；用户的修订路径是 web 端审计与冲突工作台，不是 ingest 时实时打断）
- ❌ 单次 Read 超过 30K 中文字符（"lost in the middle" 衰减；中长文必须按 H1 切块到 ≤30K 再分段读）
- ❌ 第 ③ 档长文档把扫读章节当成「已读」用——query 时若命中扫读章节关键词，应**先看 source_summary 章节登记表确认深度**，必要时触发 partial re-ingest，不能直接拿 outline preview 当真知识
- ❌ 把扫读 / 跳过的章节从 source_summary 章节登记表中省略——所有章节必须可见，省略 = 失去升级路径
- ❌ ingest 后忘记跑 `k.py list-broken-refs` 检查新引用是否解析成功
