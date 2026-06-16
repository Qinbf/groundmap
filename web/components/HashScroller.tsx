"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

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
    const fresh = document.getElementById(hash);
    if (!fresh) {
      if (debug) console.warn("[HashScroller] element NOT found at scroll time", hash);
      return;
    }
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
