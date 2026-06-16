import "server-only";
import type { StepData } from "../types";

const outlineCliOutput = `文档: raw/papers/_learn_demo/attention_is_all_you_need.md
字符数: 8742 | 段数: 40 | 生成于: 2026-05-08

# Attention Is All You Need  [^h-1-1-a7c310]  (line 11, 8742 字符)
  └─ (预览) 我们提出一种全新的序列转导网络架构 —— Transformer，完全建立在注意力机制之上，彻底抛弃了循环与卷积。
  ## Abstract  [^h-2-1-b4d217]  (line 17, 412 字符)
    └─ (预览) 主导的序列转导模型基于复杂的循环或卷积神经网络，包含一个 encoder 与一个 decoder。表现最好的模型还通过注意力机制连接 encoder 与 decoder。
  ## Introduction  [^h-2-2-c0712f]  (line 23, 998 字符)
    └─ (预览) 循环神经网络 —— 尤其是 LSTM 和 GRU —— 长期以来都是序列建模与转导任务（如语言模型、机器翻译）的当然之选。
  ## Model Architecture  [^h-2-3-d4b201]  (line 35, 4126 字符)
    └─ (预览) 大多数有竞争力的神经序列转导模型都遵循 encoder-decoder 结构。这里 encoder 将符号表示的输入序列映射为连续表示。
    ### Encoder and Decoder Stacks  [^h-3-1-4f8e29]  (line 42, 612 字符)
      └─ (预览) Encoder：由 N = 6 个相同层堆叠而成。每层有两个子层：第一个是多头自注意力机制，第二个是逐位置全连接前馈网络。
    ### Attention  [^h-3-2-3d6f0a]  (line 53, 1024 字符)
      └─ (预览) 注意力函数可以被描述为：把一个 query 与一组 key-value 对映射到一个输出，其中 query、keys、values 和输出都是向量。
    ### Multi-Head Attention  [^h-3-3-72bef4]  (line 71, 740 字符)
      └─ (预览) 我们发现，与其用 d_model 维度的 keys、values、queries 做单次注意力，不如把 queries/keys/values 线性投影 h 次。
    ### Position-wise Feed-Forward Networks  [^h-3-4-91a5d8]  (line 85, 388 字符)
      └─ (预览) 除注意力子层外，encoder 与 decoder 的每一层都包含一个全连接前馈网络，分别独立地、相同地作用于每个位置。
    ### Positional Encoding  [^h-3-5-8a2b59]  (line 95, 906 字符)
      └─ (预览) 由于我们的模型不包含循环也不包含卷积，为了让模型利用序列的顺序信息，必须注入一些关于位置的信息。
  ## Why Self-Attention  [^h-2-4-be4790]  (line 109, 1024 字符)
    └─ (预览) 本节我们将自注意力的各方面与循环、卷积层做对比 —— 这些都是常用于把变长符号序列映射到等长另一序列的方法。
  ## Results  [^h-2-5-09b3ea]  (line 119, 540 字符)
    └─ (预览) 在 WMT 2014 英德翻译任务上，大型 Transformer 模型 BLEU 达到 28.4，超过之前发表的所有模型与 ensemble 2.0 BLEU 以上。
  ## Conclusion  [^h-2-6-7da3e1]  (line 129, 482 字符)
    └─ (预览) 本工作中，我们提出了 Transformer，第一个完全基于注意力的序列转导模型，用多头自注意力替换了 encoder-decoder 中的循环层。

✓ 文档 8742 字符（约 4400 中文字 < 3 万），分级为 ① 短文——一次 Read 全文，进入第 3 步。
  · 注：上面每个 H 段的「(预览)」是 outline 自动从该段首段截取的前 120 字预览；
    AI 在第 2 步就能基于「标题 + 字符数 + 首段预览」做整体判断，不是只看光秃秃的标题。
  · 完整 30+ 页论文会落入 ② 档：按 H1/H2 切块、每块 ≤3 万分段读，每节读完调 annotate-section 把 (预览) 替换为 (LLM) 精排摘要。`;

const tierExplanationMarkdown = `## 三档分级（按中文字符等价；英文 × 0.5 估算）

| 档 | 字数 | 策略 | 本样例 |
|---|---|---|---|
| ① **短文** | < 3 万 | 一次 Read 全文 | ✅ 命中 |
| ② **中长文** | 3 - 15 万 | 按 H1 切块、每块 ≤3 万分段读，每段读完 \`annotate-section\` 精排摘要 | — |
| ③ **整本书规模** | > 15 万 | TOC 扫全 + AI 决定深读章节；**全部章节登记**到「章节深度登记」表（深读 / 扫读 / 跳过），扫读章节保留 partial re-ingest 升级路径 | — |

> **30K 上限的依据**：单次 Read 超过 30K 中文字符会触发 LLM "lost in the middle" 衰减——综合质量下降。所以即便是 1M context 的 Claude Opus，也不在单次塞进太多。

> **本样例的真实情况**：Transformer 原论文 ~30 页、引用 + 实验细节齐全的话约 5-6 万中文字等价，会落入 ② 档。此处展示的「教学演示版」只保留了 Abstract / Intro / Model Architecture / Why Self-Attention / Results / Conclusion 六节核心内容，因此命中 ① 档。`;

export const step2: StepData = {
  id: 2,
  titleKey: "learn.step.2.title",
  whyKey: "learn.step.2.why",
  whatCommand: "python scripts/k.py outline raw/papers/_learn_demo/attention_is_all_you_need.md",
  whatNoteKey: "learn.cmd.note.outline",
  focusAnchors: [
    "h-2-1-b4d217",
    "h-2-2-c0712f",
    "h-2-3-d4b201",
    "h-2-4-be4790",
    "h-2-5-09b3ea",
    "h-2-6-7da3e1",
  ],
  results: [
    { kind: "outline-cli", content: outlineCliOutput },
    {
      kind: "markdown",
      content: tierExplanationMarkdown,
      captionKey: "learn.caption.tier_table",
    },
  ],
};
