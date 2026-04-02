import React from "react";
import { render, screen } from "@testing-library/react";

function buildCaseSummary(overrides: Partial<Record<string, string>> = {}) {
  return {
    id: "case-1",
    title: "钽电容反向贴装客诉",
    status: "open",
    currentStage: "D3",
    mode: "normal",
    d1Status: "partial",
    updatedAt: "2026-03-22T12:00:00.000Z",
    ...overrides,
  };
}

function buildCaseWorkflow() {
  return {
    caseId: "case-1",
    title: "钽电容反向贴装客诉",
    status: "open",
    currentStage: "D3",
    mode: "normal",
    d1Status: "partial",
    archivedAt: null,
    messages: [
      {
        id: "msg-user-1",
        role: "user" as const,
        content: "客户反馈上电冒烟，批次 B12。",
        messageType: "evidence" as const,
        createdAt: "2026-03-22T12:00:00.000Z",
      },
    ],
    stages: [
      { stage: "D1", workingContent: "", confirmedContent: "", locked: false, impacted: false, impactSummary: null, lastReviewedAt: null },
      { stage: "D2", workingContent: "", confirmedContent: "", locked: false, impacted: false, impactSummary: null, lastReviewedAt: null },
      { stage: "D3", workingContent: "", confirmedContent: "", locked: false, impacted: false, impactSummary: null, lastReviewedAt: null },
      { stage: "D4", workingContent: "", confirmedContent: "", locked: false, impacted: false, impactSummary: null, lastReviewedAt: null },
      { stage: "D5", workingContent: "", confirmedContent: "", locked: false, impacted: false, impactSummary: null, lastReviewedAt: null },
      { stage: "D6", workingContent: "", confirmedContent: "", locked: false, impacted: false, impactSummary: null, lastReviewedAt: null },
      { stage: "D7", workingContent: "", confirmedContent: "", locked: false, impacted: false, impactSummary: null, lastReviewedAt: null },
      { stage: "D8", workingContent: "", confirmedContent: "", locked: false, impacted: false, impactSummary: null, lastReviewedAt: null },
    ],
    warnings: [],
    missingFields: [{ field: "impact", reason: "缺少影响范围", priority: "high" }],
    guidedThinking: {
      focusArea: "D3",
      thinkingGoal: "先把风险控住，再继续追因。",
      guidanceText: "当前重点是隔离、暂停出货、库存筛选和客户端遏制动作。",
      suggestedQuestions: ["客户端和库存如何处理？"],
      checkpoints: ["是否覆盖库存、在制品、已出货"],
      warnings: [],
    },
    knownFacts: [{ field: "batch", value: "B12" }],
    assumptions: [],
    riskFlags: [],
    analysisSummary: {
      title: "分析结论",
      overview: "当前异常与钽电容反向贴装高度相关。",
      confirmedFacts: ["批次 B12 已出现上电冒烟"],
      openQuestions: ["还缺低温条件复现结论"],
      risks: ["未验证前不能把根因写死"],
    },
    actionPlan: {
      title: "行动方案",
      overview: "先围堵风险，再完成失效定位。",
      immediateActions: ["暂停出货"],
      owners: ["QE"],
      verificationChecks: ["确认失效位置"],
    },
    resultReadiness: {
      analysisSummary: true,
      actionPlan: true,
      eightD: false,
    },
    resultRecommendation: {
      kind: "analysis_summary",
      title: "建议先整理分析结论",
      rationale: "当前已具备稳定事实，可以先沉淀分析结论。",
      primaryActionLabel: "整理分析结论",
    },
    conversationMeta: null,
  };
}

describe("investigation routes", () => {
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

  it("renders the investigations index with recent investigations", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/cases") {
          return new Response(JSON.stringify([buildCaseSummary()]), { status: 200 });
        }
        throw new Error(`Unexpected request: ${url}`);
      })
    );

    const { default: InvestigationsPage } = await import("@/app/investigations/page");
    const page = await InvestigationsPage();
    render(page);

    await screen.findByRole("heading", { name: "调查" });
    expect(screen.getByRole("link", { name: /钽电容反向贴装客诉/ })).toHaveAttribute(
      "href",
      "/investigations/case-1"
    );
  });

  it("renders the workspace from the dedicated investigation route", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/cases") {
          return new Response(JSON.stringify([buildCaseSummary()]), { status: 200 });
        }
        if (url === "/api/cases/case-1") {
          return new Response(JSON.stringify(buildCaseWorkflow()), { status: 200 });
        }
        throw new Error(`Unexpected request: ${url}`);
      })
    );

    const { default: InvestigationDetailPage } = await import("@/app/investigations/[caseId]/page");
    const page = await InvestigationDetailPage({
      params: Promise.resolve({ caseId: "case-1" }),
    });
    render(page);

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });
    expect(screen.getByText("调查对话")).toBeInTheDocument();
  });
});
