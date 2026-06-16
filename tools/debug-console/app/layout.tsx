import "./globals.css";
import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono } from "next/font/google";

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

export const metadata: Metadata = {
  title: "Knowledge.Console — KB Debug Workbench",
  description:
    "Editorial terminal for a markdown + Git knowledge base. Inspect agent reasoning, tool calls, and provenance live.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh" className={`${fraunces.variable} ${jbMono.variable}`}>
      <body>
        <div className="grain" aria-hidden />
        <div className="scanlines" aria-hidden />
        {children}
      </body>
    </html>
  );
}
