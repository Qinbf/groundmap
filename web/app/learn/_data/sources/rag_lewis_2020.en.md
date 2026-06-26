---
title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks"
authors: "Patrick Lewis, Ethan Perez, Aleksandra Piktus, Fabio Petroni, Vladimir Karpukhin, Naman Goyal, Heinrich Küttler, Mike Lewis, Wen-tau Yih, Tim Rocktäschel, Sebastian Riedel, Douwe Kiela"
venue: "NeurIPS 2020 (arXiv:2005.11401)"
created: 2026-05-08
note: |
  This is the sample used by the /learn teaching demo — a "teaching edition" excerpt adapted from the
  foundational RAG paper (Lewis et al., 2020), not the verbatim original. It keeps the paper's core thesis
  (a hybrid of parametric + non-parametric memory), the two marginalization schemes RAG-Sequence / RAG-Token,
  and the comparison table against a purely parametric model, while omitting the full experimental setup and
  ablations. Anchors (^h-/^p-/^c-/^t-) are hand-generated in convert.py style with fabricated hash6 parts for
  the demo. It is a fixture and does not correspond to any real workspace page.
---

# Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks ^h-1-1-a7c310

We introduce **Retrieval-Augmented Generation (RAG)** — a general-purpose fine-tuning recipe that combines **pre-trained parametric memory** (a seq2seq model, BART) with **non-parametric memory** (a dense vector index of Wikipedia accessed via the neural retriever DPR). On open-domain question answering (NaturalQuestions, TriviaQA, WebQuestions) RAG sets a new SOTA, and the language it generates is **more specific, more factual, and less hallucinated** than a purely parametric BART. ^p-1-3e8c92

## Abstract ^h-2-1-b4d217

Large pre-trained language models store factual knowledge implicitly in their **parameters** and perform strongly on downstream tasks. But this "parametric memory" has two fundamental problems: it is **hard to inspect and update** (changing a single fact requires retraining), and on knowledge-intensive tasks it is **prone to hallucination** — producing answers that sound fluent but are fabricated. ^p-2-7f1a08

We propose RAG — a general fine-tuning recipe that combines parametric and non-parametric memory. RAG reaches SOTA on three open-domain QA tasks (NaturalQuestions, TriviaQA, WebQuestions), **beating both extractive methods and purely parametric seq2seq baselines**; on abstractive generation tasks, RAG produces text that is more factual, more specific, and more diverse than BART. ^p-3-bd4e71

## Introduction ^h-2-2-c0712f

Pre-trained language models (BERT, GPT, BART) learn a great deal of factual knowledge in their parameters — this is called **parametric memory**. But it is implicit: it **cannot be inspected and cannot be updated in place**, and when asked about facts not well covered in the training corpus, the model **hallucinates**. ^p-4-2c8a91

Models with **non-parametric memory** (retrieval-based memory) can alleviate these issues: knowledge is stored explicitly in a retrievable corpus, can be **directly added, removed, or edited**, and the knowledge the model uses **can be attributed to a source**. But prior hybrid models were mostly task-specific and validated only in extractive settings. ^p-5-c891ef

REALM and ORQA recently combined "masked language modeling + a learnable retriever," but they **explored only extractive open-domain QA** — the answer is a span pulled out of a retrieved passage, not generated. ^p-6-49b3c0

This paper brings such **parametric / non-parametric hybrid memory** to **generation** tasks — that is RAG. The parametric part is a pre-trained seq2seq model (BART), and the non-parametric part is a **dense vector index of Wikipedia**, accessed by a pre-trained neural retriever (DPR). ^p-7-8d7e62

## Model Architecture ^h-2-3-d4b201

The RAG model uses the input sequence x to **retrieve text documents z**, then uses z as **extra context** when generating the target y. It has two components: a **retriever** p_η(z | x) that returns the top-K passages most relevant to x, and a **generator** p_θ(y_i | x, z, y_{1:i-1}) that produces the next token from the original input, the retrieved documents, and the prefix generated so far. ^p-8-1be4a3

To train end to end, we treat the "retrieved documents" as a **latent variable** and **marginalize** over it. There are two ways to marginalize — corresponding to **RAG-Sequence** and **RAG-Token** below. ^p-9-7c305d

### Retriever and Generator ^h-3-1-4f8e29

The **retriever** uses the **Dense Passage Retriever (DPR)**, a bi-encoder: BERT_d encodes documents, BERT_q encodes the query, and relevance is p_η(z|x) ∝ exp(d(z)^T q(x)). The top-K is solved efficiently via **MIPS (Maximum Inner Product Search, using FAISS)**. The document index splits all of Wikipedia into about **21 million** 100-word passages (chunks). ^p-10-26b7f8

The **generator** uses **BART-large (~400M parameters)**, a pre-trained seq2seq denoising autoencoder. At generation time, the retrieved document z is **concatenated** with the original input x as the encoder input, and the decoder produces the answer autoregressively. ^p-11-9af3b8

### Retrieval as a latent variable ^h-3-2-3d6f0a

**The key idea: don't require a hard pipeline of "retrieve correctly first, then generate."** Instead, treat the retrieval result as a latent variable and let generation take a weighted sum over it (marginalization). This way the retriever and generator can be **trained jointly**, and retrieval quality is shaped by the generation loss flowing back. ^p-12-c7f203

Concretely, over the top-K retrieved passages, we sum the generation probability weighted by the retrieval score p_η(z|x). There is no explicit label for "which document is correct" — the only supervision signal is the final answer. ^p-13-58e9b0

```
RAG-Sequence: p(y|x) ≈ Σ_{z∈top-k} p_η(z|x) · Π_i p_θ(y_i | x, z, y_{1:i-1})
RAG-Token:    p(y|x) ≈ Π_i Σ_{z∈top-k} p_η(z|x) · p_θ(y_i | x, z, y_{1:i-1})
``` ^c-14-7d2e8c

The two marginalizations suit different cases: **RAG-Token** can draw evidence from a **different document** at each generated token, which fits answers that "need to stitch facts across several passages"; **RAG-Sequence** uses one document to generate the whole sentence, which is simpler and already strong when "a single passage is enough." In practice both clearly beat the purely parametric baseline. ^p-15-bc92a1

We retrieve the **top-K (K=5 or 10)** passages. A larger K means higher recall but also more cost concatenated into the context — **K is the key knob between recall and cost**, with diminishing returns past a point. ^p-16-5f3047

### RAG-Sequence vs RAG-Token ^h-3-3-72bef4

**RAG-Sequence** uses the same retrieved document for the whole sequence: sample/take the top-K documents, generate a complete answer independently from each, then weight by retrieval score. ^p-17-d29b7e

```
RAG-Sequence score: for each candidate answer y,
  score(y) = Σ_{z∈top-k} p_η(z|x) · p_θ(y | x, z)
``` ^c-18-1ae04b

**RAG-Token** allows a different document at **each token**: at every step it takes a weighted sum of the top-K documents' predicted distributions, then runs standard beam search. This lets one answer fuse facts scattered across several passages. ^p-19-8b4f2a

In the paper's main experiments RAG-Token and RAG-Sequence trade wins: RAG-Token is slightly better on questions that require synthesizing multiple passages, RAG-Sequence is slightly better when the facts are concentrated in a single passage; both consistently beat the purely parametric and extractive baselines. ^p-20-c4170d

### Training (joint, no retrieval supervision) ^h-3-4-91a5d8

The retriever and generator are **trained jointly** to minimize the answer's **negative marginal log-likelihood**, with **no direct supervision for "which document to retrieve"** — retrieval quality is driven entirely, implicitly, by the downstream answer loss. ^p-21-7e6c1f

```
loss = - Σ_(x,y) log p(y | x)   # p(y|x) already marginalized over retrieved docs z
``` ^c-22-3f8b09

One key engineering trade-off: during training we **freeze the document encoder BERT_d and the whole index**, and fine-tune only the **query encoder BERT_q and the generator**. The reason: every update to BERT_d would require **rebuilding the index** over 21 million passages, which is expensive; experiments show that freezing the document encoder **loses almost no performance**. ^p-23-4dba87

### Decoding and hot-swappable index ^h-3-5-8a2b59

Because RAG's knowledge lives in a **non-parametric index** rather than being locked into parameters, it gains a unique ability: **at test time you can update world knowledge by swapping the index, with no model retraining at all**. ^p-24-c0bf41

We show this with a direct experiment: swap the Wikipedia index from one time snapshot to another, and the model's answers to time-sensitive questions like "who currently holds office X" change accordingly — **updating knowledge = swapping the index**. ^p-25-d72a08

```
# Update world knowledge: no retrain, just swap the index
index = build_faiss_index(wikipedia_2018)   # old
index = build_faiss_index(wikipedia_2020)   # new — the model's answers update with it
``` ^c-26-9bc481

For decoding, RAG-Token can use standard beam search (transition probabilities summed over documents); RAG-Sequence needs the two approximations "Thorough Decoding / Fast Decoding," trading off accuracy and speed. ^p-27-218fc6

This **hot-swappable, attributable** non-parametric memory is what fundamentally distinguishes RAG from the "cram knowledge into ever-larger model parameters" approach — and it is the starting point for the entire RAG evolution that follows. ^p-28-7a2e1f

## Why retrieve (vs. pure parametric) ^h-2-4-be4790

In this section we compare "retrieval augmentation" with "pure parametric (push all knowledge into parameters and win by scale)" along several dimensions — these dimensions explain why retrieval is necessary, not merely a nice-to-have, on knowledge-intensive tasks. ^p-29-5ef2cd

We consider three requirements to motivate the use of hybrid memory: ^p-30-b3c8a1

First, **knowledge updatability** (how costly it is to change a single fact); second, **attributability** (whether you can point to the specific passage an answer relies on); third, **hallucination tendency** (whether the model fabricates on long-tail facts). ^p-31-6e7f93

The table below compares a purely parametric model with a retrieval-augmented model on these three (plus a few engineering dimensions): ^p-32-d18b2e

| Dimension | Pure parametric (BART / T5 / GPT) | Retrieval-augmented (RAG) |
|---|---|---|
| Knowledge update | retrain or further pre-train | **just swap the index (hot-swap)** |
| Attributable | ✗ black box, can't point to evidence | **✓ can point to a specific passage** |
| Hallucination | high (esp. long-tail facts) | **low (constrained by external evidence)** |
| Knowledge capacity | bounded by parameter count | bounded by corpus size (scalable) |
| Reasoning/generalization | strong (patterns in params) | same, via the generator — no loss | ^t-33-cf4a82

**Retrieval augmentation wins across all of "knowledge update / attributability / hallucination resistance,"** at the cost of introducing the extra infrastructure of a retriever and an index. **As an added benefit**, because the answer explicitly depends on the retrieved passages, RAG's output is **inherently interpretable and auditable** — you can see which passages the model "read" before answering this way. ^p-34-7d28f0

## Results ^h-2-5-09b3ea

On open-domain QA, **RAG sets a new SOTA**: it reaches **44.5 EM** on NaturalQuestions and beats extractive (REALM, DPR) and purely parametric seq2seq (T5) baselines on TriviaQA and WebQuestions — a **generative** model overtaking on benchmarks that extractive methods excelled at was a key result at the time. ^p-35-bf1c08

On abstractive QA and generation tasks, **RAG's generated text is more factual, more specific, and more diverse than BART's**, with markedly less hallucination. In human evaluation, annotators preferred RAG's output. ^p-36-c8b4ea

## Conclusion ^h-2-6-7da3e1

This work proposed **RAG — the first general paradigm that combines parametric and non-parametric memory for knowledge-intensive generation**, using a differentiable retriever + a pre-trained seq2seq generator, marginalizing over retrieved documents to train end to end. ^p-37-4f29a6

RAG sets a new SOTA on several open-domain QA tasks, generates more factual language, and its **non-parametric memory can be updated without retraining**. This frees "knowledge" from the model's parameters into a maintainable, attributable external component. ^p-38-2bc908

We are excited about the future of retrieval-augmented models and plan to **jointly pre-train the retriever and generator from scratch**, as well as extend this paradigm to more knowledge-intensive tasks — later work such as GraphRAG, Self-RAG, and HippoRAG all builds on this line. ^p-39-d70e4c

Reproduction code and models are at https://github.com/huggingface/transformers (RAG implementation) and https://github.com/facebookresearch/DPR . ^p-40-c81b32
