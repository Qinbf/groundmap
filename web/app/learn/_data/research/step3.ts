import "server-only";
import type { StepData, Localized } from "../types";

const rootIndexAreaMarkdown: Localized = {
  zh: `## ## 领域目录（root_index 硬前置 · read-section 返回）

> 8 行结构化目录——BM25 字面召回**拿不到**这种"分类索引"，必须显式 read-section 一次才能拿到。

| 领域 | 子索引 | 页面数 |
|---|---|---|
| NLP / LLM 基础 | [[wiki/indexes/nlp_index]] | 31 |
| 信息检索基础 | [[wiki/indexes/retrieval_index]] | 12 |
| 开放域 QA | [[wiki/indexes/open_domain_qa_index]] | 8 |
| 参数化 vs 非参数化记忆 | [[wiki/indexes/memory_paradigm_index]] | 5 |
| 检索增强生成（RAG） | [[wiki/indexes/rag_index]] | 9 |
| 综合分析（跨文档） | [[wiki/indexes/analyses_index]] | 4 |
| 评测 / 基准 | [[wiki/indexes/eval_index]] | 6 |
| 计划 ingest 清单 | — | — |

→ 8 个领域入口。本论文（RAG 奠基）显然落在 **RAG / 检索增强生成** 与 **参数化 vs 非参数化记忆** 与 **开放域 QA** 三者交集——这是单 search 命中看不到的"跨领域全景"，硬必读一次后才看到。`,
  en: `## ## Domain catalog (root_index hard prerequisite · read-section return)

> An 8-row structured catalog — BM25 literal recall **cannot** reach this kind of "classification index"; you must explicitly read-section once to get it.

| Domain | Sub-MOC | Pages |
|---|---|---|
| NLP / LLM foundations | [[wiki/indexes/nlp_index]] | 31 |
| Information retrieval foundations | [[wiki/indexes/retrieval_index]] | 12 |
| Open-domain QA | [[wiki/indexes/open_domain_qa_index]] | 8 |
| Parametric vs non-parametric memory | [[wiki/indexes/memory_paradigm_index]] | 5 |
| Retrieval-Augmented Generation (RAG) | [[wiki/indexes/rag_index]] | 9 |
| Cross-document syntheses | [[wiki/indexes/analyses_index]] | 4 |
| Evaluation / benchmarks | [[wiki/indexes/eval_index]] | 6 |
| Planned ingest list | — | — |

→ 8 domain entries. This paper (RAG founding) clearly sits at the **intersection** of RAG / retrieval-augmented generation, parametric vs non-parametric memory, and open-domain QA — a "cross-domain panorama" invisible to a single search hit; you only see it after the hard prerequisite read-section.`,
};

const recallMechanismMarkdown: Localized = {
  zh: `## 为什么要搜多次？召回兜底的 5 层机制

只靠 \`k.py search\` 的字面 substring 匹配（标题 ×5 + 正文 ×1）会漏掉**语义相近但用词不同**的内容——比如新论文用「retrieval-augmented」，老 wiki 页用「检索式问答」/「外部记忆」，字面 search 命中不到。系统通过 5 层机制对冲（v0.6 起新增 ① 层为硬前置）：

| 层 | 机制 | 在本步的体现 |
|---|---|---|
| **① 硬前置：root_index 目录**（v0.6 新增） | \`read-section root_index "## 领域目录"\` 拿领域全景——结构化目录 BM25 召回不到 | 上方第一个 result：8 行表锁住 8 个领域入口；本论文命中 RAG / memory / open-domain QA 三者交集 |
| ② **多 query 自决（并发）** | AI 同时搜多个相关 term + 已知同义词，三角覆盖互补 | whatCommand 第 2-4 行：并发 3 个 search（"retrieval" / "parametric memory" / "open domain qa"），互不阻塞 |
| ③ **backlinks/outlinks 扩散** | 命中页 → 反查引用关系 → 拉到关联页 | 命中 \`open_domain_qa.md\` 后调 \`k.py backlinks\` / \`outlinks\`，顺藤摸到 \`parametric_memory.md\` / \`seq2seq.md\` 等关联页（即使没 search 命中） |
| ④ **MOC 结构性回链** | MOC 列出该领域所有重要页面，命中 MOC 后能拿到完整列表 | 第 8 步要更新 [[wiki/indexes/nlp_index]]——它本质就是「补字面召回漏洞」的备用网，下次同领域 query 通过 MOC 召回 |
| ⑤ **agent 语义二次判断（并发 read-section）** | 召回页用 \`read-section\` 轻读，AI 自己判断是否相关 | whatCommand 末段：3 个 search 的 hit 各自并发 read-section 轻读 H1 段，agent 在阅读时做语义二次判断——这是 \`知识库不内嵌 LLM、但流程依赖外部 agent\` 的根本原因 |

### 并发与效率

5 层里 ② 多 query 与 ⑤ 多次 read-section 都天然可并发——agent 不会阻塞等前一个返回再发起下一个（除非前后有依赖，例如 ⑤ 必须等 ② 的 hit）。本步的典型并发组合：

- \`read-section root_index\` （① 硬前置 · 顺序，因后面决策要靠它）
- 三路 search 并发（②）
- 对每个 hit 的 read-section 并发（⑤，但需要 ② 完成拿到 hit 列表）

### 为什么不直接上 embedding 召回？

CLAUDE.md 原则 4「严禁 embedding」是刻意取舍（也正好与本文主题呼应——RAG 用 embedding 做召回，而 GroundMap 刻意不用）：

- 引入 embedding = 切片粒度 + 向量库 + 模型版本一致性 + 持续维护成本
- 在「完整页面优先」（原则 3）前提下，**LLM 自身的语义理解能在阅读时补足 BM25 召回的精度劣势**
- 用召回率换**简单性 / 可解释性 / 长期维护性**——代价是依赖 agent 多次搜 + MOC 兜底 + 硬必读领域目录来逼近高召回
`,
  en: `## Why search multiple times? A 5-layer recall safety net

Relying only on \`k.py search\`'s literal substring match (title ×5 + body ×1) misses content that is **semantically close but worded differently** — e.g. a new paper says "retrieval-augmented" while an old wiki page says "检索式问答" / "external memory," which literal search won't hit. The system hedges with five layers (layer ① is new since v0.6 as a hard prerequisite):

| Layer | Mechanism | In this step |
|---|---|---|
| **① Hard prerequisite: root_index catalog** (new in v0.6) | \`read-section root_index "## 领域目录"\` to get the domain panorama — a structured index BM25 cannot reach | The first result above: an 8-row table locks in 8 domain entries; this paper hits the intersection of RAG / memory / open-domain QA |
| ② **Multi-query by the AI (concurrent)** | The AI searches several related terms + known synonyms at once for triangulated, complementary coverage | whatCommand lines 2–4: three concurrent searches ("retrieval" / "parametric memory" / "open domain qa") that don't block each other |
| ③ **backlinks/outlinks expansion** | A hit page → follow its link relations → pull in related pages | After hitting \`open_domain_qa.md\`, call \`k.py backlinks\` / \`outlinks\` to reach \`parametric_memory.md\` / \`seq2seq.md\` (even if they never matched search) |
| ④ **Structural MOC back-links** | A MOC lists every important page in a domain; hitting the MOC yields the full list | Step 8 updates [[wiki/indexes/nlp_index]] — essentially a backup net for "literal-recall gaps"; next same-domain query is recalled via the MOC |
| ⑤ **Second-pass semantic judgment by the agent (concurrent read-section)** | Lightly read recalled pages with \`read-section\` and let the AI decide relevance itself | whatCommand tail: each search hit gets a concurrent read-section light-read of its H1, and the agent judges semantically while reading — this is the core reason "the KB embeds no LLM but the workflow relies on an external agent" |

### Concurrency & efficiency

Of the 5 layers, ② (multi-query) and ⑤ (multi read-section) are naturally concurrent — the agent doesn't block waiting for the previous call to return before issuing the next (unless there's a true dependency, e.g. ⑤ needs ②'s hit list first). The typical concurrent shape of this step:

- \`read-section root_index\` (① hard prerequisite · sequential, because later decisions depend on it)
- three concurrent searches (②)
- one concurrent read-section per hit (⑤, but it needs ② to finish to get the hit list)

### Why not just use embedding retrieval?

CLAUDE.md principle 4 ("no embeddings") is a deliberate trade-off (and it nicely echoes this very topic — RAG uses embeddings for retrieval, while GroundMap deliberately does not):

- Adding embeddings = chunk granularity + a vector store + model-version consistency + ongoing maintenance cost
- Given "whole pages first" (principle 3), **the LLM's own semantic understanding can make up for BM25's precision gap at read time**
- It trades recall for **simplicity / interpretability / long-term maintainability** — at the cost of relying on multi-search + MOC fallback + the hard-prerequisite domain catalog to approximate high recall
`,
};

const synthesisMarkdown: Localized = {
  zh: `## AI 综合判断

> **这是 AI 的内部分析。第 5 步会作为 source_summary 的一个独立 H2 节固化下来，便于日后审计或在 web 端覆盖。**

### 核心价值

相对于现有 wiki，本文带来三个新点：

- **新范式**：参数化（BART）+ 非参数化（DPR 检索 + 维基百科索引）**混合记忆**——颠覆 wiki 现有「知识必须压进模型参数」的默认论断
- **新组件**：对"检索文档"做边缘化的 RAG-Sequence / RAG-Token，外加 DPR 检索器——这两个都是全新概念页候选
- **新对比依据**：纯参数化 vs 检索增强的三维表（知识更新 / 可溯源 / 幻觉倾向）——直接更新 [[wiki/concepts/parametric_memory]] 的核心比较

### 关联

- [[wiki/concepts/parametric_memory]] — 直接相关，本文把"知识全靠参数"升级为"参数 + 外部检索"，核心论断需要重写
- [[wiki/concepts/open_domain_qa]] — 直接相关，本文证据要求把"SOTA = 抽取式（DPR/REALM）"改成"生成式 RAG 反超抽取式"
- [[wiki/concepts/dense_passage_retrieval]] — 全新独立概念，wiki 里完全没有，是否新建独立页待第 4 步定
- [[wiki/concepts/seq2seq]] — 间接相关，本文用 BART 作生成器、沿用其骨架

### 冲突

- 与 [[wiki/concepts/parametric_memory]] 当前「靠 scale 把模型做大、参数化记忆足以解决知识密集型任务」论断不一致——本文表明检索增强在知识更新 / 可溯源 / 抗幻觉三维全面占优，且开放域 QA 上反超纯参数化 T5。第 5 步在 source_summary 用 \`> [!WARNING]\` 冲突标注块记录，留待 lint / 人工决议。
`,
  en: `## AI synthesis

> **This is the AI's internal analysis. Step 5 fixes it into the source_summary as a dedicated H2 section, for later audit or override in the web console.**

### Core value

Relative to the existing wiki, this paper brings three new things:

- **New paradigm**: parametric (BART) + non-parametric (DPR retrieval + Wikipedia index) **hybrid memory** — overturning the wiki's default claim that "knowledge must be compressed into model parameters"
- **New components**: RAG-Sequence / RAG-Token that marginalize over retrieved documents, plus the DPR retriever — both are candidates for brand-new concept pages
- **New comparison basis**: a three-axis table of pure-parametric vs retrieval-augmented (updatability / traceability / hallucination) — directly updates the core comparison in [[wiki/concepts/parametric_memory]]

### Relations

- [[wiki/concepts/parametric_memory]] — directly related; this paper upgrades "knowledge lives entirely in parameters" to "parameters + external retrieval," so the core claim must be rewritten
- [[wiki/concepts/open_domain_qa]] — directly related; the evidence here requires changing "SOTA = extractive (DPR/REALM)" to "generative RAG overtakes extractive"
- [[wiki/concepts/dense_passage_retrieval]] — a brand-new standalone concept absent from the wiki; whether to create a dedicated page is decided in step 4
- [[wiki/concepts/seq2seq]] — indirectly related; this paper uses BART as the generator and builds on its backbone

### Conflicts

- Inconsistent with the current claim in [[wiki/concepts/parametric_memory]] that "scaling the model up makes parametric memory enough for knowledge-intensive tasks" — this paper shows retrieval augmentation wins across all three axes (updatability, traceability, anti-hallucination) and overtakes pure-parametric T5 on open-domain QA. Step 5 records this with a \`> [!WARNING]\` conflict block in the source_summary, left for lint / human resolution.
`,
};

export const step3: StepData = {
  id: 3,
  titleKey: "learn.step.3.title",
  whyKey: "learn.step.3.why",
  whatCommand: `# ① 硬前置：read-section 拿 root_index 的 ## 领域目录（结构化目录，BM25 召回不到）
python scripts/k.py --workspace rag-evolution read-section wiki/root_index.md "## 领域目录"

# ② 多 query 并发搜索（互不阻塞，三角覆盖）
python scripts/k.py --workspace rag-evolution search "retrieval" --json &
python scripts/k.py --workspace rag-evolution search "parametric memory" --json &
python scripts/k.py --workspace rag-evolution search "open domain qa" --json &
wait

# ⑤ 对每个 hit 并发 read-section 轻读 H1 段（agent 二次判断）
python scripts/k.py --workspace rag-evolution read-section wiki/concepts/parametric_memory.md "## 规模假说" &
python scripts/k.py --workspace rag-evolution read-section wiki/concepts/open_domain_qa.md "## 主流路线" &
python scripts/k.py --workspace rag-evolution read-section wiki/concepts/seq2seq.md "## 简介" &
wait`,
  whatNoteKey: "learn.cmd.note.search",
  focusAnchors: ["h-2-4-be4790", "p-7-8d7e62", "t-33-cf4a82"],
  results: [
    {
      kind: "markdown",
      content: rootIndexAreaMarkdown,
      captionKey: "learn.caption.root_index_hard_prereq",
      pseudoPath: "wiki/root_index.md## 领域目录",
    },
    {
      kind: "search-result",
      query: "retrieval",
      hits: [
        {
          // title "开放域问答 Open-Domain QA" → 不含 retrieval → 0
          // body "retrieval" / "检索" ~38 次 → score = 0 + 38 = 38
          path: "wiki/concepts/open_domain_qa.md",
          score: 38,
          preview: {
            zh: "开放域问答指在没有给定上下文的情况下回答事实问题。主流路线是「检索 + 抽取」：先用 DPR/BM25 检索候选段落，再用阅读器抽取答案 span。当前 SOTA 由抽取式方法（REALM、DPR）占据…",
            en: "Open-domain QA answers factual questions without a given context. The mainstream route is \"retrieve + extract\": retrieve candidate passages with DPR/BM25, then have a reader extract the answer span. The current SOTA is held by extractive methods (REALM, DPR)…",
          },
        },
      ],
    },
    {
      kind: "search-result",
      query: "parametric memory",
      hits: [
        {
          // title "参数化记忆 Parametric Memory" → parametric×5 + memory×5 = 10
          // body "parametric" ~8 + "memory" ~15 → score = 10 + 23 = 33
          path: "wiki/concepts/parametric_memory.md",
          score: 33,
          preview: {
            zh: "大型语言模型把事实知识隐式存进参数。随着模型规模增大，参数化记忆覆盖的事实越来越多——一种观点认为，把模型做得足够大，参数化记忆就足以应对知识密集型任务…",
            en: "Large language models store factual knowledge implicitly in their parameters. As models grow, parametric memory covers more facts — one view holds that making the model big enough lets parametric memory handle knowledge-intensive tasks…",
          },
        },
        {
          // title "Seq2Seq" → 0
          // body "memory" ~3 + 相关词 ~12 → score = 0 + 15 = 15
          path: "wiki/concepts/seq2seq.md",
          score: 15,
          preview: {
            zh: "Sequence-to-Sequence（Sutskever et al., 2014）用 encoder 压缩输入、decoder 自回归生成输出。BART / T5 是其预训练去噪变种…",
            en: "Sequence-to-Sequence (Sutskever et al., 2014) compresses the input with an encoder and autoregressively generates the output. BART / T5 are its pre-trained denoising variants…",
          },
        },
      ],
    },
    {
      kind: "markdown",
      content: recallMechanismMarkdown,
      captionKey: "learn.caption.recall_mechanism",
    },
    {
      kind: "markdown",
      content: synthesisMarkdown,
      captionKey: "learn.caption.synthesis_internal",
    },
  ],
};
