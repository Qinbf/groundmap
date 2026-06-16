# 操作日志

> 追加写入，禁止修改历史条目。
> 快速查看最近操作：`grep "^## \[" log.md | tail -10`

---

## [2026-05-20] ingest | 跨境电商 demo 数据集（v1，完整替换 v0 AI/ML demo）

**背景**：用户要求把知识库 demo 改为业务相关的真实数据集，让设计的效果（三档分级 ingest / 块级 anchor / 冲突标注 / MOC 跨链接）可直接感知。选定 **SMB 跨境电商 / 出海** 作为业务领域，完全替换原 AI/ML demo 内容。

**raw 数据集**：28 篇真实下载（3 PDF + 25 HTML，来自 mofcom.gov.cn / customs.gov.cn / FAOLEX / Emarketer / Modern Retail / TaxCloud / ShipBob / PayPal / Analyzify / Sheng Lu FASH455 等公开渠道；blocked URL：SEC EDGAR PDD 20-F、白宫文档、White & Case、DHL、Yahoo Finance —— 反爬阻拦，跳过）。convert.py 全部成功（27 篇有效，yahoo 空跳过）。

**字符分布**：
- 第①档（<30K）：~20 篇
- 第②档（30K-150K）：5 篇（mofcom 数字贸易报告 95K / shein 92K / businessofapps 38K / analyzify 36K / shipbob 32K）
- 第③档（>150K）：0 篇真档（但用 mofcom 95K 演示了「章节深度登记」表机制，由于 PDF 标题层级丢失，用 ^p 锚点作为虚拟章节标识）

**source_summary**（15 篇，全部含 AI 综合判断 H2 节 + anchor 引用）：
- 官方/政策类（7 篇）：[[wiki/sources/china_ec_law_2018]] / [[wiki/sources/state_council_22_cities_pilot]] / [[wiki/sources/customs_cross_border_guide]] / [[wiki/sources/mofcom_2_63_trillion_2024]] / [[wiki/sources/mofcom_industry_belt_2025]] / [[wiki/sources/mofcom_2025_jan_sep_ecommerce]] / [[wiki/sources/beijing_cross_border_action_plan]]
- 国家级长报告（1 篇，含「## 章节深度登记」表）：[[wiki/sources/mofcom_digital_trade_2025]]
- De Minimis 系列（3 篇互印证）：[[wiki/sources/taxcloud_de_minimis_end_2025]] / [[wiki/sources/shipbob_de_minimis_adapt]] / [[wiki/sources/paypal_de_minimis_guide]]
- SHEIN 系列（2 篇含口径冲突）：[[wiki/sources/shein_us_market_share_2025]] / [[wiki/sources/analyzify_shein_stats_2025]]
- TikTok Shop 系列（2 篇含口径冲突）：[[wiki/sources/modern_retail_tiktok_smb_66]] / [[wiki/sources/emarketer_tiktok_social_commerce]]

**wiki 结构**：
- root_index 重写 → 4 个 MOC（[[wiki/indexes/platforms_index]] / [[wiki/indexes/logistics_payment_index]] / [[wiki/indexes/compliance_index]] / [[wiki/indexes/overseas_cases_index]]）
- 概念页：21 个（核心：cross_border_ecommerce / de_minimis_exemption / comprehensive_pilot_zone / overseas_warehouse / social_commerce / livestream_shopping / fast_fashion；其余 14 个含 stub）
- 实体页：6 个（shein / temu / tiktok_shop / amazon / shopify / paypal）
- 分析页：4 个（含 3 个 [!WARNING] 冲突）：
  - [[wiki/analyses/de_minimis_impact_chain_2025]] — 政策事实 → 平台冲击 → SMB 应对 → 中国整体数据反应四层级联
  - [[wiki/analyses/tiktok_shop_us_market_size_2025]] — Charm.io $14B vs Emarketer $15.82B 第三方口径冲突
  - [[wiki/analyses/china_cross_border_market_size_evolution]] — 2024 全年 2.63 vs 2.71 万亿（商务部 vs 海关）+ 2025 增速腰斩冲突
  - [[wiki/analyses/shein_market_outlook_2026]] — 美国销售 $19B vs $6.2B 口径冲突 + 重心转欧/巴叙事

**归档**：v0 AI/ML demo 内容（concepts × 11、sources × 9、analyses × 3、entities × 5、indexes × 3、operations × 1）整体移到 `wiki/_archive_ai_ml_demo/`；raw/articles/ AI 内容移到 `raw/_archive_ai_ml_demo/articles/`。按 CLAUDE.md "禁止真删除"，保留可读。

**未完成 TODO**（留给后续 ingest 批次）：
- 余下 12 篇 raw 仅生成了 markdown + outline.json，没有 source_summary：amzscout_tiktok_shop_stats / businessofapps_shein_2026 / cac_ec_law_2018 / capitalone_tiktok_stats_2025 / fulfillrite_de_minimis / huining_ec_law_interpretation / mofcom_ec_law_official / modern_retail_shein_temu_marketing / retail_dive_tiktok_growth / sacra_shein_revenue_valuation / shenzhen_cross_border_action_plan_interpret / xizang_lhasa_pilot_implementation
- 真正的第③档（>150K 字符）样本缺失：SEC EDGAR PDD 20-F 等抓取被阻；后续可考虑用 markitdown 处理多个相关 PDF 合订成"compendium"
- Temu / Amazon / Shopify / Stripe / Payoneer 的官方公开材料 ingest 待补（多家公司站抓取被反爬阻拦）
- `instant_commerce` / `silk_road_ecommerce` / `bonded_warehouse` / `fba` 等概念页目前为占位 stub，等专项 ingest 来源时填实

**验证**：本次 ingest 完成后 wiki/sources × 15 + wiki/concepts × 21 + wiki/entities × 6 + wiki/indexes × 4 + wiki/analyses × 4 + wiki/root_index × 1 = **51 个 wiki 页面**，全部含合规 frontmatter + 块级 anchor + 跨链接。预埋 3 个 `[!WARNING]` 冲突等待人类判别（适合作为 web 端"冲突工作台"的 demo）。

---

## [2026-05-03] ingest | 演示材料综述（Transformer / Alignment）
- 来源：`raw/articles/transformer_architecture_tour.md`、`raw/articles/alignment_methods_survey.md`（两份 AI agent 撰写的演示综述，已加锚点 + outline.json）
- 26 个 H 段全部 `annotate-section` 回填精排摘要（8 + 18）
- 新建：[[wiki/sources/transformer_architecture_tour]]、[[wiki/sources/alignment_methods_survey]]，全部论断附 `[[raw/articles/...#^anchor]]` 块级引用
- 修复：transformer 摘要页第一处 anchor 猜错（^p-2-d51d54 → ^p-2-26d6ff，用 `k.py find-anchor "加性注意力"` 反查）
- MOC：[[wiki/indexes/ai_index]] "关键来源" 加两条、"近期更新"加一条
- 未更新核心概念页：本次为次级佐证来源，wiki/concepts/transformer 等内容已完善，按 skill 仅更新 MOC
- 验证：`k.py list-broken-refs` 0 处失效，`k.py health` 全绿
- 摘要：raw → wiki 完整链路验证，反/出向链接从 0 变活；演示 block 视图、annotate-section 必经流程的端到端效果

---

## [2026-05-03] lint | 周度健康检查 W18
- 处理 `#to-be-updated` 积压：清理 1 条（[[wiki/concepts/transformer]]，DPO 与架构无直接关联），保留 1 条（[[wiki/concepts/attention]]，等位置编码论文 ingest）
- 修复孤儿：1 个 → 0 个（[[wiki/concepts/grokking]] 纳入 [[wiki/indexes/ai_index]] "训练动力学 / 泛化" 分类）
- fact-check：因 `raw/papers/` 实际为空、14 处引用全部失效，本周无法执行；周报中作为结构性问题待人类判别（A/B/C 三选项）
- 待人类判别冲突：1 条（[[wiki/analyses/rlhf_vs_dpo]]，距 30 天提醒阈值还有 19 天）
- 新指标 `unsummarized_sections_count` 首次启用：0（合规但因 raw 缺失暂不会被触发）
- 产出：[[wiki/operations/周报-2026-W18]]（2026-05-03 lint W19 后挪出 analyses/ 到 operations/，避免与综合分析混淆）
- 索引联动：[[wiki/root_index]] 新增"运维记录（lint 周报）"小节、page_count 28→30；[[wiki/indexes/ai_index]] page_count 19→20
- 工具修复（顺手）：`scripts/k.py` 加 `mask_code_spans()`，让 `find_to_update` 与 `list_broken_refs` 跳过反引号包裹的字面提及——本周报本身不再贡献假阳性

## [2026-04-11] update | 添加 markitdown 文档转换脚本
- 新建 `scripts/convert.py`：基于 markitdown 的批量文档转换工具
- 支持格式：PDF、DOCX、PPTX、XLSX、HTML、CSV、JSON、XML、EPUB、图片、音频、MSG
- 功能：增量转换（mtime 比较）、dry-run 模式、格式过滤、强制重新转换
- 转换产物保存在原文件同目录下（同名 .md 文件）
- 依赖：`pip install 'markitdown[all]'`

## [2026-04-11] update | Schema 一致性修复与项目改进
- 修复 root_index.md frontmatter（补全 confidence、source_count、sources、tags、scope、page_count）
- 修复设计文档章节编号错误（第十章 9.x → 10.x）
- 统一 type 枚举（设计文档补充 index 类型，现两份文档均为 6 种类型）
- CLAUDE.md 补充 Export 操作流程（与设计文档四大核心操作对齐）
- CLAUDE.md 补充 index 类型 frontmatter 说明（scope + page_count）
- 统一设计文档 index 示例 frontmatter（last_updated → last_modified，补全通用字段）
- Git 分支从 master 重命名为 main（与设计文档一致）
- 完善 .gitignore（新增 Python、编辑器、临时文件排除规则）
- 创建 wiki/_templates/ 目录，包含 5 个页面模板（entity、concept、source_summary、analysis、index）

## [2026-04-07] human | 知识库初始化
- 创建目录结构：raw/, wiki/, my_thoughts/, exports/, scripts/
- 创建 CLAUDE.md（LLM 行为规范）
- 创建 wiki/root_index.md（根索引）
- 创建 GroundMap-设计文档.md（系统设计文档）
