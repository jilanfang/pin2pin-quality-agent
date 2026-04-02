import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

describe("local auth flow", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("renders username/password login without any sign-up entry", async () => {
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
    expect(markup).toContain("密码");
    expect(markup).not.toContain("创建账号");
    expect(markup).not.toContain("没有账号");
  });
});
