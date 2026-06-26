/**
 * 讲解页 ex1 的「真实查询轨迹」——静态重建一条 assistant 消息，喂给 buildFlowGraph
 * 得到和查询控制台一模一样的推理图。所有 thought 文本 / 工具参数 / 返回数据都对应
 * workspace `rag-evolution` 里的真实内容（搜索分数、frontmatter、22 条 outlinks、
 * 冲突锚点 ^p-8-1775c9、^h-2-3-c08b6a 等均经 k.py 核对，与 ex1.html 一致）。
 *
 * KB 不调 LLM（设计原则 1）：这里是固定轨迹，不是实时推理流。
 *
 * 节点 → 讲解步骤的对应：buildFlowGraph 按时间序产出 16 个节点
 *   [query, INTENT, file:root_index(## 领域目录), STRATEGY, search, EVAL, file:graph_rag,
 *    EXTRACT, CONFLICT, outlinks, DECIDE, file:three_graph, EXTRACT, DECIDE,
 *    file:graph_rag#^p-8-1775c9(read-block 核验), ANSWER]
 * 即 nodes[i] 对应步骤 i（i=0 是起始问题）。stepRef 由 ReasoningGraph 按下标回填。
 *
 * v0.7：在 DECIDE(停止扩散) 与 ANSWER 之间插入 read-block 核验节点 —— 体现 kb-query
 * SKILL.md 第 4.6 步「细节下钻判据」：答案要照搬对立双方的精确论断 + 实验数字时，
 * 组装前先回原文逐字核验。新增 1 个节点 → 步号 14=VERIFY、15=ANSWER（HTML 步骤卡同步）。
 *
 * v0.6：新增 stepRef=2 的「硬必读 ## 领域目录」节点 —— 设计升级：把领域全景作为
 * STRATEGY 的硬前置，不再让 BM25 一击命中路径跳掉全景视角。根因是 BM25 是字面召回，
 * 结构化目录（领域/来源汇总/计划清单/实体）BM25 召回不到——这是软必读改成硬必读的根本理由。
 */
import type { UIMessage } from "@/lib/flow/build-flow-graph";

export const EX1_QUERY =
  "要不要上 Graph RAG？社区检测（community detection）是必须的吗？";

/** 推理图节点 ↔ 讲解步骤卡片的对应表（stepRef → 徽章 + 标题），详情面板「对应步骤」用 */
export const EX1_STEPS: Array<{ ref: number; badge: string; title: string }> = [
  { ref: 0, badge: "Q", title: "用户原始问题" },
  { ref: 1, badge: "INTENT", title: "解析用户查询意图" },
  { ref: 2, badge: "VIEW", title: "硬必读 ## 领域目录（领域全景）" },
  { ref: 3, badge: "STRATEGY", title: "决定查询路径" },
  { ref: 4, badge: "SEARCH", title: "BM25 全文搜索" },
  { ref: 5, badge: "EVAL", title: "评估 hits — 按 type 而非纯按分数选" },
  { ref: 6, badge: "READ", title: "读 concept 页（全文）" },
  { ref: 7, badge: "EXTRACT", title: "提取核心差异 + 索引流程" },
  { ref: 8, badge: "CONFLICT", title: "★ 撞见知识冲突标注" },
  { ref: 9, badge: "LINK", title: "看出向链接（决定要不要下钻 source）" },
  { ref: 10, badge: "DECIDE", title: "决定读 comparison 页" },
  { ref: 11, badge: "READ", title: "读 comparison 页" },
  { ref: 12, badge: "EXTRACT", title: "抽取两个分裂 + 综合结论" },
  { ref: 13, badge: "DECIDE", title: "停止扩散 — 信息已经够回答" },
  { ref: 14, badge: "VERIFY", title: "★ 复述精确冲突前 · read-block 回原文核验" },
  { ref: 15, badge: "ANSWER", title: "组合带 anchor 的结构化答案" },
];

/**
 * 每张卡片「这一步在做什么」的针对性讲解（中文，与本次查询绑定）。
 * 详情面板在通用「这是什么卡片」之后单独展示，回答「在这个具体问题里、这一步到底干了什么、为什么这么做」。
 * key = stepRef（0 = 起始问题，1..14 = 步骤）。
 */
export const EX1_NOTES: Record<number, string> = {
  0: "用户的原始问题，藏着两个子问题：①「要不要上」是选型决策；②「社区检测是不是必须」是必要性追问。而且「要不要上」暗示提问者是 RAG 系统搭建者，期望的是架构对比 + 真实分歧，而不是「好/不好」的单一结论。后面 14 步都在回应这两层。",
  1: "把问题拆成可执行的检索意图：实体 = Graph RAG / community detection；两个子问题分别对应「收益」与「必要性」。关键判断是——这是一个有「正确答案陷阱」的问题：好的答案应当暴露冲突，而不是把对立观点平均成中庸结论。",
  2: "硬必读 ## 领域目录 —— 不管关键词独特性有多高，先 read-section 把 root_index 的 ## 领域目录 节取回来。这张 8 行表是结构化目录，BM25 字面召回拿不到（搜索是「关键词匹配」，目录是「分类索引」），如果不显式读就会漏掉跨领域入口。即使后续要走 BM25 一击命中路径，这一步也只多花一次 read-section 但能避免「在 1 个领域里查得很深、漏掉相邻领域」的视野偏置。",
  3: "在两条检索路径里选最短的一条 —— 现在决策有了领域全景上下文。'图结构 RAG' 明确在 graph_rag_index；但 rag_evolution_index 是总时间线、也覆盖 GraphRAG 节点。'graph rag' + 'community detection' 都是高独特性术语，BM25 应一击命中，所以走 (B) 更快 —— 但带着领域全景上下文做决策、而不是盲搜。",
  4: "一次真实的 BM25 全文检索，返回 20 个命中。最高分是 rag_evolution_index（200 分）。注意此刻还没决定读谁——搜索只负责把候选召回来，排序用的是关键词匹配度，不代表「该先读它」。",
  5: "这一步是整条链的第一个关键取舍：分数最高的 index 是 MOC 导航层、不含论断，所以跳过；选了 166 分的 concept/graph_rag——concept 是聚合层，已经把 6 个底层 source 综合好了。体现的规则是 type 优先级（concept > analysis > source > index），而非纯比分数。",
  6: "读 graph_rag 概念页全文。frontmatter 的 source_count: 6 是个强信号——它已综合 6 篇底层来源；而正文里挂着 2 个 [!WARNING] 冲突块，正好对着用户问的「社区检测是否必须」。所以这一页很可能一篇就够。",
  7: "摘出收益侧：GraphRAG = 知识图谱 + 社区摘要，索引 5 步里含 Leiden 社区检测，查询走 Map-Reduce。每条论断都记下块级 anchor（如 ^h-2-3-c08b6a），这样最终答案才能精确溯源、而不是泛泛而谈。",
  8: "整个流程里最能体现知识库价值的一步。撞见冲突块：GraphRAG 说社区检测是核心架构，LightRAG 直接反驳「社区检测是不必要的复杂度」。知识库没有把它抹平成「社区检测一般有用」，而是用 [!WARNING] 保留双方 + 标 keep_watching。于是「社区检测必须吗」的诚实答案就是——有真实争议、且未决。\n\n注：CLAUDE.md 规定 `keep_watching` 是「人类在冲突工作台决议」后写下的状态，但 graph_rag.md 整页 `last_modified_by: LLM`，这页的 keep_watching 其实是 LLM 写入的——属于知识库真实存在的一个数据/规范偏差（rag-evolution 库里有 5 个 LLM 写的页都标了 keep_watching）。此处页面照搬真实状态，但负责任地讲出来：理想情况下需要人类在 Web 冲突工作台复核一次。",
  9: "查 graph_rag 连向了谁：22 条出链，其中 6 条指向底层 source。判断是——这些 source 已被本概念页综合过，可以不逐个读；但其中有一个跨文档对照页（three_graph_rag_families）值得继续。",
  10: "在 4 类候选里做取舍：6 个底层 source 跳过（已综合）、相关支线 concept 暂缓（用户问的是 Graph RAG 本身）、导航 index 不读（不含论断）、唯独选读 122 分的 comparison 页——它应当给出「这场争议最后怎么收」的综合结论。",
  11: "读 three_graph_rag_families 对照页。它的「结论」节（^p-6-942640）会把前面零散的分歧拔高到一个统一判断，是回答「要不要上」的收益侧依据。",
  12: "抽出两个更根本的方法论分裂：分裂①是社区检测必要吗（即第 7 步那个冲突）；分裂②是「扩充 corpus 派 vs 辅助 retrieval 派」。结论是——真正的分歧不是社区检测之争，而是后者，选型应按任务谱（sensemaking vs 全谱 QA）来定。",
  13: "用一张检查清单确认：两个子问题都已答、继续读 6 个 source 只是重复信息、支线 concept 与问题无关 → 主动停止扩散。体现的是「够了就停」，避免过度检索。",
  14: "复述精确冲突前先回原文核验——触发「细节下钻判据」：答案要照搬 GraphRAG vs LightRAG 的逐字工程论断、还点到「实验数字依赖 LLM-as-judge」，而第 6 步 read_page 只拿到 concept 页骨架（锚点清单、没有冲突块全文）。所以组装答案前 read-block 打开冲突锚 ^p-8-1775c9 取回逐字原文：核对 LightRAG §3.4「markedly reduces retrieval overhead…」的精确措辞、确认「两个工程论断真实但实验数字需谨慎」的限定没被放大，并标出答案里那条裸引用 [[wiki/sources/lightrag]] 粒度不足、应补块级锚（list-coarse-citations 会扫到）。注：定义/概览类（A 类）问题不触发这一步；此处触发是因为要照搬对立双方的精确论断与数字。",
  15: "把前面读到的组合成结构化答案：每条实质论断都挂块级 anchor，且把 GraphRAG vs LightRAG 的冲突原样保留、不平均。对照右下角「传统 chunk-RAG 会怎样」就能看出差别——chunk-RAG 会把对立观点揉成一句中庸结论，分歧被抹平、也无法精确溯源。",
};

// 硬必读：root_index 的 ## 领域目录 节返回 —— 8 行结构化目录
// （这是与 k.py read-section wiki/root_index.md "## 领域目录" 实际跑出来的输出一致）
const ROOT_INDEX_AREA = `## 领域目录

| 领域 | 子索引 | 页面数 | 最近更新 |
|------|--------|--------|----------|
| RAG 演化史 (2023-2025) — 总时间线 | [[wiki/indexes/rag_evolution_index]] | 110 | 2026-05-26 |
| 检索基础与嵌入 | [[wiki/indexes/retrieval_embedding_index]] | 27 | 2026-06-19 |
| RAG 方法演进（自纠错/自适应/压缩） | [[wiki/indexes/rag_methods_index]] | 22 | 2026-06-19 |
| 图结构 RAG | [[wiki/indexes/graph_rag_index]] | 13 | 2026-06-19 |
| 评测 · 基准 | [[wiki/indexes/evaluation_index]] | 13 | 2026-06-19 |
| Agentic · RL 检索 (2025) | [[wiki/indexes/agentic_rl_index]] | 12 | 2026-06-19 |
| 长上下文 vs RAG | [[wiki/indexes/long_context_index]] | 8 | 2026-06-19 |
| 综述与立场 | [[wiki/indexes/surveys_index]] | 3 | 2026-06-19 |

→ 8 个领域入口。'图结构 RAG' 明确在 graph_rag_index(13 页);rag_evolution_index(110 页)是总时间线、也含 GraphRAG 节点。`;

// 真实搜索返回（top 8 / 共 20 hits）—— 与 k.py search 输出一致
const SEARCH_HITS = [
  { score: 200, type: "index", path: "wiki/indexes/rag_evolution_index.md" },
  { score: 166, type: "concept", path: "wiki/concepts/graph_rag.md" },
  { score: 141, type: "analysis", path: "wiki/analyses/kb_vs_human_survey_coverage.md" },
  { score: 124, type: "analysis", path: "wiki/analyses/rag_evolution_timeline_2023_2025.md" },
  { score: 122, type: "comparison", path: "wiki/analyses/three_graph_rag_families.md" },
  { score: 121, type: "source_summary", path: "wiki/sources/lightrag.md" },
  { score: 121, type: "source_summary", path: "wiki/sources/graphrag.md" },
  { score: 107, type: "source_summary", path: "wiki/sources/hipporag2.md" },
];

const GRAPH_RAG_PAGE = `type: concept · status: draft · confidence: high · source_count: 6
sources: graphrag / lightrag / hipporag2 / hipporag1 / raptor / kag
骨架（7 个 H2 + 2 个 [!WARNING] 冲突块）:
## 核心 vs vector RAG 的差异   (^h-2-1-997cb7)
## GraphRAG 索引流程
## GraphRAG Query 流程
## 与其他 RAG 范式的关系
## 经验结果摘要
## 三派 Graph RAG 对照
## 关联页面
# 正文含冲突块 vol.1 (^p-8-1775c9) / vol.2 (^p-10-e059f6)`;

const OUTLINKS = `22 条出向链接（分组）:
# 6 个底层 source（已被本页综合，可不读）
→ wiki/sources/graphrag.md#^h-2-3-c08b6a
→ wiki/sources/lightrag.md
→ wiki/sources/hipporag2.md
→ wiki/sources/raptor.md
→ wiki/sources/hipporag1.md
→ wiki/sources/kag.md
# 相关概念（横向对照）
→ wiki/concepts/retrieval_augmented_generation.md
→ wiki/concepts/self_reflective_rag.md
→ wiki/concepts/corrective_rag.md
# 索引/MOC
→ wiki/indexes/rag_evolution_index.md`;

const THREE_GRAPH_PAGE = `type: comparison · status: draft · confidence: high · source_count: 6
骨架:
## 背景                          # 18 个月内 2 次内部分裂
## 分析：三派架构对照
  ### 完整对照表              (^h-3-1-e98c45)
  ### 两个根本性的方法论分裂  (^h-3-2-14b498)
## Batch 4 终极升级：6 篇规模
## 结论                          (^h-2-3-241385 — ★ 综合判断)`;

const ANSWER_BODY = `要不要上 Graph RAG
取决于 query 类型——global sensemaking / 主题总结类收益大；简单 factoid / 单跳 QA 未必值回 index time 成本 [[wiki/analyses/three_graph_rag_families#^p-6-942640]]。

社区检测是必须的吗（★ 真实分歧，不给单一结论）
· GraphRAG（MSR）：社区检测 + 层次摘要是核心架构 [[wiki/sources/graphrag#^h-2-3-c08b6a]]
· LightRAG（HKU）反驳：社区检测是不必要的复杂度，dual-level retrieval 拿到大部分收益且支持增量更新 [[wiki/sources/lightrag]]
· 知识库判断：两个工程论断真实，但实验数字依赖 LLM-as-judge 需谨慎；状态 keep_watching [[wiki/concepts/graph_rag#^p-8-1775c9]]

更上层的综合
真正分歧其实是「扩充 corpus 派 vs 辅助 retrieval 派」——选型按你的任务谱来定，而非"谁更好" [[wiki/analyses/three_graph_rag_families#^p-6-942640]]。`;

// read-block 取回的冲突块原文（与 k.py read-block wiki/concepts/graph_rag p-8-1775c9 一致）
const CONFLICT_BLOCK = `[!WARNING] 知识更新冲突 — 2026-05-26(Graph 派内部之争 vol.1)
旧观点(GraphRAG, Microsoft Research 2024-04): Knowledge Graph + Leiden hierarchical community detection + 预生成 community summaries + map-reduce query 是正确架构;index time 重投入换 query time 高效。
新证据([[wiki/sources/lightrag]], HKU 2024-10):
 (a) Community detection 是不必要的复杂度 —— LightRAG §3.4 原文 "markedly reduces retrieval overhead compared to the community-based traversal method used in GraphRAG"
 (b) key-value pair + dual-level retrieval + vector keyword matching 拿到大部分 graph 收益,无需社区摘要 + traversal
 (c) Incremental update: LightRAG 增量加 graph 不重建索引;GraphRAG 数据一变就重跑全部 community detection + summary
LLM 判断: LightRAG 实验数字需谨慎(都用 LLM-as-judge,数据集不同不可直接比;UltraDomain ≠ GraphRAG 原 Podcast/News)。但两个工程论断真实:(1) community detection 确实增复杂度;(2) GraphRAG 不支持增量更新是真实痛点。
状态: 👁 keep_watching — merge`;

export const EX1_MESSAGE: UIMessage = {
  id: "ex1-assistant",
  role: "assistant",
  parts: [
    {
      kind: "text",
      text:
        "**【INTENT】解析用户查询意图**\n" +
        "识别到两个实体：Graph RAG / community detection。子问题 1 = 选型「要不要上」，子问题 2 = 必要性「社区检测是不是必须」。" +
        "用户身份暗示 RAG 系统搭建者，期望「架构对比 + 暴露真实分歧」而非单结论。这是个有「正确答案陷阱」的问题——好的答案应当暴露冲突，而不是把对立观点平均掉。",
    },
    {
      kind: "tool-call",
      call: {
        id: "call-read-root-index",
        name: "read-section",
        args: { path: "wiki/root_index.md", anchor_or_title: "## 领域目录" },
        result: { ok: true, data: ROOT_INDEX_AREA, duration_ms: 4 },
      },
    },
    {
      kind: "text",
      text:
        "**【STRATEGY】决定查询路径**\n" +
        "领域全景：8 个领域入口。'图结构 RAG' 明确在 graph_rag_index(13 页)，rag_evolution_index(110 页)是总时间线、也覆盖 GraphRAG 节点。" +
        "关键词独特性：「graph rag」「community detection」都是高独特性术语，BM25 应一击命中——走 (B) 更快，但仍带领域上下文决策（避免漏掉相邻领域入口）。",
    },
    {
      kind: "tool-call",
      call: {
        id: "call-search",
        name: "search",
        args: { query: "graph rag community detection", json: true },
        result: { ok: true, data: SEARCH_HITS, duration_ms: 38 },
      },
    },
    {
      kind: "text",
      text:
        "**【EVAL】评估 hits — 按 type 而非纯按分数选**\n" +
        "BM25 最高分是 rag_evolution_index（200），但分数高 ≠ 应该首读——index 是 MOC 导航层，不含论断。" +
        "次高是 concept/graph_rag（166），concept 是「聚合层」，已把 6 个底层 source 综合成带 anchor 的摘要。" +
        "type 优先级 = concept > analysis/comparison > source > index。从 wiki/concepts/graph_rag 入手。",
    },
    {
      kind: "tool-call",
      call: {
        id: "call-read-concept",
        name: "read_page",
        args: { path: "wiki/concepts/graph_rag" },
        result: { ok: true, data: GRAPH_RAG_PAGE, duration_ms: 11 },
      },
    },
    {
      kind: "text",
      text:
        "**【EXTRACT】提取核心差异 + 索引流程**\n" +
        "索引：GraphRAG 用 knowledge graph + community summaries（vs vector RAG 的扁平 chunk pool）。" +
        "索引 5 步：chunk → LLM 抽实体/关系/claims → 构图 → Leiden 社区检测 → 层次社区摘要。" +
        "Query：Map-Reduce 每个社区摘要出 partial answer 再合并。经验：comprehensiveness + diversity 强于 vector RAG。" +
        "出处 [[wiki/sources/graphrag#^h-2-3-c08b6a]]。但用户特别问「社区检测是不是必须」——正文挂着 2 个 [!WARNING] 块，正冲着这个争议点。继续看。\n\n" +
        "**【CONFLICT】★ 撞见知识冲突标注（concept 正文内）**\n" +
        "⚠️ Graph 派内部之争 vol.1：旧观点（GraphRAG, MSR 2024-04）= 社区检测 + Leiden 层次摘要 + map-reduce 是正确架构；" +
        "新证据（LightRAG, HKU 2024-10）= 社区检测是不必要的复杂度、dual-level retrieval 拿到大部分收益、支持增量更新。" +
        "LLM 判断：两个工程论断真实，但实验数字依赖 LLM-as-judge 需谨慎。状态：👁 keep_watching（merge）。" +
        "出处 [[wiki/concepts/graph_rag#^p-8-1775c9]]。" +
        "关键：知识库没有把分歧抹平成「社区检测一般有用」，而是用 [!WARNING] 显式保留对立双方——所以诚实答案是「有真实争议、且未决」。",
    },
    {
      kind: "tool-call",
      call: {
        id: "call-outlinks",
        name: "outlinks",
        args: { path: "wiki/concepts/graph_rag" },
        result: { ok: true, data: OUTLINKS, duration_ms: 7 },
      },
    },
    {
      kind: "text",
      text:
        "**【DECIDE】决定读 comparison 页（不逐个读 6 个 source）**\n" +
        "4 类候选下一步：(a) 6 个底层 source — 跳过（已被 concept 综合）；(b) 相关 concept（vanilla/Self-RAG/CRAG）— 暂缓（支线）；" +
        "(c) rag_evolution_index — 否（导航层）；(d) analyses/three_graph_rag_families（搜索命中 122 分，跨文档对照层）— 读（应有「这场争议怎么收」的综合结论）。",
    },
    {
      kind: "tool-call",
      call: {
        id: "call-read-compare",
        name: "read_page",
        args: { path: "wiki/analyses/three_graph_rag_families" },
        result: { ok: true, data: THREE_GRAPH_PAGE, duration_ms: 9 },
      },
    },
    {
      kind: "text",
      text:
        "**【EXTRACT】抽取两个分裂 + 综合结论**\n" +
        "两个根本性方法论分裂：分裂 1 = community detection 必要吗（GraphRAG 必要 vs LightRAG 不必要，即上一步冲突）；" +
        "分裂 2 = 扩充 corpus 派（GraphRAG/LightRAG/RAPTOR）vs 辅助 retrieval 派（HippoRAG 1/2）。" +
        "结论：真正分歧不是 community detection 之争，而是「扩充 corpus 派 vs 辅助 retrieval 派」；" +
        "选型按任务谱定，置信度中-高（数字依赖 LLM-as-judge）。出处 [[wiki/analyses/three_graph_rag_families#^p-6-942640]]。\n\n" +
        "**【DECIDE】停止扩散 — 信息已经够回答**\n" +
        "检查清单：要不要上 ✅；社区检测必须吗 ✅（有真实争议且未决）；继续读 6 个 source？否（重复）；读支线 concept？否。→ 停止扩散。但答案要照搬对立双方的精确论断与实验数字，组装前先回原文核验一次（细节下钻判据）。",
    },
    {
      kind: "tool-call",
      call: {
        id: "call-read-block-conflict",
        name: "read-block",
        args: { path: "wiki/concepts/graph_rag", anchor: "p-8-1775c9" },
        result: { ok: true, data: CONFLICT_BLOCK, duration_ms: 5 },
      },
    },
    {
      kind: "text",
      text:
        "**【ANSWER】组合带 anchor 的结构化答案**\n" +
        ANSWER_BODY,
    },
  ],
};
