/**
 * Server-only：从 cookie 读出界面语言。
 *
 * 与主管理台 web/ 共用同一个 cookie 名 `kb_locale`（同域不同端口，cookie 按域共享）——
 * 这正是「跟随系统设置」：在主台切了语言，控制台读到同一个 cookie。
 */
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./i18n";

export const LOCALE_COOKIE = "kb_locale";

export function getServerLocale(): Locale {
  const v = cookies().get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
}
