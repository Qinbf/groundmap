# GroundMap — 调试控制台（debug-console）

**可选的独立子项目**：一个带 LLM 的聊天界面，用来调试和演示「外部 agent 如何调用知识库工具回答问题」——每一步工具调用（search / outline / read-section / backlinks…）和返回数据都可视化为流程图。

> **与 CLAUDE.md 原则 1 的关系**：KB 核心（`scripts/`、`web/`）严禁内嵌 LLM；本子项目**作为 KB 的外部客户端存在**，所以可以引入 LLM SDK。它只通过 HTTP 调主管理台的 `POST /api/agent-tool`（只读工具白名单 + CSRF 防护），不直接读 markdown / `.cache/`。**删掉整个 `tools/` 目录不影响 KB 任何功能。**

## 启动

> **首次**：两个子项目各装一次依赖，并按需配 console 的 `.env`：
> ```bash
> npm --prefix web install                                      # 含 concurrently（编排用）
> npm --prefix tools/debug-console install
> cp tools/debug-console/.env.example tools/debug-console/.env  # 按需填 API key
> ```

**推荐：web + console 一起起**——顶栏右上角的「查询控制台」随点随开，不必先手动拉起。在仓库根用 `make dev` 即可（已内置 `no_proxy`，开着 Clash/VPN 也能起）：

```bash
make dev            # = web :3006 + console :3100，Ctrl-C 一起停；等价于下面的 dev:all
# 或：
cd web
npm run dev:all     # web → :3006，console → :3100（concurrently 编排，Ctrl-C 一起停）
```

> 控制台通过 Node 内置 `fetch` 调主管理台（`localhost:3006`），默认就不走代理；`make dev` 再注入 `no_proxy` 兜底子进程。开代理只用于访问外部 LLM API，不影响本地通信。

**或单独起 console**（主管理台已在别处跑时）：

```bash
cd tools/debug-console
npm run dev         # 端口 3100
```

访问 [http://localhost:3100](http://localhost:3100)。主管理台顶栏右上角的「查询控制台」入口默认指向这里（可用 `NEXT_PUBLIC_CONSOLE_URL` 改地址，设为空字符串则隐藏该入口）。

## .env 配置

| 变量 | 说明 |
|---|---|
| `KB_API_BASE` | 主管理台地址（默认 `http://localhost:3006`） |
| `DEEPSEEK_API_KEY` / `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | 各 LLM provider 的 key，按需配置；未填的 provider 在 UI 中灰显 |
| `OPENAI_BASE_URL` | OpenAI 兼容端点自定义 baseURL（Moonshot / Qwen / 自建网关）；空 = 官方 |
| `CLAUDE_CODE_BIN` / `CODEX_BIN` | 本地 CLI agent 的二进制名（PATH 中可执行即可） |

### API key 怎么提供？（重要）

key **只通过本目录的 `.env` 文件提供**——界面上没有、也不需要填 key 的输入框。一个新用户拿到本项目后：

```bash
cp .env.example .env          # 复制模板
# 编辑 .env，填入你自己的 key：DEEPSEEK_API_KEY=sk-...
npm run dev                   # 重启生效（Next.js 启动时读 .env）
```

- 配了哪个 provider 的 key，UI 里对应模型就可选；没配的灰显。
- key 留在你自己机器的 `.env` 里，**不进 Git**（已被 `.gitignore` 忽略）、不写进代码——去 [platform.deepseek.com](https://platform.deepseek.com) 申请自己的 key。

这是**「自托管」模式**：每个部署者在自己的 `.env` 里用自己的 key，同一实例的访问者共用这一个 key。对单人 / 小团队自托管最简单也最安全。若要做成「每个访客在网页上填各自的 key」（多租户 SaaS 形态），需另行改造（前端加输入框 → 按请求传 key → provider 用「请求里的 key ?? `.env` 的 key」），**当前不内置**。

### DeepSeek 思考模式（默认关闭）

`deepseek-v4-flash` / `deepseek-v4-pro` 默认会先输出思维链（`reasoning_content`）再给答案，响应前有一段「思考」延迟。本控制台**默认关闭思考模式**——在 `lib/providers/deepseek.ts` 调用时传 `thinking: { type: "disabled" }`，让它像普通对话模型直接出答案：更快、更省 token，且不影响工具调用（function calling 照常）。

- **想重新开启思考**：删掉 `deepseek.ts` 里 `streamOpenAI(...)` 的第 4 个参数 `{ thinking: { type: "disabled" } }` 即可。
- 控制台已支持**流式展示推理过程**（provider 发 `reasoning-delta` → 前端渲染为可折叠的「思考过程」区块）：用任何**开着**思考的推理模型时，思考会实时显示、不再静默。关思考时此区块自然不出现。
- ⚠️ 注意：DeepSeek 不接受 `reasoning_effort: "none"`（会 400 报错），关思考的唯一开关是 `thinking: { type: "disabled" }`。

## 与主站的契约

唯一耦合面是主 `web/` 的 `POST /api/agent-tool`：

- 请求体 `{ tool: "<白名单工具名>", args: {...} }`，工具名与 `scripts/k.py` 子命令对齐（只读操作：search / outline / read-section / read-block / backlinks / outlinks 等）
- 服务端白名单校验 + CSRF 防护；写操作不在白名单内
- 返回 k.py 的 JSON 输出，由本控制台渲染为工具调用卡片与流程图

注意：本控制台的服务端 fetch 不携带浏览器 cookie，查询的 workspace 由主站的 `KB_WORKSPACE` 启动环境决定，与主站 UI 里的 workspace 切换器无关。

## 技术栈

Next.js 14 + TypeScript；`@xyflow/react` + dagre（流程图）；多 provider 适配层（`lib/providers/`：DeepSeek / Anthropic / OpenAI 兼容 / 本地 Claude Code / Codex CLI）。
