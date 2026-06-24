import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "塾 座席割り振り",
  description: "スマホ向けの塾座席割り振りプロトタイプ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
