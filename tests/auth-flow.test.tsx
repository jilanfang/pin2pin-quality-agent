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
      getRegisterConfig: () => ({
        allowSelfRegister: true,
        minPasswordLength: 8,
        rateLimitMaxAttempts: 5,
        rateLimitWindowMs: 600000,
        inviteCodes: [],
        usernameAllowlist: [],
      }),
    }));

    const { default: LoginPage } = await import("@/app/login/page");
    const page = await LoginPage();
    const markup = renderToStaticMarkup(page);

    expect(markup).toContain("账号登录");
    expect(markup).toContain("用户名");
    expect(markup).toContain("注册");
    expect(markup).toContain("登录");
  });

  it("keeps dev builds isolated from production build artifacts", async () => {
    const packageJson = await readFile(path.resolve(process.cwd(), "package.json"), "utf8");
    const nextConfig = await readFile(path.resolve(process.cwd(), "next.config.ts"), "utf8");

    expect(packageJson).toContain('NEXT_DIST_DIR=.next-dev');
    expect(nextConfig).toContain('distDir: process.env.NEXT_DIST_DIR || ".next"');
  });
});
