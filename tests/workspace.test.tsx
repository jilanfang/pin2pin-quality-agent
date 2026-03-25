import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { Workspace } from "@/components/workspace";

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
        role: "user",
        content: "客户反馈上电冒烟，批次 B12。",
        messageType: "evidence",
        createdAt: "2026-03-22T12:00:00.000Z",
      },
      {
        id: "msg-assistant-1",
        role: "assistant",
        content: "已收到新证据，当前继续聚焦 D3。\n目标：先把风险控住，再继续追因。",
        messageType: "assistant_note",
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
    missingFields: [
      { field: "impact", reason: "缺少影响范围", priority: "high" },
    ],
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
    reportCapabilities: {
      text: { allowed: true, reasonCodes: [] },
      formalHtml: { allowed: true, reasonCodes: [] },
      finalReport: { allowed: false, reasonCodes: ["d1_incomplete"] },
      pdf: { allowed: true, reasonCodes: [] },
    },
  };
}

function buildUrgentComplaintWorkflow() {
  const workflow = buildCaseWorkflow();
  return {
    ...workflow,
    currentStage: "D2",
    messages: [
      {
        id: "msg-user-urgent-1",
        role: "user",
        content:
          "客户大麦科技今天早上产线停线，MCU-800 连续 3 片上电爆板冒烟并有火花，要求立即停止发货，并在24小时内回复。",
        messageType: "evidence",
        createdAt: "2026-03-22T12:00:00.000Z",
      },
      {
        id: "msg-assistant-urgent-1",
        role: "assistant",
        content:
          "高优先级异常响应：先把现场止血，再决定怎么写快速响应版。\n我现在怎么看：这已经是客户停线级异常，当前先控住影响范围。\n为什么先问这个：失效位置和围堵状态决定你能不能先交差。\n你只需要补：失效位置、客户现场/已发货/库存/在制品的围堵状态。",
        messageType: "assistant_note",
        createdAt: "2026-03-22T12:00:05.000Z",
      },
    ],
    missingFields: [
      { field: "failure_location", reason: "还缺失效位置，无法判断现场失效链路。", priority: "high" },
      { field: "containment_status", reason: "还缺客户现场和厂内围堵状态，当前不能判断风险窗口。", priority: "high" },
    ],
    guidedThinking: {
      focusArea: "D2",
      thinkingGoal: "先把现场止血，再决定快速响应版怎么写。",
      guidanceText: "当前是客户停线级异常，优先补失效位置与围堵状态，不要抢跑根因结论。",
      suggestedQuestions: [
        "先确认失效位置，以及客户现场、已发货、库存、在制品分别怎么处理。",
      ],
      checkpoints: ["是否已明确失效位置", "是否已覆盖客户现场和厂内围堵"],
      warnings: [],
    },
    knownFacts: [
      { field: "mode", value: "customer_complaint_urgent" },
      { field: "severity", value: "high" },
      { field: "customer", value: "大麦科技" },
      { field: "model", value: "MCU-800" },
      { field: "impact", value: "客户产线停线，要求停止发货并 24h 回复" },
      { field: "containment_customer_site", value: "已封存待检" },
      { field: "containment_shipped", value: "已冻结追查" },
      { field: "containment_stock", value: "已扣留" },
      { field: "containment_wip", value: "暂停投线" },
    ],
    assumptions: [
      { statement: "当前先假设整批风险需围堵，待失效位置和追溯补齐后再收缩边界。", needsValidation: true },
    ],
    riskFlags: ["客户停线级异常，需持续复审。"],
    reportCapabilities: {
      text: { allowed: true, reasonCodes: [] },
      formalHtml: { allowed: false, reasonCodes: ["d2_unconfirmed", "containment_missing"] },
      finalReport: { allowed: false, reasonCodes: ["d1_incomplete", "stages_unconfirmed"] },
      pdf: { allowed: false, reasonCodes: ["d2_unconfirmed", "containment_missing"] },
    },
  };
}

function buildImpactedWorkflow() {
  const workflow = buildUrgentComplaintWorkflow();
  return {
    ...workflow,
    warnings: ["以下阶段受新增证据影响，需复审：D3, D4。", "失效位置已从 C25 调整为 连接器处，建议回看 D3 / D4。"],
    currentStage: "D2",
    stages: workflow.stages.map((stage) =>
      stage.stage === "D3"
        ? {
            ...stage,
            locked: true,
            confirmedContent: "D3 已确认",
            impacted: true,
            impactSummary: "失效位置已从 C25 调整为 连接器处，建议回看 D3 / D4。",
          }
        : stage.stage === "D4"
          ? {
              ...stage,
              locked: true,
              confirmedContent: "D4 已确认",
              impacted: true,
              impactSummary: "失效位置已从 C25 调整为 连接器处，建议回看 D3 / D4。",
            }
          : stage
    ),
  };
}

describe("Workspace", () => {
  it("shows a first-run guide that points users to seed cases or a blank case", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<Workspace />);

    await screen.findByText("先跑通第一单，再继续补证据和出稿。");
    expect(screen.getByText("推荐先加载一个种子案例，3 分钟内看到第一版结果。")).toBeInTheDocument();
    expect(screen.getByText("如果你手头已经有真实异常，也可以直接新建空白案件开始录入。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "从种子案例开始" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新建空白案件" })).toBeInTheDocument();
  });

  it("shows empty-state guidance before a case is selected", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<Workspace />);

    await screen.findByRole("heading", { name: "先跑通第一单" });
    expect(screen.getByText("未开始")).toBeInTheDocument();
    expect(screen.getByText("先创建或载入案件")).toBeInTheDocument();
    expect(screen.queryByText("阶段 D2")).not.toBeInTheDocument();
    expect(screen.getByText("推荐先加载种子案例，3 分钟内看见第一版摘要和报告预览。")).toBeInTheDocument();
    expect(screen.getByText("如果你手头已经有真实异常，也可以直接新建空白案件，先录入客户投诉或测试结论。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "加载演示案件" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "录入真实异常" })).toBeInTheDocument();
  });

  it("starts the create flow from empty-state actions", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<Workspace />);

    await screen.findByRole("button", { name: "加载演示案件" });

    fireEvent.click(screen.getByRole("button", { name: "加载演示案件" }));
    expect(screen.getByText("案件标题")).toBeInTheDocument();
    expect(screen.getByDisplayValue("钽电容反向贴装客诉案例")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "录入真实异常" }));
    expect(screen.getByDisplayValue("空白案件")).toBeInTheDocument();
  });

  it("puts the main task area before the sidebar on mobile", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<Workspace />);

    await screen.findByRole("heading", { name: "先跑通第一单" });

    const styles = container.querySelector("style")?.textContent ?? "";
    expect(styles).toContain("@media (max-width: 960px)");
    expect(styles).toContain(".main-panel {\n            order: 1;");
    expect(styles).toContain(".sidebar {\n            order: 2;");
  });

  it("loads cases and shows the current workflow data", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(
          JSON.stringify([
            {
              id: "case-1",
              title: "钽电容反向贴装客诉",
              status: "open",
              currentStage: "D3",
              mode: "normal",
              d1Status: "partial",
              updatedAt: "2026-03-22T12:00:00.000Z",
            },
          ]),
          { status: 200 }
        );
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(buildCaseWorkflow()), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<Workspace />);

    const caseCardTitle = await screen.findByText("钽电容反向贴装客诉");
    fireEvent.click(caseCardTitle.closest("button") ?? caseCardTitle);
    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    expect(screen.getByText("AI 协作区")).toBeInTheDocument();
    expect(screen.getAllByText(/先把风险控住，再继续追因/).length).toBeGreaterThan(0);
    expect(screen.getByText("批次")).toBeInTheDocument();
    expect(screen.getByText("B12")).toBeInTheDocument();
    const summaryStrip = screen.getByTestId("summary-strip");
    expect(within(summaryStrip).getByText("输出快览")).toBeInTheDocument();
    expect(within(summaryStrip).getByText("快速响应版（可流转）")).toBeInTheDocument();
    expect(within(summaryStrip).getByText("结案前还差")).toBeInTheDocument();
  });

  it("uses a compact codex-like chrome so the conversation stays primary", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(
          JSON.stringify([
            {
              id: "case-1",
              title: "钽电容反向贴装客诉",
              status: "open",
              currentStage: "D3",
              mode: "normal",
              d1Status: "partial",
              updatedAt: "2026-03-22T12:00:00.000Z",
            },
          ]),
          { status: 200 }
        );
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(buildCaseWorkflow()), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<Workspace />);

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    expect(screen.queryByText("案件摘要")).not.toBeInTheDocument();
    expect(screen.queryByText("AI-Native Workflow")).not.toBeInTheDocument();
    expect(screen.getByTestId("summary-strip")).toBeInTheDocument();
    expect(screen.getByTestId("composer-dock")).toBeInTheDocument();
  });

  it("uses mvp positioning copy that frames the product as an incident response copilot", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<Workspace />);

    expect(screen.getByText("芯科元析")).toBeInTheDocument();
    expect(screen.getByText("Pin2Pin 出品的失效分析工作台")).toBeInTheDocument();
    expect(screen.getByText(/把零碎异常整理成可推进、可复审、可交付的分析工作流/)).toBeInTheDocument();
    expect(screen.getByText(/先跑通第一单，再继续补证据和出稿/)).toBeInTheDocument();
    expect(screen.getByText(/先选一个开始方式，我再带着你把第一单跑通/)).toBeInTheDocument();
    expect(screen.queryByText("Pin2Pin / 芯科元析")).not.toBeInTheDocument();
  });

  it("keeps the sidebar lightweight until the user opens case creation", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(
          JSON.stringify([
            {
              id: "case-1",
              title: "钽电容反向贴装客诉",
              status: "open",
              currentStage: "D3",
              mode: "normal",
              d1Status: "partial",
              updatedAt: "2026-03-22T12:00:00.000Z",
            },
          ]),
          { status: 200 }
        );
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(buildCaseWorkflow()), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<Workspace />);

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    expect(screen.queryByText("案件标题")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "新建案件" }));
    expect(screen.getByText("案件标题")).toBeInTheDocument();
  });

  it("keeps report controls collapsed until the user opens the report tooltray", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(
          JSON.stringify([
            {
              id: "case-1",
              title: "钽电容反向贴装客诉",
              status: "open",
              currentStage: "D3",
              mode: "normal",
              d1Status: "partial",
              updatedAt: "2026-03-22T12:00:00.000Z",
            },
          ]),
          { status: 200 }
        );
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(buildCaseWorkflow()), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<Workspace />);

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    expect(screen.queryByText("报告版本")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "打开报告工具" }));
    expect(screen.getByText("报告版本")).toBeInTheDocument();
    expect(screen.getByText("文风")).toBeInTheDocument();
  });

  it("keeps a quick preview action visible even before advanced report tools are expanded", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(
          JSON.stringify([
            {
              id: "case-1",
              title: "钽电容反向贴装客诉",
              status: "open",
              currentStage: "D3",
              mode: "normal",
              d1Status: "partial",
              updatedAt: "2026-03-22T12:00:00.000Z",
            },
          ]),
          { status: 200 }
        );
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(buildCaseWorkflow()), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<Workspace />);

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    expect(screen.getByRole("button", { name: "快速预览报告" })).toBeInTheDocument();
    expect(screen.queryByText("报告版本")).not.toBeInTheDocument();
  });

  it("keeps the stage rail focused on the current task until expanded", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(
          JSON.stringify([
            {
              id: "case-1",
              title: "钽电容反向贴装客诉",
              status: "open",
              currentStage: "D3",
              mode: "normal",
              d1Status: "partial",
              updatedAt: "2026-03-22T12:00:00.000Z",
            },
          ]),
          { status: 200 }
        );
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(buildCaseWorkflow()), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<Workspace />);

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    const stageRail = screen.getByRole("tablist", { name: "阶段轨迹" });

    expect(within(stageRail).queryByRole("button", { name: /D1/ })).not.toBeInTheDocument();
    expect(within(stageRail).getByRole("button", { name: /D3/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "展开全部阶段" }));
    expect(within(stageRail).getByRole("button", { name: /D1/ })).toBeInTheDocument();
    expect(within(stageRail).getByRole("button", { name: /D8/ })).toBeInTheDocument();
  });

  it("shows facts gaps and next question as structured copilot guidance", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(
          JSON.stringify([
            {
              id: "case-1",
              title: "钽电容反向贴装客诉",
              status: "open",
              currentStage: "D3",
              mode: "normal",
              d1Status: "partial",
              updatedAt: "2026-03-22T12:00:00.000Z",
            },
          ]),
          { status: 200 }
        );
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(buildCaseWorkflow()), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<Workspace />);

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    expect(screen.getByText("已知事实")).toBeInTheDocument();
    expect(screen.getByText("当前缺口")).toBeInTheDocument();
    expect(screen.getByText("下一步建议")).toBeInTheDocument();
    expect(screen.getByText("批次：B12")).toBeInTheDocument();
    const gapPanel = screen.getByText("当前缺口").closest("section");
    if (!gapPanel) {
      throw new Error("Expected 当前缺口 panel");
    }
    const nextPanel = screen.getByText("下一步建议").closest("section");
    if (!nextPanel) {
      throw new Error("Expected 下一步建议 panel");
    }
    expect(within(gapPanel).getByText("缺少影响范围")).toBeInTheDocument();
    expect(within(nextPanel).getByText("客户端和库存如何处理？")).toBeInTheDocument();
  });

  it("shows urgent complaint triage summary and quick-response readiness blockers in the workspace", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(
          JSON.stringify([
            {
              id: "case-1",
              title: "钽电容反向贴装客诉",
              status: "open",
              currentStage: "D2",
              mode: "normal",
              d1Status: "partial",
              updatedAt: "2026-03-22T12:00:00.000Z",
            },
          ]),
          { status: 200 }
        );
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(buildUrgentComplaintWorkflow()), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<Workspace />);

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    const summaryStrip = screen.getByTestId("summary-strip");
    expect(within(summaryStrip).getByText("输出快览")).toBeInTheDocument();
    expect(within(summaryStrip).getByText("分析摘要（建议）")).toBeInTheDocument();
    expect(within(summaryStrip).getByText("出稿前还差")).toBeInTheDocument();
    expect(within(summaryStrip).getByText("还差问题描述未确认；围堵状态未具备；失效位置未明确")).toBeInTheDocument();
    expect(within(summaryStrip).getByText("客户")).toBeInTheDocument();
    expect(within(summaryStrip).getByText("大麦科技")).toBeInTheDocument();
    expect(within(summaryStrip).queryByText("案件状态")).not.toBeInTheDocument();
    expect(within(summaryStrip).queryByText("当前阶段")).not.toBeInTheDocument();
    expect(within(summaryStrip).queryByText("D1")).not.toBeInTheDocument();
    expect(within(summaryStrip).queryByText("当前目标")).not.toBeInTheDocument();
    expect(
      screen.getByText("还不能交快速响应版，先确认失效位置，再逐项补齐客户现场、已发货、成品库存、在制品的围堵状态。")
    ).toBeInTheDocument();
    expect(screen.getAllByText(/高优先级异常响应/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/为什么先问这个/).length).toBeGreaterThan(0);
    expect(screen.getByText("客户现场：已封存待检")).toBeInTheDocument();
    expect(screen.getByText("已发货：已冻结追查")).toBeInTheDocument();
  });

  it("surfaces a three-part copilot brief inside the main workspace", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(
          JSON.stringify([
            {
              id: "case-1",
              title: "钽电容反向贴装客诉",
              status: "open",
              currentStage: "D2",
              mode: "normal",
              d1Status: "partial",
              updatedAt: "2026-03-22T12:00:00.000Z",
            },
          ]),
          { status: 200 }
        );
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(buildUrgentComplaintWorkflow()), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<Workspace />);

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    const brief = screen.getByTestId("copilot-brief");

    expect(within(brief).getByText("我现在怎么看")).toBeInTheDocument();
    expect(within(brief).getByText("这是客户停线级异常，当前先控住影响范围。")).toBeInTheDocument();
    expect(within(brief).getByText("为什么先问这个")).toBeInTheDocument();
    expect(within(brief).getByText("失效位置和围堵状态决定你能不能先止血并交出快速响应版。")).toBeInTheDocument();
    expect(within(brief).getByText("你只需要补什么")).toBeInTheDocument();
    expect(
      within(brief).getByText("先确认失效位置，以及客户现场、已发货、库存、在制品分别怎么处理。")
    ).toBeInTheDocument();

    const summaryStrip = screen.getByTestId("summary-strip");
    expect(brief.compareDocumentPosition(summaryStrip) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText("先把现场止血，再决定快速响应版怎么写。")).not.toBeInTheDocument();
    expect(screen.queryByText("当前是客户停线级异常，优先补失效位置与围堵状态，不要抢跑根因结论。")).not.toBeInTheDocument();
  });

  it("shows output guidance and expert review snapshot for urgent complaint cases", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(
          JSON.stringify([
            {
              id: "case-1",
              title: "钽电容反向贴装客诉",
              status: "open",
              currentStage: "D2",
              mode: "normal",
              d1Status: "partial",
              updatedAt: "2026-03-22T12:00:00.000Z",
            },
          ]),
          { status: 200 }
        );
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(buildUrgentComplaintWorkflow()), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<Workspace />);

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    const outputPanel = screen.getByText("当前最适合输出").closest("section");
    if (!outputPanel) {
      throw new Error("Expected 当前最适合输出 panel");
    }
    expect(within(outputPanel).getByText("分析摘要（建议）")).toBeInTheDocument();
    expect(
      screen.getByText("还不能交快速响应版，先确认失效位置，再逐项补齐客户现场、已发货、成品库存、在制品的围堵状态。")
    ).toBeInTheDocument();
    expect(screen.getByText("专家审稿视角")).toBeInTheDocument();
    expect(screen.getByText("事实 4 项")).toBeInTheDocument();
    expect(screen.getByText("假设 1 项")).toBeInTheDocument();
    expect(screen.getByText("风险 1 项")).toBeInTheDocument();
    expect(screen.getByText("原因链待收口")).toBeInTheDocument();
  });

  it("shows full-8D recommendation once the case is closure-ready", async () => {
    const readyWorkflow = {
      ...buildCaseWorkflow(),
      currentStage: "D8",
      d1Status: "complete",
      stages: buildCaseWorkflow().stages.map((stage) =>
        stage.stage === "D1"
          ? { ...stage, locked: true, confirmedContent: "QE、PE、SMT、IQC 已确认。" }
          : { ...stage, locked: true, confirmedContent: `${stage.stage} 已确认`, workingContent: `${stage.stage} 已确认` }
      ),
      reportCapabilities: {
        text: { allowed: true, reasonCodes: [] },
        formalHtml: { allowed: true, reasonCodes: [] },
        finalReport: { allowed: true, reasonCodes: [] },
        pdf: { allowed: true, reasonCodes: [] },
      },
      assumptions: [],
      riskFlags: [],
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(
          JSON.stringify([
            {
              id: "case-1",
              title: "钽电容反向贴装客诉",
              status: "open",
              currentStage: "D8",
              mode: "normal",
              d1Status: "complete",
              updatedAt: "2026-03-22T12:00:00.000Z",
            },
          ]),
          { status: 200 }
        );
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(readyWorkflow), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<Workspace />);

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    const outputPanel = screen.getByText("当前最适合输出").closest("section");
    if (!outputPanel) {
      throw new Error("Expected 当前最适合输出 panel");
    }
    expect(within(outputPanel).getByText("完整 8D（可结案）")).toBeInTheDocument();
    expect(screen.getByText("所有关键阶段已确认，可直接生成完整 8D。")).toBeInTheDocument();
    expect(screen.getByText("原因链已成形")).toBeInTheDocument();
    expect(screen.getByText("措施层次已成形")).toBeInTheDocument();
  });

  it("shows a visible case-rebuild alert when prior judgement is impacted", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(
          JSON.stringify([
            {
              id: "case-1",
              title: "钽电容反向贴装客诉",
              status: "open",
              currentStage: "D2",
              mode: "normal",
              d1Status: "partial",
              updatedAt: "2026-03-22T12:00:00.000Z",
            },
          ]),
          { status: 200 }
        );
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(buildImpactedWorkflow()), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<Workspace />);

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    expect(screen.getByText("案件认知已变化")).toBeInTheDocument();
    const rebuildCard = screen.getByTestId("rebuild-review-card");
    expect(within(rebuildCard).getByText("复审提示")).toBeInTheDocument();
    expect(within(rebuildCard).getByText("变了什么")).toBeInTheDocument();
    expect(
      within(rebuildCard).getByText("失效位置已从 C25 调整为 连接器处，建议回看 D3 / D4。")
    ).toBeInTheDocument();
    expect(within(rebuildCard).getByText("先回看哪一步")).toBeInTheDocument();
    expect(within(rebuildCard).getByText("D3 / D4")).toBeInTheDocument();
    expect(within(rebuildCard).getByText("为什么先回这里")).toBeInTheDocument();
    expect(
      within(rebuildCard).getByText("因为原先围堵边界和原因链判断都建立在旧失效位置上。")
    ).toBeInTheDocument();
    expect(within(rebuildCard).getByText("暂时不稳的结论")).toBeInTheDocument();
    expect(within(rebuildCard).getByText("围堵边界、原因链判断")).toBeInTheDocument();
  });

  it("warns in the report tooltray when the current report still contains impacted sections", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(
          JSON.stringify([
            {
              id: "case-1",
              title: "钽电容反向贴装客诉",
              status: "open",
              currentStage: "D2",
              mode: "normal",
              d1Status: "partial",
              updatedAt: "2026-03-22T12:00:00.000Z",
            },
          ]),
          { status: 200 }
        );
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(buildImpactedWorkflow()), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<Workspace />);

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    fireEvent.click(screen.getByRole("button", { name: "打开报告工具" }));

    expect(screen.getByText("当前报告含待复审章节")).toBeInTheDocument();
    expect(screen.getByText("建议先回看 D3 / D4，再决定是否导出正式稿。")).toBeInTheDocument();
  });

  it("explains export risk by report stage when impacted sections still exist", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(
          JSON.stringify([
            {
              id: "case-1",
              title: "钽电容反向贴装客诉",
              status: "open",
              currentStage: "D2",
              mode: "normal",
              d1Status: "partial",
              updatedAt: "2026-03-22T12:00:00.000Z",
            },
          ]),
          { status: 200 }
        );
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(buildImpactedWorkflow()), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<Workspace />);

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    fireEvent.click(screen.getByRole("button", { name: "打开报告工具" }));

    expect(screen.getByText("当前版本：可预览，但会连同待复审提示一起导出。")).toBeInTheDocument();
    expect(screen.getByText("快速响应版（含待复审）")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("报告版本"), {
      target: { value: "final" },
    });

    expect(screen.getByText("完整 8D：请先完成复审，再进入结案导出。")).toBeInTheDocument();
    expect(screen.getByText("完整 8D（需先复审）")).toBeInTheDocument();
  });

  it("keeps only one highest-value next question visible in the main workspace", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(
          JSON.stringify([
            {
              id: "case-1",
              title: "钽电容反向贴装客诉",
              status: "open",
              currentStage: "D3",
              mode: "normal",
              d1Status: "partial",
              updatedAt: "2026-03-22T12:00:00.000Z",
            },
          ]),
          { status: 200 }
        );
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(buildCaseWorkflow()), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<Workspace />);

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    expect(screen.getAllByText("客户端和库存如何处理？")).toHaveLength(1);
  });

  it("submits evidence through the real API endpoint", async () => {
    const workflow = buildCaseWorkflow();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(
          JSON.stringify([
            {
              id: "case-1",
              title: "钽电容反向贴装客诉",
              status: "open",
              currentStage: "D3",
              mode: "normal",
              d1Status: "partial",
              updatedAt: "2026-03-22T12:00:00.000Z",
            },
          ]),
          { status: 200 }
        );
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(workflow), { status: 200 });
      }
      if (url === "/api/cases/case-1/evidence") {
        expect(init?.method).toBe("POST");
        return new Response(JSON.stringify(workflow), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<Workspace />);

    await screen.findByText("钽电容反向贴装客诉");
    fireEvent.change(screen.getByPlaceholderText(/输入客户投诉/), {
      target: { value: "补充：客户端现场确认为低温偶发。" },
    });
    fireEvent.click(screen.getByText("发送证据"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/cases/case-1/evidence",
        expect.objectContaining({
          method: "POST",
        })
      );
    });
  });

  it("keeps the stage focus card concise instead of dumping confirmed context", async () => {
    const workflow = buildCaseWorkflow();
    const stage = workflow.stages.find((item) => item.stage === "D3");
    if (!stage) {
      throw new Error("Expected D3 stage in fixture");
    }
    stage.workingContent = [
      "D3 临时遏制措施建议",
      "请先隔离库存并暂停出货。",
      "当前补充：客户端已停线并冻结仓库。",
      "已确认上下文：",
      "D2",
      "这里是不该直接铺在卡片上的历史上下文。",
    ].join("\n");

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(
          JSON.stringify([
            {
              id: "case-1",
              title: "钽电容反向贴装客诉",
              status: "open",
              currentStage: "D3",
              mode: "normal",
              d1Status: "partial",
              updatedAt: "2026-03-22T12:00:00.000Z",
            },
          ]),
          { status: 200 }
        );
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(workflow), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<Workspace />);

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    expect(screen.getByText(/客户端已停线并冻结仓库/)).toBeInTheDocument();
    expect(screen.queryByText(/已确认上下文/)).not.toBeInTheDocument();
    expect(screen.queryByText(/这里是不该直接铺在卡片上的历史上下文/)).not.toBeInTheDocument();
  });

  it("renders human-readable capability blockers instead of raw reason codes", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(
          JSON.stringify([
            {
              id: "case-1",
              title: "钽电容反向贴装客诉",
              status: "open",
              currentStage: "D3",
              mode: "normal",
              d1Status: "partial",
              updatedAt: "2026-03-22T12:00:00.000Z",
            },
          ]),
          { status: 200 }
        );
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(buildCaseWorkflow()), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<Workspace />);

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    expect(screen.getByText("结案前还差")).toBeInTheDocument();
    expect(screen.getByText(/待补齐 D1 团队与职责信息/)).toBeInTheDocument();
    expect(screen.queryByText(/d1_incomplete/)).not.toBeInTheDocument();
  });

  it("submits the final close action through the real API endpoint", async () => {
    const openWorkflow = {
      ...buildCaseWorkflow(),
      status: "open",
      d1Status: "complete",
      currentStage: "D8",
      reportCapabilities: {
        text: { allowed: true, reasonCodes: [] },
        formalHtml: { allowed: true, reasonCodes: [] },
        finalReport: { allowed: true, reasonCodes: [] },
        pdf: { allowed: true, reasonCodes: [] },
      },
    };
    const closedWorkflow = {
      ...buildCaseWorkflow(),
      status: "closed",
      d1Status: "complete",
      currentStage: "D8",
      reportCapabilities: {
        text: { allowed: true, reasonCodes: [] },
        formalHtml: { allowed: true, reasonCodes: [] },
        finalReport: { allowed: true, reasonCodes: [] },
        pdf: { allowed: true, reasonCodes: [] },
      },
    };

    const casesQueue = [
      [
        {
          id: "case-1",
          title: "钽电容反向贴装客诉",
          status: "open",
          currentStage: "D8",
          mode: "normal",
          d1Status: "complete",
          updatedAt: "2026-03-22T12:00:00.000Z",
        },
      ],
      [
        {
          id: "case-1",
          title: "钽电容反向贴装客诉",
          status: "closed",
          currentStage: "D8",
          mode: "normal",
          d1Status: "complete",
          updatedAt: "2026-03-22T12:05:00.000Z",
        },
      ],
    ];

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(JSON.stringify(casesQueue.shift() ?? casesQueue[0] ?? []), { status: 200 });
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(openWorkflow), { status: 200 });
      }
      if (url === "/api/cases/case-1/report?reportStage=final&styleMode=professional_neutral") {
        expect(init?.method).toBe("POST");
        return new Response(JSON.stringify(closedWorkflow), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<Workspace />);

    await screen.findByText("钽电容反向贴装客诉");
    fireEvent.click(screen.getByRole("button", { name: "打开报告工具" }));
    fireEvent.change(screen.getByLabelText("报告版本"), {
      target: { value: "final" },
    });
    fireEvent.click(screen.getByText("生成完整 8D 并结案"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/cases/case-1/report?reportStage=final&styleMode=professional_neutral",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    expect(screen.getAllByText("已结案").length).toBeGreaterThan(0);
  });
});
