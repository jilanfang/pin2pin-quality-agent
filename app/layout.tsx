import React from "react";
import type { Metadata } from "next";

import { SovereignShell } from "@/components/sovereign-shell";

import "./globals.css";

export const metadata: Metadata = {
  title: "Pin2pin Fireline",
  description: "面向异常响应、8D 与客诉闭环的 AI-native 作战工作台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <SovereignShell activeSection="Workspace">{children}</SovereignShell>
      </body>
    </html>
  );
}
