---
title: "跨境支付（Cross-border Payment）"
type: concept
created_date: 2026-05-20
last_modified: 2026-05-20
last_modified_by: LLM
status: draft
confidence: medium
source_count: 1
sources:
  - "[[wiki/sources/paypal_de_minimis_guide]]"
tags:
  - cross-border-payment
  - paypal
---

# 跨境支付 ^h-1-1-f3b193

> 跨境电商资金回流的关键环节——买家以本地货币付款，卖家以人民币（或其它本币）结算的全链路。 ^p-1-6219b3

## 主流服务方 ^h-2-1-acb8db

- [[wiki/entities/paypal]]：消费者认知度最高，覆盖 B2C 主流市场
- Stripe：开发者友好，独立站集成首选
- Payoneer：B2B 收款 + 海外仓提现
- Worldfirst（万里汇）：阿里系，中国卖家亚马逊收款
- Airwallex / Lianlian / PingPong：中国本土跨境收款方 ^p-2-afd209

## 合规要点 ^h-2-2-3dd3f8

- 反洗钱（AML）/ KYC 要求
- 各地税务申报（美国 1099-K / 欧盟 VAT 等）
- 数据隐私（GDPR / CCPA）
- [[wiki/concepts/de_minimis_exemption]] 终结后需把关税并入定价或在结账前明示 [[wiki/sources/paypal_de_minimis_guide#^h-2-4-ef735d]] ^p-3-e15f67

## 关联 ^h-2-3-1c3cf7

- [[wiki/entities/paypal]] / [[wiki/concepts/landed_cost]] / [[wiki/concepts/independent_site]] ^p-4-4f288e

## 待更新 ^h-2-4-840ecc

- #to-be-updated — Stripe / Payoneer / Lianlian 等竞品的官方 ingest 待补 ^p-5-fd8ad7
