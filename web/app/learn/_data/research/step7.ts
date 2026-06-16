import "server-only";
import type { StepData } from "../types";

const edBefore = `---
title: "Encoder-Decoder 架构"
type: concept
created_date: 2025-07-08
last_modified: 2026-02-04
source_count: 3
---

# Encoder-Decoder 架构

源于神经机器翻译（Cho et al., 2014; Sutskever et al., 2014），把"输入序列 → 输出序列"任务拆成：

- **Encoder**：把输入压缩成一个固定/变长的内部表示 z
- **Decoder**：从 z 自回归生成输出序列

## 经典实现

最初 encoder 与 decoder 都是 RNN（通常 LSTM）。Bahdanau et al. (2014) 加入注意力作为 decoder 对 encoder 的辅助。`;

const edAfter = `---
title: "Encoder-Decoder 架构"
type: concept
created_date: 2025-07-08
last_modified: 2026-02-04
source_count: 3
---

# Encoder-Decoder 架构

源于神经机器翻译（Cho et al., 2014; Sutskever et al., 2014），把"输入序列 → 输出序列"任务拆成：

- **Encoder**：把输入压缩成一个固定/变长的内部表示 z
- **Decoder**：从 z 自回归生成输出序列

## 经典实现

最初 encoder 与 decoder 都是 RNN（通常 LSTM）。Bahdanau et al. (2014) 加入注意力作为 decoder 对 encoder 的辅助。

---
#to-be-updated 2026-05-08: 因 [[wiki/sources/attention_is_all_you_need]] 引入的「Transformer 沿用 encoder-decoder 骨架但替换内部层为自注意力 + FFN」内容，需要在「实现演化」节补充 RNN 时代 → Transformer 时代的脉络。`;

const lstmBefore = `---
title: "LSTM"
type: concept
created_date: 2025-06-20
last_modified: 2026-01-10
source_count: 4
---

# LSTM

Long Short-Term Memory（Hochreiter & Schmidhuber, 1997）通过 **input / forget / output 三个门控**解决 vanilla RNN 的梯度消失问题，使模型能够保留长距离依赖。

## 门控公式

i_t = σ(W_i · [h_{t-1}, x_t] + b_i)  ← input gate
f_t = σ(W_f · [h_{t-1}, x_t] + b_f)  ← forget gate
o_t = σ(W_o · [h_{t-1}, x_t] + b_o)  ← output gate
c_t = f_t ⊙ c_{t-1} + i_t ⊙ tanh(W_c · [h_{t-1}, x_t] + b_c)
h_t = o_t ⊙ tanh(c_t)

## 应用场景

机器翻译、语言模型、语音识别、时间序列预测。`;

const lstmAfter = `---
title: "LSTM"
type: concept
created_date: 2025-06-20
last_modified: 2026-01-10
source_count: 4
---

# LSTM

Long Short-Term Memory（Hochreiter & Schmidhuber, 1997）通过 **input / forget / output 三个门控**解决 vanilla RNN 的梯度消失问题，使模型能够保留长距离依赖。

## 门控公式

i_t = σ(W_i · [h_{t-1}, x_t] + b_i)  ← input gate
f_t = σ(W_f · [h_{t-1}, x_t] + b_f)  ← forget gate
o_t = σ(W_o · [h_{t-1}, x_t] + b_o)  ← output gate
c_t = f_t ⊙ c_{t-1} + i_t ⊙ tanh(W_c · [h_{t-1}, x_t] + b_c)
h_t = o_t ⊙ tanh(c_t)

## 应用场景

机器翻译、语言模型、语音识别、时间序列预测。

---
#to-be-updated 2026-05-08: 因 [[wiki/sources/attention_is_all_you_need]] 提出 Transformer 全面优于 LSTM 在并行度 / 最大路径长度上的表现，需要补一节「LSTM vs Transformer」说明各自适用场景（LSTM 在 n >> d 极长序列下仍有理论优势）。`;

export const step7: StepData = {
  id: 7,
  titleKey: "learn.step.7.title",
  whyKey: "learn.step.7.why",
  whatNoteKey: "learn.cmd.note.edit",
  focusAnchors: ["h-2-3-d4b201", "p-8-1be4a3"],
  results: [
    {
      kind: "diff",
      before: edBefore,
      after: edAfter,
      pseudoPath: "wiki/concepts/encoder_decoder.md",
    },
    {
      kind: "diff",
      before: lstmBefore,
      after: lstmAfter,
      pseudoPath: "wiki/concepts/lstm.md",
    },
  ],
  concepts: [
    { termKey: "learn.concept.to_be_updated.title", bodyKey: "learn.concept.to_be_updated.body" },
  ],
};
