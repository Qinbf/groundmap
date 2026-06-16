# GroundMap — Schema（行为规范）

> **CLAUDE.md 是行为规范的唯一真相源；AGENTS.md 是其镜像，二者须逐字一致**（仅 agent 专属命名差异除外：Claude Code↔Codex、`.claude/skills/`↔`.agents/skills/`、skills 镜像中入口文件指称 CLAUDE.md↔AGENTS.md 互换；守护测试 `scripts/tests/test_release_guards.py::TestMirrorSync`）。改任一文件时必须同步另一份。

> 本文件是**所有外部 agent 操作知识库时**的行为规范。Codex、Cursor 或任何接入知识库的 agent 在执行操作前必须读取本文件。

---

## 项目定位

**本项目准备在 GitHub 上开源，提供给所有人使用**。这意味着 agent 在执行任何操作（写代码、写文档、写 markdown、改 schema、加注释、命名变量等）时必须以"公开项目、面向全球开发者"为前提：

- 代码、注释、commit message、文档**不得包含**任何个人隐私信息（真实姓名、邮箱、私钥、token、API key、内网地址、私人路径硬编码等）
- 不得包含仅作者本人能理解的语境（"我昨天和老王说的那个" / "公司内部那套" / 具体客户名）
- 设计与文档应假设**陌生贡献者也能读懂并复现**——路径用相对路径或环境变量，依赖与运行步骤显式声明，避免"只在我机器上能跑"的假设
- 示例数据应可公开分发，不引用未授权的第三方版权内容
- `my_thoughts/`、`raw/` 中的私人笔记与原始资料**默认不进入开源仓库**（已由 `.gitignore` 处理），但 agent 仍应避免把这些内容里的敏感片段复制到 `wiki/` / `scripts/` / `web/` 等会公开的目录

---

## 核心设计原则（不可违反）

1. **知识库不调用 LLM**。所有 LLM 推理由外部 agent 完成；知识库本身只暴露 MCP 工具与 REST API，不内嵌任何 agent runtime、LLM SDK 或对话能力。
   - **本条原则的范围**：`scripts/`、`web/`（KB 核心）严禁内嵌 LLM SDK。
   - **例外**：`tools/debug-console/` 是独立子项目，**作为 KB 的外部客户端存在**，可以引入 LLM SDK。它只通过 HTTP 调主 `web/` 的 REST API（`/api/agent-tool` 等），不直接读 markdown / `.cache/`。删掉 `tools/` 整个目录不影响 KB 任何功能。
2. **markdown + Git 是唯一真相源**。SQLite 索引（`.cache/index.db`）是派生层，可随时从 markdown 全量重建。删 `.cache/` 系统仍能跑。
3. **完整页面优先**。所有读取工具返回**完整页面或完整 H2/H3 段**，绝不返回 chunk。
4. **严禁 embedding 召回**。embedding 模型 / 向量存储 / 文档切片不出现在系统的任何"找相关内容"逻辑中。检索靠 BM25 全文 + 元数据过滤 + agent 阅读完整页面。
5. **写权限硬约束**：写 `raw/**`、`my_thoughts/**`、含 `#human-only` 标签或 `locked: true` frontmatter 的文件 → 工具直接拒绝（PermissionError），不是 ask、不是 warn、是 deny。
6. **删除即标记**：所有"删除"操作只能改 `status: deprecated`，绝不真删文件；历史信息有内在价值。

---

## 实际操作入口（无 MCP）

本项目**没有 MCP server**（v0.5 已废弃，见文末「未来演进路线」）。所有 KB 操作走两条路：

| 层级 | 入口 | 用途 |
|---|---|---|
| **工作流** | Skill：`kb-ingest` / `kb-query` / `kb-lint` / `kb-conflict-resolve` / `kb-export` | 端到端的摄入 / 查询 / 周检 / 冲突 / 导出 |
| **原子操作** | `python scripts/k.py <subcommand>` | outline / search / read-section / read-block / backlinks / outlinks / annotate-section / list-source-issues / list-broken-refs / list-to-update / list-orphans / list-conflicts / health 等 |
| **直接读写** | `Read` / `Edit` / `Write` | `wiki/**` markdown 文件 |

下文「四大操作流程」中出现的 `read_page` / `archive_analysis` / `mark_conflict` / `append_log` / `git_commit` 等是**抽象动作名（接口契约）**，描述 agent 应做什么，**不是可调用的 MCP tool**。落地实现 = skill 文档 + `k.py` 子命令 + `web/lib/operations.ts` 的 server action。

> **不要尝试 `ToolSearch "mcp__kb__*"` 或调用任何 `mcp__kb__*` 工具** —— 它们不存在，会返回 `No matching deferred tools found`。

---

## 目录结构

```
groundmap/                   # 引擎根（通用代码 + 规范）
├── CLAUDE.md                # 行为规范（唯一真相源）
├── AGENTS.md                # CLAUDE.md 的镜像（Codex 入口）
├── GroundMap-设计文档.md     # 系统设计文档
├── scripts/                 # 自动化脚本（k.py、convert.py）——通用
├── web/                     # Web 管理台（Next.js）——通用
├── .agents/skills/          # Codex 技能定义——通用
├── workspaces/              # 多主题工作区（可切换）
│   ├── smb-ecommerce/       # ← 当前默认 workspace
│   │   ├── wiki/            # agent 维护的 Wiki（可读写）
│   │   ├── raw/             # 原始资料（agent 不可改原始文件）
│   │   ├── exports/         # 输出物归档
│   │   ├── my_thoughts/     # 人类专属区（agent 只读）
│   │   ├── .cache/          # SQLite 索引（gitignored，可重建）
│   │   └── log.md           # 操作日志
│   ├── rag-evolution/       # ← RAG 演进主题（来自 rag-evolution-demo）
│   │   └── ...
│   └── ai-ml-demo/          # ← AI/ML 论文主题
│       └── ...
├── wiki/                    # 引擎级 wiki（仅 _templates）
├── tools/                   # 独立子工具，不属于 KB 核心
│   └── debug-console/       # 调试界面（v0.3）
└── .cache/                  # 引擎级缓存
```

---

## 权限规则

| 路径 / 标记 | 权限 |
|---|---|
| `raw/**` 下原始文件（pdf/docx/html/...） | **绝对只读** — 写操作工具直接拒绝 |
| `raw/**/*.md` 与 `raw/**/*.outline.json` | agent **不得手改**；由 `scripts/convert.py` 写入和重生成（派生层）。**例外**：`*.outline.json` 的 `agent_summary` 字段可经 `python scripts/k.py annotate-section` 回填（②③ 档 ingest 流程的必经步骤），不得手动编辑该文件 |
| `my_thoughts/**` | **只读** — 写操作工具直接拒绝 |
| 含 `#human-only` 标签的文件 | **只读** |
| 含 `locked: true` frontmatter 的文件 | **只读** |
| `wiki/**`、`log.md`、`exports/**` | 可读写 |
| `.cache/**` | 系统自动管理，agent 不应直接写 |

---

## Workspace 切换

引擎代码（scripts/、web/）一套通用，数据层按主题隔离在 `workspaces/<name>/` 下。

### k.py CLI

```bash
# 默认 workspace（smb-ecommerce）
python scripts/k.py health --json

# 指定 workspace
python scripts/k.py --workspace rag-evolution health --json
python scripts/k.py --workspace ai-ml-demo search "transformer"
```

### Web 管理台

```bash
# 默认 workspace（smb-ecommerce）
cd web && npm run dev

# 指定 workspace
cd web && KB_WORKSPACE=rag-evolution npm run dev
cd web && KB_WORKSPACE=ai-ml-demo npm run dev
```

> `KB_WORKSPACE` 设的是 Web 启动时的**初始/默认** workspace；启动后顶栏有 **workspace 切换器**（`WorkspaceSwitcher`，写 cookie `kb_workspace` + reload），可在界面直接切库、**无需重启**（仅当 >1 个 workspace 时显示）。cookie 值会校验为真实存在的 workspace（`resolveWorkspace()`），防穿越/指向不存在的库。解析优先级：cookie `kb_workspace` > `KB_WORKSPACE` env > 默认 `smb-ecommerce`，`k.py` 子进程调用同口径。

### 设计原则

- 所有 workspace 共享同一个 Git repo（引擎代码 + 数据一起版本控制）
- 不指定 workspace 时默认使用 `smb-ecommerce`（向后兼容）
- 每个 workspace 内部结构相同（wiki/、raw/、exports/、my_thoughts/、.cache/、log.md）
- `wiki/_templates/` 保留在引擎根，所有 workspace 共用

### 跨独立项目复用引擎（`KB_ROOT`）

上面的 `workspaces/<name>/` 适合"同一仓库里的多主题"。若要**一份引擎服务多个独立项目**（各项目有自己的 repo / 数据），用环境变量 `KB_ROOT` 把引擎指向项目的数据根（含 `workspaces/` 的目录）：

```bash
# 引擎装一份，数据在各项目自己的目录里
KB_ROOT=/path/项目A/kb-data python scripts/k.py --workspace main health
KB_ROOT=/path/项目A/kb-data python scripts/convert.py --workspace main
cd web && KB_ROOT=/path/项目A/kb-data KB_WORKSPACE=main npm run dev
```

- `KB_ROOT` 未设时默认 = 引擎根（数据与代码同库，向后兼容）。
- `k.py` / `convert.py` / `web`（`lib/kb.ts`）三处对 `KB_ROOT` 语义一致：数据根下须有 `workspaces/<name>/`。
- 这样优化引擎只改引擎一份、所有项目共享；各项目按需 pin 引擎版本，仅当遇到契约类升级（见「演进与兼容性」节）才需对各自数据走迁移四步。
- **两级定位**：`KB_ROOT` 选「哪个项目」（含 `workspaces/` 的数据根），`--workspace` / `KB_WORKSPACE` 选「该项目内的哪个库」。单库项目用 `--workspace main` 即可。
- ⚠️ `KB_ROOT` 必须指向**含 `workspaces/` 的那层**，不是某个具体 workspace：`<项目>/kb-data` ✅，`<项目>/kb-data/workspaces/main` ❌。
- **推荐布局**：每个项目的数据放该项目自己的文件夹（`<项目>/kb-data/workspaces/<name>/`），**不要堆进引擎 repo**——知识跟随项目（同 repo / 备份 / 权限），引擎保持纯代码以便共享、升级与开源。详见 `GroundMap-设计文档.md` §2.4。

---

## 标准 YAML Frontmatter

所有 `wiki/` 下的 markdown 文件必须包含：

```yaml
---
title: ""
type: entity | concept | source_summary | analysis | comparison | index
created_date: YYYY-MM-DD
last_modified: YYYY-MM-DD
last_modified_by: LLM | Human
status: draft | reviewed | deprecated
confidence: high | medium | low
source_count: 0
sources: []
tags: []
---
```

> **Index 类型补充字段**：`type: index` 在通用字段基础上额外包含：
> - `scope`: 该索引覆盖的文件范围（glob 模式，如 `wiki/concepts/ai/*`）
> - `page_count`: 索引覆盖的页面数量
>
> **source_summary 类型可选字段**：
> - `partial_ingest_count`: 该来源被 partial re-ingest 升级的次数（可选；默认不写即 0）
> - 正文 H2 节：`## AI 综合判断`（含 3 个 H3：核心价值 / 关联 / 冲突）；第 ③ 档长文档另含 `## 章节深度登记` 表（详见 `.agents/skills/kb-ingest/SKILL.md`）

### source_count 字段约定

`source_count` 是 frontmatter 里 **`sources:` 数组的长度**，表示该页"引用了几个底层来源"。`sources:` 里每条是 `[[wiki/sources/X]]`（二级来源摘要）或 `[[raw/papers/X]]` / `[[raw/articles/X]]`（直接引一手 raw）。

不同 type 的"期望 source_count"约定：

| 页面类型 | 期望 source_count | 理由 |
|---|---|---|
| `source_summary` | **恰好 1** | 每个 source_summary 绑定一个 raw 文件 |
| `concept` / `entity` | **> 0**（占位 stub 除外） | 概念 / 实体的数据 / 描述需要溯源 |
| `analysis` / `comparison` | **≥ 2** | 跨文档综合的本质就是综合多个来源 |
| `index`（MOC）| **= 0** | MOC 只做导航不做论断 |

**stub 例外**：尚未 ingest 完整来源的 `concept` / `entity` 页允许 `source_count: 0`，但**必须在 `tags:` 里加 `to-be-updated` 或 `stub`**——这是显式的"我知道还不完整"标记。

**lint 检查**：`python scripts/k.py list-source-issues` 会扫六类问题：

1. **count-mismatch**：`source_count` 字段值与 `sources` 数组长度不一致
2. **missing-source**：论断型页面（concept/entity/analysis/comparison）`source_count == 0` 但未标 `#to-be-updated` / `stub`
3. **analysis-undersourced**：`analysis` / `comparison` 类型且 `source_count < 2` 但未标 stub（跨文档综合的本质就是综合多个来源，至少 2 个）
4. **source-summary-mismatch**：`type=source_summary` 但 `source_count != 1`
5. **broken-source-link**：`sources` 数组中某条 `[[…]]` 链接目标文件不存在（路径拼写错误 / 被归档 / 重命名 / 未 ingest）
6. **declared-but-uncited**：论断型页面 `source_count > 0` 但正文没有任何 `[[raw/...]]` / `[[*#^*]]` 块级引用——属于 **语义层** 缺陷（frontmatter 声明了 source 但论断没真的 anchor 到它）

健康度报告（`k.py health`）会汇总以上六类问题数；归档区（`wiki/_archive_*`）不检查。

---

## 引用规范

所有实质性论断、数据、总结必须附带块级溯源引用：

```markdown
根据最新研究，该方法的准确率达到 95.3%。[[raw/papers/smith2026#^p-12-7d8e9a]]
```

**锚点格式**（由 `scripts/convert.py` 自动生成，agent 通过 `python scripts/k.py outline <path>` 获取）：

| 类型 | 格式 | 含义 |
|---|---|---|
| Heading | `^h-{level}-{seq}-{hash6}` | H1/H2/H3 段，如 `^h-2-3-a3f2c1`（第 3 个 H2） |
| Paragraph | `^p-{seq}-{hash6}` | 普通段落、列表、blockquote |
| Table | `^t-{seq}-{hash6}` | 表格 |
| Code | `^c-{seq}-{hash6}` | 代码块 |
| Figure | `^f-{seq}-{hash6}` | 独立图片 |

`seq` 是文档内全局段序号（人读用），`hash6` 是 md5(归一化内容)[:6]（保稳定性 — 内容微调时锚点会变，由 `k.py list-broken-refs` 暴露失效引用）。

**引用粒度从粗到细**：

```markdown
1. [[raw/papers/foo]]                    — 整篇（仅背景介绍用）
2. [[raw/papers/foo#^h-2-3-a3f2c1]]      — 整个 H2/H3 段（最常用）
3. [[raw/papers/foo#^p-12-7d8e9a]]       — 单段（关键数据 / 精确论断）
```

**多段、多文档引用直接并列**（语法已支持）：

```markdown
准确率 95.3%[[raw/papers/A#^p-3-abc123]]，
但多语言下降到 78%[[raw/papers/B#^p-7-def456]][[raw/papers/C#^h-2-1-xyz789]]。
```

**优先用 anchor 形式**（`#^h-...` / `#^p-...`）而非 heading 文本——anchor 是机器从大纲复制的，agent 写错概率低；heading 文本有大小写/空白差异时会失配。

**语法说明**：
- 这是**通用的 Markdown 双链 + 块锚点语法**，由知识库工具（`k.py outline` / `k.py read-section` / `k.py read-block` / `backlinks` / `outlinks` / `grep`）解析支持
- **不依赖任何特定渲染器**——知识库的解析独立实现，与 Obsidian、Foam、Logseq 等的兼容是顺便的
- 链接目标可以是：完整页面 `[[wiki/concepts/transformer]]`、特定段 `[[wiki/concepts/transformer#注意力机制]]`、特定块 `[[raw/papers/smith2026#^p-12-7d8e9a]]`

无法提供精确来源时，必须显式标注 `[需要来源]`，**不得省略**或猜测。

### 关系类型语法（v0.4b 图谱）

普通双链 `[[X]]` 只表达"A 引用了 B"，不带语义。要让图谱可视化与下游分析能区分"支持 / 反驳 / 扩展"等关系，可在第三段写**标准关系类型**：

```markdown
该方法的有效性已被多个团队复现 [[wiki/concepts/foo|SUPPORTS]]。
但在多语言场景下被反驳 [[wiki/sources/bar|REFUTES]]。
本工作是对 X 的延伸 [[wiki/concepts/x|EXTENDS]]。
```

**标准关系白名单**（7 个；如不在表中，按显示别名处理）：

| 关系 | 含义 |
|---|---|
| `SUPPORTS` | A 支持 B 的论断 |
| `REFUTES` | A 反驳 B 的论断 |
| `EXTENDS` | A 在 B 的基础上延伸 |
| `IS_A` | A 是 B 的一种 |
| `PART_OF` | A 是 B 的组成部分 |
| `ALTERNATIVE_TO` | A 是 B 的替代方案 |
| `CITES` | A 引用 B（一般文献引用） |

**判别规则**（自动；agent 写时无需感知）：第三段完整匹配白名单 → 视为关系类型，渲染为小徽章 + 在图谱里染色；其他（中文、含空格、小写、不在白名单的大写词如 `RFC`）→ 仍按显示别名处理。**完全向后兼容**——已有的 `[[X|友好名]]` 行为不变。

**lint**：`python scripts/k.py list-relation-issues` 扫"看起来像关系类型但不在白名单"（典型为拼写错误 `SUPORTS` / 用了非标准词 `IMPLEMENTS`）；接入 `health` 的 `relation_issues_count`。

**图谱可视化**：`python scripts/k.py graph` 输出 `{nodes, edges}` JSON；web 端 `/graph` 用 React Flow 渲染，节点按 type 染色、边按 link_type 染色（`REFERENCES` 灰 / `SUPPORTS` 绿 / `REFUTES` 红 / …）。

---

## 冲突处理规范

发现新旧内容矛盾时，**禁止直接覆盖**。使用 `mark_conflict` 工具，或手动写入以下格式：

```markdown
> [!WARNING] 知识更新冲突 — YYYY-MM-DD
> **旧观点**：...（来源：[[raw/...]]）
> **新证据**：...（来源：[[raw/...]]）
> **LLM 判断**：...
> **状态**：⏳ 待人类判别
```

人类在 Web 管理台的"冲突工作台"中决议后，由 `resolve_conflict` 工具改写。可选解决方式：`keep_old` / `adopt_new` / `merge` / `keep_watching`。

---

## 四大操作流程

> 所有操作均通过外部 agent 调用知识库的 CLI / REST 工具完成。知识库本身不驱动这些流程，也不内嵌 LLM 调用。

### Ingest 操作流程

> **核心原则**：全流程 agent 自决，**不询问用户**。所有 AI 判断落到 source_summary / MOC 的具体节，可在 web 端审计与覆盖；mis-classification 由 lint 流程检测后人工纠正。详细流程见 `.agents/skills/kb-ingest/SKILL.md`。

1. 用户将原始文件放入 `raw/` 对应子目录（agent 不得修改原始文件）
2. agent 调 `python scripts/convert.py`：把原始格式转为 markdown，自动加锚点（`^h-`/`^p-`/`^t-`/`^c-`/`^f-`），并生成 `.outline.json`
3. agent 调 `python scripts/k.py outline <raw_path>` 看大纲，**按字符数三档自决阅读策略**：
   - **① 短文** `< 30000`（约 3 万中文字）：`Read` 全文
   - **② 中长文** `30000 – 150000`（论文 / 报告级）：按 H1 切块、每块 ≤ 3 万分段 `read-section`
   - **③ 整本书规模** `> 150000`：TOC 扫全 + AI 自决深读章节，**全部章节登记**到 source_summary 的「## 章节深度登记」表（含状态：✓ 深读 / ⊙ 扫读 / × 跳过）。⊙ 扫读章节保留 partial re-ingest 升级路径
   - 单次 Read 严格 ≤ 3 万中文字符，避免 LLM "lost in the middle" 衰减
4. **每读完一个 H2/H3 章节，立即调 `k.py annotate-section <path> <anchor> "<一两句摘要>"` 回填精排摘要** —— **②③ 档（分段阅读）的必经步骤**；① 档短文一次 Read 全文，不强制分段回填（建议至少给主要 H2 回填一句摘要，非硬性）
5. agent **基于 wiki 现状做综合判断**：调 `k.py search` 反查相关 wiki 页，轻量阅读，自决三件事——**核心价值**（新东西在哪）/ **关联**（哪些 wiki 页有重叠）/ **冲突**（哪些论断打架）
6. agent 基于第 5 步综合**决定写作策略**：新建摘要页 + 更新哪几个核心 + 标哪几个 #to-be-updated
7. agent 在 `wiki/sources/` 创建摘要页（标准 frontmatter + 块级引用 + 「## AI 综合判断」H2 节固化第 5 步结论 + 第 ③ 档的「## 章节深度登记」表）
8. agent 立即更新最核心的 2-3 个节点页面
9. agent 给其余受影响页面打 `#to-be-updated` 标签
10. agent **自动决定 MOC 归属**：用 source_summary 的 tags 反查现有 MOC，命中则在「近期更新」节追加；无命中则用 `_templates/index_template.md` 自动新建 MOC + 在 root_index 加入口
11. agent 追加 log.md 条目
12. agent `git commit -m "ingest: <来源标题>"` 原子提交（只含 `wiki/**` 改动 + `log.md`；`raw/` 及其派生 .md / .outline.json 默认被 `.gitignore` 排除、留在本地，不入库——版权与隐私原因）

> **partial re-ingest（增量深化）**：第 ③ 档扫读 / 跳过的章节保留升级路径，由 kb-query / kb-lint / 用户 web 端三种方式触发深化。AI 自动重读该章节 → 更新现有 source_summary（不新建）→ 章节登记表 ⊙ → ✓ → log.md 记 `partial-ingest` 类型 → git commit。

### Query 操作流程

**核心步骤**（kb-query skill 完整规范见 `.agents/skills/kb-query/SKILL.md`）：

1. agent 调 `read_index("wiki/root_index.md")` → 定位子索引
2. agent 调 `read_index` 钻取到具体子索引
3. agent 调 `read_page` 读完整页面
4. agent 可调 `backlinks` / `outlinks` 顺藤摸瓜
5. agent 综合回答，附带 wiki 页面引用清单
6. 有价值的分析归档：agent 调 `archive_analysis` 写到 `wiki/analyses/`
7. agent 调 `append_log`
8. 如有新建文件：agent 调 `git_commit("query: <主题>")`

#### 查询深度模式（Codex 中固定 quick；其他 3 模式产品化预留）

skill 设计了 4 个深度模式，但**Codex 中默认且唯一行为是 quick**（即上方 1-8 步流程）。**不做关键词自动判别**——查询文本的模糊触发词（"合规""审计"等）跨语境不可靠，agent 会误判。可靠的模式选择只能通过显式机制（CLI 参数 / API 字段 / Web UI 下拉）。

| 模式 | 工具调用预算 | 设计用途 | Codex 中 |
|---|---|---|---|
| **quick** | 5-10 次 | 单点事实 / 定义 / 时间问 | ✅ 默认且唯一 |
| **audit** | 15-25 次 | 合规 / 合同 / 投资 / 估值 — 对每条 anchor 引用 read-block 反查 | ⏳ 产品化预留 |
| **explore** | 20-40 次 | 综合 / 推荐 / 行业现状 — BFS outlinks 2 层 + 读所有 source_summary | ⏳ 产品化预留 |
| **devil** | 10-20 次 | 反驳 / 风险点 — 构造反对论 + wiki 找证据 | ⏳ 产品化预留 |

**未来产品化的显式调用入口**（待开发）：
- `k.py query "..." --mode=audit` CLI 参数
- HTTP API 请求体的 `"mode": "audit"` 字段
- Web 端聊天框旁的模式下拉
- 接入 DeepSeek / 其他 LLM 时的 system prompt 注入

3 个高级模式的执行规范详见 `.agents/skills/kb-query/SKILL.md` 第 7a/b/c 步。它们是**设计契约**——为产品化时的 agent 提供明确的"该模式下做什么"指令，不在 Codex 默认行为内。

### Lint 操作流程

1. agent 调 `list_to_update` → 逐个处理 `#to-be-updated` 积压
2. agent 调 `list_orphans` → 处理孤儿页面（无入链）
3. agent 调 `list_conflicts` → 复核所有冲突标注
4. agent 抽查 wiki 论断与 raw 来源的一致性（fact-check）
5. agent 检查缺少独立页面的重要概念
6. agent 调 `archive_analysis` 生成 `wiki/analyses/周报-YYYY-WXX.md`
7. agent 调 `append_log`
8. agent 调 `git_commit("lint: 周度健康检查 WXX")`

### Export 操作流程

1. agent 基于 wiki 内容生成输出物（文章、报告、决策文档等）
2. 输出物存入 `exports/`
3. 作为来源回流：agent 调 `create_page` 在 `wiki/sources/` 创建摘要页，打 `#my-creation` 标签
4. agent 调 `append_log`
5. agent 调 `git_commit("export: <标题>")`

---

## log.md 条目格式

```markdown
## [YYYY-MM-DD] <操作类型> | <标题>
- 关键信息...
```

操作类型：`ingest` / `partial-ingest` / `query` / `lint` / `export` / `update` / `human`

---

## Web 管理台国际化（i18n）方案

Web 端支持中英两套语言。范围与不变量：

### 翻译范围

**翻译**（仅显示层）：
- UI chrome：导航、按钮、卡片标题、提示、占位符、操作 confirm
- frontmatter 字段在右侧面板/编辑器中的**显示标签**（如 `title` 显示为"标题"/"Title"）
- type / status / confidence 字段值在 Badge / Select 中的**显示文字**（如 `reviewed` 显示为"已审阅"/"Reviewed"，但底层 YAML 仍是 `status: reviewed`）

**不翻译**（数据/Schema 不变）：
- `wiki/` 下 markdown 正文与 frontmatter 中的**用户输入值**（如 `title: "Transformer 架构"`）
- frontmatter YAML 中的**字段名**（key）：`title` / `type` / `status` 等是底层 schema
- frontmatter YAML 中的**字段值**：`status: draft` / `type: concept` 等是底层数据，**仅 UI 渲染时翻译显示**
- `[[wiki-link]]` 引用、log.md、commit message、文件路径

> **核心原则**：**翻译只发生在显示层**。所有底层数据（markdown 内容、YAML key/value、文件路径、链接目标）保持不变，跨语言用户看到同一份知识库。

### 实现位置

- `web/lib/i18n.ts`：翻译表（zh + en）+ `t(key, locale, vars?)` 函数（template `{var}` 替换）
- `web/lib/server-locale.ts`：`getServerLocale()`，从 cookie `kb_locale` 读取（fallback `zh`）
- `web/lib/i18n-client.tsx`：`LocaleProvider`（含 cookie 写入 + `window.location.reload()` 切换）+ `useT()` hook
- `web/components/LocaleSwitcher.tsx`：顶部右侧的 "中 / EN" 切换按钮

### 用法

**Server component**（推荐：所有 `app/` 下的 `page.tsx` / `layout.tsx`）：
```tsx
import { t } from "@/lib/i18n";
import { getServerLocale } from "@/lib/server-locale";

export default function Page() {
  const locale = getServerLocale();
  return <h1>{t("health.title", locale)}</h1>;
}
```

**Client component**（用了 `"use client"` 的）：
```tsx
"use client";
import { useT } from "@/lib/i18n-client";

export function MyButton() {
  const t = useT();
  return <button>{t("common.save")}</button>;
}
```

### 切换机制

1. 用户点顶部 `中 / EN` 按钮
2. 写 cookie `kb_locale=zh|en`（max-age 1 年）
3. `window.location.reload()` —— 让 server component 重新 SSR 读到新 locale
4. SSR 渲染时 `<html lang="...">` 也跟着切换

### 添加新语言键的流程

1. 在 `web/lib/i18n.ts` 的 `TRANSLATIONS.zh` 与 `.en` 同时加新 key + 翻译
2. 在组件中用 `t("key", locale, vars?)`（server）或 `useT()(key, vars?)`（client）
3. 如果是 ResolveButtons 的按钮 label，传 `labelKey` + 可选 `confirmKey` 而非 plain string

### 不可违反

- 翻译表 `zh` 与 `en` **必须同步**——任何新 key 必须两边都加。`i18n.ts` 的 `TranslationKey = keyof TRANSLATIONS["zh"]` 只从 `zh` 侧派生 key，**TS 类型并不强约束 `en` 侧**（en 缺 key 时 `t()` 会回退到 zh / key）；同步靠**约定 + CI 测试**保证（守护测试 `scripts/tests/test_i18n_sync.py`）
- 不允许在组件里写硬编码的中文 / 英文 UI 字符串（除非是 markdown 内容本身的渲染）
- 永远不翻译 frontmatter 字段名（`title` / `type` / `status` 等是技术 schema，与界面语言无关）

---

## 禁止事项

- ❌ 在知识库代码中内嵌任何 LLM 调用 / Agent runtime（违反原则 1）
- ❌ 引入 embedding 模型 / 向量存储 / 文档切片（违反原则 4）
- ❌ 修改 `raw/` 目录中的原始文件（pdf/docx/...）；`raw/**/*.md` 与 `*.outline.json` 是 `convert.py` 派生产物，agent 也不要手改（下次 convert 会被覆盖）
- ❌ 修改 `my_thoughts/` 或 `#human-only` / `locked: true` 文件
- ❌ 写入无来源引用的实质性论断
- ❌ 直接覆盖冲突内容（必须使用冲突标注格式）
- ❌ 真删除文件（改为 `status: deprecated`）
- ❌ 在未完成操作时提交 commit（保持原子性）
- ❌ 在 Web 组件里写硬编码的中文/英文 UI 字符串（必须用 `t()` / `useT()`，详见"Web 管理台国际化方案"）
- ❌ 尝试调用 `mcp__kb__*` 或任何 MCP tool（项目无 MCP server，详见"实际操作入口（无 MCP）"）

---

## 演进与兼容性：优化代码时如何不破坏已 ingest 的内容

知识库会在长期使用中持续优化代码与设计。本节是改动时的兼容性约定——核心是**判断一处改动属于"零风险内核优化"还是"动了数据契约、需配套迁移"**。

### 分层耐久模型

| 层 | 内容 | 改它时 |
|---|---|---|
| **真相源** | `wiki/**.md`（agent 维护的知识）、`raw/` 原始文件 | 纯 markdown，不依赖任何代码即可读懂 / diff；删光代码内容仍在 |
| **派生层** | `.cache/index.db`、`raw/**.outline.json` | 可随时从真相源**全量重建**，删了不丢信息 |
| **代码层** | `scripts/`、`web/` | 改它**不改数据**——除非它正是负责生成"数据契约"的那部分（见 B） |

核心保障：内容是人可读的 markdown，不像向量 RAG 那样把知识锁进"换模型就得全量重算"的黑盒。

### A. 零风险改动（直接优化，无需迁移）

只是"换个工具读同一份数据"，不影响任何已有内容：

- 检索 / 排序 / 健康度 / lint 规则（改 lint 只改变"报不报警"，不改数据）
- Web UI / API / 渲染层
- SQLite 索引层（派生，删 `.cache/` 即重建）
- 新增子命令、新增 lint、新增页面

### B. 契约类改动（动了下列格式 → 必须配套迁移）

只有改到这几样**格式约定**才会影响旧内容：

1. **锚点生成算法**（`scripts/postprocess.py` 的 hash / seq / 锚点格式）——改了它，重新 convert 会产出不同 anchor，wiki 里 `[[raw/...#^旧anchor]]` 引用会集体失效。
2. **frontmatter schema**（必填字段增 / 删 / 改）——旧页缺字段（`validate-frontmatter` 会报，但内容仍可读）。
3. **`[[wikilink]]` / `^anchor` 语法**——旧引用解析失配。
4. **标准关系类型白名单**（删 / 改已有项；**新增**是向后兼容的）。

### C. 契约类改动的迁移四步法

1. **改代码** + 加**回归测试** pin 住新行为（如锚点稳定性测试、drift-sync 测试）。
2. **迁移数据**：写确定性脚本把旧格式映射到新格式（如锚点按稳定前缀做 old→new 重写所有引用），只动 `wiki/**`，不手改 `raw/**` 派生物。
3. **验证**：跑 `python scripts/k.py --workspace <w> list-broken-refs`，要求失效引用数**不增加**（理想归零）；并跑 `validate-frontmatter` / `health`。
4. **原子提交**：代码 + 迁移 + 测试一并 commit，信息注明契约变更；出问题可 `git revert`。

### 内置安全网（已在系统里，改动时善用）

- **增量转换**：`convert.py` 跳过"已加锚点且未变"的文件——改了算法，**旧文件不会被自动重锚**，除非强制（`--force`）或其源内容真的变了。故内核优化默认不触发重锚。
- **`list-broken-refs`**：精确列出失效的 `[[raw/...#^]]` 与 `[[wiki/...#^]]` 引用，是契约改动的回归闸门。
- **Git 原子提交**：每次 ingest / 迁移是一个 commit，可回滚。
- **drift-sync 测试**：`scripts/k.py` 与 `web/lib/markdown.ts` 的关系白名单 / 双链正则字面同步（`TestRelationTypesSync` / `TestWikilinkRegexSync` 守护）——新增"两处须一致"的格式逻辑时照此加测试。

> **一句话**：纯内核优化随便做；一旦碰到"锚点 / frontmatter schema / wikilink·anchor 语法 / 关系白名单"这层契约，走 B→C 的迁移四步，并以 `list-broken-refs` 归零为验收。

---

## 未来演进路线（按需，触发条件未到不要预先建设）

v0.1（CLAUDE.md + Skill + CLI + Git hook）+ v0.2（Web 管理台 + i18n）已构成完整可用的知识库。以下是预留的演进方向，**触发条件出现前不要预先建设**——避免空写未用的代码与抽象。

### v0.3 — `k.py` 加 SQLite + FTS5 索引层

**触发条件**：`wiki/` 页面数 > ~1000 且 `k.py search` / `list-orphans` / `list-conflicts` 等命令延迟可感知（>2 秒）。

**实施提示**：
- 索引存 `.cache/index.db`（已加入 `.gitignore`，纯派生数据）
- 表设计：`pages`（路径 / 元数据 / content_hash）、`pages_fts`（FTS5 + jieba 中文预分词）、`links`（双向链接邻接表）、`tags`
- `watchdog` 监听 `wiki/` 文件变化做增量更新；hash 比对决定是否重新解析
- `k.py` 检测到 `.cache/index.db` 则走索引，否则 fallback 到现在的纯 Python 全文件扫描——**保持向后兼容**
- 删 `.cache/` 后启动时自动从 `wiki/` 全量重建。**markdown 仍是唯一真相源**

### ~~v0.4 — 冲突工作台高级处理 + 类型化关系图谱~~（均已实现）

#### ~~v0.4a 冲突高级处理~~（已实现）

正文「冲突处理规范」节是面向 agent 的行为规范（四种决议均可用）；下方是工程实现位置，供后续维护参考：

- `web/lib/operations.ts`：resolve 系列 action 已支持全部四种决议（`keep_old` / `adopt_new` / `merge` / `keep_watching`）
- `adopt_new`：把冲突块替换为「新论断 + 历史 NOTE」——新论断成为主文本，原冲突块内容转写为 `> [!NOTE] 历史观点（已被新证据取代 — YYYY-MM-DD 由人类判别）` 保留（「删除即标记」，旧观点不丢）
- `merge`：把冲突块替换为人类合写的多视角整合文本，并挂一行 `> [!NOTE] 多视角合并` 标注溯源
- 决议后 frontmatter `last_modified_by` 置为 `Human`（人类决议）
- UI：`/health/conflicts` 冲突工作台已暴露四种一键决议按钮
- 复杂场景仍可去 Codex 用 `/kb-conflict-resolve` skill 走完整对话流程

#### ~~v0.4b 类型化关系图谱~~（已实现，2026-05）

正文「关系类型语法（v0.4b 图谱）」节是面向 agent 的写作规范；下方是工程实现位置，供后续维护参考：

- `RELATION_TYPES` 白名单 + `split_alias_or_relation` / `splitAliasOrRelation` 判别函数：`scripts/k.py` 与 `web/lib/markdown.ts` 字面同步（`TestRelationTypesSync` 守 drift）
- `k.py list-relation-issues` lint 接入 `health` 的 `relation_issues_count`
- `k.py graph` 子命令输出 `{nodes: [{path,title,type,status,tags,inbound_count,outbound_count}], edges: [{from,to,link_type,anchor?}]}` JSON
- `web/app/api/graph/route.ts` 透传 type / tag / include_archive 过滤
- `web/app/graph/page.tsx` + `web/components/GraphView.tsx`（React Flow）渲染图谱：节点按 `type` 染色、边按 `link_type` 染色（`REFERENCES` 灰 / `SUPPORTS` 绿 / `REFUTES` 红 / …）
- 顶部导航 `/graph` 入口；i18n keys 在 `web/lib/i18n.ts` 的 `graph.*` 节

### 已废弃

- ~~**v0.5** — MCP server + 多客户端支持~~：用户决定不需要。如未来想给 Cursor / Claude Desktop / 自建应用用，可把 `scripts/k.py` 与 `web/lib/operations.ts` 的逻辑包成 MCP tool，沉没成本为零。
