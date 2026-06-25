/**
 * 查询控制台（debug-console）的极简 i18n —— 镜像主 web/lib/i18n.ts 的设计
 *
 * - server / client 共享同一份翻译表
 * - server（layout 的 generateMetadata）用 t(key, locale)
 * - client 用 useT() hook（见 i18n-client.tsx）
 * - 非 React 模块（build-flow-graph / wiki-ref）显式传 locale 调 t(key, locale)
 * - 模板变量：{name} → vars.name
 *
 * 「跟随系统设置」：本子项目与主管理台同域（localhost，仅端口不同），cookie 按域而非端口隔离，
 * 故二者共用同一个 `kb_locale` cookie——在任一处切换语言，另一处刷新即生效。
 *
 * 范围约束：仅翻译 UI chrome（界面文案 / 按钮 / 标签 / 提示）。
 * 发给 LLM 的 system prompt 正文、会话消息内容、API 错误码均不在此列。
 */

export type Locale = "zh" | "en";

export const LOCALES: Locale[] = ["zh", "en"];
export const DEFAULT_LOCALE: Locale = "zh";

export const TRANSLATIONS = {
  zh: {
    // ── 页面元数据（layout）──
    "meta.title": "Knowledge.Console — 知识库调试工作台",
    "meta.description":
      "面向 markdown + Git 知识库的编辑终端。实时查看 agent 推理、工具调用与来源溯源。",

    // ── 语言切换 ──
    "locale.zh": "中",
    "locale.en": "EN",
    "locale.label": "语言",
    "locale.switch_to_zh": "切换到中文",
    "locale.switch_to_en": "切换到 English",

    // ── 顶栏（page.tsx）──
    "header.eyebrow": "第 01 卷 · 调试工作台",
    "header.live": "实时",
    "header.live_workbench": "实时工作台",
    "header.budget": "预算",
    "header.budget_reset": "恢复跟随模式的默认预算",
    "header.edit_prompt": "编辑 system prompt",
    "header.bar_kb": "知识库 · markdown + git",
    "header.bar_llm": "LLM 推理 + 工具调用 · 实时追踪",
    "header.bar_opensource": "开源",
    "header.prompt_following": "跟随模式 = {mode}",
    "header.prompt_reset": "↺ 重置为模式默认（{mode}）",

    // ── 选择器（provider / model / mode / workspace）──
    "picker.provider": "提供方",
    "picker.model": "模型",
    "picker.mode": "模式",
    "picker.workspace": "工作区",
    "picker.loading": "加载中…",
    "picker.unavailable": "不可用",
    "picker.na": " (不可用)",
    "picker.agent": " · 智能体",
    "picker.workspace_tip":
      "当前查询的知识库——跟随 web 主页所选的库（由 ?ws 传入），控制台内不可切换",

    // ── 查询深度模式说明 ──
    "mode.quick.desc": "单点事实 / 定义 / 时间问 — 5-10 步快速答",
    "mode.audit.desc":
      "合规 / 合同 / 投资 / 估值 — 对每条 anchor 引用 read_block 反查（15-25 步）",
    "mode.explore.desc":
      "综合 / 推荐 / 行业现状 — BFS outlinks 2 层 + 读所有 source_summary（20-40 步）",
    "mode.devil.desc": "反驳 / 风险点 — 构造反对论 + wiki 找证据（10-20 步）",

    // ── 聊天面板 ──
    "chat.tab_transcript": "对话记录",
    "chat.tab_graph": "推理图",
    "chat.lastturn": "上一轮 · {n} 次工具调用",
    "chat.noturns": "还没有对话",
    "chat.turns": "轮次 · {n}",
    "chat.placeholder": "向知识库提问任何问题…",
    "chat.thinking": "▶ 思考中",
    "chat.dispatch": "▶ 发送",
    "chat.abort": "✕ 中止",
    "chat.send_hint": "⌘ + enter 发送",
    "chat.clear": "清空记录 ⌫",
    // 空状态
    "chat.idle": "工作台 · 空闲",
    "chat.empty_pre": "准备好",
    "chat.empty_em": "审问",
    "chat.empty_post": "知识库。",
    "chat.boot": "启动序列",
    "chat.boot1": "› init knowledge.console v0.3",
    "chat.boot2": "› 挂载 markdown + git 文件系统 … ok",
    "chat.boot3": "› 接入 llm provider 通道 … ready",
    "chat.boot4": "› 等待查询。",
    // 示例提示卡
    "chat.hint_example": "示例",
    "chat.hint_tip": "提示",
    "chat.hint1_title": "Self-RAG 的 4 类反思 token（reflection tokens）是什么？",
    "chat.hint1_body": "quick 模式 · 5–10 次工具调用 · 单点事实查询",
    "chat.hint2_title": "GraphRAG、LightRAG、HippoRAG 2 三者在架构上有何根本分歧？",
    "chat.hint2_body": "explore 模式 · BFS 外链 · 综合多个来源",
    "chat.hint3_title": "点工具卡片 / 流程图节点",
    "chat.hint3_body": "右侧分屏会展开该文件 / 段 / anchor 的实时内容",

    // ── 单条消息（MessageBubble）──
    "msg.role_user": "你 · 提问",
    "msg.role_assistant": "知识库 · 回答",
    "msg.role_system": "系统",
    "msg.role_error": "故障",
    "msg.streaming": "生成中",
    "msg.reasoning_title": "思考过程",
    "msg.reasoning_live": "推理中…",
    "msg.refs": "引用 · {n}",
    "msg.broken_refs": "失效引用 · {n}",
    "msg.broken_desc":
      "这些路径在当前库不存在——模型可能编造了来源，或该问题超出本库范围。正文里它们已被标记为「当前库无此来源」、不可点击；如确属别的库，请切换工作区后重问。",
    "msg.unverified_refs": "未核实引用 · {n}",
    "msg.downgraded_refs": "已降级引用 · {n}",
    "msg.downgraded_desc":
      "这些块锚点的内容不支撑对应论断，已自动降级为整页链接（去掉假精度）。",
    "msg.end": "⚠ 结束 · {reason}",

    // ── 失效引用行内标记（wiki-ref）──
    "ref.no_source": "当前库无此来源",

    // ── 工具调用卡片（ToolCallCard）──
    "tool.call_failed": "调用失败",
    "tool.empty": "(空)",
    "tool.pending": "进行中",
    "tool.ok": "成功",
    "tool.fail": "失败",
    "tool.synthetic_tip": "mode 自动增强（非 LLM 主动决定）",
    "tool.forced": "强制",
    "tool.args": "参数 · {n}",
    "tool.open_admin": "在管理台中打开 ↗",
    "tool.no_args": "(无参数)",
    "tool.result": "结果",
    "tool.calling": "…调用中",
    "tool.result_ok": "200 成功",
    "tool.failed": "失败",
    "tool.raw_toggle_tip": "在「渲染 markdown」与「原始 JSON」之间切换",
    "tool.rendered": "↩ 渲染",
    "tool.raw_json": "原始 JSON ↗",

    // ── 流程图（FlowGraph / FlowNode / FlowDetailPanel / build-flow-graph）──
    "flow.graph_empty": "发送一条消息后这里会出现流程图",
    "flow.reasoning": "推理中…",
    "flow.incomplete": "未完成",
    "flow.warn_tip": "点击查看说明 + 追问建议",
    "flow.warn_hint": "点击右侧看追问建议 →",
    "flow.answer": "答案",
    "flow.answer_tip": "点击查看完整答案",
    "flow.answer_hint": "点击右侧查看完整 →",
    "flow.query_label": "💬 用户问题",
    "flow.thought_fallback": "思考",
    "flow.ghost_unread": "🫥 未读",
    "flow.running": "正在执行...",
    "flow.synthetic_tip": "mode 自动增强（audit 锚点反查 / explore BFS）",
    "flow.forced": "强制",
    "flow.visited": "访问 {n} 次",
    // 文件 / 工具类型徽章
    "flow.type_concept": "概念",
    "flow.type_analysis": "分析",
    "flow.type_source": "来源",
    "flow.type_entity": "实体",
    "flow.type_index": "索引",
    "flow.type_raw": "原始",
    "flow.type_thoughts": "思考",
    "flow.type_file": "文件",
    "flow.type_search": "搜索",
    "flow.type_list": "列表",
    // 右下角详情面板
    "flow.detail_ready": "📊 流程图就绪",
    "flow.detail_counts": "{n} 节点 · {edge} 条边",
    "flow.detail_hint": "悬浮节点查看详情 · 点击锁定",
    "flow.detail_lock_tip": "点击节点切换锁定；锁定后悬浮其他节点不会改变内容",
    "flow.detail_locked": "🔒 已锁定 ✕",
    "flow.detail_tool": "工具：",
    "flow.detail_args": "参数",
    "flow.detail_result_preview": "结果预览 ({status})",
    "flow.detail_full_thought": "完整思考",
    "flow.detail_user_query": "用户问题",
    "flow.detail_ghost_desc": "🫥 候选——AI 提到过但没真去读",
    "flow.detail_ghost_hint": "点节点 → 右侧分屏打开内容",
    // 节点类型徽标（FlowDetailPanel / PreviewPanel 共用）
    "flow.kind_query": "💬 用户问题",
    "flow.kind_search": "🔍 搜索",
    "flow.kind_list": "📋 列表",
    "flow.kind_ghost": "🫥 候选未读",
    "flow.kind_thought_fallback": "思考",
    "flow.kind_result": "✨ 最终答案",
    // build-flow-graph 生成的节点标题 / 边标签 / 结果占位
    "flow.node_question": "问题",
    "flow.node_final_answer": "最终答案",
    "flow.empty": "(空)",
    "flow.truncated": "…(已截断)",
    "flow.edge_forced_lookup": "强制反查",
    "flow.edge_forced_bfs": "强制 BFS",
    "flow.edge_forced": "强制",
    "flow.edge_parallel": "并行",

    // ── 右侧预览面板（PreviewPanel）──
    "preview.eyebrow": "预览",
    "preview.wiki_ref": "wiki 引用",
    "preview.node": "节点",
    "preview.fallback": "↘ 回退 → {to}",
    "preview.anchor_missing_degraded": "该锚点未在来源中找到（模型可能编造了精确位置），已退化为整页展示。",
    "preview.details": "详情",
    "preview.open_admin_tip": "在主管理台 (:3006) 打开",
    "preview.open": "打开 ↗",
    "preview.close_tip": "关闭预览",
    "preview.fetching": "加载中…",
    "preview.load_failed": "加载失败",
    "preview.unknown_error": "未知错误",
    "preview.full_query": "完整用户问题",
    "preview.step_type": "步骤类型",
    "preview.full_reasoning": "完整思考内容",
    "preview.incomplete": "⚠ 未完成",
    "preview.suggested_action": "💡 操作建议",
    "preview.warn_body":
      "回到 💬 对话 tab，发一条「请继续给最终 ANSWER 段总结」追问。AI 会基于已读到的内容补一个完整 ANSWER，流程图会自动出现 ✨ 最终答案卡片。",
    "preview.tool_call": "工具调用：{toolName}",
    "preview.status": "状态：{status}",
    "preview.params": "参数",
    "preview.full_result": "完整返回",
    "preview.empty": "(空)",
    "preview.ghost_body":
      "🫥 AI 在文本里提到过但**没真去读** —— 下面是完整内容，供你判断 AI 跳过这条路是否合理。",
    "preview.tool_call_status": "工具调用：{toolName} ({status})",

    // ── 论文样式引用（anchor-refs）──
    "refs.copied": "✓ 已复制",
    "refs.copy_tip": "^{id} · 点击复制锚点",
    "refs.list": "引用列表",
    "refs.open_admin_tip": "在主管理台打开",
    "refs.jump_tip": "跳转到段落",
    "refs.kind_h": "段",
    "refs.kind_p": "段",
    "refs.kind_t": "表",
    "refs.kind_c": "码",
    "refs.kind_f": "图",
    "refs.kind_raw": "源",
  },

  en: {
    // ── Page metadata (layout) ──
    "meta.title": "Knowledge.Console — KB Debug Workbench",
    "meta.description":
      "Editorial terminal for a markdown + Git knowledge base. Inspect agent reasoning, tool calls, and provenance live.",

    // ── Language switch ──
    "locale.zh": "中",
    "locale.en": "EN",
    "locale.label": "lang",
    "locale.switch_to_zh": "Switch to 中文",
    "locale.switch_to_en": "Switch to English",

    // ── Top bar (page.tsx) ──
    "header.eyebrow": "vol. 01 · debug workbench",
    "header.live": "live",
    "header.live_workbench": "live workbench",
    "header.budget": "budget",
    "header.budget_reset": "Reset to mode default budget",
    "header.edit_prompt": "Edit system prompt",
    "header.bar_kb": "knowledge base · markdown + git",
    "header.bar_llm": "llm reasoning + tool calls · live trace",
    "header.bar_opensource": "open-source",
    "header.prompt_following": "following mode = {mode}",
    "header.prompt_reset": "↺ reset to mode default ({mode})",

    // ── Pickers (provider / model / mode / workspace) ──
    "picker.provider": "provider",
    "picker.model": "model",
    "picker.mode": "mode",
    "picker.workspace": "workspace",
    "picker.loading": "loading…",
    "picker.unavailable": "unavailable",
    "picker.na": " (n/a)",
    "picker.agent": " · agent",
    "picker.workspace_tip":
      "The knowledge base being queried — follows the workspace selected on the web home (passed via ?ws); not switchable inside the console",

    // ── Query depth modes ──
    "mode.quick.desc":
      "Single facts / definitions / time queries — quick answer in 5-10 steps",
    "mode.audit.desc":
      "Compliance / contracts / investment / valuation — cross-check every anchor citation with read_block (15-25 steps)",
    "mode.explore.desc":
      "Synthesis / recommendations / industry landscape — BFS outlinks 2 levels + read all source_summary (20-40 steps)",
    "mode.devil.desc":
      "Rebuttal / risk points — construct counter-arguments + find evidence in wiki (10-20 steps)",

    // ── Chat panel ──
    "chat.tab_transcript": "transcript",
    "chat.tab_graph": "reasoning graph",
    "chat.lastturn": "last turn · {n} tool calls",
    "chat.noturns": "no turns yet",
    "chat.turns": "turns · {n}",
    "chat.placeholder": "ask the knowledge base anything…",
    "chat.thinking": "▶ thinking",
    "chat.dispatch": "▶ dispatch",
    "chat.abort": "✕ abort",
    "chat.send_hint": "⌘ + enter to send",
    "chat.clear": "clear log ⌫",
    // Empty state
    "chat.idle": "workbench · idle",
    "chat.empty_pre": "ready to",
    "chat.empty_em": "interrogate",
    "chat.empty_post": "the knowledge base.",
    "chat.boot": "boot sequence",
    "chat.boot1": "› init knowledge.console v0.3",
    "chat.boot2": "› mount markdown + git filesystem … ok",
    "chat.boot3": "› attach llm provider channel … ready",
    "chat.boot4": "› awaiting query.",
    // Example hint cards
    "chat.hint_example": "example",
    "chat.hint_tip": "tip",
    "chat.hint1_title": "What are Self-RAG's 4 reflection tokens?",
    "chat.hint1_body": "quick mode · 5–10 tool calls · single-fact lookup",
    "chat.hint2_title": "How do GraphRAG, LightRAG, and HippoRAG 2 fundamentally differ in architecture?",
    "chat.hint2_body": "explore mode · BFS outlinks · synthesize multiple sources",
    "chat.hint3_title": "Click a tool card / flow graph node",
    "chat.hint3_body":
      "The right split pane shows live content of that file / section / anchor",

    // ── Message (MessageBubble) ──
    "msg.role_user": "you · query",
    "msg.role_assistant": "kb · response",
    "msg.role_system": "system",
    "msg.role_error": "fault",
    "msg.streaming": "streaming",
    "msg.reasoning_title": "Reasoning",
    "msg.reasoning_live": "Reasoning…",
    "msg.refs": "references · {n}",
    "msg.broken_refs": "broken refs · {n}",
    "msg.broken_desc":
      "These paths don't exist in the current knowledge base — the model may have fabricated the source, or the question is outside this base's scope. They've been marked “no such source in the current base” inline and made unclickable; if they belong to another base, switch workspace and ask again.",
    "msg.unverified_refs": "unverified refs · {n}",
    "msg.downgraded_refs": "downgraded refs · {n}",
    "msg.downgraded_desc":
      "The content at these block anchors doesn't support the corresponding claim, so they've been automatically downgraded to whole-page links (removing the false precision).",
    "msg.end": "⚠ end · {reason}",

    // ── Broken-ref inline marker (wiki-ref) ──
    "ref.no_source": "no such source in this base",

    // ── Tool call card (ToolCallCard) ──
    "tool.call_failed": "Call failed",
    "tool.empty": "(empty)",
    "tool.pending": "pending",
    "tool.ok": "ok",
    "tool.fail": "fail",
    "tool.synthetic_tip": "Auto-injected by mode (not chosen by the LLM)",
    "tool.forced": "forced",
    "tool.args": "args · {n}",
    "tool.open_admin": "open in admin ↗",
    "tool.no_args": "(no args)",
    "tool.result": "result",
    "tool.calling": "…calling",
    "tool.result_ok": "200 ok",
    "tool.failed": "failed",
    "tool.raw_toggle_tip": "Toggle between rendered markdown and raw JSON",
    "tool.rendered": "↩ rendered",
    "tool.raw_json": "raw json ↗",

    // ── Flow graph (FlowGraph / FlowNode / FlowDetailPanel / build-flow-graph) ──
    "flow.graph_empty": "Send a message and the flow graph will appear here",
    "flow.reasoning": "reasoning…",
    "flow.incomplete": "INCOMPLETE",
    "flow.warn_tip": "Click for details + follow-up suggestions",
    "flow.warn_hint": "Click the right panel for follow-up suggestions →",
    "flow.answer": "ANSWER",
    "flow.answer_tip": "Click to view the full answer",
    "flow.answer_hint": "Click the right panel to view in full →",
    "flow.query_label": "💬 User question",
    "flow.thought_fallback": "thought",
    "flow.ghost_unread": "🫥 Unread",
    "flow.running": "Running...",
    "flow.synthetic_tip":
      "Auto-enhanced by mode (audit anchor back-reference / explore BFS)",
    "flow.forced": "Forced",
    "flow.visited": "Visited {n} times",
    // File / tool type badges
    "flow.type_concept": "concept",
    "flow.type_analysis": "analysis",
    "flow.type_source": "source",
    "flow.type_entity": "entity",
    "flow.type_index": "index",
    "flow.type_raw": "raw",
    "flow.type_thoughts": "thoughts",
    "flow.type_file": "file",
    "flow.type_search": "search",
    "flow.type_list": "list",
    // Bottom-right detail panel
    "flow.detail_ready": "📊 Flow graph ready",
    "flow.detail_counts": "{n} nodes · {edge} edges",
    "flow.detail_hint": "Hover a node for details · Click to lock",
    "flow.detail_lock_tip":
      "Click a node to toggle lock; while locked, hovering other nodes won't change the content",
    "flow.detail_locked": "🔒 Locked ✕",
    "flow.detail_tool": "Tool:",
    "flow.detail_args": "Args",
    "flow.detail_result_preview": "Result preview ({status})",
    "flow.detail_full_thought": "Full thought",
    "flow.detail_user_query": "User query",
    "flow.detail_ghost_desc": "🫥 Candidate — mentioned by the AI but never actually read",
    "flow.detail_ghost_hint": "Click the node → open content in the right split view",
    // Node kind labels (shared by FlowDetailPanel / PreviewPanel)
    "flow.kind_query": "💬 User query",
    "flow.kind_search": "🔍 Search",
    "flow.kind_list": "📋 List",
    "flow.kind_ghost": "🫥 Candidate (unread)",
    "flow.kind_thought_fallback": "Thinking",
    "flow.kind_result": "✨ Final answer",
    // Titles / edge labels / placeholders produced by build-flow-graph
    "flow.node_question": "Question",
    "flow.node_final_answer": "Final answer",
    "flow.empty": "(empty)",
    "flow.truncated": "…(truncated)",
    "flow.edge_forced_lookup": "Forced lookup",
    "flow.edge_forced_bfs": "Forced BFS",
    "flow.edge_forced": "Forced",
    "flow.edge_parallel": "Parallel",

    // ── Right preview panel (PreviewPanel) ──
    "preview.eyebrow": "preview",
    "preview.wiki_ref": "wiki ref",
    "preview.node": "node",
    "preview.fallback": "↘ fallback → {to}",
    "preview.anchor_missing_degraded": "Anchor not found in the source (the model may have fabricated the exact position); showing the whole page instead.",
    "preview.details": "Details",
    "preview.open_admin_tip": "Open in admin console (:3006)",
    "preview.open": "open ↗",
    "preview.close_tip": "Close preview",
    "preview.fetching": "fetching…",
    "preview.load_failed": "load failed",
    "preview.unknown_error": "Unknown error",
    "preview.full_query": "Full user query",
    "preview.step_type": "Step type",
    "preview.full_reasoning": "Full reasoning",
    "preview.incomplete": "⚠ INCOMPLETE",
    "preview.suggested_action": "💡 Suggested action",
    "preview.warn_body":
      "Go back to the 💬 chat tab and send a follow-up like “Please continue and summarize the final ANSWER section”. The AI will produce a complete ANSWER based on what it has read, and the flow graph will automatically show the ✨ Final answer card.",
    "preview.tool_call": "Tool call: {toolName}",
    "preview.status": "Status: {status}",
    "preview.params": "Params",
    "preview.full_result": "Full result",
    "preview.empty": "(empty)",
    "preview.ghost_body":
      "🫥 The AI mentioned this in its text but **never actually read it** —— below is the full content, so you can judge whether skipping this path was reasonable.",
    "preview.tool_call_status": "Tool call: {toolName} ({status})",

    // ── Paper-style citations (anchor-refs) ──
    "refs.copied": "✓ Copied",
    "refs.copy_tip": "^{id} · Click to copy anchor",
    "refs.list": "References",
    "refs.open_admin_tip": "Open in main console",
    "refs.jump_tip": "Jump to paragraph",
    "refs.kind_h": "P",
    "refs.kind_p": "P",
    "refs.kind_t": "T",
    "refs.kind_c": "C",
    "refs.kind_f": "F",
    "refs.kind_raw": "Src",
  },
} as const;

export type TranslationKey = keyof (typeof TRANSLATIONS)["zh"];

export function t(
  key: TranslationKey,
  locale: Locale = DEFAULT_LOCALE,
  vars?: Record<string, string | number>,
): string {
  const table = TRANSLATIONS[locale] || TRANSLATIONS[DEFAULT_LOCALE];
  const fallback = TRANSLATIONS[DEFAULT_LOCALE];
  const tpl =
    (table as Record<string, string>)[key] ||
    (fallback as Record<string, string>)[key] ||
    key;
  if (!vars) return tpl;
  return tpl.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

export function isLocale(value: unknown): value is Locale {
  return value === "zh" || value === "en";
}
