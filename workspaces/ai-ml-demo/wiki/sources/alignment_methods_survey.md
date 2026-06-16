---
title: "LLM 对齐方法综述：RLHF / DPO / Constitutional AI"
type: source_summary
created_date: 2026-05-03
last_modified: 2026-05-03
last_modified_by: LLM
status: deprecated
confidence: high
source_count: 1
sources:
  - "[[raw/_archive_ai_ml_demo/articles/alignment_methods_survey]]"
tags:
  - alignment
  - rlhf
  - dpo
  - constitutional-ai
  - demo-data
---

# LLM 对齐方法综述 ^h-1-1-760353

> **来源**：[[raw/_archive_ai_ml_demo/articles/alignment_methods_survey]] —— AI agent 撰写的演示综述（非论文原文），呼应已有 [[wiki/analyses/rlhf_vs_dpo]]，从历史顺序与系统视角整理三条主线 ^p-1-e991bd

## 核心论点 ^h-2-1-522a48

1. 预训练让模型成为"超级补全器"而非助手；对齐是把它从分布拟合转成 HHH（有用/诚实/无害）助手的过程 [[raw/_archive_ai_ml_demo/articles/alignment_methods_survey#^h-2-1-7dd14b]]
2. RLHF（OpenAI InstructGPT 2022 系统化）三阶段流程：SFT 13k 示范 → RM 33k 偏好对训练 6B 评分模型 → PPO + KL 约束优化策略 [[raw/_archive_ai_ml_demo/articles/alignment_methods_survey#^h-2-2-5ee087]]
3. DPO（Stanford 2023）核心贡献是**证明 RLHF 目标函数有闭式解**，等价于一个监督式分类损失，跳过 reward model 训练阶段 [[raw/_archive_ai_ml_demo/articles/alignment_methods_survey#^h-2-3-7befe5]]
4. Constitutional AI（Anthropic 2022）走 RLAIF 路线：用 AI 按宪法原则自评代替部分人类反馈，降低标注成本 + 让对齐目标显式可读 [[raw/_archive_ai_ml_demo/articles/alignment_methods_survey#^h-2-4-f1204e]] ^p-2-8b29ef

## DPO 的数学闭式解 ^h-2-2-c7cb93

详见 [[raw/_archive_ai_ml_demo/articles/alignment_methods_survey#^h-3-5-4951a5]] 的推导： ^p-3-6ce70c

```
RLHF 最优策略：π*(y|x) ∝ π_ref(y|x) · exp(r(x,y) / β)
反解隐含 reward：r(x,y) = β · log(π*(y|x) / π_ref(y|x)) + 常数
代入 Bradley-Terry 偏好模型 → L_DPO 监督式分类损失
``` ^c-4-a41c79

这正是 [[wiki/concepts/dpo]] 的核心思想，本篇给出完整推导链。 ^p-5-649d74

## RLHF 三阶段细节 ^h-2-3-0242b9

| 阶段 | 数据规模 | 模型 | 关键超参 |
|---|---|---|---|
| SFT [[raw/_archive_ai_ml_demo/articles/alignment_methods_survey#^h-3-1-a1647d]] | 13k 人类示范 | 微调预训练模型 | — |
| RM [[raw/_archive_ai_ml_demo/articles/alignment_methods_survey#^h-3-2-7cc0c5]] | 33k 偏好对 | 6B 参数 reward model | — |
| PPO [[raw/_archive_ai_ml_demo/articles/alignment_methods_survey#^h-3-3-f8f4cc]] | 31k prompt | π + π_ref + RM | KL 系数 β 通常 0.01-0.1 | ^t-6-f39a30

## RLHF / DPO / CAI 三方法对比 ^h-2-4-7326b9

8 维度对比表 [[raw/_archive_ai_ml_demo/articles/alignment_methods_survey#^h-2-5-878b34]]，详见 [[wiki/analyses/rlhf_vs_dpo]] 的扩展版（已含与 Zhang 2025 冲突标注）： ^p-7-1e444c

- 阶段数：RLHF 3 / DPO 2 / CAI 4
- 是否需 RM：RLHF 是、DPO **否**、CAI 是（RL-CAI 阶段）
- 反馈源：RLHF 人类、DPO 人类、CAI **AI 按宪法**
- 数据成本：RLHF 高、DPO 中、CAI **低**（少量种子 + AI 扩展）
- 可审计性：仅 CAI **原则显式可读**
- 工业采用：OpenAI/早期 Anthropic 用 RLHF；开源社区主流 DPO；Anthropic Claude 全系列 CAI ^p-8-8632c0

## 选型建议（2026 视角） ^h-2-5-3ed250

详见 [[raw/_archive_ai_ml_demo/articles/alignment_methods_survey#^h-2-6-f29520]]： ^p-9-92b4e1

- **大模型(>30B) + 干净偏好数据** → DPO（实现简单、效果不弱于 RLHF）
- **小模型(<7B) + 噪声数据** → 仍用 RLHF/PPO（稳定性可靠，参考 Zhang 2025 反例）
- **追求最低标注成本 + 可审计** → Constitutional AI / RLAIF
- **生产实际部署**：常常混合（SFT + DPO 主流程，关键安全场景套 CAI 加强） ^p-10-1a7e1c

## 开放问题 ^h-2-6-0537e7

四大未解 [[raw/_archive_ai_ml_demo/articles/alignment_methods_survey#^h-2-7-e3163e]]： ^p-11-285a68

1. **可扩展监督**（scalable oversight）：当模型能力超过人类标注员，AI 反馈如何保持可信？
2. **对齐税的机制**：通用能力下降是必然代价还是可设计绕过？
3. **HHH 多目标冲突**：诚实地拒绝 vs 有用地变通——多目标如何系统处理？
4. **对抗鲁棒性**：所有对齐方法都被 jailbreak 破解过 ^p-12-d7571b

## 与已有知识的关系 ^h-2-7-452557

- 与 [[wiki/concepts/rlhf]] / [[wiki/concepts/dpo]] / [[wiki/concepts/constitutional_ai]] 三个概念页全面呼应——本篇是它们的横向综述
- 与 [[wiki/analyses/rlhf_vs_dpo]] 互补：那篇含 Zhang 2025 冲突的具体讨论，本篇提供完整的方法学背景
- DPO 数学推导段 [[raw/_archive_ai_ml_demo/articles/alignment_methods_survey#^h-3-5-4951a5]] 比 [[wiki/sources/rafailov2023_dpo]] 摘要页的"关键推导"小节更详细——可作 [[wiki/concepts/dpo]] "核心思想"小节的扩展引用
- CAI 宪法节选 [[raw/_archive_ai_ml_demo/articles/alignment_methods_survey#^h-3-9-678065]] 与 [[wiki/concepts/constitutional_ai]] 的"宪法内容"小节内容一致 ^p-13-a95c20

## 与现有内容的差异点 ^h-2-8-4df226

无矛盾。本篇视角是"三路线并列对比"，已有 [[wiki/analyses/rlhf_vs_dpo]] 视角是"RLHF vs DPO 二元对比 + Zhang 2025 冲突"。两篇互补不冲突。 ^p-14-daef98
