"use client";
/**
 * Client 端 i18n：LocaleProvider + useLocale / useT。
 *
 * 切换语言写 cookie `kb_locale` + reload —— 与主管理台共用同名 cookie，
 * 故在控制台切语言也会被主台读到（同域共享），反之亦然。
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
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
    // cookie：1 年；root path 全局生效（与主管理台一致）
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    // 重新加载让 server component（layout / metadata）也拿到新 locale
    window.location.reload();
  }, []);

  const value = useMemo(
    () => ({ locale: initial, setLocale }),
    [initial, setLocale],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
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
