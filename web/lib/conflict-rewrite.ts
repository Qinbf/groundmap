/**
 * 冲突块改写——纯字符串 in/out，无 fs/git/next 依赖。
 *
 * 从 operations.ts 抽出：这四个函数对 markdown blockquote 形式的「知识更新冲突」
 * 块做多行正则替换，是发布后最容易静默改坏 wiki 正文的一类逻辑，独立成模块后
 * 可用 node:test 零依赖回归测试（见 conflict-rewrite.test.ts）。
 *
 * 日期通过参数注入（默认 todayISO()）——让测试能传固定日期断言确定输出。
 */

export const todayISO = (): string => new Date().toISOString().slice(0, 10);

/**
 * 删除整段 blockquote 形式的冲突块。
 * 匹配以 `> [!WARNING] 知识更新冲突` 起头、连续 `>` 行的整段，并折叠多余空行。
 */
export function removeConflictBlock(content: string): string {
  const re = /^[ \t]*> \[!WARNING\] 知识更新冲突[^\n]*(?:\n[ \t]*>[^\n]*)*\n?/gm;
  return content.replace(re, "").replace(/\n{3,}/g, "\n\n");
}

/**
 * keep_watching：把冲突块的 `[!WARNING]` 改为 `[!NOTE]`，
 * 「待人类判别」改为「持续观察 — <date>」。块整体保留。
 */
export function convertConflictToWatching(content: string, today: string = todayISO()): string {
  return content
    .replace(/> \[!WARNING\] 知识更新冲突/g, `> [!NOTE] 持续观察 — ${today}`)
    .replace(/⏳ 待人类判别/g, `🟢 持续观察中`);
}

/**
 * adopt_new：人类采纳新观点。把**首个**冲突块替换为「新论断 + 历史 NOTE」两段：
 *   <newClaim>
 *
 *   > [!NOTE] 历史观点（已被新证据取代 — YYYY-MM-DD 由人类判别）
 *   > <原冲突块内容（去掉 WARNING 头）>
 *
 * 新论断成为主文本，旧观点不丢失（CLAUDE.md「删除即标记」）。
 */
export function adoptNewFromConflict(content: string, newClaim: string, today: string = todayISO()): string {
  // 无 g flag → String.replace 自然只替换首个匹配（callback 只调一次）
  const re = /^[ \t]*> \[!WARNING\] 知识更新冲突[^\n]*(?:\n[ \t]*>[^\n]*)*/m;
  return content
    .replace(re, (block) => {
      const historyBlock = block
        .replace(
          /> \[!WARNING\] 知识更新冲突[^\n]*/,
          `> [!NOTE] 历史观点（已被新证据取代 — ${today} 由人类判别）`,
        )
        .replace(/⏳ 待人类判别/g, "✅ 已采纳新观点");
      return `${newClaim.trim()}\n\n${historyBlock}`;
    })
    .replace(/\n{3,}/g, "\n\n");
}

/**
 * merge：人类把多视角合写为整合论断。把**首个**冲突块替换为人类提供的
 * mergedText（已含视角对比 + 整合判断），并挂一行 NOTE 标注合并日期供溯源。
 */
export function mergeConflict(content: string, mergedText: string, today: string = todayISO()): string {
  const re = /^[ \t]*> \[!WARNING\] 知识更新冲突[^\n]*(?:\n[ \t]*>[^\n]*)*\n?/m;
  return content
    .replace(re, () => {
      const merged = mergedText.trim();
      return `${merged}\n\n> [!NOTE] 多视角合并 — ${today}（由人类合写）\n`;
    })
    .replace(/\n{3,}/g, "\n\n");
}
