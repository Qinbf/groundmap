# GroundMap

面向人类和 AI agent 的来源驱动知识地图。

[English](README.md) | 简体中文

GroundMap 是一个本地优先的知识地图，建立在 Markdown、Git、稳定块级锚点和 agent 完整页面阅读之上。它适合想要"可审计、可溯源"知识库的团队和个人开发者，同时避免把向量数据库、文档切片、隐藏的 LLM runtime 塞进知识库核心仓库。

## 为什么需要它

大多数 RAG 系统把召回率放在第一位：把文档切成 chunk、做 embedding、检索片段，再让 LLM 重建上下文。

GroundMap 的出发点不同：

- 知识应该保持人类可读。
- Markdown + Git 应该始终是唯一真相源。
- agent 应该读完整页面或完整章节，而不是任意 chunk。
- 每条重要论断都应该指回一个稳定的来源锚点。
- 知识库本身不应该调用 LLM。

这样得到的是一个对 AI 友好的 wiki，更容易审计、diff、评审和长期维护。

## 核心理念

- **默认不用 embedding**：检索依赖 BM25 风格全文搜索、元数据、反链、出链和完整页面阅读。
- **稳定锚点**：转换后的原始文档带有 `^h-*`、`^p-*`、`^t-*` 等块级锚点，论断可以精确引用到来源块。
- **Markdown 是真相源**：SQLite / 缓存层都是可选的派生索引，可随时重建。
- **agent 在外，知识库在内**：仓库只提供脚本、模板和 Web 管理台；LLM 推理发生在外部 agent。
- **Git 原生治理**：所有有意义的改动都是普通 commit，可评审、可回滚、可审计、可讨论。
- **人类专属区受保护**：`raw/**`、`my_thoughts/**`、`#human-only`、`locked: true` 文件由规范和 Git hooks 共同保护。
- **类型化关系图谱**：双链可携带语义关系类型（`SUPPORTS` / `REFUTES` / `EXTENDS` 等），有白名单 lint 把关，并在 Web 管理台 `/graph` 渲染为交互式图谱。

## 项目效果

浏览完整 wiki 页面、frontmatter、来源引用和块级预览。

![GroundMap Web 管理台浏览带来源引用的页面](docs/images/screenshots/web-console-page.png)

把 wiki 页面之间的类型化关系渲染成交互式知识图谱。

![GroundMap 交互式知识图谱](docs/images/screenshots/knowledge-graph.png)

用可选调试控制台查看 agent 推理图、工具调用和带溯源的答案。

![GroundMap 调试控制台展示推理图和带溯源答案](docs/images/screenshots/debug-console-reasoning.png)

## 快速开始

需要：

- Python 3.10+
- Node.js 20+
- npm

```bash
git clone https://github.com/Qinbf/groundmap.git
cd groundmap

make setup
make test
make web
```

然后打开 [http://localhost:3006](http://localhost:3006)。

> 📦 **示例 workspace 的 `raw/` 原始资料不随仓库分发**（版权原因；`workspaces/*/raw/` 已被 `.gitignore` 排除）。示例 workspace 的 `wiki/` 页面是完整随仓分发的，可以正常浏览。fresh clone 后 `k.py health` 会报告非零的 **失效引用**（示例库里的"raw 文件不存在"）和 **source 问题**（`broken-source-link`：`source_summary` 页引用的 `[[raw/...]]` 来源块不存在）——**两者都属预期现象，不代表安装失败**，本质是同一个「raw 不在场」造成的，只是指向缺失 raw 来源块的深链无法解析。想体验完整的「转换 → 引用」闭环，把你自己的文档放进某个 workspace 的 `raw/` 即可。

手动方式：

```bash
python -m pip install -r requirements-dev.txt
cd web && npm install && cd ..
bash scripts/install_hooks.sh

python -m pytest scripts/tests
python scripts/k.py health --json
cd web && npm run lint && npm run build
```

> ⚠️ **跑 `npm run build` 前请先停掉本地 dev server。** Web 管理台（`npm run dev`）与 `next build` 共用同一个 `web/.next/` 目录；dev server 在跑时执行生产构建会让运行中的 dev server 全部返回 404。仅验证类型请改用 `cd web && npx tsc --noEmit`。（CI 在干净环境里跑完整 build，不受此影响。）

### 开了代理（Clash / VPN 等）也能正常访问

本地服务监听 `localhost`（Web 管理台 `:3006`、调试控制台 `:3100`）。系统/终端开着代理时，按场景：

- **一键启动（推荐）**：`make dev` 同时起 Web（`:3006`）+ 调试控制台（`:3100`），Ctrl-C 一起停；只起 Web 用 `make web`。两者都已内置 `no_proxy=localhost,127.0.0.1,::1`，本地服务及其子进程不会被代理劫持——**无论有没有开代理都能起**。
- **直接用 `npm`**：若你绕过 Makefile 跑 `cd web && npm run dev` 且全局没配 `no_proxy`，命令行工具可能把 localhost 请求也发给代理。改用 `make`，或先 `export no_proxy=localhost,127.0.0.1,::1`（持久化可写进 `~/.zshenv`）。
- **浏览器**：Chrome / Safari / 新版 Firefox 默认就绕过 `localhost`；若装了代理扩展（如 SwitchyOmega）导致打不开，把 `localhost, 127.0.0.1` 加入其绕过列表即可。
- **页面白屏**：通常是 `.next` 缓存损坏（切分支 / 大改动后），与代理无关——`make clean` 后重启即可。

## 多工作区模型

引擎代码（`scripts/`、`web/`）一套通用，数据按主题隔离在 `workspaces/<name>/` 下，每个 workspace 内部结构相同：`wiki/`、`raw/`、`exports/`、`my_thoughts/`、`.cache/`、`log.md`。不指定 workspace 时 CLI 自动选用一个（库多时会打印提示）；用 `--workspace` 指定。

```bash
# 不带 --workspace：自动选用一个 workspace（库多时打印提示）
python scripts/k.py health --json

# 指定 workspace
python scripts/k.py --workspace ai-ml-demo search "transformer"
cd web && KB_WORKSPACE=rag-evolution npm run dev
```

本仓库自带三个示例工作区：`smb-ecommerce`、`rag-evolution`、`ai-ml-demo`。前两个是活跃演示库；`ai-ml-demo` 是刻意保留的 v0 归档库——其中多数页面带 `status: deprecated`，用来演示「只标记、不删除」的归档工作流。

Web 端顶栏还有一个 **workspace 切换器**（写 cookie `kb_workspace` 后 reload），可在界面直接切库、无需重启；`KB_WORKSPACE` 设的是启动时的初始默认。cookie 值会经 `resolveWorkspace()` 校验为真实存在的 workspace，被篡改也不会越出 workspaces 目录。

### 跨独立项目复用引擎

引擎（`scripts/`、`web/`）是一份共享工具。多个**独立项目**各自的知识库**放在各项目自己的文件夹里**，用环境变量 `KB_ROOT` 把引擎对准某个项目的数据根：

```bash
# 引擎装一份，数据在各项目自己的目录里
KB_ROOT=~/work/项目A/kb-data python ~/tools/groundmap/scripts/k.py --workspace main health
cd ~/tools/groundmap/web && KB_ROOT=~/work/项目A/kb-data KB_WORKSPACE=main npm run dev
```

`KB_ROOT` 指向**含 `workspaces/` 的那层**（如 `<项目>/kb-data`），不是某个具体 workspace；`--workspace` / `KB_WORKSPACE` 再选项目内的库。未设时默认 = 引擎仓库自身（即上面的多主题模式）。数据放各项目自己文件夹里，引擎才能保持纯代码——可共享、可升级、开源时不泄露任何项目数据。完整部署模型见 `GroundMap-设计文档.md` §2.4。

## 常用命令

以下命令在 fresh clone 上都能直接跑通（只读取随仓分发的 `wiki/` 页面）：

```bash
python scripts/k.py health --json
python scripts/k.py --workspace rag-evolution search "retrieval"
python scripts/k.py --workspace rag-evolution outline wiki/sources/bge.md
python scripts/k.py list-conflicts
python scripts/k.py list-to-update
```

Web 管理台默认监听 `http://127.0.0.1:3006`，面向本地单人使用——脚本不传 `-H 0.0.0.0`，Next.js 默认只绑定 localhost；如需局域网访问需显式加 `-H` 并自行评估写权限暴露风险：

```bash
cd web
npm run dev
```

## 仓库结构

```text
.
├── CLAUDE.md                 # Schema / 行为规范（唯一真相源）
├── AGENTS.md                 # CLAUDE.md 的 Codex 镜像（逐字对齐）
├── GroundMap-设计文档.md        # 系统设计文档
├── scripts/                  # CLI（k.py）、转换（convert.py）、解析、测试、Git hooks
├── web/                      # Next.js 阅读/编辑管理台（+ REST / server actions）
├── .claude/skills/           # Claude Code 工作流技能（kb-ingest / query / lint / export / conflict-resolve）
├── .agents/skills/           # 上述技能的 Codex 镜像
├── wiki/_templates/          # 共享页面模板（所有 workspace 共用）
├── workspaces/               # 按主题隔离的数据，可切换；自带 smb-ecommerce / rag-evolution / ai-ml-demo 示例库
│   └── <name>/
│       ├── wiki/             # Markdown wiki 页面（root_index、indexes、concepts、entities、sources、analyses）
│       ├── raw/              # 原始文档与转换后的 markdown（articles、papers、assets）
│       ├── exports/          # 生成的输出物
│       ├── my_thoughts/      # 人类专属区（agent 只读）
│       ├── .cache/           # 派生 SQLite 索引（gitignored，可重建）
│       └── log.md            # 操作日志
├── docs/                     # 公开文档
├── tools/debug-console/      # 可选的独立调试控制台（KB 外部客户端；见其 README）
├── .github/                  # CI、issue 模板、PR 模板
└── requirements*.txt         # Python 依赖
```

仓库没有 `backend/` 目录：最初的 MCP + REST 后端已废弃（见 `GroundMap-设计文档.md` §10.5），REST 与写操作改由 `web/` 提供。

## GroundMap 不做什么

GroundMap 刻意不包含：

- 在知识库核心内嵌 LLM SDK 调用，
- 用于默认检索的 embedding 模型或向量存储，
- 隐藏的文档切片流水线，
- 托管的多租户 SaaS 层，
- 私有行业 playbook。

这些边界是有意为之。开源核心专注于耐久的知识底座；产品专属的 agent、工作流和企业集成可以放在它之外。

## 文档

- 🎓 **[新手图文教程：手把手搭建并使用知识库](docs/新手教程-手把手搭建知识库.md)** —— 零基础，带真实截图和完整案例，强烈建议从这里开始（也有 [HTML 版](docs/新手教程-手把手搭建知识库.html)，带侧栏目录、适合本地离线阅读）
- [Quickstart](docs/quickstart.md)
- [为什么不用 embedding](docs/why-no-embeddings.md)
- [Demo 方案](docs/demo.md)
- [Web 管理台](web/README.md)

## 路线图

- 带可再分发来源的公开演示 workspace。
- 打包的 CLI 命令，例如 `groundmap health`。
- Web 管理台里更好的新手引导。
- 面向大型仓库的可选派生 SQLite/FTS 索引。

设计契约与未来演进说明见 `AGENTS.md`。

## 参与贡献

欢迎贡献，尤其是文档、测试、新手引导、CLI 易用性和 Web UI 打磨方向。请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

本项目使用 Apache License 2.0，见 [LICENSE](LICENSE)。

Apache-2.0 许可证适用于开源核心。行业 playbook、客户定制流程、托管产品层可以独立维护为私有资产。
