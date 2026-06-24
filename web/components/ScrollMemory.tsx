"use client";
import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  currentEntryKey,
  forceNewEntryKey,
  ensureEntryKey,
  getSavedScrollByEntry,
  getSavedScrollByUrl,
  saveScroll,
  holdScrollControl,
  releaseScrollControl,
  clearScrollClaim,
} from "@/lib/scroll-memory";

// 主阅读区滚动容器的标记。PageColumns 与 blocks 页的 <main> 都打上它；一个路由
// 同一时刻只有一个，querySelector 取第一个即可。
const SELECTOR = "[data-kb-scroll-main]";

const MAX_FRAMES = 40; // 还原等待布局稳定的兜底帧数（约 650ms）
const STABLE_FRAMES = 3; // scrollHeight 连续这么多帧不变即视为布局稳定
// 还原结束后延后释放接管的时长：HashScroller 在同一布局稳定点才 tryScroll，延后
// 释放确保它读到「已接管」而让位；又尽快让出，避免误伤之后真正的锚点导航。
const RELEASE_DELAY_MS = 150;

function findContainer(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector<HTMLElement>(SELECTOR);
}

function currentHref(): string {
  return window.location.pathname + window.location.search;
}

/**
 * 把容器还原到 top 像素处。
 *
 * 难点：目标页正文（尤其长篇 markdown）可能还在渲染/长高，此刻直接设 scrollTop
 * 会被浏览器夹断到当前 scrollHeight。于是：先立即尽力还原一次（内容已缓存时无
 * 闪动），随后在内容长高的每一帧持续跟随目标，直到 scrollHeight 连续几帧不变
 *（布局稳定）或兜底超时——与 HashScroller 同源思路，独立精简版避免相互耦合。
 *
 * onSettled 在自然结束或被取消时各调用一次（让调用方解除「还原中」抑制）。
 * 返回 canceller：下次决策前调它，打断在途还原。
 */
function restoreWhenStable(
  el: HTMLElement,
  top: number,
  onSettled: () => void,
): () => void {
  let done = false;
  const settle = () => {
    if (done) return;
    done = true;
    onSettled();
  };

  el.scrollTop = top; // 立即尽力还原一次

  let last = -1;
  let stable = 0;
  let frames = 0;
  const tick = () => {
    if (done) return;
    frames += 1;
    if (frames > MAX_FRAMES) {
      el.scrollTop = top; // 布局迟迟不稳：精确还原一次后收手
      settle();
      return;
    }
    const h = el.scrollHeight;
    if (h === last) {
      stable += 1;
      if (stable >= STABLE_FRAMES) {
        el.scrollTop = top; // 布局稳定 → 精确还原
        settle();
        return;
      }
    } else {
      last = h;
      stable = 0;
      el.scrollTop = top; // 仍在长高 → 每帧跟随目标，减少跳动
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  return settle;
}

/**
 * 记忆并还原主阅读区（<main>）的滚动位置。挂在 (shell) 布局里，覆盖
 * /、/page/*、/blocks/* 三个路由；渲染 null，全部逻辑在 effect/事件里（仅客户端）。
 * 其它顶层路由（/health、/graph 等）有各自的 layout，不在覆盖范围内。
 *
 * 编辑态（?mode=edit）下 center 是 CodeMirror，它在自身内部滚动、外层 <main> 因
 * PageEditor 用 h-full/overflow-hidden 而基本不滚动，故不会污染记忆——此结论依赖
 * PageEditor 的布局，改其滚动结构时需复核。
 */
export function ScrollMemory() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const keyRef = useRef<string>(""); // 当前历史条目 key（滚动监听据此保存）
  const lastDecidedKeyRef = useRef<string>(""); // 去重：同一条目只决策一次
  const lastDecidedHashRef = useRef<string>(""); // 上次决策时的 location.hash（识别克隆条目）
  const decidedHrefRef = useRef<string>(""); // 上次决策时的 pathname+search（用于分流）
  const isRestoringRef = useRef(false); // 还原期间抑制回存，防夹断中间态写脏
  const cancelRestoreRef = useRef<(() => void) | null>(null);
  const runDecisionRef = useRef<() => void>(() => {});

  // 导航决策：定位当前历史条目 → 有记忆则还原；否则置顶 / 让位给 hash。
  // 不读 pathname，直接读 history.state 的 key，故任何触发源都能复用。
  // 在每次 render 赋值（读的全是 ref，无闭包陈旧问题），供下面三个监听调用。
  runDecisionRef.current = () => {
    let key = currentEntryKey();
    const hash = window.location.hash;
    // 去重 vs 识别克隆条目：浏览器对原生 location.hash 跳转（如无 clipboard 时点 §N 自锚
    // 走的 `window.location.hash = …` fallback）会**克隆**当前条目的 history.state，连
    // __kbScrollKey 一起复制 → 新条目与原条目共用一个 key。
    //  - key 相同且 hash 也相同 → 真·同条目重复触发 → 去重 return（原行为）。
    //  - key 相同但 hash 变了 → 这是克隆出来的新条目 → 给它重发独立 key，使其有自己的
    //    scrollTop 槽位：避免原条目阅读位置被锚点位置覆盖、且后退回原条目时还原不被误挡。
    if (key === lastDecidedKeyRef.current) {
      if (hash === lastDecidedHashRef.current) return;
      key = forceNewEntryKey();
    }
    const url = currentHref();
    lastDecidedKeyRef.current = key;
    lastDecidedHashRef.current = hash;
    keyRef.current = key;
    decidedHrefRef.current = url;

    cancelRestoreRef.current?.(); // 取消在途还原（会解除 isRestoring）
    cancelRestoreRef.current = null;
    clearScrollClaim(); // 丢掉上一次导航残留的接管，避免误让位本次（尤其全新锚点导航）

    const container = findContainer();
    if (!container) return;

    // 优先级：① 精确 entry-key 命中（后退/前进回到本条目）→ 无条件还原，最贴合浏览器
    // 原生语义，即便带 hash 也还原到离开时的位置；② 否则若本次导航带显式 hash（点引用/
    // 锚点链接）→ 让位给 HashScroller 跳锚点，不被 URL 兜底还原盖掉（显式锚点是明确意图，
    // 优先于"这个页面上次读到哪"）；③ 无 hash 时才用 URL 兜底还原曾读过的页面。
    const byEntry = getSavedScrollByEntry(key);
    const byUrl = window.location.hash ? undefined : getSavedScrollByUrl(url);
    const saved = byEntry ?? byUrl;
    if (saved != null) {
      // 还原阅读位置：接管让 HashScroller 让位（否则它会把页面又拽到锚点，盖掉真实阅读位置）。
      const token = holdScrollControl();
      isRestoringRef.current = true;
      cancelRestoreRef.current = restoreWhenStable(container, saved, () => {
        isRestoringRef.current = false;
        cancelRestoreRef.current = null;
        // 还原结束后延后释放接管（盖过 HashScroller 同布局稳定点的 tryScroll）。
        window.setTimeout(() => releaseScrollControl(token), RELEASE_DELAY_MS);
      });
      return;
    }

    // 全新到达的条目：
    if (window.location.hash) {
      // 有 hash → 交给 HashScroller 定位锚点；此处不存初值，待滚动监听在它实际
      // 滚动后记真实锚点位置（避免存入复用 <main> 节点的陈旧 scrollTop）。
      return;
    }
    // 无 hash → 回到顶部（顺带修掉 <main> 节点复用 + Link scroll=false 造成的
    // 「新页面停在旧滚动位置」），并落初值保证后退回来一定有记录可还原。
    container.scrollTop = 0;
    saveScroll(key, url, 0);
  };

  // 触发源 1：客户端跨 URL 导航（pushState，不触发 popstate）+ 首次挂载。
  // 依赖 searchParams 是「触发器」而非读取值——同 pathname 仅 query 变化
  //（如 ?mode=edit）也是一次新历史条目，需重跑决策；本 effect 不读它的值。
  useEffect(() => {
    runDecisionRef.current();
  }, [pathname, searchParams]);

  // 触发源 2：浏览器前进/后退（popstate）与同页锚点导航（hashchange）。这些不改
  // 变 pathname/searchParams，触发源 1 捕获不到——而知识库点脚注 [n]（#ref-N）属
  // 高频操作，必须让对应条目各自记忆、后退能还原。
  // 只接管「不改变 pathname/search」的导航；跨 URL 的前进/后退交回触发源 1（它在
  // 内容 commit 后运行，时序正确，且 <main> 可能换成另一棵子树的新节点）。
  useEffect(() => {
    const onNav = () => {
      if (currentHref() !== decidedHrefRef.current) return;
      runDecisionRef.current();
    };
    window.addEventListener("popstate", onNav);
    window.addEventListener("hashchange", onNav);
    return () => {
      window.removeEventListener("popstate", onNav);
      window.removeEventListener("hashchange", onNav);
    };
  }, []);

  // 持续保存：在当前 <main> 上挂 rAF 节流的滚动监听，把 scrollTop 记到当前 entry。
  // 依赖 pathname：跨路由 <main> 可能是新 DOM 节点，需要重新查询并重挂监听。
  useEffect(() => {
    const container = findContainer();
    if (!container) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (isRestoringRef.current) return; // 还原中的程序化滚动不回存，防夹断写脏
        const k = keyRef.current;
        if (!k) return;
        ensureEntryKey(k); // 自愈 Next 在 refresh/server action 抹掉的 key
        // 带 hash 时只写精确 entry，不写 URL 兜底表——避免锚点跳转的瞬时位置污染
        // 「该页无 hash 真实阅读位置」（见 saveScroll 注释 / scroll-memory 兜底语义）。
        saveScroll(k, decidedHrefRef.current, container.scrollTop, !window.location.hash);
      });
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [pathname]);

  return null;
}
