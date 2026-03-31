import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

describe("RootLayout", () => {
  beforeEach(() => {
    vi.doMock("@/lib/server/auth", () => ({
      getServerAuthState: async () => ({
        authEnabled: true,
        userId: "user-1",
        isAuthenticated: true,
        username: "alice",
      }),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("provides the sovereign shell as the global app frame", async () => {
    const { default: RootLayout } = await import("@/app/layout");
    const layout = await RootLayout({
      children: <div>layout-child</div>,
    });
    const markup = renderToStaticMarkup(layout);

    expect(markup).toContain('data-testid="sovereign-shell"');
    expect(markup).toContain("Pin2pin Fireline");
    expect(markup).toContain('aria-label="主导航"');
    expect(markup).toContain('aria-label="工具侧栏"');
    expect(markup).toContain("总览");
    expect(markup).toContain("调查");
    expect(markup).toContain("方法问题");
    expect(markup).toContain("layout-child");
    expect(markup).not.toContain("Workspace");
    expect(markup).not.toContain("CASE + CHAT ONLY");
  });
});
