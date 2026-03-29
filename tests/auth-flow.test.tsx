import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

describe("auth flow", () => {
  const previousSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousSupabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  afterEach(() => {
    if (previousSupabaseUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousSupabaseUrl;
    if (previousSupabaseKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = previousSupabaseKey;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("renders the login page when auth is enabled and the user is not authenticated", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "pk_test";

    vi.doMock("@/lib/server/auth", () => ({
      getServerAuthState: async () => ({
        authEnabled: true,
        userId: null,
        isAuthenticated: false,
        email: null,
      }),
    }));

    const { default: LoginPage } = await import("@/app/login/page");
    const page = await LoginPage();
    const markup = renderToStaticMarkup(page);

    expect(markup).toContain("登录后继续处理案件");
    expect(markup).toContain("没有账号？创建一个");
  });
});
