# GroundMap — 调试控制台（debug-console）

**可选的独立子项目**：一个带 LLM 的聊天界面，用来调试和演示「外部 agent 如何调用知识库工具回答问题」——每一步工具调用（search / outline / read-section / backlinks…）和返回数据都可视化为流程图。

> **与 CLAUDE.md 原则 1 的关系**：KB 核心（`scripts/`、`web/`）严禁内嵌 LLM；本子项目**作为 KB 的外部客户端存在**，所以可以引入 LLM SDK。它只通过 HTTP 调主管理台的 `POST /api/agent-tool`（只读工具白名单 + CSRF 防护），不直接读 markdown / `.cache/`。**删掉整个 `tools/` 目录不影响 KB 任何功能。**

## 启动

前提：主管理台已在跑（`cd web && npm run dev`，默认端口 3006）。

```bash
cd tools/debug-console
npm install            # 首次
cp .env.example .env   # 按需填 API key
npm run dev            # 端口 3100
```

访问 [http://localhost:3100](http://localhost:3100)。主管理台顶栏的「查询控制台」链接默认指向这里（可用 `NEXT_PUBLIC_CONSOLE_URL` 改地址，设为空字符串则隐藏该入口）。

## .env 配置

| 变量 | 说明 |
|---|---|
| `KB_API_BASE` | 主管理台地址（默认 `http://localhost:3006`） |
| `DEEPSEEK_API_KEY` / `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | 各 LLM provider 的 key，按需配置；未填的 provider 在 UI 中灰显 |
| `OPENAI_BASE_URL` | OpenAI 兼容端点自定义 baseURL（Moonshot / Qwen / 自建网关）；空 = 官方 |
| `CLAUDE_CODE_BIN` / `CODEX_BIN` | 本地 CLI agent 的二进制名（PATH 中可执行即可） |

## 与主站的契约

唯一耦合面是主 `web/` 的 `POST /api/agent-tool`：

- 请求体 `{ tool: "<白名单工具名>", args: {...} }`，工具名与 `scripts/k.py` 子命令对齐（只读操作：search / outline / read-section / read-block / backlinks / outlinks 等）
- 服务端白名单校验 + CSRF 防护；写操作不在白名单内
- 返回 k.py 的 JSON 输出，由本控制台渲染为工具调用卡片与流程图

注意：本控制台的服务端 fetch 不携带浏览器 cookie，查询的 workspace 由主站的 `KB_WORKSPACE` 启动环境决定，与主站 UI 里的 workspace 切换器无关。

## 技术栈

Next.js 14 + TypeScript；`@xyflow/react` + dagre（流程图）；多 provider 适配层（`lib/providers/`：DeepSeek / Anthropic / OpenAI 兼容 / 本地 Claude Code / Codex CLI）。
