---
title: "Agent 范式对比：ReAct / Function Calling / MCP"
type: analysis
created_date: 2026-04-19
last_modified: 2026-04-19
last_modified_by: LLM
status: deprecated
confidence: medium
source_count: 0
sources: []
tags:
  - agent
  - tool-use
  - comparison
---

# Agent 范式对比 ^h-1-1-c0451b

## 触发问题 ^h-2-1-5a47ad

构建 LLM Agent 时，[[wiki/concepts/tool_use]] 的实现范式有几种？各自优劣？ ^p-1-f1dc31

## 范式 A：ReAct（Thought-Action-Observation） ^h-2-2-32aa01

```
Thought: 我需要查 X
Action: search("X")
Observation: <搜索结果>
Thought: 现在我知道...
``` ^c-2-6165ec

- **优点**：语义清晰、可观察
- **缺点**：纯文本协议，工具调用解析容易出错 ^p-3-ef86cc

## 范式 B：Function Calling（OpenAI / Anthropic） ^h-2-3-23c877

模型直接输出结构化 JSON： ^p-4-c804cf

```json
{"name": "search", "arguments": {"q": "X"}}
``` ^c-5-d47e2e

- **优点**：解析稳定、生态完善
- **缺点**：模型需要专门微调，跨模型不通用 ^p-6-0a0637

## 范式 C：MCP（Model Context Protocol） ^h-2-4-2da55f

[[wiki/entities/anthropic]] 主推的工具暴露协议： ^p-7-882769

- 工具运行在独立进程（MCP server），通过 stdio / HTTP 连接 agent
- 工具描述、参数 schema 标准化
- 跨 agent 可移植（Claude Code、Cursor、Claude Desktop） ^p-8-566835

- **优点**：标准化、生态可重用
- **缺点**：多一层进程，启动开销略高 ^p-9-8dc763

## 范式 D：直接代码执行 ^h-2-5-240e6d

- [[wiki/entities/openai]] o 系列、Anthropic Computer Use 路线
- 模型直接生成代码 → sandbox 执行
- 灵活性最高，安全性最敏感 ^p-10-7052b5

## 选型建议 ^h-2-6-fbddbc

| 场景 | 推荐 |
|---|---|
| 单一 LLM 应用、轻量工具 | Function Calling |
| 跨多个 agent 客户端 / SaaS 服务 | MCP |
| 复杂科学计算、数据分析 | Code Execution |
| 教学 / 开源 / 快速迭代 | ReAct | ^t-11-61b5a6

## 与其他主题的关系 ^h-2-7-4468e4

- 都依赖 [[wiki/concepts/chain_of_thought]] 推理
- 都建立在 [[wiki/concepts/in_context_learning]] 之上
- 工具调用错误恢复、长 horizon 规划仍是开放问题 ^p-12-c9e74c
