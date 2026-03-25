import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "芯科元析 8D Copilot",
  description: "面向电子质量与失效分析的 AI-native 8D 工作台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
