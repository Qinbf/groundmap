import "server-only";
import type { StepData } from "../types";

const attnBefore = `---
title: "注意力机制 Attention Mechanism"
type: concept
created_date: 2025-09-04
last_modified: 2026-02-18
source_count: 3
---

# 注意力机制

最早由 Bahdanau et al. (2014) 引入到神经机器翻译，作为 encoder-decoder 模型中 **decoder 关注 encoder 隐状态的辅助组件**。计算方式：以 decoder 当前隐状态为 query，对 encoder 所有隐状态做兼容性打分（加性或点积），softmax 后加权求和。

## 形式化

给定 query q、keys k_1..k_n、values v_1..v_n：score_i = align(q, k_i)；attention(q) = Σ softmax(score)_i · v_i

## 主要变体

- **加性注意力**（Bahdanau et al., 2014）：用前馈网络计算 align
- **点积注意力**（Luong et al., 2015）：q·k 内积，实现更快`;

const attnAfter = `---
title: "注意力机制 Attention Mechanism"
type: concept
created_date: 2025-09-04
last_modified: 2026-05-08
source_count: 4
---

# 注意力机制

最早由 Bahdanau et al. (2014) 引入到神经机器翻译，作为 encoder-decoder 模型中 decoder 关注 encoder 隐状态的辅助组件。**2017 年 Transformer 的提出让注意力从辅助组件升级为主结构**——完全替代循环层 [[wiki/sources/attention_is_all_you_need]]。

## 形式化

给定 query q、keys k_1..k_n、values v_1..v_n：score_i = align(q, k_i)；attention(q) = Σ softmax(score)_i · v_i

## 主要变体

- **加性注意力**（Bahdanau et al., 2014）：用前馈网络计算 align
- **点积注意力**（Luong et al., 2015）：q·k 内积，实现更快
- **Scaled Dot-Product**（Vaswani et al., 2017）：在点积基础上除以 √d_k，对抗 d_k 增大导致 softmax 进入梯度极小区——Transformer 的核心运算 [[wiki/sources/attention_is_all_you_need#^p-16-5f3047]]
- **Multi-Head**（Vaswani et al., 2017）：把 Q/K/V 线性投影 h 次到不同子空间并行计算，再 concat。让模型同时关注多个表示子空间，单头会被平均化抑制 [[wiki/sources/attention_is_all_you_need#^p-19-8b4f2a]]

## 自注意力 vs 跨注意力

- **跨注意力**：Q 来自一个序列，K/V 来自另一序列（如 decoder→encoder）。Bahdanau 原版即此类。
- **自注意力**：Q/K/V 都来自同一序列。Transformer encoder 与 decoder 的内部层都是自注意力。`;

const seqBefore = `---
title: "序列建模 Sequence Modeling"
type: concept
created_date: 2025-08-15
last_modified: 2026-01-22
source_count: 2
---

# 序列建模

任务：把变长输入序列映射到输出（标签 / 另一序列 / 单一值）。典型场景：机器翻译、语言建模、speech-to-text、时间序列预测。

## 主流架构

**LSTM 因门控机制是当前最佳序列模型**——通过 input/forget/output 三门解决了 vanilla RNN 的长依赖梯度消失问题。GRU 是其轻量化变种。

## 关键挑战

- 长距离依赖：信号需要经过 n 步才能传播
- 训练时的顺序性：h_t 依赖 h_{t-1}，难以并行`;

const seqAfter = `---
title: "序列建模 Sequence Modeling"
type: concept
created_date: 2025-08-15
last_modified: 2026-05-08
source_count: 3
---

# 序列建模

任务：把变长输入序列映射到输出（标签 / 另一序列 / 单一值）。典型场景：机器翻译、语言建模、speech-to-text、时间序列预测。

## 主流架构

**2014-2017：RNN 时代**——LSTM 与 GRU 通过门控机制解决了 vanilla RNN 的长依赖梯度消失问题，成为机器翻译与语言建模的事实标准。

**2017 后：Transformer 时代**——[[wiki/sources/attention_is_all_you_need]] 表明自注意力在三个维度全面优于循环层：

| 维度 | RNN/LSTM | Self-Attention |
|---|---|---|
| 每层复杂度 | O(n·d²) | O(n²·d) |
| 顺序操作数 | O(n) | **O(1)** |
| 最大依赖路径 | O(n) | **O(1)** |

数据来源 [[wiki/sources/attention_is_all_you_need#^t-33-cf4a82]]。**当 n < d 时（机器翻译典型情形）self-attention 反而比循环更快**。LSTM 在极长序列（n >> d，如完整音频）下仍有理论优势。

## 关键挑战（重写）

- **长距离依赖**：RNN 的 O(n) 路径长度让早期信号易被遗忘；self-attention 的 O(1) 路径让任意两位置直接交互
- **训练并行性**：循环模型沿位置顺序计算，self-attention 一层之内完全并行——这是 Transformer 训练快的根本原因 [[wiki/sources/attention_is_all_you_need#^p-5-c891ef]]`;

const trBefore = `（页面不存在）`;

const trAfter = `---
title: "Transformer"
type: concept
created_date: 2026-05-08
last_modified: 2026-05-08
last_modified_by: LLM
status: draft
confidence: high
source_count: 1
sources:
  - "[[wiki/sources/attention_is_all_you_need]]"
tags:
  - transformer
  - architecture
  - deep-learning
---

# Transformer

**首次提出**：Vaswani et al., NeurIPS 2017, "Attention Is All You Need" [[wiki/sources/attention_is_all_you_need]]。

完全基于 [[wiki/concepts/attention_mechanism|自注意力]] 的 encoder-decoder 架构，**抛弃了循环与卷积**，所有信息流由 attention + 残差 + LayerNorm + 逐位置 FFN 组成。

## 架构

- **Encoder**：N=6 个相同层，每层 = Multi-Head Self-Attention + 逐位置 FFN，外加残差与 LayerNorm
- **Decoder**：N=6 个相同层，相比 Encoder 多一个对 encoder 输出的 cross-attention 子层，且自注意力加 mask 保证自回归 [[wiki/sources/attention_is_all_you_need#^p-11-9af3b8]]
- **位置信息**：靠 [[wiki/concepts/positional_encoding]] 注入，因为架构本身无位置感

## 核心维度

- d_model = 512（所有子层与 embedding 共用维度，便于残差）
- h = 8 个注意力头，每头 d_k = d_v = 64
- d_ff = 2048（FFN 内层维度）

## 影响

后续 BERT / GPT / T5 / ViT / Whisper / Llama 等几乎所有大模型都建立在 Transformer 之上——这是 2017 后深度学习的根架构。`;

export const step6: StepData = {
  id: 6,
  titleKey: "learn.step.6.title",
  whyKey: "learn.step.6.why",
  whatNoteKey: "learn.cmd.note.edit",
  focusAnchors: [
    "p-15-bc92a1",
    "p-16-5f3047",
    "p-19-8b4f2a",
    "t-33-cf4a82",
    "p-5-c891ef",
  ],
  results: [
    {
      kind: "diff",
      before: attnBefore,
      after: attnAfter,
      pseudoPath: "wiki/concepts/attention_mechanism.md",
    },
    {
      kind: "diff",
      before: seqBefore,
      after: seqAfter,
      pseudoPath: "wiki/concepts/sequence_modeling.md",
    },
    {
      kind: "diff",
      before: trBefore,
      after: trAfter,
      pseudoPath: "wiki/concepts/transformer.md",
      captionKey: "learn.caption.new_page",
    },
  ],
};
