import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

describe("local auth flow", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("renders login and registration entry when registration is available", async () => {
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
        inviteCodes: ["fl26-demo-0001"],
        usernameAllowlist: [],
      }),
    }));

    const { default: LoginPage } = await import("@/app/login/page");
    const page = await LoginPage();
    const markup = renderToStaticMarkup(page);

    expect(markup).toContain("账号登录");
    expect(markup).toContain("用户名");
    expect(markup).toContain("密码");
    expect(markup).toContain("注册");
    expect(markup).not.toContain("需要邀请码");
  });
});
