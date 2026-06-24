/**
 * scroll-memory 的回归守护——零依赖 node:test。
 *
 * 重点钉死 saveScroll 的 writeUrlFallback 语义：带 hash 的瞬时锚点滚动不得污染
 * 「该页无 hash 真实阅读位置」这一 URL 兜底（否则日后无 hash 重访会错误落到锚点）。
 * 被测函数只读写模块级 Map、不触碰 window，故可在 node 里直接跑。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  saveScroll,
  getSavedScrollByEntry,
  getSavedScrollByUrl,
  currentEntryKey,
  forceNewEntryKey,
} from "./scroll-memory.ts";

test("saveScroll: 默认同时写 entry 与 URL 兜底表", () => {
  saveScroll("e-A", "/page/A", 100);
  assert.equal(getSavedScrollByEntry("e-A"), 100);
  assert.equal(getSavedScrollByUrl("/page/A"), 100);
});

test("saveScroll: writeUrlFallback=false 只写精确 entry，不污染 URL 兜底", () => {
  saveScroll("e-B1", "/page/B", 1000); // 无 hash：记真实阅读位置
  saveScroll("e-B2", "/page/B", 200, false); // 带 hash 的瞬时锚点位置：不写 URL 表
  assert.equal(getSavedScrollByEntry("e-B2"), 200); // 精确 entry 记到
  assert.equal(getSavedScrollByUrl("/page/B"), 1000); // URL 兜底仍是 1000，未被 200 污染
});

test("getSavedScrollByEntry / ByUrl: 未记录返回 undefined", () => {
  assert.equal(getSavedScrollByEntry("nope"), undefined);
  assert.equal(getSavedScrollByUrl("/never"), undefined);
});

test("currentEntryKey 复用已有 key；forceNewEntryKey 破解克隆、强制发新 key", () => {
  // 用 window mock 模拟「浏览器对原生 hash 跳转克隆了 history.state（含 __kbScrollKey）」：
  // 克隆后 currentEntryKey 会读到与原条目相同的 key，forceNewEntryKey 必须发一个不同的新 key
  // 并写回 state，使克隆条目拥有独立记忆槽（修 §N 自锚 fallback 后退还原失效）。
  const g = globalThis as unknown as { window?: unknown };
  const real = g.window;
  // 用持有对象（而非局部变量）存 state：避免 TS 把只在闭包里赋值的局部收窄成 null。
  const hist: { state: Record<string, unknown> | null } = { state: null };
  g.window = {
    history: {
      get state() {
        return hist.state;
      },
      replaceState(s: Record<string, unknown>) {
        hist.state = s;
      },
    },
  };
  try {
    const k1 = currentEntryKey();
    assert.equal(typeof k1, "string");
    assert.equal(hist.state?.__kbScrollKey, k1); // 写回 state
    assert.equal(currentEntryKey(), k1); // 复用（模拟克隆条目共用 key）
    const k2 = forceNewEntryKey();
    assert.notEqual(k2, k1); // 破解克隆：发了不同的新 key
    assert.equal(hist.state?.__kbScrollKey, k2); // 新 key 写回当前条目 state
    assert.equal(currentEntryKey(), k2);
  } finally {
    g.window = real;
  }
});
