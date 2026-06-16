# 从 `raw/` 到 `wiki/` ——一份原始资料的完整旅程

> 本文回答一个核心问题：**当我把一篇 PDF（或 docx / html / markdown）扔进 `raw/`，到它在 `wiki/` 里被引用、被检索、被分析，中间到底发生了什么？**
>
> 阅读对象：第一次接触本知识库的开发者 / agent。
> 配套阅读：项目根的 `CLAUDE.md`（行为规范）、`GroundMap-设计文档.md`（系统设计）。

---

## 0. 一句话概括

> **raw/ 是"原矿"，wiki/ 是"提炼物"。中间靠两件事衔接：`scripts/convert.py` 把原矿格式标准化（markdown + 锚点 + 大纲），agent 用 `scripts/k.py` 按章节阅读并把提炼后的论点写到 wiki/ 页面，每条实质性论断都用块级锚点（`^h-...` / `^p-...`）回溯到原文。**

整条流水线分 5 个阶段：

```
①  放置原始文件                    ← 人类
        ↓
②  convert.py：转 md + 加锚点 + 生成 outline    ← 脚本
        ↓
③  agent 阅读：outline → read-section → annotate-section（每节都调）  ← 外部 LLM agent
        ↓
④  写 wiki/sources/ 摘要页 + 含块级引用    ← 外部 LLM agent
        ↓
⑤  更新核心节点 + 索引 + log + git commit    ← 外部 LLM agent
```

> ⚠️ 注意第 0 条原则：**知识库本身不调用 LLM**。所有"阅读 / 综合 / 写 wiki"动作由外部 agent 完成。本仓库只提供 `convert.py` 和 `k.py` 两个工具，外加一个 web 管理台。

---

## 1. 阶段 ①：放置原始文件

### 你做的事

> **路径约定**：数据按主题隔离在 `workspaces/<name>/` 下，本文所有 `raw/` / `wiki/` 均指**当前 workspace 内**的目录（默认 `smb-ecommerce`，即 `workspaces/smb-ecommerce/raw/...`）。`scripts/k.py` 的路径参数是 **workspace 相对**的（写 `raw/papers/foo.md` 即可，不要写全 `workspaces/.../raw/...`）；`scripts/convert.py` 不传 `--dir` 时按 `--workspace` 自动扫 `workspaces/<name>/raw/`；`--dir` 是显式扫描目录，按运行命令时所在目录解析（通常在仓库根运行，即写**仓库相对**路径，如 `--dir workspaces/smb-ecommerce/raw/articles`），且必须位于数据根内。切换 workspace 用 `--workspace <name>` / `KB_WORKSPACE=<name>`。

把任意支持的格式拖到当前 workspace 的 `raw/` 对应子目录：

```
workspaces/<name>/raw/
├── papers/         # 论文（pdf 居多）
├── articles/       # 博客 / 公众号 / 网页文章（html / md / docx）
└── assets/         # 配图、表格、独立资源
```

支持格式（来自 `scripts/convert.py` 的 `SUPPORTED_EXTENSIONS` 常量）：

```
.md  .pdf  .docx  .pptx  .xlsx  .xls
.html  .htm  .csv  .json  .xml
.epub
.jpg  .jpeg  .png  .gif  .bmp  .tiff  .tif  .webp
.mp3  .wav
.msg
```

### 硬约束

| 路径 | 权限 |
|---|---|
| `raw/**` 下原始文件（pdf / docx / html / ...） | **绝对只读**——任何 agent 写工具都会拒绝 |
| `raw/**/*.md` 与 `raw/**/*.outline.json` | agent **只读**；这是 `convert.py` 的派生产物，下次 convert 会覆盖 |

> **git 范围**：`raw/` 整个目录（原始文件 + 派生 `*.md` / `*.outline.json`）默认**不进 git**——`.gitignore` 的 `workspaces/*/raw/` 已整体排除。**raw 留在本地，公开（提交）的是 wiki 提炼物**。派生产物虽不入库，仍禁止 agent 手改：它们的内容必须与原文一致，手改会导致锚点漂移、引用失效，且下次 convert 会被覆盖。

---

## 2. 阶段 ②：`convert.py` ——格式标准化 + 锚点系统

### 调用方式

```bash
python scripts/convert.py                            # 增量：扫默认 workspace 的 raw/（即 workspaces/smb-ecommerce/raw/）
python scripts/convert.py --workspace rag-evolution  # 指定 workspace
python scripts/convert.py --dry-run                  # 只列出待处理文件
python scripts/convert.py --force                    # 全部重转
python scripts/convert.py --ext .pdf                 # 只转 pdf
python scripts/convert.py --dir workspaces/smb-ecommerce/wiki/   # 显式指定目录（如给 wiki 页面加锚点）
```

> `--dir` 给出时 `--workspace` 被忽略；目录按运行命令时所在位置解析（通常在仓库根运行，写 `workspaces/<name>/...` 这样的仓库相对路径），且必须在数据根内。

### 单个文件做了什么（`convert.py` 的 `convert_file()`）

```
原始文件 (smith2024.pdf)
    ↓  markitdown.MarkItDown().convert()
markdown 纯文本
    ↓  postprocess.process(markdown, doc_path)
含锚点的 markdown + outline 数据
    ↓  写盘
smith2024.md  +  smith2024.outline.json
```

### 锚点编号（`postprocess.py` 的 `add_anchors()`）

每个段落、heading、表格、代码块、图片块的**行末**追加一个空格 + 锚点：

| 块类型 | 锚点格式 | 示例 |
|---|---|---|
| Heading | `^h-{level}-{seq}-{hash6}` | `## 核心贡献 ^h-2-1-f4e44b` |
| Paragraph / List / Blockquote | `^p-{seq}-{hash6}` | `提出 Transformer ... ^p-2-825954` |
| Table | `^t-{seq}-{hash6}` | `\| ... \| ^t-4-36259c` |
| Code block | `^c-{seq}-{hash6}` | `\`\`\` ^c-3-...` |
| Figure | `^f-{seq}-{hash6}` | `![](...) ^f-1-...` |

- `seq` 是文档内全局段序号（heading 是按 level 各自计数）——人读时一眼就知"第几段"
- `hash6` 是 `md5(归一化内容)[:6]`——内容微调时锚点自动变，由 `k.py list-broken-refs` 暴露失效引用
- 同 hash 撞车时追加 `-2`、`-3` 保唯一

### 幂等性

`convert.py` 的 `should_convert()` 决定是否重新处理：
- 派生 `.md` 或 `.outline.json` 不存在 → 处理
- 非 `.md`：原文件 mtime > 派生 `.md` mtime → 重转
- `.md`：检查文中是否已有 ≥3 处锚点尾巴（`postprocess.py` 的 `has_anchors()`）
- 内容未变时输出与原文 byte-equal——不会污染 git 工作树

### 同时生成的 `outline.json`

每个 md 都配一个同名 `.outline.json`，结构：

```json
{
  "doc_path": "raw/papers/smith2024.md",
  "doc_chars": 87532,
  "doc_paragraphs": 234,
  "generated_at": "2026-05-03",
  "sections": [
    {
      "anchor": "h-1-1-431e0c",
      "title": "Attention Is All You Need",
      "level": 1,
      "line": 1,
      "char_start": 0,
      "char_end": 234,
      "preview": "Vaswani et al. ...",
      "agent_summary": null,
      "children": [
        {
          "anchor": "h-2-1-f4e44b",
          "title": "核心贡献",
          "level": 2,
          ...
        }
      ]
    }
  ]
}
```

> `agent_summary` 字段一开始是 null，由 agent 阅读后用 `k.py annotate-section` 回填精排摘要——后续查询时直接看摘要就能判断这一节是否相关，不必每次都全文 read。

---

## 3. 阶段 ③：agent 阅读 ——大纲驱动 + 章节级精读

外部 agent（Claude Code、Cursor 等）**不允许**直接 `Read` 整个 PDF（数十万字符会撑爆 context），而是按以下顺序操作：

### 3.1 看大纲

```bash
python scripts/k.py outline raw/papers/smith2024.md
```

输出（节选）：

```
文档: raw/papers/smith2024.md
字符数: 87532 | 段数: 234 | 生成于: 2026-05-03

# Attention Is All You Need  [^h-1-1-431e0c]  (line 1, 234 字符)
  └─ (预览) Vaswani et al. 提出基于 self-attention 的序列建模...
  ## Abstract  [^h-2-1-3ae146]  (line 12, 1820 字符)
    └─ (预览) The dominant sequence transduction models are based on...
  ## Introduction  [^h-2-2-10e39a]  (line 35, 4521 字符)
    └─ (预览) Recurrent neural networks have firmly established...
  ## Model Architecture  [^h-2-3-0fdf24]  (line 89, 18430 字符)
    └─ (预览) Most competitive neural sequence transduction models...
    ### Encoder and Decoder Stacks  [^h-3-1-...]  (line 95, 3210 字符)
    ### Attention  [^h-3-2-...]  (line 132, 9870 字符)
    ...
  ## Results  [^h-2-4-cd4741]  (line 245, 6720 字符)
  ## Conclusion  [^h-2-5-...]  (line 312, 980 字符)
```

### 3.2 决策分支：三档自决（CLAUDE.md "Ingest 操作流程" 第 3 步）

**agent 自决，不询问用户**。按字符数三档处理：

| 档 | 字数（中文等价） | 策略 | 综合保真度 |
|---|---|---|---|
| ① **短文** | < 30K（约 3 万中文字） | `Read` 全文，一次性读完 | 高 |
| ② **中长文** | 30K – 150K（论文 / 报告级） | 按 H1 切块、每块 ≤ 3 万分段 `read-section`，每段读完 `annotate-section` | 高（多步但不漏） |
| ③ **整本书规模** | > 150K（专著 / 法规全文） | TOC 扫全 + AI 自决深读章节；**全部章节**登记到 source_summary 的「## 章节深度登记」表（含状态：✓ 深读 / ⊙ 扫读 / × 跳过） | 中（透明声明深度差异） |

> **30K 上限的依据**：单次 Read 超过 30K 中文字符会触发 LLM "lost in the middle" 衰减——综合质量下降。所以即便 Claude Opus 是 1M context，也不在单次塞太多。
>
> 英文文档按 `字符数 × 0.5` 估算中文等价（英文 1 token ≈ 4 char，中文 1 token ≈ 1.5-2 char）。
>
> **第 ③ 档的 ⊙ 扫读章节**保留 partial re-ingest 升级路径——后续 query 命中关键词、lint 探测高频被引、或用户在 web 端主动触发，都可让 AI 重读该章节升级到 ✓ 深读。详见 `.claude/skills/kb-ingest/SKILL.md` 「增量深化」节。

### 3.3 读单节

```bash
python scripts/k.py read-section raw/papers/smith2024.md h-2-3-0fdf24
# 也可以传 title 文本：
python scripts/k.py read-section raw/papers/smith2024.md "Model Architecture"
```

返回该 H2 段从 `char_start` 到下一同级 heading 之前的全部原文，**不会切片**——保持完整段落、表格、公式不被截断。

### 3.4 读单块（精确到段）

写 wiki 时若要引用某段具体数据：

```bash
python scripts/k.py read-block raw/papers/smith2024.md p-87-cd4741
# 输出仅该段原文（去掉行末锚点尾巴）
```

### 3.5 反查锚点

如果手上只有"某段文字"想找它的 anchor：

```bash
python scripts/k.py find-anchor raw/papers/smith2024.md "BLEU 28.4"
# → [^p-127-8ad2e9]  (paragraph, line 251)
#     ...we achieve a new state-of-the-art BLEU score of 28.4...
```

### 3.6 回填精排摘要（**ingest 必经**，每个精读章节都要调）

> **关键规则**：每读完一个 H2 / H3 章节，**立即**对它调一次 `annotate-section`。LLM 反正都把这节读了一遍，写一两句概括的边际成本接近零，但能给下次任何 agent / 查询提供章节级二级索引。
>
> `CLAUDE.md` "Ingest 操作流程"第 4 步写明这是必经步骤，不是优化项。

#### 操作

```bash
python scripts/k.py annotate-section raw/papers/smith2024.md h-2-3-0fdf24 \
  "Encoder/Decoder 各 6 层；Multi-Head Self-Attention 用 8 头；Position Encoding 用正弦函数。"
```

下次任何 agent 跑 `k.py outline` 时这一节会显示 `(LLM)` 标的精排摘要（而不是默认的 `(预览)` ——后者只是该节前 N 字截断）。

#### 为什么必做

1. **边际成本≈0**：LLM 已经在读这章准备写 `wiki/sources/` 摘要页，多生成一两句话的额外 token 几乎可以忽略
2. **双层索引才完整**：
   - **整篇级**：`wiki/sources/<paper>.md` 是结构化摘要（带 frontmatter + 块级引用，主要服务 query 流）
   - **章节级**：`outline.json` 的 `agent_summary` 是章节便签（主要服务下次 read-section 之前的精确定位）
   - 两者**不冗余**，分别承担不同粒度的索引职责
3. **可由 lint 兜底验证**：`k.py health` 会列出"被 wiki 引用过但 `agent_summary` 为 null"的章节数，缺了会被暴露

#### 历史背景（写在这里防止误解）

`CLAUDE.md` 早期措辞是"**可调**"，导致 187 处 `agent_summary` 全是 null，是流程执行的疏漏。本文档与 `CLAUDE.md` 已同步将其升级为必经步骤；存量 `null` 由 lint 流程逐步补齐。

---

## 4. 阶段 ④：在 `wiki/sources/` 创建摘要页

> **写前：AI 综合判断**——在打开模板填内容前，agent 已先用 `python scripts/k.py search` 反查 wiki 现状做了三件事综合：核心价值（新东西在哪）/ 关联（哪些 wiki 页有重叠）/ 冲突（哪些论断打架）。这些结论作为 source_summary 的「## AI 综合判断」H2 节固化下来。详见 `.claude/skills/kb-ingest/SKILL.md` 第 3 步。

### 模板

`wiki/_templates/source_summary_template.md` 是骨架，agent 复制后填充。最重要的几点：

1. **标准 frontmatter**（schema 见 `CLAUDE.md`）
2. **每条实质性论断都附带块级引用**（`[[raw/...#^p-...]]` 或 `[[raw/...#^h-...]]`）
3. **「## AI 综合判断」H2 节**（含 3 个 H3：核心价值 / 关联 / 冲突）——固化第 3 步的综合判断，便于日后 web 端审计或覆盖
4. **「## 章节深度登记」H2 节**——仅第 ③ 档（>15 万字长文档）需要，用表格列出**全部章节**的深度状态（✓ 深读 / ⊙ 扫读 / × 跳过），扫读章节保留 partial re-ingest 升级路径

### 引用粒度从粗到细

```markdown
1. [[raw/papers/foo]]                        ← 整篇（仅背景介绍用）
2. [[raw/papers/foo#^h-2-3-a3f2c1]]          ← 整个 H2/H3 段（最常用）
3. [[raw/papers/foo#^p-12-7d8e9a]]           ← 单段（关键数据 / 精确论断）
```

> 写 wiki 时 **优先用 anchor 形式**（`#^h-...` / `#^p-...`），而不是 heading 文本——anchor 是 agent 从 outline 复制的，写错概率低；heading 文本有大小写 / 空白差异时会失配。

### 多条引用并列

```markdown
准确率 95.3%[[raw/papers/A#^p-3-abc123]]，
但多语言下降到 78%[[raw/papers/B#^p-7-def456]][[raw/papers/C#^h-2-1-xyz789]]。
```

### 无来源时必须显式标注

```markdown
该方法在生产环境部署超过 6 个月 [需要来源]
```

**绝不允许**写没有来源的实质性论断、也**不允许**省略 `[需要来源]` 标签。

---

## 5. 阶段 ⑤：更新核心节点 + 索引联动 + 收尾

> 本节示例中的 DPO / Vaswani 等页面名仅作**格式示意**；落在本仓库的真实完整例子见 §6。

### 5.1 立即更新最核心的 2-3 个节点

举例：刚 ingest 了一篇关于 DPO 的论文，则：
- **必须立即更新**：`wiki/concepts/dpo.md`、`wiki/concepts/rlhf.md`（DPO 是 RLHF 的对比项）
- **必须立即更新**：`wiki/indexes/ai_index.md` 的"近期更新"和"关键来源"小节

### 5.2 给次要受影响页面打 `#to-be-updated`

```markdown
---
#to-be-updated 2026-05-03: [[wiki/sources/rafailov2023_dpo]] 引入后，
待补充"训练范式"章节中 [[wiki/concepts/dpo]] 与 Transformer 训练流程的整合
```

> 这是**懒标记**——不要求当下就改完所有相关页，但必须留下线索，供下一次 lint 流程消化。

### 5.3 自动判断 MOC 归属

agent 用 source_summary 的 `tags` 字段反查现有 MOC（`python scripts/k.py list-pages --type=index --json`）：

- **匹配到现有 MOC**：在该 MOC 的「近期更新」节追加一条；多个候选选 `scope` 最窄的
- **没匹配到任何 MOC**（首次进入新领域）：用 `wiki/_templates/index_template.md` 自动新建 `wiki/indexes/<tag>_index.md`，scope 设为 `wiki/concepts/<tag>*`，把新摘要页 + 5.1 更新过的核心概念页加进去；同时在 `wiki/root_index.md` 加一行入口

**agent 自决，不询问用户**。归属错了由 lint 流程检测后人工纠正。

### 5.4 检查冲突

发现新论文与既有 wiki 论断矛盾时，**禁止覆盖**，写冲突标注：

```markdown
> [!WARNING] 知识更新冲突 — 2026-05-03
> **旧观点**：RLHF 是对齐 LLM 的最佳方法（来源：[[raw/papers/ouyang2022#^p-3-...]]）
> **新证据**：DPO 在偏好数据上效果更优且训练更简单（来源：[[raw/papers/rafailov2023#^p-7-...]]）
> **LLM 判断**：两者目标一致但方法路径不同，DPO 在某些场景下确实更优
> **状态**：⏳ 待人类判别
```

### 5.5 追加 `log.md`

```markdown
## [2026-05-03] ingest | Vaswani et al. 2017 - Attention Is All You Need
- 新建 wiki/sources/vaswani2017_transformer.md
- 更新 wiki/concepts/transformer.md（新增"核心设计"章节）
- 更新 wiki/concepts/attention.md（补充 Multi-Head 细节）
- 更新 wiki/indexes/ai_index.md（新增"关键来源"条目）
- 给 wiki/concepts/in_context_learning.md 打 #to-be-updated
```

### 5.6 原子 commit

```bash
# git 在仓库根运行，路径写全 workspaces/<name>/...
# raw/ 已被 .gitignore（workspaces/*/raw/）排除，无需也无法 add
git add workspaces/<name>/wiki/sources/vaswani2017_transformer.md
git add workspaces/<name>/wiki/concepts/transformer.md workspaces/<name>/wiki/concepts/attention.md
git add workspaces/<name>/wiki/indexes/ai_index.md
git add workspaces/<name>/log.md
git commit -m "ingest: Vaswani et al. 2017 - Attention Is All You Need"
```

> **原子性**：新建 source 摘要 + 受影响节点更新 + 索引 + log 必须**一起**进同一个 commit。这样 `git log` 即使不看 diff 也能讲清楚每次知识库变化的因果链。
>
> **raw 不入库**：`raw/` 及其派生 `*.md` / `*.outline.json` 被 `.gitignore` 整体排除——raw 留在本地，公开的是 wiki（见 §1"git 范围"）。所以 ingest 的原子提交只含 `wiki/**` 与 `log.md`。

---

## 6. 完整真实例子：Sheng Lu《Shein Lost Market Share in the U.S. ...》

下面用一个**真实落在本仓库默认 workspace（`workspaces/smb-ecommerce/`）**的例子走一遍：Sheng Lu（特拉华大学）2026-02 的博客文章《Shein Lost Market Share in the U.S. Apparel Retail Market in 2025 Amid Trade Tensions》。除 `raw/` 本身（被 `.gitignore` 排除、只存在于本地）外，最终产物都能在仓库里看到。

### 6.1 起点：原始文件入库

```bash
# 把下载好的网页 HTML 放进当前 workspace 的 raw/articles/
cp ~/Downloads/shein_us_market_share_2025.html \
   workspaces/smb-ecommerce/raw/articles/shein_us_market_share_2025.html
```

### 6.2 跑 convert

```bash
python scripts/convert.py        # 默认 workspace = smb-ecommerce
```

输出：

```
扫描目录: <project-root>/workspaces/smb-ecommerce/raw
待转换: 1 | 已是最新: 26

  转换: articles/shein_us_market_share_2025.html ... 完成 -> shein_us_market_share_2025.md (新增, 92466 字符, 23 章节, 193 段)

========================================
转换完成:
  成功: 1
```

产物（与 `.html` 同目录）：
- `raw/articles/shein_us_market_share_2025.md`（含锚点的纯 markdown）
- `raw/articles/shein_us_market_share_2025.outline.json`（结构化大纲）

### 6.3 看大纲决定怎么读

```bash
python scripts/k.py outline raw/articles/shein_us_market_share_2025.md
```

输出（真实运行结果，节选）：

```
文档: raw/articles/shein_us_market_share_2025.md
字符数: 92466 | 段数: 193 | 生成于: 2026-05-20

# Shein Lost Market Share in the U.S. Apparel Retail Market in 2025 Amid Trade Tensions  [^h-1-1-f56b34]  (line 41, 89981 字符)
  └─ (预览) Latest Data from Euromonitor shows that while the United States remained Shein's largest apparel sales market in 2025...
  ## Author: Sheng Lu  [^h-2-1-e7a57e]  (line 74, 838 字符)
  ## 41 thoughts on "Shein Lost Market Share ..."  [^h-2-2-464cca]  (line 80, 64237 字符)
    └─ (LLM) 读者评论区（64K 字符），与本文核心论点无关，未深读
  ## Post navigation  [^h-2-3-1d0810]  (line 376, 549 字符)
  ...
```

字符数 92466 落在第②档（30000 – 150000，见 §3.2 三档），所以**不能直接 Read 全文**，要按章节读。大纲进一步显示：这 92K 里约 64K 是博客读者评论（`h-2-2-464cca`），核心论点集中在文档头部——深读正文、跳过噪声节。

### 6.4 精读正文 + 回填摘要

本文结构特殊：核心论点集中在 H1 开头的几个段落（`p-10` ~ `p-13`），后面挂着 64K 的评论区。所以直接用 `read-block` 精读关键数据段（结构干净的论文 / 报告则按 §3.3 用 `read-section` 整段读）：

```bash
# 核心数据段：美国服装份额 1.8% → 1.7%、销售额 -4.5%
python scripts/k.py read-block raw/articles/shein_us_market_share_2025.md p-10-4e143d

# 市场多元化数据：欧 5 国 + 巴西增长
python scripts/k.py read-block raw/articles/shein_us_market_share_2025.md p-12-6c45f0
```

**读完（或决定跳过）一个章节，立即回填摘要**（§3.6 的必经步骤——"未深读"也要登记。下面这条就是真实仓库里这节 annotation 的来历）：

```bash
python scripts/k.py annotate-section raw/articles/shein_us_market_share_2025.md h-2-2-464cca \
  "读者评论区（64K 字符），与本文核心论点无关，未深读"
```

回填后任何 agent 再跑 `k.py outline`，该节就从 `(预览)` 截断的头部变成 `(LLM)` 标的精排摘要——§6.3 的输出正是回填后的状态。

### 6.5 检查重复

```bash
python scripts/k.py search "shein"
```

wiki 中已存在 `wiki/entities/shein.md` 实体页与另一篇 SHEIN 来源 `wiki/sources/analyzify_shein_stats_2025.md`——所以**不要**新建实体页，而是把新发现合并进 `shein.md`；两篇来源数字对不上的地方进「AI 综合判断 → 冲突」节（见 6.6）。

### 6.6 写 `wiki/sources/shein_us_market_share_2025.md`

最终产物（真实仓库文件，节选）：

```markdown
---
title: "Shein 美国市场份额 2025 因贸易紧张下滑（Sheng Lu / Euromonitor）"
type: source_summary
created_date: 2026-05-20
last_modified: 2026-05-20
last_modified_by: LLM
status: draft
confidence: high
source_count: 1
sources:
  - "[[raw/articles/shein_us_market_share_2025]]"
tags:
  - shein
  - fast-fashion
  - us-market
  - de-minimis
  - tariff
  - market-share
---

# Shein 美国市场份额 2025 因贸易紧张下滑 ^h-1-1-07ca3b

## 核心论点 ^h-2-1-522a48

1. 2025 年 [[wiki/entities/shein]] 在美国服装零售销售额**下滑 4.5%**，市场份额从
   2024 年的 **1.8% 跌至 1.7%**，自 2021 年以来首次下滑
   [[raw/articles/shein_us_market_share_2025#^p-10-4e143d]]。
...

## AI 综合判断（基于 wiki 现状） ^h-2-3-e0e2f6

### 核心价值 ^h-3-1-57ae37
...
### 关联 ^h-3-2-1c3cf7
...
### 冲突 ^h-3-3-93190b
...
```

注意点：
- frontmatter 完全符合 schema（`CLAUDE.md` 中"标准 YAML Frontmatter"）：`type: source_summary` 配 `source_count: 1`，`sources` 恰好一条
- 每条实质性论断后都跟着 `[[raw/articles/shein_us_market_share_2025#^p-...]]` 块级引用
- 「## AI 综合判断」H2 节固化核心价值 / 关联 / 冲突三个 H3——本例的「冲突」节记录了与 `wiki/sources/analyzify_shein_stats_2025`（SHEIN 全球销售 +40-45%）的口径差异及收口结论（美国局部下滑 vs 全球扩张，两口径并存）
- 横向出链 `[[wiki/entities/shein]]` `[[wiki/concepts/de_minimis_exemption]]`——让节点页与来源页双向连通
- 自身的段落锚点 `^h-1-1-...` `^p-1-...` 由 `convert.py --dir workspaces/smb-ecommerce/wiki/` 自动加上

### 6.7 更新核心节点

本次 ingest 实际更新了三个节点页 + 一个 MOC，都可在仓库里查证：

#### `wiki/entities/shein.md`

关键数据表与"美国份额首次下滑"论断都 anchor 到本来源（真实文件节选）：

```markdown
| 2025 美国服装份额 | **1.7%（↓ from 1.8%）** | [[wiki/sources/shein_us_market_share_2025#^p-10-4e143d]] |
```

#### `wiki/concepts/de_minimis_exemption.md` / `wiki/concepts/fast_fashion.md`

把本文作为 De Minimis 终结的**业务影响实证**之一（真实文件节选）：

```markdown
- [[wiki/entities/shein]] 美国服装份额从 1.8% 跌至 1.7%，2025 销售额 -4.5% [[wiki/sources/shein_us_market_share_2025#^p-10-4e143d]]
```

#### `wiki/indexes/platforms_index.md`

在「近期更新」节追加（真实文件节选）：

```markdown
## 近期更新 ^h-2-3-deb736

- 2026-05-20 — 全量首次建立（[[wiki/sources/modern_retail_tiktok_smb_66]] / [[wiki/sources/emarketer_tiktok_social_commerce]] / [[wiki/sources/shein_us_market_share_2025]] 等）
```

### 6.8 给次要受影响页面打 `#to-be-updated`

例如 `wiki/entities/temu.md`（Temu 同受 De Minimis 冲击但缺专门来源）末尾的真实标记：

```markdown
- #to-be-updated — 当前没有专门的 Temu 来源 ingest（SEC EDGAR PDD 20-F 抓取被反爬阻拦）；后续可补 PDD 财报披露或第三方研报作为权威 ingest
```

后续 lint 流程（`python scripts/k.py list-to-update`）会列出所有 `#to-be-updated` 积压。

### 6.9 写 log + commit

本例实际是作为 demo 数据集批量 ingest 的一部分入库的，对应 `workspaces/smb-ecommerce/log.md` 的「[2026-05-20] ingest | 跨境电商 demo 数据集」条目。若单独 ingest 一篇，log 条目与 commit 形如：

```bash
# log.md 追加：
## [2026-05-20] ingest | Shein 美国市场份额 2025（Sheng Lu / Euromonitor）
- 新建 wiki/sources/shein_us_market_share_2025.md
- 更新 wiki/entities/shein.md、wiki/concepts/de_minimis_exemption.md、wiki/concepts/fast_fashion.md
- 更新 wiki/indexes/platforms_index.md（近期更新）
- wiki/entities/temu.md 保持 #to-be-updated（缺专门来源）

# 一次性 commit（git 在仓库根运行；raw/ 被 .gitignore 排除，不进提交）：
git add workspaces/smb-ecommerce/wiki/sources/shein_us_market_share_2025.md
git add workspaces/smb-ecommerce/wiki/entities/shein.md
git add workspaces/smb-ecommerce/wiki/concepts/de_minimis_exemption.md
git add workspaces/smb-ecommerce/wiki/concepts/fast_fashion.md
git add workspaces/smb-ecommerce/wiki/indexes/platforms_index.md
git add workspaces/smb-ecommerce/log.md
git commit -m "ingest: Shein 美国市场份额 2025（Sheng Lu / Euromonitor）"
```

### 6.10 验收：从 wiki 反查到 raw

完成 ingest 后任意时刻，下面这些动作都应该顺畅（均为本仓库真实可跑的命令）：

```bash
# 1. 反向链接：哪些 wiki 页提到这篇文章？
python scripts/k.py backlinks raw/articles/shein_us_market_share_2025.md
# 真实输出 30+ 条，含 wiki/sources/shein_us_market_share_2025.md、
# wiki/concepts/de_minimis_exemption.md、wiki/root_index.md 等

# 2. 出向链接：这篇 source 摘要页都引用了什么？
python scripts/k.py outlinks wiki/sources/shein_us_market_share_2025.md
# 真实输出 21 条，含 raw/articles/shein_us_market_share_2025.md#^p-10-4e143d、
# wiki/entities/shein.md 等

# 3. 失效引用扫描：摘要页里的 ^anchor 是否都还存在于原文？
python scripts/k.py list-broken-refs
# 应输出 "✅ 没有失效的 raw 引用"

# 4. 健康度
python scripts/k.py health
# 看 orphans_count（孤儿页）、conflicts_count、to_update_count 是否符合预期
```

---

## 7. 异常路径速查

| 现象 | 可能原因 | 处理 |
|---|---|---|
| `convert.py` 报"转换结果为空" | markitdown 不识别（如扫描版 PDF） | 手动转 OCR；或换 `pdfplumber` / `pymupdf` 预处理 |
| outline.json 与 md 不同步 | 手改了 md 但没重跑 convert | `python scripts/convert.py --force`（整个 workspace 的 raw/）或 `--force --dir workspaces/smb-ecommerce/raw/papers` 只重转一处 |
| `k.py list-broken-refs` 报失效 | 原文内容微调导致 hash 变 | 手动改 wiki 引用为新 anchor，或在原文恢复变更 |
| 摘要页里有 `[需要来源]` | 写时找不到精确出处 | lint 流程逐条补 anchor，或把论断降级为 `confidence: low` |
| 同 hash 撞车导致 `-2` 后缀 | 文档内有完全重复的段落 | 不影响使用；`postprocess.py` 的 `make_unique()`（`add_anchors` 内部）自动加序号保唯一 |
| ingest 完忘了打 `#to-be-updated` | 受影响页面隐性遗漏 | lint 阶段 `list-orphans` + `list-to-update` 兜底 |

---

## 8. 关键设计决策（为什么是这样）

| 决策 | 替代方案 | 为什么不选 |
|---|---|---|
| 锚点用 `^h-/^p-/^t-/^c-/^f-` 写在行末 | 用 heading 文本做引用 | heading 文本有大小写 / 空白差异；agent 写错概率高 |
| `hash6` 内容微调时自动失效 | 永久稳定 ID（如 UUID） | 内容变了引用不该还指向旧位置；失效暴露才是对的 |
| 知识库**不**调用 LLM | 内嵌 embedding + 向量搜索 | 违反原则 4；切片召回会破坏完整段语义；embedding 模型选型成本高 |
| `read-section` / `read-block` 返回**完整段** | 返回 chunk | 切片会断裂表格、公式、列表；完整段才有上下文 |
| `raw/` 连同派生 `.md` / `.outline.json` 进 `.gitignore`，不入库 | 派生产物提交 git | 原始资料常含版权 / 隐私内容，开源仓库只发布 wiki 提炼物；派生物可随时由 `convert.py` 重建。代价是换台机器后 `[[raw/...]]` 引用无法跳转——这是有意取舍：raw 留在本地，公开的是 wiki |
| `删除 = status: deprecated` | 真删文件 | 历史信息有内在价值；真删后 backlinks 断裂 |

---

## 9. 想得更深一点

- **为什么不直接把 PDF 整本喂给 LLM？** 三个理由：① 大文档 context 成本高；② 一次性读完往往**只记住开头和结尾**（lost-in-the-middle）；③ 没有锚点就没法回溯——下个月想验证某个结论时找不到原文出处。
- **为什么强制每条论断都要 anchor？** 知识库的目的不是"存储看过什么"，而是"任意时刻都能回到原文重新验证"。anchor 是这个能力的物理基础。
- **为什么 wiki 页面也要加锚点？** 因为 wiki 页面会被其他 wiki 页面引用（横向出链），而且会被 export 出去。anchor 让任何一段都能被精确回链。
- **为什么 `last_modified_by` 要分 LLM / Human？** 决议冲突、敏感判断必须由人类拍板；frontmatter 留痕便于 lint 流程区分"AI 自动写的"和"人类决议过的"。

---

> **下一步阅读**：`CLAUDE.md`（行为规范全文）、`GroundMap-设计文档.md`（系统设计与未来演进）、`scripts/postprocess.py`（锚点算法源码）、`scripts/k.py`（CLI 实现）。
