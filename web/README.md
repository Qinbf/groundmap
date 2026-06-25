# GroundMap — Web 管理台

知识库的 Web 阅读 / 编辑界面。**严格不内嵌 LLM**——所有 AI 协助任务由外部 agent 执行，例如遵循根目录 `AGENTS.md` 的 ingest / query / lint 工作流。

## 启动

需要 Node 18+ 和 Python 3.10+（用于调用 `scripts/k.py`）。

```bash
cd web
npm install     # 首次
npm run dev     # 端口 3006
```

访问 [http://localhost:3006/](http://localhost:3006/)。

## 路由

| 路由 | 功能 |
|---|---|
| `/` | 主三栏：Wiki 树 + 欢迎屏（默认显示 root_index 摘要） |
| `/page/<path>` | 单页阅读 |
| `/page/<path>?mode=edit` | 编辑模式（CodeMirror + frontmatter 编辑） |
| `/blocks/<path>` | 页面的块级视图（锚点 / 偏移 / 引用坐标表） |
| `/health` | 健康度仪表板 |
| `/health/{conflicts,orphans,to-update,broken-refs,stale-drafts,low-confidence}` | 六个问题工作台（多数含一键决议；broken-refs 仅列表，需去编辑页改引用） |
| `/graph` | 类型化关系图谱（React Flow，节点按 type、边按关系类型染色） |

## API（内部）

### 高频（直读文件系统）

- `GET /api/pages/tree` — 列出所有 wiki/ 下的页面
- `GET /api/pages/<path>` — 读单页（frontmatter + content + raw）
- `PUT /api/pages/<path>` — 写单页（路径白名单 + frontmatter locked 拦截）；body 带 `commit_message` 时**原子完成写文件 + git commit**（失败自动回滚），编辑器保存即走此路径
- `GET /api/raw/<path>` — 读 raw/ 下原文（只读）
- `GET /api/backlinks?path=...` — 反向链接
- `GET /api/outlinks?path=...` — 出向链接
- `POST /api/resolve` — 健康度 / 冲突工作台的一键决议（写 + commit）
- `POST /api/commit` — 独立的 add+commit 端点（供外部客户端用；web 编辑器已不再调它）

### 低频（spawn `scripts/k.py`）

- `GET /api/health`
- `GET /api/orphans`
- `GET /api/conflicts`
- `GET /api/to-update`
- `GET /api/broken-refs`
- `GET /api/search?q=...&limit=20`
- `GET /api/validate?path=...`
- `GET /api/outline?path=...` / `GET /api/blocks?path=...` — 大纲与块级锚点数据
- `GET /api/graph` — 图谱 `{nodes, edges}`（透传 type / tag / include_archive 过滤）

`GET /api/workspaces`（直读文件系统，列 workspace 目录，顶栏切换器用）也属高频类。

### 外部 agent 入口

- `POST /api/agent-tool` — **外部客户端（如 `tools/debug-console`）调用 KB 原子操作的唯一入口**：白名单工具名（search / outline / read-section / backlinks 等只读操作），带 CSRF 防护。它是主管理台向外暴露的 REST 工具接口，`tools/debug-console` 通过它访问 KB 而不直接读 markdown。

## 写权限保护

两层硬约束：

1. **API Route 内**（`lib/permissions.ts`）：
   - `raw/**` `my_thoughts/**` 直接拒绝（403）
   - frontmatter `locked: true` 拒绝
   - 标签含 `human-only` 拒绝
2. **Git pre-commit hook**（`scripts/hooks/pre-commit`）：
   - 任何对 `raw/` 或 `my_thoughts/` 的改动进入 commit 都会被拒绝（覆盖旧顶层与 `workspaces/<name>/` 两种布局，含非 ASCII 文件名）
   - 例外：人类用 `git commit --no-verify` 显式跳过

## 编辑流程

1. 进入 `/page/<path>?mode=edit`
2. 改 frontmatter 字段（type/status/confidence/tags）或正文（CodeMirror）
3. **Ctrl+S** 或点"保存"
4. 后端：`PUT /api/pages/<path>`（body 带 `commit_message`）一次性原子完成「写文件 + git commit」；commit 失败时自动回滚写入
5. commit message 形如 `update: edit wiki/concepts/X.md via web`

## 不内嵌的能力（永远）

- ❌ Chat / AI 助手
- ❌ LLM 调用
- ❌ 向量检索 / embedding

需要 AI 协助时，让外部 agent 调用 skill 与 `scripts/k.py`——通过 markdown 文件系统与 web 端共享同一份真相源。

## 测试

冲突块改写逻辑（`lib/conflict-rewrite.ts` 的 keep_old / keep_watching / adopt_new /
merge 四种决议——发布后最易静默改坏 wiki 正文的多行正则替换）有一组零依赖回归测试，
用 Node 内置 `node:test` + type stripping 直接跑 `.ts`，**不引入 jest/vitest**：

```bash
cd web
npm test
```

> 需要 Node ≥ 23.6（内置 type stripping 默认开启；22.6–23.5 需在脚本里加
> `--experimental-strip-types`）。核心 `dev` / `build` 走 Next 的 SWC，不受此约束，
> Node 20+ 即可。

## 技术栈

- Next.js 14（App Router）+ TypeScript
- Tailwind + shadcn 风格组件
- react-markdown + remark-gfm（渲染）
- CodeMirror 6（编辑）
- gray-matter（frontmatter）
- Node child_process（spawn k.py）

## 端口

默认 3006。在 `package.json` 的 `scripts.dev` `scripts.start` 改 `-p` 参数即可。
