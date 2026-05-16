import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

function stubHomePageFetch(hasItems = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/overview") {
        return new Response(
          JSON.stringify({
            stats: {
              activeInvestigations: hasItems ? 2 : 0,
              pendingEvidence: hasItems ? 3 : 0,
              readyArtifacts: hasItems ? 1 : 0,
            },
            recentInvestigations: hasItems
              ? [
                  {
                    id: "case-1",
                    title: "钽电容反向贴装客诉",
                    stageLabel: "D3 临时遏制",
                    statusLabel: "进行中",
                    updatedAtLabel: "03/22 12:00",
                    href: "/investigations/case-1",
                  },
                ]
              : [],
            artifactHighlights: hasItems
              ? [
                  {
                    caseId: "case-1",
                    caseTitle: "钽电容反向贴装客诉",
                    artifactKind: "analysis_summary",
                    artifactLabel: "24h 初版 8D / 快速响应版",
                    href: "/investigations/case-1?preview=analysis_summary",
                  },
                ]
              : [],
          }),
          { status: 200 }
        );
      }
      throw new Error(`Unexpected request: ${url}`);
    })
  );
}

describe("HomePage", () => {
  let locationAssign: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    locationAssign = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...window.location,
        assign: locationAssign,
      },
    });

    vi.mock("@/lib/server/auth", () => ({
      getServerAuthState: async () => ({
        authEnabled: true,
        userId: "user-1",
        isAuthenticated: true,
        username: "alice",
      }),
    }));
  });

  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("renders the overview entrypoint instead of the investigation workspace", async () => {
    stubHomePageFetch(true);

    const { default: Page } = await import("@/app/workspace/page");
    const page = await Page();
    render(page);

    await screen.findByRole("heading", { name: "把客户投诉或异常情况贴进来" });

    expect(screen.getByLabelText("首页异常输入框")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "开始分析" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "继续最近调查" })).toHaveAttribute(
      "href",
      "/investigations/case-1"
    );
    expect(screen.getByText("直接贴原始材料，我先起调查。")).toBeInTheDocument();
    expect(screen.getByText("最近调查")).toBeInTheDocument();
    expect(screen.getByText("方法问题")).toBeInTheDocument();
    expect(screen.getByText("24h 初版 8D / 快速响应版")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "开始快速响应" })).not.toBeInTheDocument();
    expect(screen.queryByText("Fireline Workspace")).not.toBeInTheDocument();
  });

  it("renders an empty overview state when no investigations exist yet", async () => {
    stubHomePageFetch(false);

    const { default: Page } = await import("@/app/workspace/page");
    const page = await Page();
    render(page);

    await screen.findByRole("heading", { name: "把客户投诉或异常情况贴进来" });

    expect(screen.getByText("还没有调查，先贴第一段情况。")).toBeInTheDocument();
    expect(screen.queryByText("钽电容反向贴装客诉")).not.toBeInTheDocument();
    expect(screen.queryByText("24h 初版 8D / 快速响应版")).not.toBeInTheDocument();
  });

  it("creates a case from the hero input, sends the first evidence, and navigates to the investigation", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === "/api/overview") {
          return new Response(
            JSON.stringify({
              stats: {
                activeInvestigations: 1,
                pendingEvidence: 2,
                readyArtifacts: 0,
              },
              recentInvestigations: [
                {
                  id: "case-1",
                  title: "旧案件",
                  stageLabel: "D2 问题定义",
                  statusLabel: "进行中",
                  updatedAtLabel: "03/31 10:00",
                  href: "/investigations/case-1",
                },
              ],
              artifactHighlights: [],
            }),
            { status: 200 }
          );
        }
        if (url === "/api/cases" && init?.method === "POST") {
          return new Response(
            JSON.stringify({
              id: "case-hero-1",
              title: "华星科技冒烟客诉",
            }),
            { status: 200 }
          );
        }
        if (url === "/api/cases/case-hero-1/evidence" && init?.method === "POST") {
          return new Response(
            JSON.stringify({
              caseId: "case-hero-1",
              messages: [
                {
                  id: "msg-1",
                  role: "user",
                  content: "客户华星科技邮件反馈：昨日上线后出现 3 台板卡上电冒烟，涉及 MCU-800 批次 B19。",
                  createdAt: "2026-03-31T10:00:00.000Z",
                },
              ],
            }),
            { status: 200 }
          );
        }
        throw new Error(`Unexpected request: ${url}`);
      });
    vi.stubGlobal("fetch", fetchMock);

    const { default: Page } = await import("@/app/workspace/page");
    const page = await Page();
    render(page);

    await screen.findByRole("heading", { name: "把客户投诉或异常情况贴进来" });

    fireEvent.change(screen.getByLabelText("首页异常输入框"), {
      target: {
        value: "客户华星科技邮件反馈：昨日上线后出现 3 台板卡上电冒烟，涉及 MCU-800 批次 B19。",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "开始分析" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/cases",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/cases/case-hero-1/evidence",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    expect(locationAssign).toHaveBeenCalledWith("/investigations/case-hero-1");
  });

  it("keeps input and shows a recovery action when case creation succeeds but first evidence fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === "/api/overview") {
          return new Response(
            JSON.stringify({
              stats: {
                activeInvestigations: 0,
                pendingEvidence: 0,
                readyArtifacts: 0,
              },
              recentInvestigations: [],
              artifactHighlights: [],
            }),
            { status: 200 }
          );
        }
        if (url === "/api/cases" && init?.method === "POST") {
          return new Response(
            JSON.stringify({
              id: "case-hero-2",
              title: "新调查",
            }),
            { status: 200 }
          );
        }
        if (url === "/api/cases/case-hero-2/evidence" && init?.method === "POST") {
          return new Response(
            JSON.stringify({
              error: "首条材料暂时没有处理成功，请继续进入调查补充。",
            }),
            { status: 503 }
          );
        }
        throw new Error(`Unexpected request: ${url}`);
      })
    );

    const { default: Page } = await import("@/app/workspace/page");
    const page = await Page();
    render(page);

    await screen.findByRole("heading", { name: "把客户投诉或异常情况贴进来" });

    fireEvent.change(screen.getByLabelText("首页异常输入框"), {
      target: {
        value: "客户现场反馈异常，先帮我起一条调查。",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "开始分析" }));

    expect(await screen.findByText("首条材料暂时没有处理成功，请继续进入调查补充。")).toBeInTheDocument();
    expect(screen.getByLabelText("首页异常输入框")).toHaveValue("客户现场反馈异常，先帮我起一条调查。");
    expect(screen.getByRole("link", { name: "进入已建调查继续处理" })).toHaveAttribute(
      "href",
      "/investigations/case-hero-2"
    );
    expect(locationAssign).not.toHaveBeenCalled();
  });

  it("shows an inline error and keeps input when case creation fails before any case is created", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === "/api/overview") {
          return new Response(
            JSON.stringify({
              stats: {
                activeInvestigations: 0,
                pendingEvidence: 0,
                readyArtifacts: 0,
              },
              recentInvestigations: [],
              artifactHighlights: [],
            }),
            { status: 200 }
          );
        }
        if (url === "/api/cases" && init?.method === "POST") {
          return new Response(
            JSON.stringify({
              error: "创建调查失败，请稍后重试。",
            }),
            { status: 503 }
          );
        }
        throw new Error(`Unexpected request: ${url}`);
      })
    );

    const { default: Page } = await import("@/app/workspace/page");
    const page = await Page();
    render(page);

    await screen.findByRole("heading", { name: "把客户投诉或异常情况贴进来" });

    fireEvent.change(screen.getByLabelText("首页异常输入框"), {
      target: {
        value: "客户现场反馈异常，先帮我起一条调查。",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "开始分析" }));

    expect(await screen.findByText("创建调查失败，请稍后重试。")).toBeInTheDocument();
    expect(screen.getByLabelText("首页异常输入框")).toHaveValue("客户现场反馈异常，先帮我起一条调查。");
    expect(screen.queryByRole("link", { name: "进入已建调查继续处理" })).not.toBeInTheDocument();
    expect(locationAssign).not.toHaveBeenCalled();
  });

  it("submits the hero flow only once when the primary action is double-clicked", async () => {
    let resolveCreate: ((value: { caseSummary: { id: string; title: string } }) => void) | null = null;
    const createInvestigationFromInput = vi.fn(
      () =>
        new Promise<{ caseSummary: { id: string; title: string } }>((resolve) => {
          resolveCreate = resolve;
        })
    );

    vi.doMock("@/lib/client/investigation-entry", () => ({
      InvestigationEntryError: class InvestigationEntryError extends Error {},
      createInvestigationFromInput,
    }));

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/overview") {
          return new Response(
            JSON.stringify({
              stats: {
                activeInvestigations: 0,
                pendingEvidence: 0,
                readyArtifacts: 0,
              },
              recentInvestigations: [],
              artifactHighlights: [],
            }),
            { status: 200 }
          );
        }
        throw new Error(`Unexpected request: ${url}`);
      })
    );

    const { default: Page } = await import("@/app/workspace/page");
    const page = await Page();
    render(page);

    await screen.findByRole("heading", { name: "把客户投诉或异常情况贴进来" });

    fireEvent.change(screen.getByLabelText("首页异常输入框"), {
      target: {
        value: "客户投诉双击提交并发保护验证。",
      },
    });

    const button = screen.getByRole("button", { name: "开始分析" });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(createInvestigationFromInput).toHaveBeenCalledTimes(1);

    expect(resolveCreate).toBeTypeOf("function");
    resolveCreate!({
      caseSummary: {
        id: "case-hero-once",
        title: "并发保护验证",
      },
    });

    await waitFor(() => {
      expect(locationAssign).toHaveBeenCalledWith("/investigations/case-hero-once");
    });
  });
});
