---
title: "Tool Use / Function Calling"
type: concept
created_date: 2026-04-12
last_modified: 2026-04-19
last_modified_by: LLM
status: deprecated
confidence: medium
source_count: 0
sources: []
tags:
  - agent
  - reasoning
  - tool
---

# Tool Use / Function Calling ^h-1-1-96ce63

让大模型**调用外部工具**（搜索引擎、代码解释器、数据库、API）扩展能力，是构建 Agent 的核心机制。 ^p-1-946b6c

## 主流范式 ^h-2-1-fd3093

| 范式 | 代表 | 特点 |
|---|---|---|
| ReAct | 早期开源 | Thought → Action → Observation 循环 |
| Function Calling | [[wiki/entities/openai]] / [[wiki/entities/anthropic]] | 模型输出结构化 JSON 调工具 |
| MCP（Model Context Protocol） | [[wiki/entities/anthropic]] 主推 | 工具暴露的标准协议 |
| Code Execution | [[wiki/entities/openai]] o 系列 | 模型直接生成代码并跑 | ^t-2-9769fc

## 实现要素 ^h-2-2-bb22a0

- **工具描述**：给模型看的接口说明（name + parameters + 何时用）
- **工具调用解析**：模型输出 → 解析为函数调用
- **结果回填**：工具执行结果作为新的对话轮次
- **多步循环**：Agent loop 直到模型给出最终答案 ^p-3-85e623

## 与其他概念的关系 ^h-2-3-330f03

- 依赖 [[wiki/concepts/chain_of_thought]] 做推理
- 是 [[wiki/concepts/in_context_learning]] 的实用化扩展
- 详见 [[wiki/analyses/agent_paradigms]] ^p-4-fb164d

## 待研究 ^h-2-4-96d787

- 长 horizon 任务的可靠性
- 工具调用错误的恢复策略
- 与 [[wiki/concepts/multimodal_reasoning]] 的交互（如视觉工具） ^p-5-626941
