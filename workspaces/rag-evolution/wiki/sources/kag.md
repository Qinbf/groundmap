---
title: "KAG: Knowledge Augmented Generation for Professional Domains (Liang et al. 2024-09)"
type: source_summary
created_date: 2026-05-26
last_modified: 2026-05-26
last_modified_by: LLM
status: draft
confidence: high
source_count: 1
sources:
  - "[[raw/papers/2024-09-kag]]"
partial_ingest_count: 0
tags:
  - rag
  - graph-rag
  - domain-specific
  - 2024
  - ant-group
---

# KAG: Knowledge Augmented Generation ^h-1-1-2ae417

> **原始文件**: [[raw/papers/2024-09-kag]]
> **作者**: Lei Liang, Mengshu Sun et al.(蚂蚁集团 Ant Group / OpenSPG)
> **发表**: 2024-09 arXiv preprint
> **arXiv**: [2409.13731](https://arxiv.org/abs/2409.13731)
> **字符数**:179628 — **第③档(整本书规模)** ^p-1-55f7f9

## 章节深度登记 ^h-2-1-9f7e46

第③档 KAG 处理 — 因 KAG 是**专业领域应用论文**(医疗/金融),技术深度对本 KB demo 的核心论断(RAG 演化范式)贡献度有限,**仅深读概念层章节**:

| Section | 状态 | 选择理由 |
|---|---|---|
| Introduction | ✓ 深读 | KAG 设计目标 + 与 vanilla RAG / GraphRAG 对照 |
| Related Work | ⊙ 扫读 | survey-style 内容,扫读建立映射 |
| KAG Framework | ⊙ 扫读 | 核心方法,但深度细节(domain-specific 设计)对 demo 主线收益小 |
| Domain Applications(医疗/金融) | × 跳过 | domain-specific 案例 |
| Experiments | × 跳过 | 实验细节 |
| Discussion / Conclusion | × 跳过 | 短结论 |
^t-1-5d67e9 ^p-2-af89c4

## 摘要 ^h-2-1-811e72

KAG 是 **专业领域(医疗 / 金融 / 法律)的 RAG 增强框架**——蚂蚁集团 OpenSPG 平台的核心方案。它把 RAG 改造为 **"KG + Reasoning Planner + Domain-Specific Schema"**:用领域知识图作 retrieval 基础 + LLM-based reasoning planner 做多步分解 + domain-aligned 嵌入。KAG 论文核心论点是 **"vanilla RAG 在专业领域不可用"** — 准确率 / 事实严格度 / 多跳推理都不达标[[raw/papers/2024-09-kag]]。 ^p-3-e49b95

## 关键发现 / 论点 ^h-2-2-93d2ce

1. **professional domain ≠ open-domain**:医疗/金融/法律的事实严格度要求 vanilla RAG 不能满足 [[raw/papers/2024-09-kag]]
2. **KG schema 是关键**:不同于 GraphRAG/HippoRAG 的 schemaless OpenIE,KAG 用 domain-specific schema(医学本体 / 法律实体类型) [[raw/papers/2024-09-kag]]
3. **Reasoning planner**:类似 IRCoT 的多步检索,但更结构化,可与 KG 表示对齐 [KB 综合]
4. **生产部署经验**:OpenSPG / 支付宝场景的落地数据 [[raw/papers/2024-09-kag]] ^p-4-45bbaf

## AI 综合判断 ^h-2-3-3d5f17

### 核心价值 ^h-3-1-eb2f7a

KAG 代表 **"RAG 在专业领域的工程现实"** — 它的方法论分类**不归入本 KB 的 4 主线**(query-time 控制 / corpus 表征 / LC 挑战 / hybrid),而是**正交于这些研究方向的"应用层框架"**。本 KB ingest KAG 主要是为了**展示 graph RAG 在领域应用层的存在**,但 KAG 的核心贡献是工程整合(schema + planner + 嵌入),不挑战或扩展任何 KB 已识别的方法论分类。 [KB 综合] ^p-5-4d3be8

### 关联 ^h-3-2-f856d6

- [[wiki/concepts/graph_rag]] — graph RAG 派,但是**应用层而非方法论层**(三派对照表加 KAG 行,标"domain-specific 应用,正交于三派之争")
- [[wiki/sources/graphrag]] / [[wiki/sources/hipporag2]] — 同为 graph 派,但 schema 化路径不同
- [[wiki/sources/gao_rag_survey]] — Gao Survey 写作时(2023 末)KAG 还未发布,survey 未覆盖 ^p-6-3555c6

### 冲突 ^h-3-3-cabb88

**不触发新冲突标注** — KAG 是应用层框架,不在 RAG 方法论辩论的核心战场上。它的"vanilla RAG 在专业领域不可用"论断可以视作对 [[wiki/concepts/retrieval_augmented_generation]] 的细化(增加"领域适用性"维度),但不构成需要标注的反驳。 ^p-7-7d1e6c

## 与 Wiki 的关联 ^h-2-4-5a2e99

- 影响:[[wiki/concepts/graph_rag]] 三派对照表加 KAG 行(应用层独立列)
- MOC:[[wiki/indexes/rag_evolution_index]] Batch 2 ^p-8-b35d79
