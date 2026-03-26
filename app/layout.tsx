import React from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";

import { SovereignShell } from "@/components/sovereign-shell";

import "./globals.css";

export const metadata: Metadata = {
  title: "Pin2pin Fireline",
  description: "面向异常响应、8D 与客诉闭环的 AI-native 作战工作台",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let hasCasesCookie = false;
  try {
    const cookieStore = await cookies();
    hasCasesCookie = cookieStore.get("fireline-has-cases")?.value === "1";
  } catch {
    hasCasesCookie = false;
  }

  return (
    <html lang="zh-CN">
      <body>
        <SovereignShell activeSection="Workspace" hasCases={hasCasesCookie}>
          {children}
        </SovereignShell>
      </body>
    </html>
  );
}
