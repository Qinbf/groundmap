# 操作日志

> 本 KB 由 LLM 自动维护;每次 ingest / query / lint / export 操作追加一条记录。

## [2026-05-25] bootstrap | 初始化 RAG 演化史 demo KB

- 从 llm-wiki 主框架复制:`scripts/` / `.claude/skills/` / `wiki/_templates/` / `CLAUDE.md`
- 创建空骨架:`raw/papers/` / `wiki/{sources,concepts,entities,analyses,indexes}/`
- 计划 ingest 8 篇 RAG 关键论文(2023-10 至 2025-03)
- 预期产出:source_summary × 8、领域 MOC、跨文档 analyses、冲突标注时间线

## [2026-05-26] ingest | Batch 4: Evaluation 3 篇(末批,完成 33/33)

3 篇 evaluation 论文 + 1 个共享概念页 + 3 个旗舰 analyses 终极升级:

**Evaluation source_summary**(3 篇):
1. [[wiki/sources/ragas]] (Es et al. 2023-09) — 自动指标框架(Faithfulness/Context/Answer Relevance)
2. [[wiki/sources/multihop_rag]] (Tang & Yang 2024-01) — 真实 multi-hop benchmark + Null query(测拒答)
3. [[wiki/sources/crag_benchmark]] (Meta 2024-06) — KDD Cup 综合 benchmark,**揭示主流 RAG 仅 ~40% 准确率**(对比 NQ 80%+)

**新概念页**:
- [[wiki/concepts/rag_evaluation]] — 综合 3 篇,梳理"自动指标框架 vs benchmark 数据集"双维度;与 Gao Survey §VI 章节对应

**旗舰 analyses 终极升级**(基于 33 篇规模重写/扩展):
- [[wiki/analyses/rag_evolution_timeline_2023_2025]] — **完整重写为 33 篇终极版**,识别 **5 条并行演化主线 + 6 处冲突 + 3 个涌现方法论分类**;含完整时间线(2020-04 DPR → 2025-03 R1 派)+ 范式翻新因果链
- [[wiki/analyses/three_graph_rag_families]] — Batch 4 升级:6 篇规模的两派(扩充 corpus 3 家 / 辅助 retrieval 2 家)+ KAG 应用层独立
- [[wiki/analyses/kb_vs_human_survey_coverage]] — Batch 4 升级:33 篇规模对照,KB 实质扩展 Gao Survey **约 24 篇**(2024-04 之后工作)

**最终统计**:
- 33/33 ingest 完成(原计划 38,实际 33;5 篇边缘工作 SPLADE/GritLM/LazyGraphRAG/WebRL/Modular RAG Survey 未 ingest,边际收益递减)
- 46 wiki 页(33 sources + 8 concepts + 1 comparison + 2 analyses + 2 index)
- 6 处冲突标注(`k.py list-conflicts` 全扫到)
- lint 全合规
- 14 次 git commit + 5 个 tag(v1.0 → v1.4)

🎯 实验闭环完成。

## [2026-05-26] ingest | Batch 3: LC 扩展 3 篇 + RL/Agentic 扩展 4 篇

7 篇 ingest 完成(30/38 总进度):

**LC / Hybrid 扩展**(3 篇):
1. [[wiki/sources/recomp]] (2023-10) — 压缩 + Selective augmentation(Self-Route 思想前驱)
2. [[wiki/sources/longllmlingua]] (2023-10) — token-level prompt 压缩,对抗 LC 的工程武器
3. [[wiki/sources/longrag]] (2024-06) — LC LLM 作 RAG generator,RAG vs LC 融合方案

**RL / Agentic 扩展**(4 篇):
4. [[wiki/sources/memgpt]] (2023-10) — LLMs as OS,memory-augmented 开山(后改名 Letta)
5. [[wiki/sources/raft]] (2024-03) — RAG-Aware Fine-Tuning,domain-specific 主张
6. [[wiki/sources/search_o1]] (2025-01) — o1 派 agentic RAG(**第③档**,纯 prompting + LRM)
7. [[wiki/sources/deeprag]] (2025-02) — IL 派 agentic RAG(MCTS + imitation learning)

**第 6 处冲突标注首次触发**:
在 [[wiki/concepts/rl_augmented_retrieval]] 注入 `> [!WARNING]` 块**2025 Agentic RAG 三家鼎立**:
- **o1 派**(prompting + LRM):Search-o1,无需训练但需强 base
- **R1 派**(RL outcome reward):R1-Searcher / Search-R1,7B 超 o1 派 32B
- **IL 派**(MCTS + imitation):DeepRAG,atomic decision MDP

这是 KB demo **首次识别 2025 同年内范式分歧**(之前 5 处冲突都跨年)。

概念页升级:
- [[wiki/concepts/rag_vs_long_context]] 加"融合方案"小节(3 条工程路径:Self-Route / LongRAG / 压缩)
- [[wiki/concepts/retrieval_augmented_generation]] 加**第 5 条主线** "通用 RAG vs domain-specific RAG"(RAFT + KAG)
- [[wiki/concepts/rl_augmented_retrieval]] 三家对照表(o1 / R1 / IL)+ 关联 MemGPT

进度:30/38 ingest(Batch 0/1/2/3 ✓);剩余 Batch 4 共 8 篇:Evaluation(RAGAS / CRAG-bench / MultiHop-RAG)+ 旗舰 analyses 升级。

## [2026-05-26] ingest | Batch 2: Self-Reflective 前史 5 篇 + Graph 扩展 3 篇

8 篇 ingest 完成(23/38 总进度):

**Self-Reflective 演化前置历史**(5 篇,2022-10 → 2023-05):
1. [[wiki/sources/self_ask]] — Self-Ask:显式 query decomposition prompting
2. [[wiki/sources/react]] — ReAct:Reasoning + Acting agent 框架奠基
3. [[wiki/sources/ircot]] — IRCoT:interleaving retrieval + CoT multi-hop
4. [[wiki/sources/self_refine]] — Self-Refine:iterative self-feedback
5. [[wiki/sources/flare]] — FLARE:Active RAG,token logprob 触发动态 retrieve

**Graph RAG 扩展**(3 篇):
6. [[wiki/sources/raptor]] — RAPTOR(2024-01):GMM 聚类 + 递归层次摘要(**扩充 corpus 派**具体 anchor)
7. [[wiki/sources/hipporag1]] — HippoRAG 1(2024-05):OpenIE KG + PPR(**HippoRAG 2 前作**,辅助 retrieval 派开山)
8. [[wiki/sources/kag]] — KAG(蚂蚁 2024-09):专业领域 KG + Reasoning Planner(**第③档处理**)

新增产出:
- 升级 [[wiki/concepts/self_reflective_rag]] 加"演化前置历史"小节,梳理 prompting (2022-2023) → SFT (Self-RAG 2023-10) → RL (R1 派 2025-03) 三段演化论;5 篇 prompting 路线纳入完整谱系
- 升级 [[wiki/concepts/graph_rag]] 三派对照表加 3 行:RAPTOR 作"扩充 corpus 派"具体 anchor / HippoRAG 1 作"辅助 retrieval 派"起源 / KAG 独立应用层分类

Batch 2 关键贡献:**给现有 5 处冲突标注做回流补充 anchor**——graph_rag.md vol.2 标注里"扩充 corpus 派"现在从抽象类别变为 3 个具体代表(GraphRAG/LightRAG/RAPTOR);self_reflective_rag.md 标注里"prompting 路线被替代"现在有 5 个具体前作 anchor。

进度:23/38 ingest(Batch 0 ✓ + Batch 1 ✓ + Batch 2 ✓),剩余 Batch 3-4 共 15 篇待处理。

## [2026-05-26] ingest | Batch 1: Gao Survey + Retrieval Foundation 6 篇

7 篇 ingest 完成(15/38 总进度):

1. **[[wiki/sources/gao_rag_survey]]** — Gao et al. 2024 RAG Survey(arXiv 2312.10997)
   - **第③档处理**:字符数 152509,触发整本书规模流程
   - 含「## 章节深度登记」表:II Overview 深读 / III Retrieval + VI Evaluation 扫读 / 其他跳过
   - 含 KB vs Survey 覆盖度对照矩阵(已 ingest 8 篇 → 2 篇被 survey 覆盖,6 篇 KB 扩展)
2. **[[wiki/sources/dpr]]** — DPR (Karpukhin et al. 2020-04) 现代 dense retrieval 起点
3. **[[wiki/sources/colbertv2]]** — ColBERTv2 (Santhanam et al. 2021-12) late interaction 派
4. **[[wiki/sources/contriever]]** — Contriever (Izacard et al. 2021-12) unsupervised dense retrieval
5. **[[wiki/sources/e5]]** — E5 (Wang et al. Microsoft 2022-12) 工程化双塔
6. **[[wiki/sources/bge]]** — BGE / C-Pack (BAAI 2023-09) 中英双语 SOTA
7. **[[wiki/sources/nv_embed_v2]]** — NV-Embed v2 (NVIDIA 2024-05) LLM-as-encoder
   - **关键**:HippoRAG 2 graph 之争 vol.2 的具体 baseline anchor

新增产出:
- 共享概念页 [[wiki/concepts/retrieval_foundations]] — 三派架构对照(single-vector / late interaction / LLM-based)+ supervised vs unsupervised 之争 + 与 Batch 0 8 篇的 retriever 默认选择对照
- **[[wiki/analyses/kb_vs_human_survey_coverage]] v2 升级**——从定性对照升级到基于 Gao Survey ingest 的严格 anchor 级对照;识别 survey 2 个结构性盲点(graph 派 / LC 挑战)

技术亮点:
- 改造 scripts/download_papers.sh 支持 arxiv-html / ar5iv 双 source(老论文 2020-2022 没官方 HTML,ar5iv fallback 解决)
- Batch 0/1 双批次累积模式(scripts/download_papers.sh 一次扫,跳过已存在)

Batch 1 无新冲突标注(retrieval foundation 互相不冲突),但 NV-Embed v2 为 graph 之争 vol.2 提供具体 anchor。

进度:15/38 ingest(Batch 0 ✓ + Batch 1 ✓),剩余 23 篇待 Batch 2-4 处理。

## [2026-05-26] export | 3 篇旗舰对照分析(实验闭环)

完成 8/8 ingest 后,产出 3 篇 wiki/analyses/:

1. **[[wiki/analyses/rag_evolution_timeline_2023_2025]]** — 演化时间线 + 5 次冲突标注汇总,识别 4 条并行演化主线(query-time 控制流 / corpus 表征 / 元挑战 / hybrid 融合);main observation:冲突主要发生在主线内部,主线之间几乎正交
2. **[[wiki/analyses/three_graph_rag_families]]** — 三派 Graph RAG 深度对照表,提出"扩充 corpus 派 vs 辅助 retrieval 派"的根本性方法论分类(从 graph_rag 概念页的 2 个冲突标注 + 对照表抽离深化)
3. **[[wiki/analyses/kb_vs_human_survey_coverage]]** — 本 KB 自动综合 vs Gao et al. 2024 RAG Survey 覆盖度对照,核心结论:KB 在 8 篇范围内识别出 survey 没覆盖的 2 个新议题(LC 路线挑战 + RL 范式翻新);KB 的独特价值是冲突追踪的实时性 + 机器可读性

更新 root_index + rag_evolution_index 反映 3 篇 analyses。
KB 18 页(8 sources + 6 concepts + 1 index + 3 analyses)。
list-conflicts 仍为 5 处。

## [2026-05-26] ingest | R1-Searcher + Search-R1(RL 范式双子星,2025-03)

- R1-Searcher (RUC 2025-03-05, arXiv 2503.05592, 字符 72429)+ Search-R1 (UIUC 2025-03-12, arXiv 2503.09516, 字符 130530)
- 创建 [[wiki/sources/r1_searcher]] + [[wiki/sources/search_r1]] + 共享 [[wiki/concepts/rl_augmented_retrieval]] 概念页(含两篇对照表)
- **第 5 次冲突标注**(自决检索范式翻新):在 [[wiki/concepts/self_reflective_rag]] 注入第 2 个 `> [!WARNING]` 块,RL outcome-based 训练 vs reflection tokens SFT,两篇都用 7-8B Base 超过 GPT-4o-mini
- 两篇并发工作(差 7 天),互相未引,但方法高度相似:都用 outcome reward + multi-turn rollout + retrieved token loss masking
- 关键区别:R1-Searcher 两阶段 reward + Reinforce++;Search-R1 单阶段 + PPO/GRPO 双兼容 + 系统 ablation
- 8/8 ingest 完成

## [2026-05-26] ingest | HippoRAG 2 (OSU 2025-02, arXiv 2502.14802)

- 字符数 116155(第②档),读 Intro / Related Work / Section 3 HippoRAG 2 主体 / Experimental Setup
- 创建 [[wiki/sources/hipporag2]]
- **第 4 次冲突标注**(graph 派内部之争 vol.2):在 [[wiki/concepts/graph_rag]] 注入第 2 个 `> [!WARNING]` 块,HippoRAG 2 反驳整个"扩充 corpus 派"(GraphRAG/LightRAG/RAPTOR),提出"KG 辅助 retrieval"的根本性架构区分
- 在 graph_rag 概念页加 **三派 Graph RAG 对照表**——清晰区分"扩充 corpus 派" vs "辅助 retrieval 派"两条根本路径
- list-conflicts 扫到 4 处标注

## [2026-05-26] ingest | LightRAG (HKU 2024-10, arXiv 2410.05779)

- 字符数 79036(第②档),读 Abstract / Intro / Section 2 RAG / Section 3 架构
- 创建 [[wiki/sources/lightrag]]
- **第 3 次冲突标注**(graph 派内部之争 vol.1):在 [[wiki/concepts/graph_rag]] 注入 `> [!WARNING]` 块,记录 LightRAG 反驳 GraphRAG community detection,改用 key-value + dual-level + incremental
- 标注里 critical 评论:LightRAG 的实验数字声明需谨慎(评估范式相同但数据集不同)
- 4 次 commit 后 list-conflicts 扫到 3 处标注(self_reflective_rag, rag-core, graph_rag)

## [2026-05-26] ingest | RAG vs Long-Context LLMs (DeepMind 2024-07, arXiv 2407.16833)

- 字符数 67045(第②档),读完整 Intro + Benchmarking + Self-Route + Why-RAG-fails
- 创建 [[wiki/sources/rag_or_longcontext]] + [[wiki/concepts/rag_vs_long_context]]
- **第 2 次冲突标注**(更大,挑战整个 RAG 赛道):在根概念页 [[wiki/concepts/retrieval_augmented_generation]] 注入 `> [!WARNING]` 块,论断 LC > RAG(GPT-4O +13.1%);Self-Route hybrid 为合理融合方向
- 建议状态:keep_watching(LC 模型继续进化,1-2 年回看)
- annotate-section 回填 4 个关键章节
- 更新 MOC + root_index(4/8)

## [2026-05-26] ingest | GraphRAG (Microsoft Research 2024-04, arXiv 2404.16130)

- 字符数 118084(第②档),读 Abstract / Intro / Background / Methods 主体 / Results
- 创建 [[wiki/sources/graphrag]] + [[wiki/concepts/graph_rag]]
- 与前两篇**无直接冲突**——改进维度正交:GraphRAG 改 corpus 表征(index time),Self-RAG/CRAG 改 query-time 控制流
- 关键贡献:首次定义"global sensemaking"问题类(vector RAG 在此类问题上 fail)
- 更新 [[wiki/concepts/retrieval_augmented_generation]] 演化方向章节,明确"正交改进"观察
- 预留冲突锚点:LightRAG / HippoRAG 2 ingest 时回流注入(graph 派内部之争)
- annotate-section 回填 4 个关键章节

## [2026-05-26] ingest | CRAG: Corrective RAG (Yan et al. 2024-01, arXiv 2401.15884)

- 字符数 93235(第②档),读 Abstract / Intro / Related / Task Formulation / Section 4 主体(4.1-4.5)/ Section 5 Results
- 创建 [[wiki/sources/crag]]、[[wiki/concepts/corrective_rag]]
- **首次触发冲突标注流程**:在 [[wiki/concepts/self_reflective_rag]] 注入 `> [!WARNING]` 块,记录两条冲突:
  - (a) "critic 内化 vs 外置 evaluator":Llama2-7B critic vs T5-large 0.77B evaluator,后者轻 9 倍
  - (b) Self-CRAG > Self-RAG 在 PopQA/Bio/PubHealth 上,证伪"内化是终极路径"假设
- 状态:⏳ 待人类判别,建议 merge(两种路线是互补非互斥)
- 更新 [[wiki/indexes/rag_evolution_index]]:CRAG ⊙ → ✓,加冲突标记
- 更新 [[wiki/root_index]]:来源 1/8 → 2/8
- annotate-section 回填 6 个 CRAG 关键章节
- lint:`list-source-issues` 全部通过

## [2026-05-26] ingest | Self-RAG (Asai et al. ICLR 2024, arXiv 2310.11511)

- 字符数 74718(第②档中长文),按 H1 切块 + read-section 读 Abstract / Intro / Related / Method 3.1-3.3 / Experiments / Results
- 创建 [[wiki/sources/self_rag]]、[[wiki/concepts/retrieval_augmented_generation]] (stub)、[[wiki/concepts/self_reflective_rag]]
- 新建 MOC [[wiki/indexes/rag_evolution_index]](RAG 演化史时间线表)
- annotate-section 回填 6 个关键章节摘要
- 综合判断:首篇 ingest,无前置冲突;预言后续 CRAG 会走不同路径(evaluator 而非 critic)、Search-R1 / R1-Searcher 用 RL 挑战 reflection tokens 范式
- lint:`list-source-issues` 全部通过
