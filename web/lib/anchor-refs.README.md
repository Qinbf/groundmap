# anchor-refs — 论文样式段落引用渲染层

## 角色 / 边界

`web/lib/anchor-refs.tsx` 是 Web 管理台的**显示层抽象**：把 markdown 中的 trailing anchor（`^h-/^p-/^t-/^c-/^f-`）与跨文档 raw wikilink（`[[raw/.../foo#^p-1-abc]]`）按出现顺序统一编号，渲染时在原位显示 `[n]` 上标，文末渲染 References 区。

**这是纯显示层** —— 与 CLAUDE.md "引用规范"小节描述的**数据层契约**互不重叠：

| 层 | 内容 | 由谁定义 |
|---|---|---|
| 数据层 | anchor 格式 / wikilink 语法 / 引用粒度 / sources frontmatter | CLAUDE.md，所有外部 agent 必须遵守 |
| 显示层 | 论文样式 [n] / References 区 / 上标交互 | 本模块，只在 Web 渲染时生效 |

删掉 `anchor-refs.tsx` 整个文件 → 数据层完全不受影响，知识库照旧；只是 Web 端会回到"裸 anchor 字符串显示"或"完全隐藏 anchor"的旧体验。

## 设计原则

1. **数据层不变**：`raw/**/*.md` / `wiki/**/*.md` 的 anchor、wikilink 都是真相源，渲染层不修改它们。
2. **编号是 per-page 临时映射**：`[1]` 只在当前页面渲染上下文里有意义；agent 写 wiki 引用时**仍然用 anchor ID**（`[[raw/foo#^p-12-7d8e9a]]`），不要用 `[12]`。
3. **registry key 命名空间**：用前缀显式区分两种引用，避免冲突 ——
   - `self:<anchor-id>` 同文档段落自身的 trailing anchor
   - `raw:<target>#<anchor>` 跨文档 raw wikilink 引用（target 已去 `.md` 后缀）
4. **统一编号、出现顺序**：trailing anchor 与 raw wikilink 合并按 `index` 排序，去重后给同一 `[n]`。

## API 概览

```ts
// 扫描 markdown，建立 registry + refs 列表
buildAnchorRegistry(content, { scanWikilinks?: boolean })
  → { registry: Map<string, number>, refs: AnchorRef[] }

// Context — 让深层组件（WikiLink / AnchorSup）查编号
AnchorRegistryContext

// 上标组件
AnchorSup({ id })        // 同文档 anchor 上标，点击复制 ^anchor 到剪贴板
// WikiLink 自己处理 raw 引用的 [n] 上标（用 refNum prop 传 RawLinkWithPreview）

// 两套 Components map（合并到 ReactMarkdown.components 用）
ANCHOR_COMPONENTS        // 抽 anchor、输出 id、渲染上标 —— PageRenderer 用
ANCHOR_COMPONENTS_BARE   // 只抽 anchor 视觉文本，不输出 id、不渲染上标 —— MiniMarkdown 用

// 文末 References 区（按段类型 badge + 长文档默认折叠 + hash 监听自动展开）
References({ refs })
```

## 使用方式

### PageRenderer（主页面渲染）

```tsx
const { registry, refs } = useMemo(
  () => buildAnchorRegistry(content, { scanWikilinks: true }),
  [content],
);

return (
  <article className="prose ...">
    <AnchorRegistryContext.Provider value={registry}>
      <ReactMarkdown components={{ ...ANCHOR_COMPONENTS, a: ..., code: ... }}>
        {processed}
      </ReactMarkdown>
    </AnchorRegistryContext.Provider>
    <References refs={refs} />
  </article>
);
```

### MiniMarkdown（hover preview / BlocksTable / learn 模块）

```tsx
// 不 build registry，不包 Provider，不渲染 References —— BARE 即可
<ReactMarkdown components={{ ...ANCHOR_COMPONENTS_BARE, a: ... }}>
  {content}
</ReactMarkdown>
```

### WikiLink（raw 引用 [n] 上标）

WikiLink 内部已经接入：从 `AnchorRegistryContext` 查 `raw:<target>#<anchor>`，命中时把 raw link 渲染成 `[n]` 上标并保留 hover popover；未命中走默认琥珀色链接。**调用方无需感知**，正常使用 `<WikiLink target anchor>` 即可。

## 关键设计决定 / trade-offs

- **BARE 版本存在的理由**：BlocksTable 这类一页同时渲染 N 个 MiniMarkdown 的场景，如果每个都包 Provider + 输出 id：① 视觉上满屏出现局部 `[1] [1] [1]`；② 跨实例 trailing anchor 可能撞 id 破坏 hash 跳转。BARE 等价回到"只剥离 anchor 视觉文本"的最简行为。

- **AnchorSup 点击 = 复制 anchor，非跳转**：论文样式 [n] 点击通常跳到 reference list，但用户的核心痛点是"想引用某段时复制 anchor ID 麻烦"。点击复制 + clipboard 失败 fallback 跳转 + hover title 同时显示完整 `^anchor` 与"点击复制"提示，是综合体验最好的方案。

- **代码块扫描屏蔽**：`maskCodeBlocks` 把 ``` / `~~~` / `` ` `` 内部内容用**等长空白**替换再扫，防止代码块里的 anchor / wikilink 字面串被注册成 ghost references（ReactMarkdown 不会把代码块内容交给 WikiLink / Anchored* 组件渲染，但 regex 看不出来）。等长空白保持 `index` 偏移稳定，让按出现顺序的 sort 仍正确。

- **References 默认折叠阈值 = 30**：经验值，长文档（如 source_summary 大综述）容易超过；折叠后用户点 [n] 触发 `hashchange` → `useEffect` 自动展开 → HashScroller 的 MutationObserver 等元素出现再滚 —— 整条链路自洽。

- **不纳入 wiki 内部链接**：`[[wiki/concepts/X]]` 是知识库内部跳转（章节导航），语义上不是论文 citation，强行编号会污染 References 区。所以 `RAW_WIKILINK_RE` 强制以 `raw/` 开头。

## 已知限制

- **多 anchor 同行**：`段尾 ^h-2-1-src12 ^h-2-1-b66ea6` 这种一行末尾有两个 anchor 的情况，`LINE_ANCHOR_RE` 与 `extractTrailingAnchor` 都只识别末尾那个 —— 前一个 anchor 既不会被注册编号，也不会被剥离视觉。这是预存在限制（与本模块无关），需要由 `scripts/convert.py` 在生成阶段保证一段一锚点。

- **跨文档预览**：References 区里 raw 引用条目只显示路径 + anchor，不显示目标段的文字预览 —— 因为获取它需要 fetch 另一个文件的 API 调用，每个 reference 单独 fetch 不可接受。如需要预览，用户应 hover 正文里的 `[n]` 上标（保留了原 RawLinkWithPreview 的 popover）。

- **HTML 表格中间单元格无上标**：trailing anchor 约定放在表格末行最后一列（match 行末），中间单元格不会有上标，符合 `convert.py` 的输出规范。

## 扩展指南

- **加新的 `RefKind`**：在 `RefKind` 联合类型加值；i18n `references.kind.<新kind>` 加 zh/en 翻译；`buildAnchorRegistry` 里赋值 `kind` 的逻辑覆盖到新场景。
- **接入新的 markdown 渲染场景**：选 `ANCHOR_COMPONENTS`（有 Provider + 完整论文样式）或 `ANCHOR_COMPONENTS_BARE`（只剥离视觉）。如果新场景与主页面同时渲染，**优先 BARE**避免 id 冲突。
- **不要在新增 markdown 渲染器里把 `MaskCodeBlocks` 跳过**：跳过会引入 ghost references，且 issue 不容易在 dev 阶段发现。
