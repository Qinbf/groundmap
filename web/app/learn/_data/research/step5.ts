import "server-only";
import type { StepData } from "../types";

const sourceSummaryContent = `---
title: "Attention Is All You Need（论文摘要）"
type: source_summary
created_date: 2026-05-08
last_modified: 2026-05-08
last_modified_by: LLM
status: draft
confidence: high
source_count: 1
sources:
  - "[[raw/papers/_learn_demo/attention_is_all_you_need]]"
tags:
  - transformer
  - attention
  - sequence-modeling
  - deep-learning
---

# Attention Is All You Need（论文摘要）

> **来源**：[[raw/papers/_learn_demo/attention_is_all_you_need]] —— Vaswani et al., NeurIPS 2017（教学演示节选）

## 核心论点

1. **序列转导可以完全摆脱循环**：Transformer 完全建立在注意力机制之上，**抛弃所有循环与卷积**，仍能在 WMT 2014 英德/英法翻译上达到 SOTA [[raw/papers/_learn_demo/attention_is_all_you_need#^p-1-3e8c92]]。

2. **顺序计算是 RNN 时代的根本瓶颈**：RNN 沿位置顺序计算（h_t 依赖 h_{t-1}），阻断训练时跨样本的并行化，是制约长序列建模的根本约束 [[raw/papers/_learn_demo/attention_is_all_you_need#^p-5-c891ef]]。

3. **Scaled Dot-Product Attention 是核心运算**：\`Attention(Q,K,V) = softmax(QK^T/√d_k) V\`。除以 √d_k 是为了对抗 d_k 较大时点积量级过大、softmax 进入梯度极小区域 [[raw/papers/_learn_demo/attention_is_all_you_need#^c-14-7d2e8c]][[raw/papers/_learn_demo/attention_is_all_you_need#^p-16-5f3047]]。

4. **Multi-Head 让模型同时关注多个表示子空间**：h=8 个并行注意力头，每头 d_k=d_v=64。多头允许模型在不同位置上同时关注来自不同表示子空间的信息——单头会被平均化抑制 [[raw/papers/_learn_demo/attention_is_all_you_need#^p-19-8b4f2a]]。

5. **位置信息靠正弦位置编码注入**：因为模型没有循环也没有卷积，需要显式注入位置信息。正弦/余弦组合让模型容易学到「通过相对位置注意」，且可外推到训练时未见的更长序列 [[raw/papers/_learn_demo/attention_is_all_you_need#^c-26-9bc481]][[raw/papers/_learn_demo/attention_is_all_you_need#^p-28-7a2e1f]]。

## 关键数据

**层类型对比表**（n=序列长度，d=表示维度）：

| 层类型 | 每层复杂度 | 顺序操作 | 最大路径长度 |
|---|---|---|---|
| Self-Attention | O(n²·d) | **O(1)** | **O(1)** |
| Recurrent | O(n·d²) | O(n) | O(n) |
| Convolutional | O(k·n·d²) | O(1) | O(log_k n) |

数据来自原文 [[raw/papers/_learn_demo/attention_is_all_you_need#^t-33-cf4a82]]。三维对比清晰显示：**self-attention 在并行度与依赖路径上同时占优**，唯一代价是 n² 复杂度 —— 当 n < d 时反而比循环更快。

**实验结果**：WMT 2014 EN→DE 达到 **28.4 BLEU**（超过当时含 ensemble 的 SOTA 2.0+），EN→FR 单模型 **41.8 BLEU**，训练成本仅为最佳模型的一小部分 [[raw/papers/_learn_demo/attention_is_all_you_need#^p-1-3e8c92]][[raw/papers/_learn_demo/attention_is_all_you_need#^p-35-bf1c08]]。

## 方法学要点

- **残差连接 + LayerNorm** 沿用 [He et al., 2015] 的残差思路，所有子层都包成 \`LayerNorm(x + Sublayer(x))\` [[raw/papers/_learn_demo/attention_is_all_you_need#^p-10-26b7f8]]
- **Decoder 的自注意力加 mask**：禁止位置 i 看到 i 之后的位置，保证自回归生成的因果性 [[raw/papers/_learn_demo/attention_is_all_you_need#^p-11-9af3b8]]
- **位置编码方案的选择**：作者也实验了"学习的位置 embedding"，效果几乎相同；最终选正弦版本是因为可能更利于外推 [[raw/papers/_learn_demo/attention_is_all_you_need#^p-28-7a2e1f]]

## 与已有知识的关系

> [!WARNING] 知识更新冲突 — 2026-05-08
> **旧观点**：[[wiki/concepts/sequence_modeling]] 当前主张 "LSTM 因门控机制是最佳序列模型"
> **新证据**：本文表明 self-attention 在每层复杂度（n < d 时）、并行度、最大依赖路径长度三个维度全面优于循环层，且 BLEU 实验质量超越 SOTA [[raw/papers/_learn_demo/attention_is_all_you_need#^t-33-cf4a82]]
> **LLM 判断**：旧论断应改为 "在 2017 年以前 LSTM 是最佳；之后 self-attention 成为新默认。LSTM 在极长序列（n >> d）下仍有理论复杂度优势"
> **状态**：⏳ 待人类判别

- 与 [[wiki/concepts/attention_mechanism]] 关联：本文是该机制从"辅助组件"升级为"主结构"的转折点
- 与 [[wiki/concepts/transformer]] 关联：本文即该架构的奠基论文，作为该页的来源 #1
- 与 [[wiki/concepts/positional_encoding]] 关联：本文提出的正弦位置编码方案
`;

export const step5: StepData = {
  id: 5,
  titleKey: "learn.step.5.title",
  whyKey: "learn.step.5.why",
  whatNoteKey: "learn.cmd.note.write",
  focusAnchors: [
    "p-1-3e8c92",
    "p-5-c891ef",
    "c-14-7d2e8c",
    "p-19-8b4f2a",
    "t-33-cf4a82",
  ],
  results: [
    {
      kind: "markdown",
      content: sourceSummaryContent,
      pseudoPath: "wiki/sources/attention_is_all_you_need.md",
    },
  ],
  concepts: [
    { termKey: "learn.concept.source_summary.title", bodyKey: "learn.concept.source_summary.body" },
    { termKey: "learn.concept.frontmatter.title", bodyKey: "learn.concept.frontmatter.body" },
    { termKey: "learn.concept.wikilink.title", bodyKey: "learn.concept.wikilink.body" },
  ],
};
