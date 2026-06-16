/**
 * Server-only：从 cookie 中读出 UI 偏好(语言 / § 段落引用显示)
 */
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./i18n";

export const LOCALE_COOKIE = "kb_locale";
export const SELF_REFS_COOKIE = "kb_show_self_refs";

export function getServerLocale(): Locale {
  const v = cookies().get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

/** § 段落引用是否显示;默认 false;cookie 为 "1" → true */
export function getServerShowSelfRefs(): boolean {
  const v = cookies().get(SELF_REFS_COOKIE)?.value;
  return v === "1";
}
