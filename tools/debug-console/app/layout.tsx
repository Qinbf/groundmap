import "./globals.css";
import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono } from "next/font/google";
import { t } from "@/lib/i18n";
import { getServerLocale } from "@/lib/server-locale";
import { LocaleProvider } from "@/lib/i18n-client";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["opsz", "SOFT"],
});

const jbMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

export function generateMetadata(): Metadata {
  const locale = getServerLocale();
  return {
    title: t("meta.title", locale),
    description: t("meta.description", locale),
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getServerLocale();
  return (
    <html lang={locale} className={`${fraunces.variable} ${jbMono.variable}`}>
      <body>
        <div className="grain" aria-hidden />
        <div className="scanlines" aria-hidden />
        <LocaleProvider initial={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
