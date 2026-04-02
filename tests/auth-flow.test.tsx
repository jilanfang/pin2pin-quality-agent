import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

describe("auth flow", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("renders the login page when auth is enabled and the user is not authenticated", async () => {
    vi.doMock("@/lib/server/auth", () => ({
      getServerAuthState: async () => ({
        authEnabled: true,
        userId: null,
        isAuthenticated: false,
        username: null,
      }),
    }));

    const { default: LoginPage } = await import("@/app/login/page");
    const page = await LoginPage();
    const markup = renderToStaticMarkup(page);

    expect(markup).toContain("账号登录");
    expect(markup).toContain("用户名");
    expect(markup).not.toContain("没有账号？创建一个");
  });

  it("keeps dev builds isolated from production build artifacts", async () => {
    const packageJson = await readFile(path.resolve(process.cwd(), "package.json"), "utf8");
    const nextConfig = await readFile(path.resolve(process.cwd(), "next.config.ts"), "utf8");

    expect(packageJson).toContain('NEXT_DIST_DIR=.next-dev');
    expect(nextConfig).toContain('distDir: process.env.NEXT_DIST_DIR || ".next"');
  });
});
