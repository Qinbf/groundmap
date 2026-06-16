import "server-only";
import type { StepData } from "../types";

const recallMechanismMarkdown = `## 为什么要搜多次？召回兜底的 4 层机制

只靠 \`k.py search\` 的字面 substring 匹配（标题 ×5 + 正文 ×1）会漏掉**语义相近但用词不同**的内容——比如新论文用「Transformer」，老 wiki 页用「self-attention 架构」，字面 search 命中不到。系统通过 4 层机制对冲：

| 层 | 机制 | 在本步的体现 |
|---|---|---|
| ① **多 query 自决** | AI 同时搜多个相关 term + 已知同义词，三角覆盖互补 | 上方 whatCommand：同时搜 "attention" / "sequence modeling" / "encoder decoder"，互相补漏 |
| ② **backlinks/outlinks 扩散** | 命中页 → 反查引用关系 → 拉到关联页 | 命中 \`attention_mechanism.md\` 后调 \`k.py backlinks\` / \`outlinks\`，顺藤摸到 \`sequence_modeling.md\` / \`lstm.md\` 等关联页（即使没 search 命中） |
| ③ **MOC 结构性回链** | MOC 列出该领域所有重要页面，命中 MOC 后能拿到完整列表 | 第 8 步要更新 [[wiki/indexes/deep_learning_index]]——它本质就是「补字面召回漏洞」的备用网，下次同领域 query 通过 MOC 召回 |
| ④ **agent 语义二次判断** | 召回页用 \`read-section\` 轻读，AI 自己判断是否相关 | 即使关键词错配、回来的页不那么准，AI 读完页面内容能补救——这是 \`知识库不内嵌 LLM、但流程依赖外部 agent\` 的根本原因 |

### 为什么不直接上 embedding 召回？

CLAUDE.md 原则 4「严禁 embedding」是刻意取舍：

- 引入 embedding = 切片粒度 + 向量库 + 模型版本一致性 + 持续维护成本
- 在「完整页面优先」（原则 3）前提下，**LLM 自身的语义理解能在阅读时补足 BM25 召回的精度劣势**
- 用召回率换**简单性 / 可解释性 / 长期维护性**——代价是依赖 agent 多次搜 + MOC 兜底来逼近高召回
`;

const synthesisMarkdown = `## AI 综合判断

> **这是 AI 的内部分析。第 5 步会作为 source_summary 的一个独立 H2 节固化下来，便于日后审计或在 web 端覆盖。**

### 核心价值

相对于现有 wiki，本文带来三个新点：

- **新架构**：完全去掉循环 / 卷积、仅靠注意力的 encoder-decoder 模型——颠覆 wiki 现有「序列建模 = RNN/LSTM」的默认论断
- **新组件**：Scaled Dot-Product Attention（公式 \`softmax(QK^T/√d_k) V\`）与 Multi-Head Attention（h=8 并行子空间）——这两个都是全新概念页候选
- **新对比依据**：自注意力 vs 循环 vs 卷积的三维表（每层复杂度 / 顺序操作数 / 最大路径长度）——直接更新 [[wiki/concepts/sequence_modeling]] 的核心比较

### 关联

- [[wiki/concepts/attention_mechanism]] — 直接相关，本文是该机制的「自给自足」式应用范本（不再作为 RNN 的辅助），核心论断需要升级
- [[wiki/concepts/sequence_modeling]] — 直接相关，本文证据要求把"循环为默认"改成"自注意力为默认"
- [[wiki/concepts/positional_encoding]] — 全新独立概念，wiki 里完全没有，是否新建独立页待第 4 步定
- [[wiki/concepts/encoder_decoder]] — 间接相关，本文沿用其骨架但替换内部层

### 冲突

- 与 [[wiki/concepts/sequence_modeling]] 当前「LSTM 因门控机制是最佳序列模型」论断不一致——本文表明 self-attention 在路径长度 O(1)、并行度 O(1) 上均完胜，在翻译质量上也超过 SOTA。第 5 步在 source_summary 用 \`> [!WARNING]\` 冲突标注块记录，留待 lint / 人工决议。
`;

export const step3: StepData = {
  id: 3,
  titleKey: "learn.step.3.title",
  whyKey: "learn.step.3.why",
  whatCommand: `python scripts/k.py search "attention" --json
python scripts/k.py search "sequence modeling" --json
python scripts/k.py search "encoder decoder" --json
# 对每个 hit ≥ 2 的页面调 read-section 轻读 H1 段`,
  whatNoteKey: "learn.cmd.note.search",
  focusAnchors: ["h-2-4-be4790", "p-7-8d7e62", "t-33-cf4a82"],
  results: [
    {
      kind: "search-result",
      query: "attention",
      hits: [
        {
          // title "注意力机制 Attention Mechanism" → "attention" × 5 = 5
          // body 出现 ~37 次 → score = 5 + 37 = 42
          path: "wiki/concepts/attention_mechanism.md",
          score: 42,
          preview: "注意力机制最早由 Bahdanau et al. (2014) 提出，作为 encoder-decoder 模型中 decoder 关注 encoder 隐状态的辅助组件。计算方式：以 decoder 当前隐状态为 query 与 encoder 所有隐状态做兼容性打分…",
        },
      ],
    },
    {
      kind: "search-result",
      query: "sequence modeling",
      hits: [
        {
          // title "序列建模 Sequence Modeling" → sequence×5 + modeling×5 = 10
          // body "sequence" ~15 次 + "modeling" ~10 次 → score = 10 + 25 = 35
          path: "wiki/concepts/sequence_modeling.md",
          score: 35,
          preview: "序列建模任务（机器翻译、语言模型、speech-to-text）的主流方法以 RNN 家族为骨架，其中 LSTM 因门控机制是当前最佳序列模型…",
        },
        {
          // title "LSTM" → 0
          // body "sequence" ~12 次 + "modeling" ~3 次 → score = 0 + 15 = 15
          path: "wiki/concepts/lstm.md",
          score: 15,
          preview: "Long Short-Term Memory（Hochreiter & Schmidhuber, 1997）通过 input/forget/output 三个门控解决了 vanilla RNN 的梯度消失问题…",
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
