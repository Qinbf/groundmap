/**
 * 主阅读区滚动位置记忆（按浏览器历史条目）。
 *
 * 知识库正文不在 window 上滚动，而在内层 overflow:auto 的 <main> 容器里。Next.js
 * App Router 的内置 scroll restoration 只覆盖 window，对内层容器无能为力——于是
 * 「从 A 滚到一半 → 跳到 B → 后退回 A」时，A 的阅读位置会丢。本模块按历史条目
 * 记住每个 <main> 的 scrollTop，后退/前进回来时还原。
 *
 * 两级记忆：
 *   1. 历史条目 key（history.state.__kbScrollKey）——后退/前进回到某个具体历史条目
 *      时，精确还原「那一次」离开的位置（优先级最高，最贴合浏览器原生语义）。
 *   2. URL key（pathname+search）——进入一个「曾读过的页面」时（面包屑、双链、标签、
 *      「← 返回」等任意前进导航都会 push 出新条目、条目 key 必然 miss），用 URL 回退
 *      到该页上次离开的位置。
 * 二者都 miss = 这个页面从没读过 → 回到顶部（保留「新页面不会停在上一页滚动位置」）。
 * 每次保存同时写两张表；读取时条目 key 优先、URL 兜底。
 *
 * 关于 key 的稳健性：Next 自管 history.state。其在「同 URL」的 router.refresh()
 * / server action 重渲时会以 preserveCustomHistoryState=false 做 replaceState，
 * 抹掉本字段（本 app 保存页面 / 冲突决议后即触发）。为此 ensureEntryKey() 在
 * 滚动时用原 key 把它写回（自愈），保住「条目↔scrollTop」映射；万一在写回前就
 * 离开，最差也只是该条目退化为「后退回来回到顶部」，不会出错。
 *
 * 纯浏览器端模块、无持久化：整页刷新后记忆清空，与浏览器原生行为一致。
 */

// 历史条目 key -> scrollTop（精确，后退/前进用）。
const STORE = new Map<string, number>();
// 页面 URL（pathname+search）-> scrollTop（兜底，进入曾读过的页面用）。
const STORE_BY_URL = new Map<string, number>();
// 两张表都是模块级，存活于同一会话的所有客户端（SPA）导航；整页刷新清空。

let keyCounter = 0;

// HashScroller 让位协调：ScrollMemory 还原阅读位置时「接管」滚动定位，HashScroller
// 在它（异步、等布局稳定后）实际滚动的时刻若发现已被接管即让位，不去拽锚点。
//
// 为何用「持有/释放 + token」而非固定时间窗：还原要等长页布局稳定，最长可达
// ~650ms（远超任何固定窗口）；而 HashScroller 也在同一布局稳定点才滚——若窗口短于
// 还原耗时，tryScroll 执行时 claim 已过期、就会把页面拽回锚点盖掉还原。故接管必须
// 覆盖整个还原过程、并在还原结束后稍微延后释放（盖过 HashScroller 同点的 tryScroll），
// 又尽快让出以免误伤之后真正的锚点导航。token 防止「旧的延迟释放」误清掉新一次接管；
// 硬上限兜底防止万一漏释放导致 HashScroller 永久让位。
let claimSeq = 0;
let activeClaim = 0; // 0 = 当前无人接管
let claimDeadline = -Infinity;
const CLAIM_MAX_MS = 1500;

function now(): number {
  // performance 在目标运行环境（"use client" + effect/事件回调内）恒在；
  // 回退 0 仅为类型安全，不会在真实浏览器里走到。
  return typeof performance !== "undefined" ? performance.now() : 0;
}

function readState(): Record<string, unknown> {
  return (window.history.state || {}) as Record<string, unknown>;
}

function stampEntryKey(key: string): void {
  try {
    // 展开保留 Next 自己的 state 字段，只增补一个独立属性；省略第三参 url
    // 不改变当前 URL（第二参为已废弃的 title，浏览器忽略）。
    window.history.replaceState({ ...readState(), __kbScrollKey: key }, "");
  } catch {
    // 个别环境 replaceState 受限：退化为「这次不记忆」，不致命。
  }
}

// Date.now 仅作可读前缀；keyCounter 单调递增才是唯一性保证（同毫秒也不撞）。
function mintKey(): string {
  keyCounter += 1;
  return `e-${Date.now().toString(36)}-${keyCounter}`;
}

/** 取当前历史条目的稳定 key；首次到达该条目时生成并写回 history.state。 */
export function currentEntryKey(): string {
  if (typeof window === "undefined") return "ssr";
  const existing = readState().__kbScrollKey;
  if (typeof existing === "string") return existing;
  const key = mintKey();
  stampEntryKey(key);
  return key;
}

/**
 * 强制给当前历史条目发一个全新 key 并写回 state（覆盖原有的）。
 *
 * 用于「浏览器对原生 location.hash 跳转克隆了上一条目的 state」这种情形：克隆出来的新
 * 条目带着与原条目相同的 __kbScrollKey，二者会共用同一个 scrollTop 槽位、且去重逻辑会
 * 把新条目误判为「同条目、已决策」。重发独立 key 让该条目拥有自己的记忆槽，原条目的
 * 阅读位置不被覆盖、后退回原条目时也能正常还原。
 */
export function forceNewEntryKey(): string {
  if (typeof window === "undefined") return "ssr";
  const key = mintKey();
  stampEntryKey(key);
  return key;
}

/**
 * 确保当前历史条目带着指定 key——若被 Next 的同 URL replaceState 抹掉了，用原 key
 * 写回（自愈），从而保住该条目与 STORE 中 scrollTop 的映射。
 */
export function ensureEntryKey(key: string): void {
  if (typeof window === "undefined") return;
  if (readState().__kbScrollKey === key) return;
  stampEntryKey(key);
}

/**
 * 按历史条目 key 记录 scrollTop；`writeUrlFallback` 为真时同时写 URL 兜底表。
 *
 * 带 hash 的滚动（如点 References 自引用跳到某块）必须传 false：URL 兜底表存的是
 * 「该页**无 hash 时**的真实阅读位置」，用于日后无 hash 重访时还原。若把锚点跳转的
 * 瞬时位置也写进去，会污染兜底——日后无 hash 重访会错误地落到锚点而非阅读位置。
 */
export function saveScroll(
  entryKey: string,
  url: string,
  top: number,
  writeUrlFallback = true,
): void {
  STORE.set(entryKey, top);
  if (writeUrlFallback) STORE_BY_URL.set(url, top);
}

/** 按历史条目 key 取精确记忆位置（后退/前进回到本条目用）。 */
export function getSavedScrollByEntry(entryKey: string): number | undefined {
  return STORE.get(entryKey);
}

/** 按页面 URL 取兜底记忆位置（进入一个曾读过的页面用）。 */
export function getSavedScrollByUrl(url: string): number | undefined {
  return STORE_BY_URL.get(url);
}

/** ScrollMemory 开始还原时接管滚动定位；返回 token 供之后释放。 */
export function holdScrollControl(): number {
  claimSeq += 1;
  activeClaim = claimSeq;
  claimDeadline = now() + CLAIM_MAX_MS;
  return claimSeq;
}

/** 释放本次接管（token 不是当前活跃接管则忽略，避免误清掉后来者）。 */
export function releaseScrollControl(token: number): void {
  if (activeClaim === token) {
    activeClaim = 0;
    claimDeadline = -Infinity;
  }
}

/** 无条件清除任何残留接管——新一次导航决策开始时调用，避免旧 claim 误让位后续导航。 */
export function clearScrollClaim(): void {
  activeClaim = 0;
  claimDeadline = -Infinity;
}

/** HashScroller 用：本次滚动定位是否正被 ScrollMemory 接管。 */
export function isScrollClaimed(): boolean {
  return activeClaim !== 0 && now() < claimDeadline;
}
