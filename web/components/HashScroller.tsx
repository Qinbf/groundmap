"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isScrollClaimed } from "@/lib/scroll-memory";

/**
 * Next.js 客户端导航不会触发浏览器原生的 fragment 滚动——
 * pathname/searchParams 变了，但浏览器认为是同一文档，hash 不会自动定位。
 *
 * 本组件挂在 PageColumns 里，pathname 变化或 hashchange 时主动找 id 元素
 * 并 scrollIntoView。
 *
 * 实现要点：
 * - 用 MutationObserver 等待 id 元素出现（而不是固定 setTimeout 时长）——
 *   长文档 markdown 渲染时间不可预测，固定时长容易踩空
 * - 找到后 scrollIntoView({behavior:'smooth', block:'start'})
 * - 兜底 3 秒后 disconnect observer
 * - hash 可能被浏览器 percent-encode（^ → %5E），用 decodeURIComponent 还原
 */
function decodeHash(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * 把锚点元素归一到「该参考块的起点元素」。
 *
 * convert.py 把「块级锚点」一律追加到块的**最后一行**，于是渲染后 id 落在块的最后一个
 * 子元素上：
 *   - 表格 → 最后一行的某个 `<td>`（经 relocateTableRowAnchors 搬入单元格）
 *   - 多项列表 → 最后一个 `<li>`（整张列表是一个 ^p-N 块、锚点只标在末项）
 *   - 多段引用块 → 最后一个 `<p>`
 *   - 代码块 → `<pre>` 内的 `<code>`（高亮 code 会漏掉 pre 的内边距/边框，看着只高亮一部分）
 * 直接滚到 / 高亮该子元素会停在块的中部 / 末尾或只盖住一部分——用户看到的是「参考段落
 * 最后面的内容」或「只高亮了一部分」。故向上归一到**最外层**的 表格 / 列表 / 引用块 / 代码块，
 * 滚动与高亮都以整块为准。
 *
 * 安全性：单段落（无此类祖先）原样返回；单项列表归一到只含一项的列表、起点≈自身，无副作用；
 * 嵌套列表取最外层（^p-N 块本就是顶层列表）。爬到正文 / 滚动容器边界即停，绝不整页归一。
 */
function resolveBlockTarget(el: HTMLElement): HTMLElement {
  let target: HTMLElement = el;
  for (
    let cur: HTMLElement | null = el;
    cur && !cur.matches?.("[data-kb-scroll-main], main, article, body");
    cur = cur.parentElement
  ) {
    if (cur.matches?.("table, ul, ol, blockquote, pre")) target = cur; // 记最外层命中
  }
  return target;
}

const HIGHLIGHT_CLASS = "kb-hash-highlight"; // 单块：背景 + 外圈
const HIGHLIGHT_REGION_CLASS = "kb-hash-highlight-region"; // 多块连片：仅背景，避免每段都套一圈
const HIGHLIGHT_MS = 2600; // 与 globals.css 的 kb-hash-flash* 动画时长一致
let highlightTimer: number | undefined;
let highlightEls: HTMLElement[] = [];

const HEADING_RE = /^H[1-6]$/;
const SECTION_STOP_RE = /^(H[1-6]|HR)$/; // 标题 / 分隔线 = 不算正文首块

/**
 * 决定「高亮哪些元素」。
 *
 * 标题锚点（^h-N → `<h1..6>`）特殊：它只是一行标题，只高亮 `<h>` 会让用户看到「只高亮了
 * 标题、下面的小字没高亮」。所以把**标题 + 紧随其后的首个正文块**一起高亮——这恰好与悬浮
 * 「章节预览」展示的内容一致（预览也是标题 + firstBlock）。
 *
 * 只接「首块」、不贪整节：一节可能很长（含大表格等），全染既与预览不符、视觉也过重。首块
 * 若是标题 / 分隔线（空节）则只高亮标题本身。其它块（表格/列表/段落/代码块）已由
 * resolveBlockTarget 归一为整块，单元素高亮即可。
 */
function resolveHighlightTargets(el: HTMLElement): HTMLElement[] {
  if (!HEADING_RE.test(el.tagName)) return [el];
  const targets: HTMLElement[] = [el];
  const next = el.nextElementSibling as HTMLElement | null;
  if (next && !SECTION_STOP_RE.test(next.tagName)) targets.push(next); // 仅首块
  return targets;
}

/** 给目标块加一段渐隐高亮，提示用户「就是这一段」。重复点同一锚点也能重新触发。
 *  传入多个元素（标题 + 其正文）时用「仅背景」变体连成一片，不给每段都套外圈。 */
function flashHighlight(els: HTMLElement[]) {
  if (typeof window === "undefined" || els.length === 0) return;
  const cls = els.length > 1 ? HIGHLIGHT_REGION_CLASS : HIGHLIGHT_CLASS;
  // 清掉上一处高亮（如连续点不同引用）
  highlightEls.forEach((e) => {
    e.classList.remove(HIGHLIGHT_CLASS, HIGHLIGHT_REGION_CLASS);
  });
  window.clearTimeout(highlightTimer);
  els.forEach((e) => e.classList.remove(HIGHLIGHT_CLASS, HIGHLIGHT_REGION_CLASS));
  void els[0].offsetWidth; // 强制 reflow → 重启 CSS 动画（重复点同一锚点也能再闪）
  els.forEach((e) => e.classList.add(cls));
  highlightEls = els;
  highlightTimer = window.setTimeout(() => {
    highlightEls.forEach((e) => e.classList.remove(HIGHLIGHT_CLASS, HIGHLIGHT_REGION_CLASS));
    highlightEls = [];
    highlightTimer = undefined;
  }, HIGHLIGHT_MS);
}

/** 找到 element 最近的可滚祖先（overflow-y: auto/scroll）。none 则 fallback 到 window. */
function findScrollableAncestor(el: HTMLElement): HTMLElement | Window {
  let cur: HTMLElement | null = el.parentElement;
  while (cur) {
    const style = window.getComputedStyle(cur);
    const oy = style.overflowY;
    if ((oy === "auto" || oy === "scroll") && cur.scrollHeight > cur.clientHeight) {
      return cur;
    }
    cur = cur.parentElement;
  }
  return window;
}

/**
 * 把 el 滚到其滚动容器的顶部。
 *
 * 不用 el.scrollIntoView：在多层 overflow 嵌套（如 PageColumns 的 main）下，
 * 浏览器对"该让谁滚"判断不稳；显式找最近 scroll ancestor 自己算 offset 最可控。
 */
function scrollElementToTop(el: HTMLElement, topOffset = 12) {
  const scrollable = findScrollableAncestor(el);
  if (scrollable instanceof Window) {
    const top = el.getBoundingClientRect().top + window.scrollY - topOffset;
    window.scrollTo({ top, behavior: "smooth" });
  } else {
    const elRect = el.getBoundingClientRect();
    const containerRect = scrollable.getBoundingClientRect();
    const top = elRect.top - containerRect.top + scrollable.scrollTop - topOffset;
    scrollable.scrollTo({ top, behavior: "smooth" });
  }
}

/**
 * 等待 main 容器的 scrollHeight 稳定（连续 N 帧不变），表示 React 渲染 + layout 完成；
 * 然后回调。避免在元素 *出现* 但页面 *还在长高* 时计算错位置。
 *
 * 兜底：超过 maxFrames 仍未稳定 → 仍调 callback 但通过 onTimeout 通知调用方
 * （让 debug 模式能 warn"layout 未稳定但已尝试滚动"，方便排查异步图片
 * 加载导致的位置漂移）。
 */
function whenLayoutStable(
  probeEl: HTMLElement,
  callback: () => void,
  onTimeout?: () => void,
) {
  const ancestor = findScrollableAncestor(probeEl);
  const measure = () =>
    ancestor instanceof Window
      ? document.documentElement.scrollHeight
      : ancestor.scrollHeight;

  let last = -1;
  let stableFrames = 0;
  let totalFrames = 0;
  const maxFrames = 40; // 约 650ms 兜底

  const tick = () => {
    totalFrames += 1;
    if (totalFrames > maxFrames) {
      onTimeout?.();
      callback();
      return;
    }
    const h = measure();
    if (h === last) {
      stableFrames += 1;
      if (stableFrames >= 3) {
        callback();
        return;
      }
    } else {
      last = h;
      stableFrames = 0;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// 调试开关：把 ?hashdebug=1 加到 URL 上启用
function isDebug(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("hashdebug") === "1";
}

function scrollToHash() {
  if (typeof window === "undefined") return () => {};
  const hash = decodeHash(window.location.hash.slice(1));
  const debug = isDebug();
  if (debug) console.log("[HashScroller] scrollToHash", { hash, location: window.location.href });
  if (!hash) return () => {};

  let cancelled = false;
  const tryScroll = () => {
    if (cancelled) return;
    // 后退/前进还原阅读位置时（ScrollMemory 已接管），让位——否则会把页面又拽到
    // 锚点，盖掉用户离开时的真实滚动位置。所有滚动路径（路由变化 rAF、同页
    // hashchange）都汇到这里，故只在此判一次即可。同页脚注点击属「全新到达」、
    // ScrollMemory 不会 claim，不受影响。
    if (isScrollClaimed()) return;
    const found = document.getElementById(hash);
    if (!found) {
      if (debug) console.warn("[HashScroller] element NOT found at scroll time", hash);
      return;
    }
    // 表格锚点落在单元格上 → 归一到整张 <table>，否则会停在表格中部看不到表头
    const fresh = resolveBlockTarget(found);
    const ancestor = findScrollableAncestor(fresh);
    const elRect = fresh.getBoundingClientRect();
    if (debug) {
      const isWin = ancestor instanceof Window;
      console.log("[HashScroller] scrolling now", {
        hash,
        container: isWin ? "window" : "main",
        containerScrollTop: isWin ? window.scrollY : (ancestor as HTMLElement).scrollTop,
        containerScrollHeight: isWin
          ? document.documentElement.scrollHeight
          : (ancestor as HTMLElement).scrollHeight,
        containerClientHeight: isWin
          ? window.innerHeight
          : (ancestor as HTMLElement).clientHeight,
        elementTop: elRect.top,
        elementText: fresh.textContent?.slice(0, 50),
      });
    }
    scrollElementToTop(fresh);
    // 滚动以块起点为准（标题→标题本身），高亮则可跨多元素（标题 + 其下正文）
    flashHighlight(resolveHighlightTargets(fresh));
  };

  const onTimeout = () => {
    if (debug) {
      console.warn(
        "[HashScroller] layout 未在 ~650ms 内稳定；仍尝试滚动，但位置可能因后续异步内容（图片/dynamic import）漂移",
        { hash },
      );
    }
  };

  // Case A: 元素已在 DOM → 等 layout 稳定再滚（防止后续 mutations 让位置失效）
  const existing = document.getElementById(hash);
  if (existing) {
    whenLayoutStable(existing, tryScroll, onTimeout);
    return () => {
      cancelled = true;
    };
  }

  // Case B: 还没渲染 → MutationObserver 等元素出现，再等 layout 稳定
  let done = false;
  const observer = new MutationObserver(() => {
    if (done) return;
    const el = document.getElementById(hash);
    if (el) {
      done = true;
      observer.disconnect();
      whenLayoutStable(el, tryScroll, onTimeout);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  const timeoutId = window.setTimeout(() => {
    if (!done) {
      done = true;
      observer.disconnect();
    }
  }, 3000);

  return () => {
    cancelled = true;
    done = true;
    observer.disconnect();
    window.clearTimeout(timeoutId);
  };
}

export function HashScroller() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 路由变化（client navigation）后等一帧开始；rAF 比 setTimeout(0) 更接近"渲染后"
    let rafId = 0;
    let cleanup: () => void = () => {};
    rafId = window.requestAnimationFrame(() => {
      cleanup = scrollToHash();
    });

    // 同页 hash 变化（如 popover 内点同页锚点）也要响应
    const onHashChange = () => {
      cleanup();
      cleanup = scrollToHash();
    };
    window.addEventListener("hashchange", onHashChange);

    return () => {
      window.cancelAnimationFrame(rafId);
      cleanup();
      window.removeEventListener("hashchange", onHashChange);
    };
  }, [pathname]);

  return null;
}
