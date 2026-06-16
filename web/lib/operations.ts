/**
 * 健康度问题的"一键处理"操作集合
 * 每个 action：读文件 → 改 frontmatter / 改 content → 写回 → 自动 commit
 */
import { readFile, writeFile } from "./kb";
import { parseMarkdown, serializeMarkdown, TO_BE_UPDATED_RE } from "./markdown";
import { checkWritePermissionAsync } from "./permissions";
import { gitAddAndCommit } from "./git";
import {
  todayISO,
  removeConflictBlock,
  convertConflictToWatching,
  adoptNewFromConflict,
  mergeConflict,
} from "./conflict-rewrite";

export type ResolveAction =
  | "set_status_deprecated"
  | "set_status_reviewed"
  | "set_confidence_medium"
  | "set_confidence_high"
  | "remove_to_be_updated"
  | "resolve_conflict_keep_old"
  | "resolve_conflict_keep_watching"
  | "resolve_conflict_adopt_new"
  | "resolve_conflict_merge";

/** adopt_new / merge 需要的额外用户输入 */
export interface ResolvePayload {
  /** adopt_new：替换冲突主论断的新文本（一段 markdown） */
  newClaim?: string;
  /** merge：人类亲自合写的整合文本（一段 markdown） */
  mergedText?: string;
}

export interface ResolveResult {
  ok: boolean;
  error?: string;
  message?: string;
  commit?: string;
}

const ACTION_LABELS: Record<ResolveAction, string> = {
  set_status_deprecated: "deprecate",
  set_status_reviewed: "mark reviewed",
  set_confidence_medium: "bump confidence to medium",
  set_confidence_high: "bump confidence to high",
  remove_to_be_updated: "clear #to-be-updated",
  resolve_conflict_keep_old: "resolve conflict (keep_old)",
  resolve_conflict_keep_watching: "mark conflict as keep_watching",
  resolve_conflict_adopt_new: "resolve conflict (adopt_new)",
  resolve_conflict_merge: "resolve conflict (merge)",
};

export async function applyResolve(
  relPath: string,
  action: ResolveAction,
  payload?: ResolvePayload,
): Promise<ResolveResult> {
  // 路径白名单 + 现有文件 frontmatter 锁定检查
  const perm = await checkWritePermissionAsync(relPath);
  if (!perm.allowed) {
    return { ok: false, error: perm.reason || "权限拒绝" };
  }

  // 读
  let raw: string;
  try {
    raw = await readFile(relPath);
  } catch (e) {
    return { ok: false, error: `读取失败: ${e}` };
  }

  const { frontmatter, content } = parseMarkdown(raw);
  const newFm = { ...frontmatter };
  let newContent = content;

  switch (action) {
    case "set_status_deprecated":
      newFm.status = "deprecated";
      break;
    case "set_status_reviewed":
      newFm.status = "reviewed";
      break;
    case "set_confidence_medium":
      newFm.confidence = "medium";
      break;
    case "set_confidence_high":
      newFm.confidence = "high";
      break;
    case "remove_to_be_updated":
      newContent = removeToBeUpdatedBlock(content);
      break;
    case "resolve_conflict_keep_old":
      newContent = removeConflictBlock(content);
      break;
    case "resolve_conflict_keep_watching":
      newContent = convertConflictToWatching(content);
      break;
    case "resolve_conflict_adopt_new":
      if (!payload?.newClaim?.trim()) {
        return { ok: false, error: "缺少 newClaim：adopt_new 需要新论断文本" };
      }
      newContent = adoptNewFromConflict(content, payload.newClaim);
      break;
    case "resolve_conflict_merge":
      if (!payload?.mergedText?.trim()) {
        return { ok: false, error: "缺少 mergedText：merge 需要人类合写的整合文本" };
      }
      newContent = mergeConflict(content, payload.mergedText);
      break;
    default:
      return { ok: false, error: `未知 action: ${action}` };
  }

  // 通用：last_modified + last_modified_by
  newFm.last_modified = todayISO();
  newFm.last_modified_by = "Human";

  const newRaw = serializeMarkdown(newFm, newContent);
  try {
    await writeFile(relPath, newRaw);
  } catch (e) {
    return { ok: false, error: `写入失败: ${e}` };
  }

  // 自动 commit
  const commitMsg = `update: ${ACTION_LABELS[action]} on ${relPath} via web`;
  const commit = await gitAddAndCommit([relPath], commitMsg);
  if (!commit.ok) {
    return { ok: false, error: `git commit 失败: ${commit.error}` };
  }
  return {
    ok: true,
    message: commit.noop ? "已保存（无变更）" : `已 commit ${commit.commit}`,
    commit: commit.commit,
  };
}

/**
 * 删除带 `#to-be-updated` 的整个尾部块。
 * 通常的写法是：
 *
 *   ---
 *   #to-be-updated 2026-04-22: <说明>
 *
 * 把这一段（含前面的 `---` 与空行）整体清掉。
 *
 * 边界处理：
 *   - 跳过围栏代码块（``` 之间）：示例代码里讨论 `#to-be-updated` 这个 tag
 *     不应触发删除，否则会把整段示例代码连带前导分隔符吃掉
 *   - 回退前导空行/分隔符**最多 2 行**（一个 `---` + 一个空行）：避免误删
 *     正文段落之间的合法空行
 */
function removeToBeUpdatedBlock(content: string): string {
  const lines = content.split("\n");
  const out: string[] = [];
  let inCodeFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // 切换围栏状态（``` 或 ~~~ 起头）
    if (/^[ \t]{0,3}(```|~~~)/.test(line)) {
      inCodeFence = !inCodeFence;
      out.push(line);
      continue;
    }
    if (!inCodeFence && TO_BE_UPDATED_RE.test(line)) {
      // 删除当前行；同时回退去掉前面的 "---" 分隔符与空行（最多 2 行）
      let popped = 0;
      while (out.length > 0 && popped < 2) {
        const last = out[out.length - 1];
        if (last.trim() === "" || last.trim() === "---") {
          out.pop();
          popped += 1;
          continue;
        }
        break;
      }
      // 跳过当前行
      continue;
    }
    out.push(line);
  }
  // 收尾：保证文件以单个换行结尾
  let result = out.join("\n");
  if (!result.endsWith("\n")) result += "\n";
  return result;
}
