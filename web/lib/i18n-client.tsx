"use client";
/**
 * Client 端 i18n + UI 偏好:LocaleProvider + SelfRefsProvider + 对应 hooks
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  t as tCore,
  type Locale,
  type TranslationKey,
} from "./i18n";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
});

const LOCALE_COOKIE = "kb_locale";

export function LocaleProvider({
  initial,
  children,
}: {
  initial: Locale;
  children: ReactNode;
}) {
  const setLocale = useCallback((l: Locale) => {
    // cookie：1 年；root path 全局生效
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    // 重新加载让 server component 也拿到新 locale
    window.location.reload();
  }, []);

  const value = useMemo(() => ({ locale: initial, setLocale }), [initial, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}

export function useT() {
  const { locale } = useLocale();
  return useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) =>
      tCore(key, locale, vars),
    [locale],
  );
}

// ============================================================
// § 段落引用显示开关
// ------------------------------------------------------------
// 控制范围:正文 AnchorSup 的 §N 上标 + References 区"段落引用 (§)"子节。
// **不影响** [N] 跨文档引用。
// 持久化:cookie kb_show_self_refs(true|false),默认 true。
// 即时切换:cookie + setState,不 reload(渲染都在 client component)。
// ============================================================

const SELF_REFS_COOKIE = "kb_show_self_refs";

interface SelfRefsContextValue {
  show: boolean;
  setShow: (v: boolean) => void;
}

const SelfRefsContext = createContext<SelfRefsContextValue>({
  show: false,
  setShow: () => {},
});

export function SelfRefsProvider({
  initial,
  children,
}: {
  initial: boolean;
  children: ReactNode;
}) {
  const [show, setShowState] = useState(initial);
  const setShow = useCallback((v: boolean) => {
    document.cookie = `${SELF_REFS_COOKIE}=${v ? "1" : "0"}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    setShowState(v);
  }, []);
  const value = useMemo(() => ({ show, setShow }), [show, setShow]);
  return <SelfRefsContext.Provider value={value}>{children}</SelfRefsContext.Provider>;
}

export function useSelfRefs(): SelfRefsContextValue {
  return useContext(SelfRefsContext);
}

// 客户端只透出 TranslationKey 类型；TRANSLATIONS 不再 export——避免整张表（~22KB）
// 被 bundler 拉进每个 client component 的 chunk。需要翻译的客户端走 useT() 即可。
export type { TranslationKey };
