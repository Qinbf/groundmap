---
name: kb-query
description: 知识库查询工作流——像研究员一样按 root_index → 子索引 → 具体页面的层级钻取查阅知识库回答问题，跟随 backlinks/outlinks 顺藤摸瓜，把有价值的综合分析归档到 wiki/analyses/。当用户提到"查"、"问"、"对比"、"综述"、"在知识库里找"、"based on the wiki"等场景时使用此 skill。
---

# 知识库查询工作流（kb-query）

你现在是知识库的 **研究员**。像人类查资料一样，按层级钻取、顺藤摸瓜，**绝不切片+embedding**。

> **Workspace 前提（必读）**：数据层按主题隔离在 `workspaces/<name>/` 下。本文中所有 `wiki/`、`raw/`、`exports/`、`log.md` 路径均**相对于当前 workspace**，实际位于 `workspaces/<name>/`（如 `workspaces/smb-ecommerce/wiki/root_index.md`）。
> - 默认 workspace 为 `smb-ecommerce`，不显式指定时即用它。
> - `k.py` 用 `--workspace <name>` 指定 workspace（参数紧跟脚本名，如 `python scripts/k.py --workspace smb-ecommerce search "<关键词>"`）。
> - `Read` / `Write` 与 `git add` 必须用**带 workspace 的全路径**（如 `Read workspaces/smb-ecommerce/wiki/root_index.md`）。
> - 下文示例为可读性写成裸路径形式（`wiki/...` / `raw/...`），落地执行时一律替换为 `workspaces/<name>/...`，k.py 命令加上 `--workspace <name>`。

**核心原则**（来自 AGENTS.md）：
- 永远读完整页面或完整 H2/H3 段，不读 chunk
- 优先 wiki/（已编译的综合判断），其次 raw/
- 回答必须附引用清单
- 有价值的综合分析必须归档（探索复利）

---

## 第 0 步：模式说明（Codex 中固定走 quick）

本 skill 设计了 4 个查询深度模式，但**在 Codex 中，默认且唯一行为是 quick 模式**——直接跳到第 1 步执行即可。

**不做关键词自动判别**。原因：基于查询文本的模糊触发词（"合规"、"审计"等）不可靠——同一个词在不同语境含义不同，agent 会误判。可靠的方式是显式 API 字段 / CLI 参数 / Web UI 下拉框，这些都是产品化定制时的工作，不在 Codex 默认行为内。

### 4 个模式定义（设计规范，留待产品化时落地）

| 模式 | 工具调用预算 | 典型场景 | 与 quick 的差异 |
|---|---|---|---|
| **quick**（Codex 默认 + 唯一）| 5-10 次 | "X 是什么 / 时间 / 数据" | 第 1-8 步完整流程 |
| **audit**（产品化预留）| 15-25 次（1.5-3x）| 高 stake 决策：合规 / 合同 / 投资 / 估值 | quick 流程末尾追加"引用核实通道"（详见第 7a 步） |
| **explore**（产品化预留）| 20-40 次（3-5x）| 复杂综合：推荐 / 评估 / 行业现状 | quick 流程"决定停止"判据放宽，BFS outlinks 2 层 + 读所有 source_summary（详见第 7b 步） |
| **devil**（产品化预留）| 10-20 次（1.5-2x）| 反驳 / 风险点 / 决策审视 | quick 流程末尾追加"反对论构造 + 证据反查"（详见第 7c 步） |

### 高级模式的调用方式（未来产品化）

3 个高级模式不在 Codex 中自动触发，将通过**显式机制**调用：

- **CLI 参数**：未来可能在 `k.py` 加 `query` 子命令，支持 `--mode={quick,audit,explore,devil}`
- **API 字段**：包成 HTTP 服务时，请求体里带 `"mode": "audit"` 字段
- **Web UI 下拉**：产品化 web 端的聊天框旁加模式选择器
- **system prompt 注入**：DeepSeek / Claude API 接入时，在 system prompt 里硬编码 mode 行为

这些都是后续产品化开发的工作。**当前 Codex 用户**：默认 quick，第 1-8 步走完即可，第 7a/b/c 步当作设计文档参考。

> **重要：第 4.6 步「细节下钻判据」是所有模式共有的核心行为，quick 也执行**——它不属于产品化预留。即 Codex 默认的 quick 模式**会在真正需要原文细节时主动 `read-block` / `read-section` 回查原文**，只是不像 audit 那样对每条引用全量核验。模式差异仅在第 7a/b/c 的追加动作，不在"要不要按需下钻原文"这件事上。

---

## 第 1 步：理解问题、规划入口

明确用户问题的核心概念（2-3 个关键词）。问自己：
- 这是要"查事实"（What is X？）还是"做综合"（compare X and Y / synthesize）？
- 涉及哪个领域？

**不要直接 Grep 全库**——先走结构化路径。

## 第 2 步：读 root_index 定位领域

```
Read wiki/root_index.md
```

找到与问题相关的"领域目录"行。如果根索引为空或没有相关领域：

```bash
# 用 search 兜底
python scripts/k.py search "<关键词>" --json --limit 10
```

## 第 3 步：钻取分领域 MOC

```
Read wiki/indexes/<domain>_index.md
```

在 MOC 中找出最相关的 2-5 个页面（可能是 concepts/、entities/、sources/）。

## 第 4 步：读相关页面（完整页，不读片段）

对每个相关页面：

```
Read wiki/concepts/<X>.md
```

记笔记（在你的回应中累积，不写文件）：
- 这页的核心论断
- 关键引用（哪些 `[[raw/...]]`）
- 可疑或不一致的点

## 第 4.5 步：检查 source_summary 章节深度登记（partial re-ingest 触发）

读完相关 wiki 页后，**如果该页核心论断的来源指向某个 `wiki/sources/X.md`**，进一步检查那份摘要页是否登记了"扫读"章节：

```
Read wiki/sources/<X>.md
```

在文件里找 `## 章节深度登记` H2 节（没有此节说明该来源是第 ① / ② 档全读，**直接跳到第 5 步**）。

**如果有此节**，逐行看 ⊙ **扫读** 行，判断章节的 `原标题` 或 `备注` 是否与用户查询的关键词高度相关：

| 判断 | 动作 |
|---|---|
| ⊙ 扫读章节标题与查询关键词高度相关 | **触发 partial re-ingest 升级**（见下） |
| 全 ✓ 深读 | 信息充分，进入第 5 步 |
| ⊙ 扫读章节与查询无关 | 信息充分，进入第 5 步 |
| × 跳过章节与查询相关 | 通常意味着这个文档对该问题价值低；在第 7 步答案中显式标注"该来源对此主题未覆盖" |

**触发 partial re-ingest 升级**：

1. 切到 kb-ingest skill 的「增量深化」子流程
2. 升级目标：`raw/.../<file>.md` 的对应 `^h-` anchor
3. 触发原因：`query 命中关键词「<X>」但原扫读未深入`
4. 升级完成后回到本流程，**重新** `Read` 已更新的 source_summary 与受影响 wiki 页，再综合回答

> **不要拿 ⊙ 扫读章节的 outline preview 当真知识使用**——它只是标题级判断，没有论证细节支撑。AGENTS.md "Ingest 操作流程" 反例区已明令。

## 第 4.6 步：细节下钻判据（所有模式适用，quick 也执行）

> 这是**所有模式共有的核心行为**，不是 audit 专属、更不是产品化预留。它保证"真正需要原文细节时一定回查原文"，而不是把锚点照抄进引用清单就算溯源。

读完 wiki 页、准备组织答案时，对你**即将写进答案的每条论断**问一句：**它要的是"原文级精确"吗？**

**命中下列任一 → 回答前必须 `read-block` / `read-section` 打开锚点核验原文，再下结论**（不得仅凭 wiki 蒸馏版作答）：

- 论断含**精确引文 / 具体数字 / 日期 / 金额 / 比例 / 条款编号**，而 wiki 上是 ingest 蒸馏的二手转写（非逐字摘录）
- 命中来源是**第 ③ 档长文档**（带「章节深度登记」表）——蒸馏时本就接受了深度差异，硬细节更可能只留在原文
- 用户问题本身在要"原文怎么说 / 确切措辞 / 精确条款 / 完整数据"
- 命中的 wiki 论断带 `[KB 综合]` / `[KB 观察]` 等**二手标记**，而你要把它当一手事实陈述使用

**命中下列 → 不必下钻**（A 类常见问题，detail 已在 wiki，锚点只作溯源凭证）：

- 问的是定义 / 分类 / 时间线概览 / "X 是什么"，wiki 综合层已足够
- 论断不含需要逐字精确的硬细节

**动作**：

```bash
python scripts/k.py read-block raw/papers/<file>.md <anchor>     # 取精确段（^p- / ^t-）
python scripts/k.py read-section raw/papers/<file>.md <anchor>   # 取完整 H2/H3 章节（^h-）
```

- 原文支撑论断 → 用核验过的措辞作答，锚点照常进引用清单
- 原文与 wiki 蒸馏有出入（语义 drift / 数字对不上 / anchor 取段偏移）→ **以原文为准作答**，并在「不确定性」节记一句"wiki 摘要与原文有出入，已按原文修正"，提示该 wiki 页需人审
- 锚点失配 / 目标文件不存在（典型：raw 未随库留存）→ 明确标注"无法核验原文（raw 不在场）"，**不要假装核验过**

> **与 audit 模式（第 7a 步）的关系**：本步是日常的"按需精确"——只对真正需要原文级精确的论断下钻；audit 是"全量强化版"——对答案里**每条** anchor 都回查。本步在所有模式（含 quick）默认执行，audit 在此之上把核验扩展到全部引用，两者不冲突。

## 第 5 步：顺藤摸瓜（backlinks / outlinks）

如果第 4 步发现某页很关键，查它的关系网络：

```bash
# 谁链接到这页（可能是其他相关讨论）
python scripts/k.py backlinks wiki/concepts/<X>.md --json

# 这页链到哪（可能有更深入的子主题）
python scripts/k.py outlinks wiki/concepts/<X>.md --json
```

按需要 `Read` 这些关联页面。

## 第 6 步：覆盖度自检

问自己：
- 用户的问题，我已经覆盖了哪些角度？
- 还有哪些角度可能漏了？
- 是否有冲突标注或 `#to-be-updated` 影响答案的可信度？

如果有疑问，再做 1-2 次 `search` 或 `Read`（读完整页面）：

```bash
python scripts/k.py search "<可能漏的角度>" --json
python scripts/k.py list-conflicts --json   # 看有没有相关冲突
```

## 第 7 步：综合回答

用以下格式回答用户：

```markdown
## 简短答复
<2-3 句话直接回答问题>

## 详细分析

### <主题 1>
<分析内容> [[wiki/concepts/<X>]] [[raw/papers/<Y>#^block-id]]

### <主题 2>
...

## 不确定性 / 注意事项
- <如有：标注的冲突、低 confidence 来源、`#to-be-updated` 警告>

## 引用清单
- [[wiki/concepts/<A>]]
- [[wiki/sources/<B>]]
- [[raw/papers/<C>#^block-id]]
```

**约束**：
- 每个论断都要有引用
- 不要编造未在 wiki 中出现的内容
- 如果 wiki 没说，明确说"知识库中未涵盖这个主题"

## 第 7a 步：audit 模式扩展 — 引用核实通道

> **产品化预留**——Codex 默认不执行此步。下方流程是为后续产品化（CLI / API / Web UI 显式调用）准备的设计规范，未来 agent 在 mode=audit 时按此执行。

quick 流程组合答案后，**回头校验每条 anchor 引用是否真的支撑论断**。这是 audit 模式的核心价值——捕获 wiki 写错 / AI 综合时偏离原文 / anchor hash 失配。

### 流程

1. 从答案里提取所有 `[[raw/...#^p-N-hash]]` / `[[raw/...#^h-N-N-hash]]` 引用（典型 3-10 条）
2. 对每条引用：
   ```bash
   python scripts/k.py read-block raw/articles/<file>.md <anchor>
   ```
3. 把"agent 论断"与"原文段落"**逐条比对**：
   - 关键事实（日期 / 数字 / 主体）是否在原文里？
   - 引用的论断是否被原文段落直接支撑？
   - 是否有语义 drift（agent 综合时加了原文没有的限定词 / 程度词）？

### 评分

每条引用给一个标签：
- ✅ **完全支撑**：原文段落直接说了 agent 的论断
- ⚠️ **部分支撑**：原文有相关信息但 agent 加了未支撑的修饰（如"显著""明显"等）
- ❌ **错引**：原文段落不含 agent 论断的关键信息（典型：anchor 取了错段或被 hash 重算后 drift）

### 输出附加

在答案末尾追加「## 审计报告」节：

```markdown
## 审计报告（audit 模式自动追加）

**通过 X / Y 条引用核实**：
- ✅ `^p-39-85500c`（shipbob）→ 论断"2025-05-02 中港取消"，原文 list 确认
- ⚠️ `^p-67-6ecf9e`（taxcloud）→ 论断"2025-08-29 全球终结"，原文段落"That exemption has now ended"未含日期；
  **建议改引** `^p-66-e8a801`（原文"Until August 29, 2025..."）或 `^p-62-a72770`（"As of August 29, 2025..."）

**总评**：4 条 ✅ + 1 条 ⚠️。论断方向正确，但日期 anchor 取段偏移，建议人审后修正。
```

如果发现 ❌ 错引：**不要默默修复**，让用户看到——这是知识库 wiki 写作质量信号。后续可手工 `Edit` 修正 wiki 论断的 anchor。

---

## 第 7b 步：explore 模式扩展 — 广度扫读

> **产品化预留**——Codex 默认不执行此步。下方流程是后续产品化时（mode=explore）的执行规范。

quick 模式优化"最少读"，explore 反过来——主动多读，挖未被 concept/analysis 综合层暴露的细节。

### 加做的事

1. **读所有 source_summary**：不只是 concept 页的综合，把 frontmatter `sources:` 列出的所有页面挨个 `Read`。重点看「AI 综合判断」节的"冲突"小节——是否有 concept 页没整合过来的次级冲突？

2. **outlinks 跟两层**：
   ```bash
   python scripts/k.py outlinks wiki/concepts/<X>.md
   # 然后对每个出链页面，再跑一次 outlinks
   python scripts/k.py outlinks wiki/concepts/<Y>.md
   ```
   特别关注 wiki/sources/ → raw/ 的二级跳，可能直接 `read-section` 读 raw 章节拿一手细节。

3. **list-conflicts + list-bare-claims**：
   ```bash
   python scripts/k.py list-conflicts --json
   python scripts/k.py list-bare-claims --json
   ```
   筛出与查询主题相关的条目——可能有 wiki 还没"消化"的冲突或裸论断。

4. **跨主题关联**：对 entity 和 concept 页，做 `backlinks` 反查，看是谁在引用——可能引出未读的相关分析角度。

### 输出附加

在答案末尾追加「## 扩展阅读发现」节：

```markdown
## 扩展阅读发现（explore 模式自动追加）

**底层来源补充**：
- ShipBob 来源给出完整时间线（2016 TFTEA → 2024 提案 → 2025 取消）—— concept 页只引了最后两段
- PayPal 来源 H2-4「关税并入定价」详述了"避免买家收账单 chargeback"机制 ——quick 模式略过

**相邻冲突信号**：
- [[wiki/analyses/china_cross_border_market_size_evolution]] 含"增速腰斩 vs 基数效应"双解释（[!WARNING]），与本问题强相关——quick 模式没读到
- "欧盟 VAT 收紧（待 ingest）" 是另一个平行政策头风——wiki 中标记 #to-be-updated，提示信息缺口

**未触达的角度**：
- Temu 具体业绩影响（待补 PDD 财报 ingest，wiki 现为 stub）
- 美国本土仓 vs 海外仓的具体落地成本对比（未 ingest 详细数据）
```

---

## 第 7c 步：devil 模式扩展 — 反对论构造

> **产品化预留**——Codex 默认不执行此步。下方流程是后续产品化时（mode=devil）的执行规范。

agent 给完答案后，**主动构造一个反对当前结论的论证**，然后在 wiki 找证据支撑或反驳这个反对论。

### 流程

1. 看 quick 答案的核心结论（通常 1-3 句）
2. **构造反对论**：what's the strongest counter-argument？常见 4 类：
   - **归因质疑**：是否真是 X 导致 Y，可能是别的原因
   - **范围质疑**：影响范围是否被夸大
   - **时间质疑**：暂时现象还是长期趋势
   - **采样质疑**：数据来源是否有偏（行业自报 / 单口径）
3. **在 wiki 找反对论的支撑**：
   ```bash
   python scripts/k.py search "<反对论关键词>" --json
   ```
4. 评估反对论：
   - 如果 wiki 有支撑 → 反对论**有力**，附 `[!WARNING] 魔鬼代言反驳` 块
   - 如果 wiki 无支撑 → 反对论**弱**，结论稳健，附"已审视反对论但无证据支撑"footer
   - 如果 wiki 自己已识别此反对论（典型：analysis 页含双解释）→ 直接引用 wiki 自己的判断

### 输出附加

在答案末尾追加「## 魔鬼代言审视」节：

```markdown
## 魔鬼代言审视（devil 模式自动追加）

> [!WARNING] 反对论：增速腰斩 ≠ De Minimis 影响
>
> **反对论**：2025 中国跨境电商增速 +6.4% 也许只是 2024 高基数（+14%）的自然回落，并非政策冲击。
>
> **Wiki 已识别此反对论**：[[wiki/analyses/china_cross_border_market_size_evolution#^p-4-7114d4]] 的"解释 B：基数效应"——2024 已经高速增长，再叠加同等增速难度大；行业进入整合期。
>
> **Wiki AI 判断**：两种解释**非互斥**。但解释 A（外部贸易摩擦）的时间窗与 5-8 月节点高度吻合，更有说服力。
>
> **devil 评估**：反对论**有 wiki 支撑但被 wiki 自己判定为次要**。结论方向稳健，但建议跟踪 2026 H1 数据——如果美国本土仓策略起效，应看到出口端反弹（验证解释 A）。
```

---

## 第 8 步：归档到 wiki/analyses/（如果分析有价值）

判断标准：
- 跨多个页面的综合 → **应归档**
- 简单的事实查询（"X 的定义是什么"） → **不归档**
- 用户明确说"做一个对比/综述" → **必归档**

如果应归档：用 `Write` 创建 `wiki/analyses/<slug>.md`：

```yaml
---
title: "<分析标题>"
type: analysis
created_date: 2026-04-28
last_modified: 2026-04-28
last_modified_by: LLM
status: draft
confidence: high
source_count: <N>
sources:
  - "[[wiki/concepts/<A>]]"
  - "[[wiki/sources/<B>]]"
tags:
  - <主题>
---

# <分析标题>

## 触发问题
<原始用户问题>

## 综合分析
<回答内容，含引用>

## 引用清单
<所有引用页面>
```

然后追加 log.md：

```markdown
## [2026-04-28] query | <分析主题>
- 问题：<简短>
- 产出：`wiki/analyses/<slug>.md`
- 引用 wiki 页面：<N> 个
```

最后：

```bash
# 路径用带 workspace 的全路径（默认 workspace 为 smb-ecommerce）
git add workspaces/<name>/wiki/analyses/<slug>.md workspaces/<name>/log.md
git commit -m "query: <分析主题>"
```

---

## 完成检查清单

**Codex 默认 quick 模式**：

- [ ] 走过 root_index → MOC → 具体页的层级（没有直接 Grep）
- [ ] 读了完整页面，没有读 chunk
- [ ] 检查了相关 source_summary 的「章节深度登记」表；命中扫读章节已触发 partial re-ingest 升级
- [ ] 命中"需要原文级精确"的论断（精确引文/数字/日期/条款，或来源为第③档长文）已按第 4.6 步 `read-block`/`read-section` 核验原文
- [ ] 至少做了一次 backlinks 或 outlinks 检查（除非问题极简单）
- [ ] 做了覆盖度自检
- [ ] 答案的每个论断都有引用
- [ ] （如果有价值）归档到 analyses/ 并 commit

**产品化预留模式**（Codex 不执行，留作未来 CLI / API / Web UI 显式调用时的执行规范）：

- audit：第 7a 步 — 对答案里每条 anchor 引用调 read-block 比对原文；「## 审计报告」节列每条 ✅ / ⚠️ / ❌
- explore：第 7b 步 — 读所有 source_summary + outlinks 跟 2 层 + list-conflicts / list-bare-claims 扫；「## 扩展阅读发现」节
- devil：第 7c 步 — 构造反对论 + wiki 找证据；「## 魔鬼代言审视」节附 `[!WARNING]` 反驳块

## 反例（绝对不要做）

- ❌ 一上来就 `Grep` 全库（应先读 root_index）
- ❌ 编造 wiki 中不存在的内容
- ❌ 给出无引用的论断
- ❌ 切片读取（只读某段、想象其他段的内容）
- ❌ 把综合分析丢弃在对话历史里（应归档到 analyses/）
- ❌ 跳过第 4.5 步——拿 ⊙ 扫读章节的 outline preview 当真知识用（必须先触发 partial re-ingest 升级到 ✓ 深读再综合）
