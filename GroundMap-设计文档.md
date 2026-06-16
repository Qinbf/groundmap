# GroundMap — 来源驱动的知识地图设计文档

> **版本**: v2.0
> **日期**: 2026-04-28
> **定位**: 让外部 agent 可调用、可解释、可审计的个人知识地图基座

---

> ## ⚠️ 架构现状声明（务必先读）
>
> 本文档保留了早期"四层架构 + MCP server"的概念表述，但**实际落地形态与之有差异**，以 `CLAUDE.md` 为准。三处关键现状：
>
> 1. **没有 MCP server**。原 v0.5 的 "MCP Server" 计划**已废弃**（用户决定不需要，见 §10.5）。本文中出现的 `read_index` / `read_page` / `backlinks` / `mark_conflict` 等是**抽象动作名（接口契约）**，描述 agent 应做什么，**不是可调用的 MCP tool**。实际入口只有三条：
>    - **工作流**：`.claude/skills/kb-{ingest,query,lint,export,conflict-resolve}/SKILL.md`（Claude Code）/ `.agents/skills/`（Codex 镜像）
>    - **原子操作**：`python scripts/k.py <subcommand>`
>    - **直接读写**：`Read` / `Edit` / `Write` 操作 `wiki/**`
> 2. **不存在 `backend/` 目录**。下方 §2.2 推荐目录结构里的 `backend/`（MCP + REST 适配器）从未落地，已在该处标注为「已废弃，不存在」。REST 能力实际由 `web/`（Next.js）的 server action + route handler 提供。
> 3. **数据已多 workspace 化**。实际目录是 `workspaces/<name>/{wiki,raw,exports,my_thoughts,.cache,log.md}`，引擎代码（`scripts/`、`web/`）一套通用，默认 workspace 为 `smb-ecommerce`。下方 §2.2 的扁平结构是早期单 workspace 形态，已在该处补指针。**目录结构以 `CLAUDE.md` 为准**。

---

## 一、核心理念

### 1.1 问题：RAG 与传统 Wiki 的双重局限

**RAG 范式的根本缺陷**

大多数人使用 LLM 处理文档的方式是 RAG（检索增强生成）：上传文件集合，查询时切片 + embedding 检索相关片段，生成回答。这个范式有两个根本问题：

1. **召回是有损的**。embedding 是统计相似度，不是真正理解相关。top-K 之外的相关内容你**永远不知道漏了什么**——对严肃研究是隐性灾难。
2. **没有积累**。LLM 每次都从零开始重新发现知识。问一个需要综合五篇文档的微妙问题，LLM 每次都得重新拼凑相关碎片。

**传统 Wiki（人工维护）的根本缺陷**

人工维护的 Wiki 总会衰败。维护负担增长得比价值快——加入新页面、更新交叉引用、解决矛盾、定期复盘——这些"记账工作"超过了人类的耐心阈值。

### 1.2 解法：编译一次，持续维护，工具化暴露

GroundMap 的做法不同。两层关键设计：

**第一层：编译产物，而非检索碎片**

Agent 不是在查询时从原始文档中检索，而是**增量式地构建和维护一个持久化的 Wiki** —— 一组结构化的、相互链接的 Markdown 文件，位于人类和原始资料之间。

当新来源到达时，agent 阅读、提取关键信息，然后**整合进现有 Wiki** —— 更新实体页面、修订主题摘要、标注新旧矛盾、强化或挑战正在演进的综合判断。知识被编译一次，然后持续更新。

Wiki 是一个持久的、复利增长的产出物。交叉引用已经建好。矛盾已经被标记。综合判断已经反映了你读过的一切。每添加一个来源、每问一个问题，Wiki 都在变得更丰富。

**第二层：知识库作为工具集，而非应用**

知识库本身**不调用 LLM、不内嵌 agent runtime、不做对话**。它是一组**纯净的工具**——通过 `scripts/k.py` CLI 与 `.claude/skills`（/`.agents/skills`）工作流暴露给外部 agent（Claude Code、Codex 等），通过 `web/` 的 REST/server action 暴露给 Web 管理台。（原 MCP 协议入口计划已废弃，见 §10.5。）

外部 agent 像研究员一样**调度工具**查阅知识库：`read_index → grep → read_page → backlinks → ...`，每一步可观察、可审计、可中断，**绝不切片喂 chunk**。

> **类比**：知识库是 Wiki 的"数据库 + 工具层"；外部 agent 是"程序员"；Web 管理台是"人类的控制台"。三者各司其职、互相解耦。

### 1.3 适用场景

| 场景 | 描述 |
|------|------|
| **个人成长** | 追踪目标、健康、心理 —— 整理日记、文章、播客笔记，建立关于自己的结构化图景 |
| **深度研究** | 数周或数月钻研一个主题 —— 阅读论文、文章、报告，增量构建带有演进论点的综合 Wiki |
| **读书伴侣** | 逐章整理，为人物、主题、情节线索建立页面。读完后得到一个丰富的伴读 Wiki |
| **团队/商业** | 由 agent 维护的内部 Wiki，输入来自 Slack、会议记录、项目文档、客户电话 |
| **Agent 长期记忆** | 作为其他 AI Agent 的知识基座（经 `k.py` CLI / Web REST 接入；如未来需要可把这两层包成 MCP tool，见 §10.5） |
| **其他** | 竞品分析、尽职调查、旅行规划、课程笔记、兴趣深潜 —— 任何需要随时间积累并组织知识的场景 |

---

## 二、系统架构

### 2.1 四层架构

```
┌──────────────────────────────────────────────┐
│ Schema 层  (CLAUDE.md — 规范、惯例、原则)      │
├──────────────────────────────────────────────┤
│ Wiki 层    (agent 维护的 Markdown — 摘要、    │
│            实体、概念、综合判断)               │
├──────────────────────────────────────────────┤
│ Raw 层     (不可变的原始资料 — 文章、论文、    │
│            图片、数据)                         │
├──────────────────────────────────────────────┤
│ 工具层     (k.py CLI + skills + Web REST/     │
│            server action；MCP 已废弃未建)      │
└──────────────────────────────────────────────┘
```

- **Raw 层**：你策源的文档集合。**不可变** —— agent 只读不改。这是事实来源（Source of Truth）。
- **Wiki 层**：agent 生成的 Markdown 文件目录。摘要、实体页、概念页、对比、综述。Agent 完全拥有这一层（人类可干预、覆盖）。
- **Schema 层**：CLAUDE.md，告诉外部 agent 如何摄入、查询、维护 Wiki。
- **工具层**：`scripts/k.py` CLI + `.claude/skills`（/`.agents/skills`）工作流 + `web/`（Next.js）的 REST route handler 与 server action（其中可选挂 SQLite/FTS5 派生索引，v0.3 触发条件未到时不建）。**这一层不调 LLM**——它只暴露能力，由外部 agent 调度。原计划的 MCP Server 已废弃（见 §10.5），文中所有 `read_*` / `mark_conflict` 等是抽象动作名而非可调用 tool。

### 2.2 推荐目录结构

> **以 `CLAUDE.md` 的「目录结构」节为准**。下图保留早期形态以便理解概念分层，但实际结构有两点差异：(1) 数据层已按主题隔离到 `workspaces/<name>/`（见 §2.3）；(2) `backend/` 从未落地，已废弃。

实际结构（引擎代码通用 + 数据按 workspace 隔离）：

```
AI知识库/                       # 引擎根（通用代码 + 规范）
├── CLAUDE.md                # Schema：行为规范（唯一真相源）
├── GroundMap-设计文档.md      # 本文档
├── scripts/                 # 自动化脚本（k.py、convert.py）——通用
├── web/                     # Web 管理台（Next.js）——通用，并提供 REST/server action
├── .claude/skills/          # Claude Code 技能定义（kb-ingest / query / lint / export / conflict-resolve）
├── .agents/skills/          # 同上的 Codex 镜像（与 .claude/skills 内容仅 agent 命名差异）
├── wiki/_templates/         # 引擎级页面模板（所有 workspace 共用）
└── workspaces/              # 多主题工作区（可切换；默认 smb-ecommerce）
    └── <name>/
        ├── wiki/            # agent 维护的 Wiki（root_index / indexes / entities / concepts / sources / analyses）
        ├── raw/             # 原始资料（articles / papers / assets；不可变）
        ├── exports/         # 输出物归档
        ├── my_thoughts/     # 人类专属区（agent 只读）
        ├── .cache/          # SQLite 索引（gitignored，可重建）
        └── log.md           # 操作日志
```

> **❌ 已废弃 / 不存在**：早期设计中的 `backend/`（`backend/src/knowledge{,_mcp,_rest}/` 的 MCP + REST 适配器）**从未落地**——随 v0.5 MCP server 计划一并废弃（见 §10.5）。REST 与写操作能力实际由 `web/`（Next.js 的 route handler + `web/lib/operations.ts` 的 server action）提供，不需要独立后端进程。
>
> `claude_code源码/`（参考实现）仅作架构借鉴，已 gitignore，不属于知识库本身。

### 2.3 多工作区（workspace）模型

引擎代码（`scripts/`、`web/`）一套通用，数据层按主题隔离在 `workspaces/<name>/` 下，每个 workspace 内部结构相同。

- 所有 workspace 共享同一个 Git repo（引擎代码 + 数据一起版本控制）。
- 不指定 workspace 时默认使用 `smb-ecommerce`（向后兼容）。
- `wiki/_templates/` 保留在引擎根，所有 workspace 共用。
- Web 端启动后顶栏有 **workspace 切换器**（写 cookie `kb_workspace` + reload），可在界面切库、无需重启；`KB_WORKSPACE` 环境变量设的是启动时的初始默认。解析口径：cookie > env > 默认，cookie 值经 `resolveWorkspace()` 校验为真实 workspace（防穿越）。

```bash
# 默认 workspace（smb-ecommerce）
python scripts/k.py health --json

# 指定 workspace
python scripts/k.py --workspace rag-evolution health --json
python scripts/k.py --workspace ai-ml-demo search "transformer"

# Web 管理台指定 workspace
cd web && KB_WORKSPACE=rag-evolution npm run dev
```

> **Web 管理台默认仅监听 `127.0.0.1`，面向本地单人使用**——`web/package.json` 的 `dev` / `start` 脚本不传 `-H 0.0.0.0`，Next.js 默认只绑定 localhost。如需局域网访问需显式加 `-H`，并自行评估读写权限暴露风险（Web 端可触发 wiki 写操作与冲突决议）。

### 2.4 多项目部署：引擎与数据分离（`KB_ROOT`）

§2.3 的 `workspaces/` 适合「同一仓库内多主题」。当多个**独立项目**各自需要知识库时，把**引擎**与**数据**分离：引擎装一份共享，每个项目的知识库数据放在**该项目自己的目录**里，用环境变量 `KB_ROOT` 把引擎临时对准某个项目的数据根。

```
~/tools/groundmap/            # 引擎：仅代码 + 开源 demo，不放真实项目数据
└── scripts/  web/  .claude/  workspaces/(仅样例)

~/work/项目A/                  # 项目 A（自己的 repo）
└── kb-data/                   # 项目 A 的知识库，跟随项目走
    └── workspaces/main/{wiki,raw,exports,my_thoughts,log.md}

~/work/项目B/  └── kb-data/workspaces/main/{...}
```

```bash
KB_ROOT=~/work/项目A/kb-data python ~/tools/groundmap/scripts/k.py --workspace main health
KB_ROOT=~/work/项目B/kb-data python ~/tools/groundmap/scripts/k.py --workspace main search "..."
```

- **两级定位**：`KB_ROOT` 选「哪个项目」（含 `workspaces/` 的数据根），`--workspace` / `KB_WORKSPACE` 选「项目内的哪个库」。`KB_ROOT` 须指向含 `workspaces/` 的那层，而非某个具体 workspace。
- `KB_ROOT` 未设时默认 = 引擎根（数据与代码同库，即 §2.3 的单库模式，向后兼容）。`scripts/k.py`、`scripts/convert.py`、`web/lib/kb.ts` 三处对 `KB_ROOT` 语义一致。
- **为什么数据放各项目里**：知识跟随项目（同 repo / 同备份 / 同权限）；引擎纯代码可独立升级、开源时不泄露任何项目数据；多项目互不干扰。
- **引擎升级**：纯内核优化各项目直接共享；契约类改动（锚点 / schema / 语法 / 关系白名单）才需对各项目数据走迁移四步——见行为规范 `CLAUDE.md` 的「演进与兼容性」节。各项目可按需 pin 引擎版本（git submodule tag 或一个 `.groundmap-version` 标记）。

---

## 三、核心操作

四大操作均由**外部 agent 通过工具调用**完成。知识库不驱动这些流程。

> **本章只描述每个流程的概念骨架**。具体步骤、命令、检查清单见 `CLAUDE.md` 的 "四大操作流程" 与 `.claude/skills/kb-{ingest,query,lint,export,conflict-resolve}/SKILL.md`。两者出现 drift 时，**以 CLAUDE.md 与 SKILL.md 为准**——它们是 agent 实际遵循的规范。

### 3.1 Ingest（摄入）

用户将新来源放入 `raw/` 后，告知 agent 处理。**全流程 agent 自决，不询问用户**。概念骨架：

1. agent 用 `Bash: python scripts/convert.py` 把原始格式（pdf/docx/...）转为带锚点的 markdown + outline.json
2. agent 用 `Read` / `python scripts/k.py outline / read-section` 阅读来源——按字符数三档自决：① 短文 < 3 万 一次读完；② 中长文 3-15 万按 H1 切块每块 ≤ 3 万分段读；③ 整本书 > 15 万 TOC 扫全 + AI 选读 + 全部章节登记到「章节深度登记」表（⊙ 扫读 / × 跳过的章节保留 partial re-ingest 升级路径）
3. agent 用 `python scripts/k.py search` 反查相关 wiki 页轻读，**AI 自决**综合判断：核心价值 / 关联 / 冲突——基于 wiki 现状而非孤立总结原文
4. agent 基于第 3 步综合自决**写作策略**：新建摘要页 + 更新哪几个核心 + 标哪几个 #to-be-updated
5. agent 用 `Write` 在 `wiki/sources/` 创建摘要页（必含标准 frontmatter + 块级 anchor 引用 + 「## AI 综合判断」节 + 第 ③ 档「## 章节深度登记」表）
6. agent 用 `Edit` 更新最核心的 2-3 个节点页面
7. agent 用 `Edit` 给其余受影响页面追加 `#to-be-updated` 标签（懒更新）
8. agent **自动判断 MOC 归属**：tags 匹配现有 MOC 则在「近期更新」节追加；无命中则自动新建 MOC + root_index 加入口
9. agent 用 `Edit` 追加 `log.md` + `Bash: git commit -m "ingest: ..."`

> **懒更新机制**：一次 Ingest 可能影响 10-15 个页面，但不必全部当场更新。agent 只立即处理最核心的节点，其余标记 `#to-be-updated`，在闲时或 Lint 阶段批量处理。这降低了单次操作的复杂度和出错概率。
>
> **AI 自决 + 可纠错**：3、4、8 步都是 AI 自决而非询问用户——一次 ingest 不打断对话流。所有 AI 判断落到 source_summary 或 MOC 的具体节，可在 web 端审计 / 修改 / 用冲突工作台覆盖。mis-classification 由 lint 流程检测后人工纠正。
>
> **partial re-ingest（增量深化）**：第 ③ 档扫读章节由 kb-query / kb-lint / 用户 web 端三种方式之一触发深化升级——一次 ingest 不是终点，知识可按需深化。

### 3.2 Query（查询）

外部 agent 接到查询后：先 `Read wiki/root_index.md` → 钻取子索引 → `Read` 具体页面 → 综合回答 + 引用清单。

回答可以是不同形式：Markdown 页面、对比表格、幻灯片、图表、画布——这些都由**外部 agent 的能力**决定，知识库只负责提供素材与归档。

**关键**：好的回答应该回流 Wiki。一个对比分析、一个发现的联系、一个深度分析——agent 用 `Write wiki/analyses/<slug>.md` 归档，让探索也能产生复利。

### 3.3 Lint（健康检查）

定期由外部 agent 触发：

- 处理 `python scripts/k.py list-to-update` 积压
- 处理 `python scripts/k.py list-orphans` 孤儿
- 复核 `python scripts/k.py list-conflicts` 冲突
- 抽查 wiki 论断与 raw 来源一致性（fact-check）—— 用 `python scripts/k.py list-broken-refs` 查失效引用、`list-bare-claims` 查无引用支撑的论断
- 补缺失的概念页
- 生成 `wiki/analyses/周报-YYYY-WXX.md`

### 3.4 Export（输出闭环）

```
Raw → Ingest → Wiki → Query → 输出物
            ↑                    │
            └──── Export 回流 ────┘
```

输出物（文章、报告、决策文档）打 `#my-creation` 标签后回流到 `wiki/sources/`，成为更高维度的来源。系统形成正向循环。

---

## 四、数据结构与可溯源性

### 4.1 通用 Markdown 双链 + 块锚点引用

**规则**：agent 在 Wiki 页面中生成的任何实质性论断、数据或总结，都必须附带指向 Raw Sources 的精确链接。

```markdown
根据最新研究，该方法的准确率达到 95.3%。[[raw/papers/smith2026#^p-12-7d8e9a]]
```

**语法说明**：
- 这是**通用的 Markdown 双链 + 块锚点语法**
- 由知识库工具（`read_page` / `backlinks` / `outlinks`）解析支持
- **不依赖任何特定渲染器**——Obsidian / Foam / Logseq 等的兼容性是顺便的，知识库自身实现独立
- 块锚点（`^h-…` / `^p-…` / `^t-…` 等）由 `scripts/convert.py` 在转换时**自动生成**；agent 通过 `k.py outline <path>` 获取后复制使用，**不手写、不改 raw 派生 md**（详见 CLAUDE.md「引用规范」）
- 链接形式：
  - 完整页面：`[[wiki/concepts/transformer]]`
  - 特定 H2/H3 段：`[[wiki/concepts/transformer#注意力机制]]`
  - 特定块锚点：`[[raw/papers/smith2026#^p-12-7d8e9a]]`

agent 无法提供精确来源时，必须显式标注 `[需要来源]`，**不得省略**。

### 4.2 标准化 YAML Frontmatter

Wiki 层所有 Markdown 文件强制使用结构化元数据：

```yaml
---
title: "页面标题"
type: entity | concept | source_summary | analysis | comparison | index
created_date: 2026-04-28
last_modified: 2026-04-28
last_modified_by: LLM | Human
status: draft | reviewed | deprecated
confidence: high | medium | low
source_count: 3
sources:
  - "[[raw/articles/example_article]]"
  - "[[raw/papers/example_paper]]"
tags:
  - machine-learning
  - transformer
---
```

**优势**：通过 `python scripts/k.py list-pages` 瞬间查询：

```bash
python scripts/k.py list-pages --type=entity --modified-by=LLM --json \
  | jq '[.[] | select(.status != "reviewed")] | sort_by(.last_modified) | reverse'
```

→ "所有由 LLM 生成但人类尚未 Review 的实体页面，按修改时间降序"。

> **不依赖 Dataview 等插件**——查询能力由 `scripts/k.py` 内置（v0.3 起会加 SQLite/FTS5 索引层，命令接口不变）。

---

## 五、分层内容地图（MOCs）

### 5.1 从单一索引到层级导航

```
root_index.md
├── indexes/tech_index.md
│   ├── indexes/ai_index.md
│   └── indexes/systems_index.md
├── indexes/health_index.md
└── indexes/history_index.md
```

**查询流程**：

```
用户提问 → 外部 agent 用 Read wiki/root_index.md（极少 Token）
       → Read wiki/indexes/tech_index.md
       → Read wiki/indexes/ai_index.md
       → Read 钻取 2-3 个具体页面
       → 综合回答
```

对比"读取一个包含全部页面的 index.md"，Token 消耗降低一个数量级。

### 5.2 索引格式规范

每个索引文件遵循统一格式：

```markdown
---
title: "AI 领域索引"
type: index
created_date: 2026-04-28
last_modified: 2026-04-28
last_modified_by: LLM
status: draft
confidence: high
source_count: 0
sources: []
tags:
  - artificial-intelligence
scope: "wiki/concepts/ai/*, wiki/entities/ai/*"
page_count: 47
---

## 核心概念
- [[Transformer 架构]] — 基于注意力机制的序列模型，主流 LLM 的基础架构
- [[RLHF]] — 人类反馈强化学习，LLM 对齐的主要方法

## 关键实体
- [[OpenAI]] — GPT 系列开发者
- [[Anthropic]] — Claude 系列

## 近期更新
- 2026-04-28: 新增 [[多模态推理]] 页面（来源：Smith et al. 2026）
```

---

## 六、人机协同安全机制

### 6.1 人类专属区（Human-only Zone）

**规则**：以下内容 agent **只有读取权限，绝对禁止修改**：

- `my_thoughts/` 目录下的所有文件
- 带有 `#human-only` 标签的任何文件
- 带有 `locked: true` frontmatter 字段的页面

**实现层面**：双层硬约束保护——
1. `.claude/settings.json` 的 `permissions.deny` 拦截 `Write(raw/**)` / `Edit(raw/**)` / `Write(my_thoughts/**)` 等
2. `scripts/hooks/pre-commit` 拦截 `raw/` 原始文件（pdf/docx/...）和 `my_thoughts/**` 进入 commit；放行 `raw/**/*.md` 与 `raw/**/*.outline.json`（convert.py 派生层）

不是软提示，是路径白名单 + Git hook 双重兜底。

### 6.2 非破坏性更新（冲突标注）

当 agent 发现新资料与旧 Wiki 内容冲突时，**不得直接覆盖**。必须手写以下格式（也可由 Web 管理台 `/health/conflicts` 路由批量插入）：

```markdown
> [!WARNING] 知识更新冲突 — 2026-04-28
> **旧观点**：根据 [[raw/papers/old_paper]]，方法 A 的准确率为 89%。
> **新证据**：根据 [[raw/papers/new_paper]]，更大数据集上方法 A 仅达 82%。
> **LLM 判断**：新研究样本量更大，结果可能更可靠，但测试条件有差异。
> **状态**：⏳ 待人类判别
```

### 6.3 冲突工作台（Web 管理台职责）

人类登录 Web 管理台 `/health/conflicts` 路由，看到所有 `python scripts/k.py list-conflicts` 输出的冲突标注列表。每条提供四种解决方案，**四条路径均已实现**（v0.4a，2026-05）于 `web/lib/operations.ts`：

- **采纳新观点**：旧观点改为历史注释（已实现：`resolve_conflict_adopt_new`，需传 `newClaim` 新论断文本）
- **保留旧观点**：新证据存疑，记录但不采纳（已实现：`resolve_conflict_keep_old`）
- **合并**：弹出 markdown 编辑器，由人类亲自合写（已实现：`resolve_conflict_merge`，需传 `mergedText` 整合文本）
- **继续观察**：维持冲突状态，等更多证据（已实现：`resolve_conflict_keep_watching`）

人类点击后，前端调 `web/lib/operations.ts` 的 action 改写 markdown 并自动 commit；四条路径已全部可用，复杂场景仍可去 Claude Code 用 `/kb-conflict-resolve` skill 走完整对话流程。

---

## 七、索引与日志

### 7.1 log.md — 操作时间线

追加写入的操作记录，统一前缀格式便于解析：

```markdown
## [2026-04-28] ingest | Smith et al. 2026: Multimodal Reasoning
- 来源：`raw/papers/smith2026.md`
- 新建页面：`wiki/concepts/multimodal_reasoning.md`
- 更新页面：`wiki/entities/gpt5.md`, `wiki/concepts/transformer.md`
- 标记待更新：`wiki/concepts/attention.md` (#to-be-updated)
- 摘要：提出多模态推理的统一框架，3 个基准上超越 SOTA...

## [2026-04-28] query | LLM 对齐方法对比
- 查询："对比 RLHF、DPO 和 Constitutional AI"
- 产出：`wiki/analyses/alignment_comparison.md`
- 引用了 7 个 Wiki 页面

## [2026-04-25] lint | 周度健康检查
- 发现 3 个孤儿页面，已添加入链
- 发现 1 处矛盾，已标注冲突
- 处理了 5 个 #to-be-updated 页面
- 产出：`wiki/analyses/周报-2026-W17.md`
```

可用命令快速查看：`grep "^## \[" log.md | tail -10`

### 7.2 SQLite 索引（派生层 — v0.3 演进项，**触发条件未到不预先建设**）

> 当前 `scripts/k.py` 走纯 Python 全文件扫描，1k 页内秒级返回。当 wiki 页面数 > ~1000 且 `k.py search` / `list-orphans` 等命令延迟 > 2 秒时启用本节方案。

`.cache/index.db`，纯派生数据，加入 `.gitignore`：

```sql
pages         (id, path, title, type, frontmatter_json, content_hash, indexed_at)
pages_fts     (FTS5 external content，jieba 中文预分词)
links         (from_page, to_page, link_type, anchor_text)
tags          (page_id, tag)
audit_log     (id, tool_name, input_summary, timestamp)
```

`watchdog` 监听 `wiki/` 与 `raw/` 文件变化，hash 对比增量更新。删 `.cache/` 后启动时全量重建。`k.py` 检测到 `.cache/index.db` 走索引，否则 fallback 到现在的纯 Python 扫描——**保持向后兼容**。

---

## 八、自动化与工作流

### 8.1 周期性 Lint 触发

**v0.1 默认**：人类手动 `/kb-lint`（触发 `.claude/skills/kb-lint/SKILL.md`），按 7 步流程处理积压、孤儿、冲突、fact-check、生成周报。

**进阶（按需）**：
- **Cron**：定时脚本启动 Claude Code 跑 `/kb-lint`（OS 层定时任务）
- **Subagent 后台**（v0.2）：派 `kb-curator` 跑批量任务，主对话不被打扰
- **Web 管理台触发**（规划中，未实现）：健康度仪表板按钮一键启动

### 8.2 输出闭环（The Output Loop）

```
Raw → Ingest → Wiki → Query → 输出物（exports/）
            ↑                          │
            └────── Export 回流 ────────┘
```

输出物（文章、报告、决策文档、演示文稿）打 `#my-creation` 标签后回流，成为更高维度的来源。

---

## 九、Git 版本控制

Git 不只是"可选的版本管理"，它是这套系统的**安全网和原子性保障**。一次 Ingest 可能触及十几个文件，任何中断或错误都可能让 Wiki 处于不一致状态。Git 让每次操作可回滚、可审计、可对比。

### 9.1 核心原则

- **一次完整操作 = 一个 commit**。一次 Ingest、一次 Lint、一次批量更新，各自独立提交。操作中途出错可以整体 revert。
- **commit message 即操作日志**。与 `log.md` 形成双重记录 —— log.md 面向 agent 导航，Git log 面向人类审计。
- **永远不要 force push**。

### 9.2 Commit 规范

```
ingest: 摄入 Smith et al. 2026 - Multimodal Reasoning
query:  生成对齐方法对比分析
lint:   周度健康检查 W17
update: 批量处理 #to-be-updated 积压（8 个页面）
fix:    修正 transformer.md 中的错误引用
human:  手动修订核心原则页面
```

### 9.3 .gitignore 配置

```gitignore
# 数据隐私与版权：raw / my_thoughts 默认不入库（见下方说明）
workspaces/*/raw/
workspaces/*/my_thoughts/
workspaces/*/.cache/
workspaces/*/exports/

# wiki 大纲缓存（派生层：k.py 按 doc_chars 判新鲜、过期即现场重建）
workspaces/*/wiki/**/*.outline.json

# 派生索引（可重建）
.cache/

# 系统文件
.DS_Store
Thumbs.db
desktop.ini
*.tmp

# Python
__pycache__/
*.py[cod]
*.egg-info/
.venv/

# Web 前端
web/.next/
web/node_modules/

# 编辑器
.vscode/
.idea/
*.swp
```

> **注意**：`raw/` 中的原始资料及其派生物（`.md` / `.outline.json`）**默认不纳入 Git**——版权与隐私原因（原始 PDF/文章往往不可再分发，路径名本身可能泄露私人语境）。入库的是 `wiki/` 提炼物：agent 自己的表述 + 指向 raw 的块级引用坐标。代价是 fresh clone 后 `[[raw/...]]` 引用会显示为失效（预期行为，README 已声明）；raw 资料靠本地备份策略保管，与 CLAUDE.md「权限规则」/ ingest 第 12 步同口径。
>
> **关于 `wiki/**/*.outline.json`**（显式取舍）：wiki 页的大纲缓存也不入库。它是派生层——结构部分（章节树 / 字符偏移）由 `k.py` 按 `doc_chars` 判新鲜、过期即从当前 markdown 现场重建，无需持久化。唯一不可从 markdown 重建的是 `agent_summary`（annotate-section 回填的精排摘要），故 fresh clone 的 wiki 大纲面板不展示这些摘要——这是为「派生层不入库、可重建」的整洁不变量付的小代价。真正承载摘要的是 raw 页的 outline（ingest 阅读时回填），而 raw 派生物本就不入库；wiki 侧摘要属次要、本地便利数据。若未来需要让摘要随仓库分发，应把它写进 markdown 真相源（如 frontmatter 或正文 H2 节），而非持久化派生的 outline.json。

### 9.4 回滚操作

| 需求 | 命令 |
|---|---|
| 查看最近操作 | `git log --oneline -20` |
| 查看某次 Ingest 改了哪些文件 | `git show --stat <hash>` |
| 查看某页历史 | `git log --oneline -- wiki/concepts/transformer.md` |
| 撤销最近的 Ingest | `git revert <hash>` |
| 恢复被误改的文件 | `git checkout <hash> -- <file>` |

Web 管理台 `/history` 可视化界面为规划项（尚未实现）；当前回滚走上方 Git 命令即可。

---

## 十、技术架构

> **当前状态（v0.4 已就绪）**：v0.1（Schema + Skill + CLI + Git hook）+ v0.2（Web 管理台 + i18n + 引用基础设施 + 章节大纲）+ v0.4a（冲突工作台四条解决路径）+ v0.4b（类型化关系图谱 + `/graph` 可视化）已构成完整可用的知识库。v0.3 的 SQLite/FTS5 索引层按触发条件（>1000 页）保留未建。
>
> **本章是技术总览**。组件级细节（具体命令、permissions 配置、hook 行为、Web 路由清单）见 `CLAUDE.md` 与 `web/README.md`。两者 drift 时**以 CLAUDE.md 为准**。

### 10.1 工作流：Claude Code Skill

`.claude/skills/` 下五个 skill 锁定四大操作的标准流程：

| Skill 目录 | 触发 | 作用 |
|---|---|---|
| `kb-ingest/SKILL.md` | `/kb-ingest <path>` 或 LLM 自动激活 | 摄入新来源（10 步流程）|
| `kb-query/SKILL.md` | `/kb-query <q>` 或 LLM 自动激活 | 像研究员一样查阅（8 步）|
| `kb-lint/SKILL.md` | `/kb-lint` | 周度健康检查（7 步）|
| `kb-export/SKILL.md` | `/kb-export <主题>` | 输出闭环（8 步）|
| `kb-conflict-resolve/SKILL.md` | `/kb-conflict-resolve` | 冲突逐条人类决议（5 步）|

每个 SKILL.md 包含 YAML frontmatter（name + description）+ 详细步骤指令。description 写得专业、明确，让 LLM 在用户提到相关任务时能正确激活。

**好处**：流程被 SKILL.md 锁定，"应执行而漏执行"率从 30-50% 降至 5-10%（与 MCP 高级工具效果相当），但**零额外服务**。

### 10.2 结构化查询 CLI：`scripts/k.py`

只做"内置 Read/Grep/Glob 做不到或绕弯路"的事，全部支持 `--json`。命令分三组：

- **查询**：`search` / `list-pages` / `backlinks` / `outlinks`
- **健康度**：`health` / `list-orphans` / `list-conflicts` / `list-to-update` / `list-broken-refs` / `list-unsummarized` / `list-bare-claims` / `validate-frontmatter`
- **章节级引用基础设施**（v0.3）：`outline` / `read-section` / `read-block` / `find-anchor` / `annotate-section`

> 完整列表与参数见 `python scripts/k.py --help` 与各子命令的 `--help`。命令会持续增加，本文档不维护一一对应——避免 drift。

实现：纯 Python 扫 markdown + 解析 frontmatter，**不上数据库**。1k 页内秒级返回；将来真慢了再加 SQLite/FTS5（见 §7.2 / v0.3 演进路线）。

### 10.3 写权限保护（双层硬约束）

#### 第一层：Claude Code permissions

`.claude/settings.json`：

```json
{
  "permissions": {
    "deny": [
      "Write(raw/**)", "Edit(raw/**)", "MultiEdit(raw/**)",
      "Write(my_thoughts/**)", "Edit(my_thoughts/**)",
      "Bash(rm raw/**)", "Bash(rm -rf raw*)"
    ],
    "allow": [
      "Read(**)", "Grep(**)", "Glob(**)",
      "Bash(python scripts/k.py *)",
      "Bash(python scripts/convert.py *)"
    ],
    "ask": ["Bash(git commit *)", "Bash(git push *)"]
  }
}
```

#### 第二层：Git pre-commit hook

`scripts/hooks/pre-commit`：检测到 commit 包含 `raw/` 或 `my_thoughts/` 改动时拒绝（覆盖旧顶层与 `workspaces/<name>/` 两种布局，含非 ASCII 文件名）。人类如确需提交，用 `git commit --no-verify` 显式跳过（`commit:` 前缀仍建议按 §9.2 惯例标 `human:`，但豁免靠 `--no-verify`，不靠 message 前缀——pre-commit 阶段读不到本次 message）。

通过 `bash scripts/install_hooks.sh` 一键安装到本地 `.git/hooks/`。

### 10.4 内置工具完成的事

绝大部分操作直接用 Claude Code 内置工具：

| 操作 | 工具 |
|---|---|
| 读 wiki 页面 | `Read` |
| 全文搜索（关键词） | `Grep` |
| 列出文件 | `Glob` |
| 创建/修改 wiki 页面 | `Write` / `Edit` |
| 调 CLI / git / convert | `Bash` |

**关键不变量**：所有 wiki/ 下的写入都通过 Claude Code 自身工具（受 permissions 保护），不需要专门"知识库写工具"。

### 10.5 演进路线（按需，不预先建设）

| 版本 | 状态 | 触发条件 | 内容 |
|---|---|---|---|
| v0.1 | ✅ 已完成 | — | Schema (CLAUDE.md) + 5 个 Skill + `scripts/k.py` CLI + Git pre-commit hook |
| v0.2 | ✅ 已完成 | 想要"非 chat 形式"管理 | Web 管理台（Next.js + shadcn + i18n 双语） |
| v0.3 | 部分完成 | 引用基础设施 / 性能 | ✅ 章节大纲 + 块锚点 + `list-broken-refs` 已落地；⏳ SQLite + FTS5 索引层等触发条件（>1000 页） |
| v0.4a | ✅ 已完成（2026-05） | 复杂冲突频繁 | Web 工作台四条冲突解决路径全部落地：`adopt_new` / `merge` / `keep_old` / `keep_watching`（见 §6.3 与 `web/lib/operations.ts`） |
| v0.4b | ✅ 已完成（2026-05） | wiki > 500 页 + 真在用类型化关系 | `[[X|REFUTES]]` 类型化关系图谱（7 个标准关系白名单 + `k.py list-relation-issues` lint + `k.py graph` JSON）+ `/graph` 可视化路由（`web/components/GraphView.tsx`，React Flow） |
| ~~v0.5~~ | ❌ 已废弃 | — | ~~MCP server~~ — 用户决定不需要。如未来想给 Cursor / Claude Desktop / 自建应用用，可把 `scripts/k.py` 与 `web/lib/operations.ts` 包成 MCP tool，沉没成本为零 |

**关键性质**：触发条件未到时不预先建设；具体每版的实施提示见 `CLAUDE.md` "未来演进路线" 章节。

---

## 十一、操作规范清单

> 推荐通过 `/kb-ingest` `/kb-query` `/kb-lint` `/kb-export` `/kb-conflict-resolve` 五个 skill 触发对应工作流——SKILL.md 已包含完整步骤指令。下列清单是后置检查，确认 agent 走完了应有动作。

### Ingest 操作规范
- [ ] 原始文件放入 `raw/`，**不可修改原始文件**
- [ ] 用 `Write` 创建摘要页（`wiki/sources/<slug>.md`），必含标准 frontmatter
- [ ] 所有实质性论断必须附 `[[raw/...]]` 块级引用
- [ ] 核心节点（2-3 个）用 `Edit` 立即更新；次要节点底部追加 `#to-be-updated`
- [ ] 更新对应 MOC 索引
- [ ] `Edit` log.md 追加条目；`Bash: git commit -m "ingest: ..."`

### Query 操作规范
- [ ] 先 `Read wiki/root_index.md` → 钻取 MOC → `Read` 具体页面
- [ ] 必要时调 `python scripts/k.py backlinks <path>` 顺藤摸瓜
- [ ] 回答附来源引用清单
- [ ] 有价值的分析 `Write wiki/analyses/<slug>.md`
- [ ] `Edit` log.md 追加；如有新建文件则 commit

### Lint 操作规范
- [ ] `python scripts/k.py health --json` → 拿全景，记下每个 count
- [ ] `python scripts/k.py list-to-update --json` → 逐条处理
- [ ] `python scripts/k.py list-orphans --json` → 修复或标记 deprecated
- [ ] `python scripts/k.py list-conflicts --json` → 复核所有未决冲突
- [ ] `python scripts/k.py list-broken-refs --json` → 处理失效的 `[[raw/...#^anchor]]` 引用
- [ ] `python scripts/k.py list-unsummarized --json` → 给被引用但 `agent_summary` 为 null 的章节回填摘要
- [ ] `python scripts/k.py list-bare-claims --json` → 给"含数字 / 百分比但无 anchor 引用也无 `[需要来源]` 标记"的段落补引用
- [ ] 抽查 wiki 论断与 raw 一致性（fact-check）
- [ ] 检查缺失的重要概念
- [ ] `Write wiki/analyses/周报-YYYY-WXX.md` 生成周报
- [ ] `Edit` log.md + `Bash: git commit -m "lint: ..."`

### Export 操作规范
- [ ] 与用户对齐输出物形态、长度、受众
- [ ] 走 query 流程做综合调研
- [ ] `Write exports/<YYYY-MM-DD>_<slug>.md`
- [ ] 至少与用户迭代一轮
- [ ] 定稿后 `Write wiki/sources/<slug>__my-creation.md` 回流，打 `#my-creation` 标签
- [ ] 在被引用的 wiki 页面建立"相关产出"反向溯源
- [ ] `Edit` log + commit

### Conflict-resolve 操作规范
- [ ] `python scripts/k.py list-conflicts --json` 列出未决冲突
- [ ] 每条提供结构化讨论材料（旧观点 / 新证据 / 中立分析 / 4 种处理选项）
- [ ] 由人类决议（adopt_new / keep_old / merge / keep_watching）
- [ ] 改写时**保留旧观点为历史注释**，不直接覆盖
- [ ] `last_modified_by` 改为 `Human`
- [ ] `Edit` log + commit

### 禁止事项
- ❌ 在知识库代码中内嵌 LLM 调用 / Agent runtime
- ❌ 引入 embedding 模型 / 向量存储 / 文档切片
- ❌ 修改 `raw/` 任何文件（被 settings.json 与 Git pre-commit hook 双层拦截）
- ❌ 修改 `my_thoughts/` 或 `#human-only` / `locked: true` 文件
- ❌ 写入无来源引用的实质性论断
- ❌ 直接覆盖冲突内容（必须保留历史注释）
- ❌ 真删除文件（改为 `status: deprecated`）
- ❌ `git add -A` / `git add .`（用具体文件名，避免误提交）

---

## 十二、设计哲学

> 知识管理的瓶颈不是获取信息，而是维护和组织信息的人力成本。

人类放弃 Wiki 是因为维护负担增长得比价值快。Agent 不会厌倦，不会忘记更新交叉引用，可以一次修改 15 个文件。Wiki 保持鲜活，因为维护成本接近于零。

但工具化 Agent 时，关键的设计决定是 **职责边界**：

> **知识库不是 Agent，知识库是 Agent 的资源。**

这意味着：
- 知识库**不内嵌 LLM**——agent 能力快速演进，知识库不应被某一代 LLM 绑定
- 知识库**不做对话**——这是外部 agent 的事
- 知识库**只暴露能力**——MCP 给 agent 用，REST 给人类用，markdown + Git 给所有人用
- 知识库**只做一件事**：让外部 agent 与人类**都能可靠、可解释、可审计地访问与维护一个持续编译的知识产物**

这个理念在精神上接近 Vannevar Bush 1945 年的 Memex 构想 —— 一个私人的、精心策划的、文档之间有关联性路径的知识库。Bush 的愿景比后来的万维网更接近这个设计：私有的、主动维护的、文档间的连接与文档本身同样有价值。

他无法解决的那部分 —— **谁来做维护** —— 现在由外部 agent 来承担。
而知识库本身，只需要做好"被调用方"。

**人类的工作**：策源、引导、提出好问题、做最终判别（特别是冲突解决）。
**外部 agent 的工作**：摄入、综合、维护、查询。
**知识库的工作**：稳定、可解释地服务以上两者。
