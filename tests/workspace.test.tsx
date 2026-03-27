import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { Workspace } from "@/components/workspace";

function buildCaseSummary(
  overrides: Partial<{
    id: string;
    title: string;
    status: string;
    currentStage: string;
    mode: string;
    d1Status: string;
    updatedAt: string;
    archivedAt: string | null;
  }> = {}
) {
  return {
    id: "case-1",
    title: "钽电容反向贴装客诉",
    status: "open",
    currentStage: "D3",
    mode: "normal",
    d1Status: "partial",
    updatedAt: "2026-03-22T12:00:00.000Z",
    archivedAt: null,
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
      {
        id: "msg-assistant-1",
        role: "assistant" as const,
        content: "已收到新证据，当前继续聚焦 D3。\n目标：先把风险控住，再继续追因。",
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

function buildUrgentComplaintWorkflow() {
  const workflow = buildCaseWorkflow();
  return {
    ...workflow,
    currentStage: "D2",
    messages: [
      {
        id: "msg-user-urgent-1",
        role: "user" as const,
        content:
          "客户大麦科技今天早上产线停线，MCU-800 连续 3 片上电爆板冒烟并有火花，要求立即停止发货，并在24小时内回复。",
        messageType: "evidence" as const,
        createdAt: "2026-03-22T12:00:00.000Z",
      },
      {
        id: "msg-assistant-urgent-1",
        role: "assistant" as const,
        content:
          "高优先级异常响应：先把现场止血，再决定怎么写快速响应版。\n我现在怎么看：这已经是客户停线级异常，当前先控住影响范围。\n为什么先问这个：失效位置和围堵状态决定你能不能先交差。\n你只需要补：失效位置、客户现场/已发货/库存/在制品的围堵状态。",
        messageType: "assistant_note" as const,
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
      suggestedQuestions: ["先确认失效位置，以及客户现场、已发货、库存、在制品分别怎么处理。"],
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
    analysisSummary: {
      title: "分析结论",
      overview: "当前已确认客户停线级异常，先围堵影响范围，再继续确认失效位置。",
      confirmedFacts: ["客户产线已停线", "已要求停止发货"],
      openQuestions: ["还缺失效位置", "还缺完整围堵状态"],
      risks: ["24 小时内只能给出保守版结论"],
    },
    actionPlan: null,
    resultReadiness: {
      analysisSummary: true,
      actionPlan: false,
      eightD: false,
    },
    resultRecommendation: {
      kind: "analysis_summary",
      title: "建议先整理分析结论",
      rationale: "当前更适合先把已确认事实和风险窗口整理出来，不要抢跑 8D。",
      primaryActionLabel: "整理分析结论",
      secondaryActionLabel: "继续补信息",
      deferActionLabel: "稍后再说",
    },
  };
}

function buildImpactedWorkflow() {
  const workflow = buildUrgentComplaintWorkflow();
  return {
    ...workflow,
    warnings: ["失效位置已从 C25 调整为连接器处，这条信息会影响 D3 / D4，需要回看。"],
    currentStage: "D2",
    stages: workflow.stages.map((stage) =>
      stage.stage === "D3"
        ? {
            ...stage,
            locked: true,
            confirmedContent: "D3 已确认",
            impacted: true,
            impactSummary: "失效位置已从 C25 调整为连接器处，这条信息会影响 D3 / D4，需要回看。",
          }
        : stage.stage === "D4"
          ? {
              ...stage,
              locked: true,
              confirmedContent: "D4 已确认",
              impacted: true,
              impactSummary: "失效位置已从 C25 调整为连接器处，这条信息会影响 D3 / D4，需要回看。",
            }
          : stage
    ),
  };
}

function buildPreview() {
  return {
    document: {
      artifactKind: "analysis_summary",
      title: "分析结论",
      caseStatus: "open",
    },
    text: "分析结论文本预览",
    html: "<html><body><h1>分析结论预览</h1></body></html>",
    warnings: [],
  };
}

function stubFetch(handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  const fetchMock = vi.fn(handler);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function workspaceWithSingleCase(handler?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  const workflow = buildCaseWorkflow();
  const fetchMock = stubFetch(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === "/api/cases") {
      return new Response(JSON.stringify([buildCaseSummary()]), { status: 200 });
    }
    if (url === "/api/cases/case-1") {
      return new Response(JSON.stringify(workflow), { status: 200 });
    }
    if (handler) {
      return handler(input, init);
    }
    throw new Error(`Unexpected request: ${url}`);
  });

  render(<Workspace />);
  return { fetchMock, workflow };
}

describe("Workspace", () => {
  it("shows a first-run guide that keeps the conversation area primary", async () => {
    stubFetch(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<Workspace />);

    await screen.findByText("先跑通第一单，再继续补证据和出稿。");
    expect(screen.getByText(/推荐先加载一个种子案例，3 分钟内看到第一版结果/)).toBeInTheDocument();
    expect(screen.getAllByText("先按开始第一单，我会直接带你进入分析。").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "开始第一单" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "直接新建空白案件" })).toBeInTheDocument();
    expect(screen.getByTestId("composer-dock")).toBeInTheDocument();
    expect(screen.getByLabelText("证据输入框")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "快速新建案件" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "反馈" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "打开报告面板" })).not.toBeInTheDocument();
  });

  it("lets the user send the first evidence directly from the empty state by creating a blank case first", async () => {
    const blankSummary = buildCaseSummary({
      id: "case-2",
      title: "新的 8D 案件",
      currentStage: "D2",
      d1Status: "not_started",
      updatedAt: "2026-03-23T10:00:00.000Z",
    });
    const blankWorkflow = {
      ...buildCaseWorkflow(),
      caseId: "case-2",
      title: "新的 8D 案件",
      currentStage: "D2",
      d1Status: "not_started",
      messages: [],
      knownFacts: [],
      assumptions: [],
      riskFlags: [],
    };
    const afterEvidenceWorkflow = {
      ...blankWorkflow,
      messages: [
        {
          id: "msg-user-1",
          role: "user" as const,
          content: "客户现场发现上电冒烟，批次 B19，已暂停出货。",
          messageType: "evidence" as const,
          createdAt: "2026-03-23T10:05:00.000Z",
        },
      ],
      knownFacts: [{ field: "batch", value: "B19" }],
    };

    const fetchMock = stubFetch(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/cases" && !init?.method) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      if (url === "/api/cases" && init?.method === "POST") {
        return new Response(JSON.stringify(blankSummary), { status: 200 });
      }
      if (url === "/api/cases/case-2" && !init?.method) {
        return new Response(JSON.stringify(blankWorkflow), { status: 200 });
      }
      if (url === "/api/cases/case-2/evidence") {
        return new Response(JSON.stringify(afterEvidenceWorkflow), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<Workspace />);

    await screen.findByRole("button", { name: "发送证据" });
    fireEvent.change(screen.getByLabelText("证据输入框"), {
      target: { value: "客户现场发现上电冒烟，批次 B19，已暂停出货。" },
    });
    fireEvent.click(screen.getByRole("button", { name: "发送证据" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/cases",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            title: "新的 8D 案件",
            seedCase: undefined,
          }),
        })
      );
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/cases/case-2/evidence",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    await screen.findByRole("heading", { name: "新的 8D 案件" });
    expect(screen.getByText("ACTIVE CASE #CASE-2")).toBeInTheDocument();
  });

  it("keeps the shell chrome minimal even after cases exist", async () => {
    workspaceWithSingleCase();

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    expect(screen.queryByRole("button", { name: "快速新建案件" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "反馈" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "打开报告面板" })).not.toBeInTheDocument();
  });

  it("creates and opens a seed case immediately from the primary first-run action", async () => {
    const seedSummary = buildCaseSummary({ title: "钽电容反向贴装客诉案例" });
    const seedWorkflow = {
      ...buildCaseWorkflow(),
      title: "钽电容反向贴装客诉案例",
    };
    const fetchMock = stubFetch(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/cases" && !init?.method) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      if (url === "/api/cases" && init?.method === "POST") {
        return new Response(JSON.stringify(seedSummary), { status: 200 });
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(seedWorkflow), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<Workspace />);

    await screen.findByRole("button", { name: "开始第一单" });
    fireEvent.click(screen.getByRole("button", { name: "开始第一单" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/cases",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            title: "钽电容反向贴装客诉案例",
            seedCase: "tantalum_reverse_polarity",
          }),
        })
      );
    });

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉案例" });
    expect(screen.queryByLabelText("案件抽屉")).not.toBeInTheDocument();
  });

  it("creates a blank case from the drawer and switches the workspace context to the new case", async () => {
    const casesQueue = [
      [buildCaseSummary()],
      [
        buildCaseSummary({
          id: "case-2",
          title: "新的空白案件",
          currentStage: "D2",
          d1Status: "not_started",
          updatedAt: "2026-03-23T10:00:00.000Z",
        }),
        buildCaseSummary(),
      ],
    ];

    const blankWorkflow = {
      ...buildCaseWorkflow(),
      caseId: "case-2",
      title: "新的空白案件",
      currentStage: "D2",
      d1Status: "not_started",
      messages: [],
      knownFacts: [],
      assumptions: [],
      riskFlags: [],
    };

    const fetchMock = stubFetch(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/cases" && !init?.method) {
        return new Response(JSON.stringify(casesQueue.shift() ?? casesQueue.at(-1) ?? []), { status: 200 });
      }
      if (url === "/api/cases" && init?.method === "POST") {
        return new Response(
          JSON.stringify(
            buildCaseSummary({
              id: "case-2",
              title: "新的空白案件",
              currentStage: "D2",
              d1Status: "not_started",
              updatedAt: "2026-03-23T10:00:00.000Z",
            })
          ),
          { status: 200 }
        );
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(buildCaseWorkflow()), { status: 200 });
      }
      if (url === "/api/cases/case-2") {
        return new Response(JSON.stringify(blankWorkflow), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<Workspace />);

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    act(() => {
      window.dispatchEvent(new CustomEvent("fireline:toggle-case-drawer"));
    });

    const drawer = await screen.findByLabelText("案件抽屉");
    fireEvent.click(within(drawer).getByRole("button", { name: "新建案件" }));
    fireEvent.change(within(drawer).getByLabelText("案件标题"), {
      target: { value: "新的空白案件" },
    });
    fireEvent.click(within(drawer).getByRole("button", { name: "创建案件" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/cases",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            title: "新的空白案件",
            seedCase: undefined,
          }),
        })
      );
    });

    await screen.findByRole("heading", { name: "新的空白案件" });
    expect(screen.getByText("ACTIVE CASE #CASE-2")).toBeInTheDocument();
    expect(screen.queryByLabelText("案件抽屉")).not.toBeInTheDocument();
  });

  it("uses a conversation-first chrome and removes the old summary strip and top report toolbar", async () => {
    workspaceWithSingleCase();

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    expect(screen.getByText("AI 协作区")).toBeInTheDocument();
    expect(screen.queryByTestId("summary-strip")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "打开报告工具" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "快速预览报告" })).not.toBeInTheDocument();
    expect(screen.getByTestId("result-recommendation-card")).toBeInTheDocument();
  });

  it("keeps the case list in a drawer instead of a permanently expanded sidebar", async () => {
    workspaceWithSingleCase();

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    expect(screen.queryByLabelText("案件抽屉")).not.toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new CustomEvent("fireline:toggle-case-drawer"));
    });
    await screen.findByLabelText("案件抽屉");
    expect(screen.getByText("新建案件")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "收起案件抽屉" }));
    expect(screen.queryByLabelText("案件抽屉")).not.toBeInTheDocument();
  });

  it("filters visible cases in the drawer with a single search-first flow", async () => {
    stubFetch(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(
          JSON.stringify([
            buildCaseSummary(),
            buildCaseSummary({
              id: "case-2",
              title: "连接器虚焊异常",
              updatedAt: "2026-03-22T13:00:00.000Z",
            }),
            buildCaseSummary({
              id: "case-3",
              title: "已归档旧案件",
              archivedAt: "2026-03-20T09:00:00.000Z",
              updatedAt: "2026-03-20T09:00:00.000Z",
            }),
          ]),
          { status: 200 }
        );
      }
      if (url === "/api/cases/case-2") {
        return new Response(
          JSON.stringify({
            ...buildCaseWorkflow(),
            caseId: "case-2",
            title: "连接器虚焊异常",
          }),
          { status: 200 }
        );
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(buildCaseWorkflow()), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<Workspace />);

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    act(() => {
      window.dispatchEvent(new CustomEvent("fireline:toggle-case-drawer"));
    });

    const drawer = await screen.findByLabelText("案件抽屉");
    const search = within(drawer).getByLabelText("搜索案件");
    expect(within(drawer).getByText("连接器虚焊异常")).toBeInTheDocument();
    expect(
      within(drawer).getByRole("button", { name: /钽电容反向贴装客诉.*D3/i })
    ).toBeInTheDocument();

    fireEvent.change(search, { target: { value: "连接器" } });
    expect(within(drawer).getByText("连接器虚焊异常")).toBeInTheDocument();
    expect(
      within(drawer).queryByRole("button", { name: /钽电容反向贴装客诉.*D3/i })
    ).not.toBeInTheDocument();
  });

  it("closes the drawer after switching to another case from the list", async () => {
    stubFetch(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(
          JSON.stringify([
            buildCaseSummary(),
            buildCaseSummary({
              id: "case-2",
              title: "连接器虚焊异常",
              currentStage: "D2",
              updatedAt: "2026-03-22T13:00:00.000Z",
            }),
          ]),
          { status: 200 }
        );
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(buildCaseWorkflow()), { status: 200 });
      }
      if (url === "/api/cases/case-2") {
        return new Response(
          JSON.stringify({
            ...buildCaseWorkflow(),
            caseId: "case-2",
            title: "连接器虚焊异常",
            currentStage: "D2",
          }),
          { status: 200 }
        );
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<Workspace />);

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    act(() => {
      window.dispatchEvent(new CustomEvent("fireline:toggle-case-drawer"));
    });

    const drawer = await screen.findByLabelText("案件抽屉");
    fireEvent.click(within(drawer).getByRole("button", { name: /连接器虚焊异常.*D2/i }));

    await screen.findByRole("heading", { name: "连接器虚焊异常" });
    expect(screen.queryByLabelText("案件抽屉")).not.toBeInTheDocument();
  });

  it("clears an open preview drawer when creating a new case from the drawer", async () => {
    const preview = buildPreview();
    const originalSummary = buildCaseSummary();
    const blankSummary = buildCaseSummary({
      id: "case-2",
      title: "新的空白案件",
      currentStage: "D2",
      d1Status: "not_started",
      updatedAt: "2026-03-23T10:00:00.000Z",
    });
    const blankWorkflow = {
      ...buildCaseWorkflow(),
      caseId: "case-2",
      title: "新的空白案件",
      currentStage: "D2",
      d1Status: "not_started",
      messages: [],
      knownFacts: [],
      assumptions: [],
      riskFlags: [],
      resultReadiness: {
        analysisSummary: false,
        actionPlan: false,
        eightD: false,
      },
      resultRecommendation: {
        kind: "analysis_summary" as const,
        title: "先继续补关键信息",
        rationale: "当前还没有稳定事实，先补现象、时间、批次和影响范围，再整理分析结论。",
        primaryActionLabel: "继续补信息",
        secondaryActionLabel: "稍后整理",
      },
    };

    const fetchMock = stubFetch(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/cases" && !init?.method) {
        return new Response(JSON.stringify([originalSummary]), { status: 200 });
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(buildCaseWorkflow()), { status: 200 });
      }
      if (url === "/api/cases/case-1/report-preview?artifact=analysis_summary") {
        return new Response(JSON.stringify(preview), { status: 200 });
      }
      if (url === "/api/cases" && init?.method === "POST") {
        return new Response(JSON.stringify(blankSummary), { status: 200 });
      }
      if (url === "/api/cases/case-2") {
        return new Response(JSON.stringify(blankWorkflow), { status: 200 });
      }
      if (url === "/api/cases?refresh=created") {
        return new Response(JSON.stringify([blankSummary, originalSummary]), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    let caseListReadCount = 0;
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/cases" && !init?.method) {
        caseListReadCount += 1;
        const payload = caseListReadCount >= 2 ? [blankSummary, originalSummary] : [originalSummary];
        return new Response(JSON.stringify(payload), { status: 200 });
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(buildCaseWorkflow()), { status: 200 });
      }
      if (url === "/api/cases/case-1/report-preview?artifact=analysis_summary") {
        return new Response(JSON.stringify(preview), { status: 200 });
      }
      if (url === "/api/cases" && init?.method === "POST") {
        return new Response(JSON.stringify(blankSummary), { status: 200 });
      }
      if (url === "/api/cases/case-2") {
        return new Response(JSON.stringify(blankWorkflow), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<Workspace />);

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });
    fireEvent.click(screen.getByRole("button", { name: "整理分析结论" }));
    await screen.findByTestId("preview-drawer");

    act(() => {
      window.dispatchEvent(new CustomEvent("fireline:toggle-case-drawer"));
    });

    const drawer = await screen.findByLabelText("案件抽屉");
    fireEvent.click(within(drawer).getByRole("button", { name: "新建案件" }));
    fireEvent.change(within(drawer).getByLabelText("案件标题"), {
      target: { value: "新的空白案件" },
    });
    fireEvent.click(within(drawer).getByRole("button", { name: "创建案件" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/cases",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            title: "新的空白案件",
            seedCase: undefined,
          }),
        })
      );
    });

    await screen.findByRole("heading", { name: "新的空白案件" });
    expect(screen.queryByTestId("preview-drawer")).not.toBeInTheDocument();
    expect(screen.getByText("先继续补关键信息")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "继续补信息" })).toBeInTheDocument();
  });

  it("keeps the preview drawer hidden by default and opens it from the conversation action card", async () => {
    const preview = buildPreview();
    const { fetchMock } = workspaceWithSingleCase(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/cases/case-1/report-preview?artifact=analysis_summary") {
        return new Response(JSON.stringify(preview), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    expect(screen.queryByTestId("preview-drawer")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "整理分析结论" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/cases/case-1/report-preview?artifact=analysis_summary"
      );
    });

    const drawer = await screen.findByTestId("preview-drawer");
    expect(within(drawer).getAllByText("结果预览").length).toBeGreaterThan(0);
    expect(within(drawer).getByTitle("分析结论预览")).toBeInTheDocument();
  });

  it("anchors the case drawer as a viewport overlay so it does not depend on workspace layout flow", async () => {
    workspaceWithSingleCase();

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    act(() => {
      window.dispatchEvent(new CustomEvent("fireline:toggle-case-drawer"));
    });

    const drawer = await screen.findByLabelText("案件抽屉");
    const scrim = screen.getByRole("button", { name: "关闭抽屉遮罩" });

    expect(scrim).toHaveStyle({ position: "fixed" });
    expect(drawer).toHaveStyle({ position: "fixed" });
  });

  it("shows AI result recommendation actions in the assistant area instead of topbar controls", async () => {
    workspaceWithSingleCase();

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    const actionCard = screen.getByTestId("result-recommendation-card");
    expect(within(actionCard).getByText("建议先整理分析结论")).toBeInTheDocument();
    expect(within(actionCard).getByRole("button", { name: "整理分析结论" })).toBeInTheDocument();
    expect(within(actionCard).queryByRole("button", { name: "继续补信息" })).not.toBeInTheDocument();
    expect(within(actionCard).queryByRole("button", { name: "稍后再说" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("报告版本")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("文风")).not.toBeInTheDocument();
  });

  it("removes unlock and revalidate buttons from the main stage view", async () => {
    workspaceWithSingleCase();

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    expect(screen.queryByRole("button", { name: "确认当前阶段" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "解锁" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "复审" })).not.toBeInTheDocument();
  });


  it("uses AI guidance to explain impacted stages instead of asking for manual revalidation", async () => {
    const impactedWorkflow = buildImpactedWorkflow();
    stubFetch(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(JSON.stringify([buildCaseSummary({ currentStage: "D2" })]), { status: 200 });
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(impactedWorkflow), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<Workspace />);

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    expect(screen.getByText("案件认知已变化")).toBeInTheDocument();
    expect(
      screen.getAllByText("失效位置已从 C25 调整为连接器处，这条信息会影响 D3 / D4，需要回看。").length
    ).toBeGreaterThan(0);
    expect(screen.queryByText(/请先复审/)).not.toBeInTheDocument();
    const timeline = screen.getByTestId("stage-timeline");
    expect(within(timeline).getByText("D3 临时遏制")).toBeInTheDocument();
    expect(within(timeline).getAllByText("受影响").length).toBeGreaterThan(0);
  });

  it("keeps the composer as a single-line dock by default and lets the user expand and collapse it", async () => {
    workspaceWithSingleCase();

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    const dock = screen.getByTestId("composer-dock");
    const input = within(dock).getByLabelText("证据输入框");
    expect(dock).toHaveAttribute("data-dock-position", "viewport-fixed");
    expect(input).toHaveAttribute("rows", "1");
    expect(within(dock).getByRole("button", { name: "展开输入框" })).toBeInTheDocument();
    expect(within(dock).getByRole("button", { name: "发送证据" })).toBeInTheDocument();

    fireEvent.click(within(dock).getByRole("button", { name: "展开输入框" }));
    expect(input).toHaveAttribute("rows", "4");

    fireEvent.click(within(dock).getByRole("button", { name: "收起输入框" }));
    expect(input).toHaveAttribute("rows", "1");
  });

  it("submits evidence through the docked composer", async () => {
    const workflow = buildCaseWorkflow();
    const fetchMock = stubFetch(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(JSON.stringify([buildCaseSummary()]), { status: 200 });
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

    render(<Workspace />);

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    fireEvent.change(screen.getByLabelText("证据输入框"), {
      target: { value: "补充：客户端现场确认为低温偶发。" },
    });
    fireEvent.click(screen.getByRole("button", { name: "发送证据" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/cases/case-1/evidence",
        expect.objectContaining({
          method: "POST",
        })
      );
    });
  });

  it("keeps the stage timeline focused on the current stage until expanded", async () => {
    workspaceWithSingleCase();

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    const timeline = screen.getByTestId("stage-timeline");
    expect(within(timeline).queryByText("D1")).not.toBeInTheDocument();
    expect(within(timeline).getByText("D3 临时遏制")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "展开全部阶段" }));
    expect(within(timeline).getByText("D1 团队与分工")).toBeInTheDocument();
    expect(within(timeline).getByText("D8 结案沉淀")).toBeInTheDocument();
  });

  it("keeps structured AI guidance and result-readiness context inside the main assistant card", async () => {
    const urgentWorkflow = buildUrgentComplaintWorkflow();
    stubFetch(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(JSON.stringify([buildCaseSummary({ currentStage: "D2" })]), { status: 200 });
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(urgentWorkflow), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<Workspace />);

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    expect(screen.getByText("我现在怎么看")).toBeInTheDocument();
    expect(screen.getByText("这是客户停线级异常，当前先控住影响范围。")).toBeInTheDocument();
    expect(screen.getByText("当前建议整理")).toBeInTheDocument();
    expect(screen.getAllByText("分析结论").length).toBeGreaterThan(0);
    expect(screen.getAllByText("当前更适合先把已确认事实和风险窗口整理出来，不要抢跑 8D。").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("summary-strip")).not.toBeInTheDocument();
  });

  it("exposes stable accessibility regions for the refactored conversation layout", async () => {
    workspaceWithSingleCase();

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    expect(screen.getByLabelText("案件上下文")).toBeInTheDocument();
    expect(screen.getByLabelText("AI 主分析卡")).toBeInTheDocument();
    expect(screen.getByLabelText("证据输入停靠区")).toBeInTheDocument();
    expect(screen.getByTestId("conversation-feed")).toHaveAttribute("data-has-floating-dock", "true");
  });

  it("submits the 8D action from the conversation area and updates the case state", async () => {
    const openWorkflow = {
      ...buildCaseWorkflow(),
      status: "open",
      d1Status: "complete",
      currentStage: "D8",
      resultReadiness: {
        analysisSummary: true,
        actionPlan: true,
        eightD: true,
      },
      resultRecommendation: {
        kind: "eight_d",
        title: "建议生成 8D",
        rationale: "当前关键阶段已闭环，可以生成正式 8D。",
        primaryActionLabel: "生成 8D",
        secondaryActionLabel: "预览 8D",
        deferActionLabel: "继续检查",
      },
    };
    const closedWorkflow = {
      ...openWorkflow,
      status: "closed",
    };
    const casesQueue = [
      [buildCaseSummary({ currentStage: "D8", d1Status: "complete" })],
      [buildCaseSummary({ currentStage: "D8", d1Status: "complete", status: "closed" })],
    ];

    const fetchMock = stubFetch(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(JSON.stringify(casesQueue.shift() ?? []), { status: 200 });
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(openWorkflow), { status: 200 });
      }
      if (url === "/api/cases/case-1/report?artifact=eight_d") {
        expect(init?.method).toBe("POST");
        return new Response(JSON.stringify(closedWorkflow), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<Workspace />);

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    fireEvent.click(screen.getByRole("button", { name: "生成 8D" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/cases/case-1/report?artifact=eight_d",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    expect(screen.getAllByText("已结案").length).toBeGreaterThan(0);
  });


  it("emits a workspace-open event when client telemetry is enabled for tests", async () => {
    (
      window as Window & {
        __AI_QUALITY_ENABLE_TEST_TELEMETRY__?: boolean;
      }
    ).__AI_QUALITY_ENABLE_TEST_TELEMETRY__ = true;

    const fetchMock = stubFetch(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      if (url === "/api/telemetry") {
        expect(init?.method).toBe("POST");
        return new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<Workspace />);

    await screen.findByText("先跑通第一单，再继续补证据和出稿。");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/telemetry",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("\"name\":\"workspace_opened\""),
        })
      );
    });

    delete (
      window as Window & {
        __AI_QUALITY_ENABLE_TEST_TELEMETRY__?: boolean;
      }
    ).__AI_QUALITY_ENABLE_TEST_TELEMETRY__;
  });
});
