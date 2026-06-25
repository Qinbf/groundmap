---
title: "落地成本（Landed Cost）"
type: concept
created_date: 2026-05-20
last_modified: 2026-05-20
last_modified_by: LLM
status: draft
confidence: high
source_count: 2
sources:
  - "[[wiki/sources/shipbob_de_minimis_adapt]]"
  - "[[wiki/sources/paypal_de_minimis_guide]]"
tags:
  - landed-cost
  - de-minimis
  - pricing
---

# 落地成本 ^h-1-1-0dbdbd

> 一件商品**从出厂到目的国买家手中**全程的总成本：商品成本 + 运费 + 报关 + 关税 + 增值税 + 仓储 + 最后一公里。 ^p-1-6e4bde

## De Minimis 终结后的新挑战 ^h-2-1-dd0f0f

- 之前 < $800 直邮可跳过关税与报关，**落地成本 ≈ 商品 + 运费**
- 现在**关税 + 报关费 + 时间成本**全部计入，落地成本可上升 15-40% [[wiki/sources/shipbob_de_minimis_adapt#^p-31-a5551f]]
- 卖家必须**重定价**或**把关税并入标价**——避免买家收到关税账单产生 chargeback [[wiki/sources/paypal_de_minimis_guide#^h-2-4-ef735d]] ^p-2-30b818

## 工具 ^h-2-2-20dce2

- ERP / 订单系统需支持 [[wiki/concepts/hts_code]] 10 位 HTS 编码
- 落地成本计算器集成（[[wiki/entities/paypal]] / TaxCloud / Avalara 等） ^p-3-8f419b

## 关联 ^h-2-3-1c3cf7

- [[wiki/concepts/de_minimis_exemption]] / [[wiki/concepts/hts_code]] / [[wiki/concepts/overseas_warehouse]] ^p-4-9ab43e
