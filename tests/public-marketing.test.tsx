import React from "react";
import { render, screen } from "@testing-library/react";

describe("public marketing routes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("renders the Fireline marketing homepage for unauthenticated visitors", async () => {
    vi.doMock("@/lib/server/auth", () => ({
      getServerAuthState: async () => ({
        authEnabled: true,
        userId: null,
        isAuthenticated: false,
        username: null,
      }),
    }));

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("marketing homepage should not load workspace data");
      })
    );

    const { default: Page } = await import("@/app/page");
    const page = await Page();
    render(page);

    expect(
      screen.getByRole("heading", { name: "Fireline 是质量异常闭环方案里的案件工作台。" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("它把客诉、异常响应、8D 和 RCA 的零散信息先整理清楚，找出缺口，帮团队 1 小时形成第一版结论。")
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "看产品结构" })).toHaveAttribute("href", "/product");
    expect(screen.getByRole("link", { name: "已有账号登录" })).toHaveAttribute("href", "/login");
    expect(screen.queryByLabelText("首页异常输入框")).not.toBeInTheDocument();
  });

  it("renders the public product page at /product", async () => {
    const { default: ProductPage } = await import("@/app/product/page");
    const page = await ProductPage();
    render(page);

    expect(
      screen.getByRole("heading", { name: "Pin2pin Fireline 是异常响应与问题闭环工作台。" })
    ).toBeInTheDocument();
    expect(screen.getByText("总览入口")).toBeInTheDocument();
    expect(screen.getByText("调查推进")).toBeInTheDocument();
    expect(screen.getByText("结果产物")).toBeInTheDocument();
    expect(screen.getByText("方法助手")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "返回首页" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "已有账号登录" })).toHaveAttribute("href", "/login");
  });
});
