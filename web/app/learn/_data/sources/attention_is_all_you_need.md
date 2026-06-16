---
title: "Attention Is All You Need"
authors: "Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Łukasz Kaiser, Illia Polosukhin"
venue: "NeurIPS 2017 (arXiv:1706.03762)"
created: 2026-05-08
note: |
  本文为 /learn 教学演示页所用样例 —— Transformer 论文（Vaswani et al., 2017）的「教学演示版」节选改编，
  非原文逐字。保留了论文的核心论点、关键公式、与 RNN/CNN 的对比表，省略了完整的训练细节与实验配置，
  以适合作为 ingest 流程的 raw 输入。引用条目（如 [Bahdanau et al., 2014]）取自论文原始引文，
  锚点（^h-/^p-/^c-/^t-）按 convert.py 风格手工生成，hash6 部分为演示捏造。
---

# Attention Is All You Need ^h-1-1-a7c310

我们提出一种全新的序列转导（sequence transduction）网络架构 —— **Transformer**，完全建立在注意力机制之上，彻底抛弃了循环（recurrence）与卷积（convolution）。在两个机器翻译任务上的实验表明，这种模型在质量上更优，同时**显著更易并行化**，训练时间也更短。Transformer 在 WMT 2014 英德翻译任务上达到 28.4 BLEU，比当时最佳结果（包括集成模型）高出 2 BLEU 以上；在英法翻译任务上以 8 张 GPU 训练 3.5 天得到 41.8 BLEU 的新单模型 SOTA —— 训练成本仅为已发表最佳模型的一小部分。 ^p-1-3e8c92

## Abstract ^h-2-1-b4d217

主导的序列转导模型基于复杂的循环或卷积神经网络，包含一个 encoder 与一个 decoder。表现最好的模型还通过**注意力机制**连接 encoder 与 decoder [Bahdanau et al., 2014]。我们提出一种全新的、简单的网络架构 —— Transformer —— **完全基于注意力机制，完全没有循环与卷积**。 ^p-2-7f1a08

两个机器翻译任务上的实验表明这些模型质量更优、并行性更好，训练所需时间也大幅减少。我们的模型在 WMT 2014 英德翻译任务上达到 **28.4 BLEU**，比当前最佳结果（包括 ensemble）高出 2 BLEU 以上。在 WMT 2014 英法翻译任务上，我们的单模型在 8 张 GPU 上训练 3.5 天后达到 **41.8 BLEU**，刷新单模型最优成绩，且训练成本只是当时最佳模型的一小部分。 ^p-3-bd4e71

## Introduction ^h-2-2-c0712f

循环神经网络 —— 尤其是 LSTM [Hochreiter & Schmidhuber, 1997] 和 GRU [Cho et al., 2014] —— 长期以来都是序列建模与转导任务（如语言模型、机器翻译）的当然之选 [Sutskever et al., 2014]。这些模型沿输入与输出序列的位置（symbol positions）顺序计算，把位置与时间步对齐：在每一步 t 生成隐藏状态 h_t，作为前一步 h_{t-1} 与当前位置输入的函数。 ^p-4-2c8a91

这种**固有的顺序性**阻断了训练时跨样本的并行化 —— 在序列较长时尤为致命，因为内存约束限制了能跨样本批处理的数目。最近的工作通过分解技巧 [Kuchaiev & Ginsburg, 2017] 与条件计算 [Shazeer et al., 2017] 显著提升了计算效率，但**顺序计算的根本约束依然存在**。 ^p-5-c891ef

注意力机制已经成为各类任务中**令人信服的序列建模与转导模型组件**，能够建模依赖关系而无需考虑这些依赖在输入或输出序列中的距离 [Bahdanau et al., 2014; Kim et al., 2017]。然而，除少数例外 [Cheng et al., 2016]，这些注意力机制都是与循环网络结合使用的。 ^p-6-49b3c0

本文提出 **Transformer**，一种摒弃循环、完全依赖注意力机制来抽取输入与输出之间全局依赖的模型架构。Transformer **允许显著更高的并行化**，在 8 张 P100 GPU 上训练 12 小时后即可在翻译质量上达到新的 SOTA。 ^p-7-8d7e62

## Model Architecture ^h-2-3-d4b201

大多数有竞争力的神经序列转导模型都遵循 **encoder-decoder 结构** [Cho et al., 2014; Bahdanau et al., 2014]。这里，encoder 将符号表示的输入序列 (x_1, ..., x_n) 映射为连续表示序列 z = (z_1, ..., z_n)。给定 z，decoder 然后一次生成一个元素，得到符号输出序列 (y_1, ..., y_m)。每一步都是**自回归**的（auto-regressive）—— 在生成下一个时把之前生成的符号当作额外输入。 ^p-8-1be4a3

Transformer 沿用这个总体结构，但 encoder 与 decoder 两边都采用**堆叠的自注意力（self-attention）与逐位置全连接层**，分别如下文 Encoder 与 Decoder Stacks 节所述。 ^p-9-7c305d

### Encoder and Decoder Stacks ^h-3-1-4f8e29

**Encoder**：由 N = 6 个相同层堆叠而成。每层有两个子层：第一个是**多头自注意力**机制，第二个是简单的**逐位置全连接前馈网络**。我们在每个子层周围使用**残差连接** [He et al., 2015]，紧接 layer normalization [Ba et al., 2016]。即每个子层的输出是 `LayerNorm(x + Sublayer(x))`，其中 `Sublayer(x)` 是子层自身实现的函数。为方便残差连接，模型中所有子层与 embedding 层都产出维度 **d_model = 512** 的输出。 ^p-10-26b7f8

**Decoder**：同样由 N = 6 个相同层堆叠而成。除了 encoder 层的两个子层外，decoder 还插入了第三个子层 —— 对 encoder 栈输出执行多头注意力。与 encoder 类似，每个子层周围使用残差连接 + layer normalization。我们还修改了 decoder 栈中的自注意力子层，**禁止某位置看到后续位置**（通过 mask 实现），结合输出 embedding 偏移一位，确保位置 i 的预测只依赖于位置 i 之前的已知输出。 ^p-11-9af3b8

### Attention ^h-3-2-3d6f0a

**注意力函数可以被描述为：把一个 query 与一组 key-value 对映射到一个输出**，其中 query、keys、values 和输出都是向量。输出是 values 的加权和，每个 value 的权重由 query 与对应 key 的兼容性函数计算得出。 ^p-12-c7f203

我们这种特殊形式的注意力称为 **"Scaled Dot-Product Attention"**。输入由维度为 d_k 的 queries 与 keys、维度为 d_v 的 values 组成。我们对 query 与所有 keys 计算点积，每个点积除以 √d_k，再经过 softmax 得到 values 上的权重： ^p-13-58e9b0

```
Attention(Q, K, V) = softmax(Q K^T / √d_k) V
``` ^c-14-7d2e8c

为什么除以 √d_k？两种最常用的注意力函数是**加性注意力** [Bahdanau et al., 2014] 和**点积注意力**。点积注意力与我们的算法相同，除了那个缩放因子 1/√d_k。加性注意力用一个含单隐藏层的前馈网络来计算兼容性函数。两者理论复杂度相似，但**点积注意力在实践中更快、更省空间** —— 因为它能用高度优化的矩阵乘法实现。 ^p-15-bc92a1

当 d_k 较小时两种机制表现相近；当 d_k 较大时不缩放的点积注意力反而**比加性注意力更差**。我们怀疑这是因为 d_k 大时点积的量级会很大，把 softmax 推到梯度极小的区域。为对抗这个效应，**我们用 1/√d_k 缩放点积**。 ^p-16-5f3047

### Multi-Head Attention ^h-3-3-72bef4

我们发现，**与其用 d_model 维度的 keys、values、queries 做单次注意力**，不如把 queries、keys、values **线性投影 h 次**到不同的、学到的 d_k、d_k、d_v 维度上更有益。在每一份投影后的 queries、keys、values 上**并行执行注意力**，得到 d_v 维度的输出，再把它们 **concat** 并再投影一次，得到最终输出： ^p-17-d29b7e

```
MultiHead(Q, K, V) = Concat(head_1, ..., head_h) W^O
其中 head_i = Attention(Q W_i^Q, K W_i^K, V W_i^V)
``` ^c-18-1ae04b

**多头注意力允许模型在不同位置上同时关注来自不同表示子空间的信息**。如果只用单个注意力头，平均化会抑制这一点。 ^p-19-8b4f2a

本文使用 **h = 8 个并行注意力层**（即"头"）。每一头都用 d_k = d_v = d_model/h = 64。由于每头维度的降低，总计算成本与单头全维度注意力相似。 ^p-20-c4170d

### Position-wise Feed-Forward Networks ^h-3-4-91a5d8

除注意力子层外，encoder 与 decoder 的每一层都包含一个**全连接前馈网络**，分别独立地、相同地作用于每个位置。它由两个线性变换 + 中间一个 ReLU 激活构成： ^p-21-7e6c1f

```
FFN(x) = max(0, x W_1 + b_1) W_2 + b_2
``` ^c-22-3f8b09

虽然线性变换在不同位置上相同，但**它们在层与层之间使用不同的参数**。另一种描述方式是：两个 kernel size 为 1 的卷积。输入与输出维度都是 d_model = 512；内层维度为 d_ff = 2048。 ^p-23-4dba87

### Positional Encoding ^h-3-5-8a2b59

由于我们的模型**不包含循环也不包含卷积**，为了让模型利用序列的顺序信息，必须**注入一些关于位置的信息**。为此，我们在 encoder 与 decoder 栈底部的 input embeddings 上加入"**位置编码**"（positional encodings）。位置编码与 embedding 维度相同（d_model），所以两者可以直接相加。可选方案很多，学习的或固定的都有 [Gehring et al., 2017]。 ^p-24-c0bf41

本文使用不同频率的 **正弦与余弦函数**： ^p-25-d72a08

```
PE(pos, 2i)   = sin(pos / 10000^(2i/d_model))
PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))
``` ^c-26-9bc481

其中 pos 是位置，i 是维度。即位置编码每个维度对应一个正弦波，波长形成从 2π 到 10000·2π 的几何级数。我们选这个函数是因为我们假设它能让模型**容易地学到通过相对位置注意**：对任意固定的偏移 k，PE(pos+k) 都可以表示为 PE(pos) 的线性函数。 ^p-27-218fc6

我们也实验了学习的位置 embedding [Gehring et al., 2017]，发现两个版本结果**几乎相同**。我们选了正弦版本，因为它可能让模型**外推到比训练时遇到的序列更长的长度**。 ^p-28-7a2e1f

## Why Self-Attention ^h-2-4-be4790

本节我们将自注意力的各方面与循环、卷积层做对比 —— 这些都是常用于把一个变长符号表示序列 (x_1, ..., x_n) 映射到等长另一序列 (z_1, ..., z_n) 的方法，例如典型序列转导模型 encoder 或 decoder 中的一个隐藏层。 ^p-29-5ef2cd

我们考虑三方面诉求来动机自注意力的使用： ^p-30-b3c8a1

一是**每层总计算复杂度**；二是**可并行的计算量**，以最少所需顺序操作数衡量；三是**网络中长距离依赖之间的路径长度** —— 学习长距离依赖是许多序列转导任务的关键挑战。 ^p-31-6e7f93

下表对比了不同层类型的最大路径长度、每层复杂度与最小顺序操作数（n 为序列长度，d 为表示维度，k 为卷积核大小，r 为受限自注意力的邻域大小）： ^p-32-d18b2e

| 层类型 | 每层复杂度 | 顺序操作 | 最大路径长度 |
|---|---|---|---|
| Self-Attention | O(n² · d) | O(1) | O(1) |
| Recurrent | O(n · d²) | O(n) | O(n) |
| Convolutional | O(k · n · d²) | O(1) | O(log_k(n)) |
| Self-Attention (restricted) | O(r · n · d) | O(1) | O(n / r) | ^t-33-cf4a82

**自注意力层在 n < d 时比循环层更快**，这是机器翻译中 SOTA 模型使用的句长（如 word-piece 与 byte-pair 表示）的常见情形。**作为附加好处，自注意力还能产生更可解释的模型** —— 检查注意力分布显示，不同 head 显然学到了执行不同任务，许多 head 表现出与句法和语义结构相关的行为。 ^p-34-7d28f0

## Results ^h-2-5-09b3ea

在 WMT 2014 英德翻译任务上，**大型 Transformer 模型（Transformer-big）** BLEU 达到 **28.4**，超过之前发表的所有模型与 ensemble 2.0 BLEU 以上，达到新的 SOTA 28.4。该模型配置见原文 Table 3；训练耗时 3.5 天，使用 8 张 P100 GPU。 ^p-35-bf1c08

在 WMT 2014 英法翻译任务上，**大型模型达到 41.0 BLEU**（同样 8 张 P100、3.5 天训练）—— 超过之前发表的所有单模型，训练成本不到之前最佳的 1/4。**英德翻译的 base 模型（Transformer base）**在训练成本仅几个 GPU 小时的情况下仍然超过了所有之前发表的单模型（包括 ensemble）。 ^p-36-c8b4ea

## Conclusion ^h-2-6-7da3e1

本工作中，我们提出了 **Transformer，第一个完全基于注意力的序列转导模型**，用多头自注意力替换了 encoder-decoder 架构中最常见的循环层。 ^p-37-4f29a6

在翻译任务上，**Transformer 训练速度显著快于基于循环或卷积层的架构**。在 WMT 2014 英德与英法翻译任务上，我们均达到新 SOTA。在前一个任务上，我们最好的模型甚至超越了所有之前报告的 ensemble。 ^p-38-2bc908

我们对基于注意力的模型的未来感到兴奋，并计划将其应用到其他任务。我们计划将 Transformer 扩展到涉及**文本以外**的输入与输出模态的问题，并研究**局部、受限的注意力机制**来高效处理图像、音频、视频等大输入与输出。让生成不那么顺序化（less sequential）是我们的另一个研究目标。 ^p-39-d70e4c

用于训练和评估模型的代码可在 https://github.com/tensorflow/tensor2tensor 找到。 ^p-40-c81b32
