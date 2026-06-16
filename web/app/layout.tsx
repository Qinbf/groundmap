import type { Metadata } from "next";
import "./globals.css";
import { LocaleProvider, SelfRefsProvider } from "@/lib/i18n-client";
import { PopoverProvider } from "@/lib/popover-context";
import { getServerLocale, getServerShowSelfRefs } from "@/lib/server-locale";

export const metadata: Metadata = {
  title: "GroundMap",
  description: "知识库管理台 / Knowledge Base Console",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = getServerLocale();
  const showSelfRefs = getServerShowSelfRefs();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <LocaleProvider initial={locale}>
          <SelfRefsProvider initial={showSelfRefs}>
            <PopoverProvider>{children}</PopoverProvider>
          </SelfRefsProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
