import React from "react";
import { render, screen } from "@testing-library/react";

import HomePage from "@/app/page";

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
    messages: [
      {
        id: "msg-user-1",
        role: "user" as const,
        content: "客户反馈上电冒烟，批次 B12。",
        messageType: "evidence" as const,
        createdAt: "2026-03-22T12:00:00.000Z",
      },
      {
        id: "msg-assistant-1",
        role: "assistant" as const,
        content: "已收到新证据，当前继续聚焦 D3。",
        messageType: "assistant_note" as const,
        createdAt: "2026-03-22T12:00:05.000Z",
      },
    ],
    stages: [
      {
        stage: "D1",
        workingContent: "QE、PE、SMT 已加入团队。",
        confirmedContent: "",
        locked: false,
        impacted: false,
        impactSummary: null,
        lastReviewedAt: null,
      },
      {
        stage: "D2",
        workingContent: "D2 问题描述",
        confirmedContent: "D2 已确认",
        locked: true,
        impacted: false,
        impactSummary: null,
        lastReviewedAt: null,
      },
      {
        stage: "D3",
        workingContent: "D3 临时遏制措施建议",
        confirmedContent: "",
        locked: false,
        impacted: false,
        impactSummary: null,
        lastReviewedAt: null,
      },
      {
        stage: "D4",
        workingContent: "",
        confirmedContent: "",
        locked: false,
        impacted: false,
        impactSummary: null,
        lastReviewedAt: null,
      },
      {
        stage: "D5",
        workingContent: "",
        confirmedContent: "",
        locked: false,
        impacted: false,
        impactSummary: null,
        lastReviewedAt: null,
      },
      {
        stage: "D6",
        workingContent: "",
        confirmedContent: "",
        locked: false,
        impacted: false,
        impactSummary: null,
        lastReviewedAt: null,
      },
      {
        stage: "D7",
        workingContent: "",
        confirmedContent: "",
        locked: false,
        impacted: false,
        impactSummary: null,
        lastReviewedAt: null,
      },
      {
        stage: "D8",
        workingContent: "",
        confirmedContent: "",
        locked: false,
        impacted: false,
        impactSummary: null,
        lastReviewedAt: null,
      },
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
    assumptions: [{ statement: "当前先假设客户端库存也需要同步围堵。", needsValidation: true }],
    riskFlags: ["低温偶发需进一步复现确认。"],
    analysisSummary: {
      title: "分析结论",
      overview: "当前异常与钽电容反向贴装高度相关，先按贴装方向异常作为主要分析方向。",
      confirmedFacts: ["批次 B12 已出现上电冒烟", "客户端已反馈现场异常"],
      openQuestions: ["还缺低温条件复现结论", "还缺失效位置显微确认"],
      risks: ["未验证前不能把根因写死"],
    },
    actionPlan: {
      title: "行动方案",
      overview: "先围堵风险，再完成失效定位和根因验证。",
      immediateActions: ["暂停出货", "冻结库存", "客户端隔离筛选"],
      owners: ["QE", "PE"],
      verificationChecks: ["确认失效位置", "补齐低温复现记录"],
    },
    resultReadiness: {
      analysisSummary: true,
      actionPlan: true,
      eightD: false,
    },
    resultRecommendation: {
      kind: "analysis_summary",
      title: "建议先整理分析结论",
      rationale: "当前已具备稳定事实，可以先沉淀分析结论；根因仍待验证，不建议直接生成 8D。",
      primaryActionLabel: "整理分析结论",
      secondaryActionLabel: "继续补信息",
      deferActionLabel: "稍后再说",
    },
  };
}

function stubHomePageFetch() {
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
}

describe("HomePage", () => {
  it("renders the embedded workspace content without owning the global shell", async () => {
    stubHomePageFetch();

    const page = await HomePage();
    render(page);

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    expect(screen.queryByTestId("sovereign-shell")).not.toBeInTheDocument();
    expect(screen.getByText("Fireline Workspace")).toBeInTheDocument();
    expect(screen.getByText("当前建议")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "整理分析结论" })).not.toBeInTheDocument();
  });
});
