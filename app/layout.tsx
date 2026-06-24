import type { Metadata } from "next";
import "./globals.css";

const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";
const isUserOrOrgPage = repoName.endsWith(".github.io");
const basePath = process.env.GITHUB_PAGES === "true" && repoName && !isUserOrOrgPage ? `/${repoName}` : "";

export const metadata: Metadata = {
  title: "配置",
  applicationName: "配置",
  description: "スマホ向けの塾座席割り振りプロトタイプ",
  manifest: `${basePath}/manifest.webmanifest`,
  appleWebApp: {
    capable: true,
    title: "配置",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
