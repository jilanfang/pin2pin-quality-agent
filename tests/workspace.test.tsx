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
      displayKindLabel: "分析结论",
    },
    conversationMeta: null,
    presentation: {
      isUrgentCustomerComplaint: false,
      primaryNarrative: "把现场碎片，推进成可交付调查",
      primaryArtifactLabel: "分析结论",
      primaryArtifactShortLabel: "分析结论",
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
      title: "建议先生成 24h 初版 8D",
      rationale: "当前先把已确认事实、围堵状态和风险窗口整理成 24h 初版 8D，再继续补验证。",
      primaryActionLabel: "生成 24h 初版 8D",
      secondaryActionLabel: "继续补信息",
      deferActionLabel: "稍后再说",
      displayKindLabel: "24h 初版 8D",
    },
    presentation: {
      isUrgentCustomerComplaint: true,
      primaryNarrative: "导入客诉材料，生成 24h 初版 8D",
      primaryArtifactLabel: "24h 初版 8D / 快速响应版",
      primaryArtifactShortLabel: "24h 初版 8D",
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
      displayArtifactLabel: "24h 初版 8D / 快速响应版",
      trustSummary: "已确认事实需继续回看原材料，待验证项不能直接写成结论。",
      title: "24h 初版 8D",
      caseStatus: "open",
    },
    text: "分析结论文本预览",
    html: "<html><body><h1>24h 初版 8D 预览</h1></body></html>",
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

    await screen.findByRole("heading", { name: "把异常情况贴进来，我先帮你起调查" });
    expect(screen.getByText(/可以直接粘贴客户投诉、测试结论、批次工单、现场观察或会议纪要/)).toBeInTheDocument();
    expect(screen.getByTestId("entry-composer-card")).toBeInTheDocument();
    expect(screen.getByLabelText("证据输入框")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "加载演示案例" })).toBeInTheDocument();
    expect(screen.queryByText("先开始一条调查，再继续补证据和出稿。")).not.toBeInTheDocument();
    expect(screen.queryByTestId("composer-dock")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "快速新建调查" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "反馈" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "打开报告面板" })).not.toBeInTheDocument();
  });

  it("keeps a loading gate when opening a case route before payload resolves", async () => {
    const workflow = buildCaseWorkflow();
    let resolveCases: ((value: Response) => void) | null = null;
    let resolveCase: ((value: Response) => void) | null = null;
    const casesPromise = new Promise<Response>((resolve) => {
      resolveCases = resolve;
    });
    const casePromise = new Promise<Response>((resolve) => {
      resolveCase = resolve;
    });

    stubFetch(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/cases") {
        return casesPromise;
      }
      if (url === "/api/cases/case-1") {
        return casePromise;
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<Workspace initialCaseId="case-1" />);

    expect(screen.getByText("正在载入调查内容…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "编辑调查标题" })).toHaveTextContent("正在载入调查…");
    expect(screen.queryByText("先开始第一条调查")).not.toBeInTheDocument();
    expect(screen.queryByTestId("entry-composer-card")).not.toBeInTheDocument();

    act(() => {
      resolveCases?.(new Response(JSON.stringify([buildCaseSummary()]), { status: 200 }));
      resolveCase?.(new Response(JSON.stringify(workflow), { status: 200 }));
    });

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });
    await waitFor(() => {
      expect(screen.queryByText("正在载入调查内容…")).not.toBeInTheDocument();
    });
  });

  it("lets the user send the first evidence directly from the empty state by creating a blank case first", async () => {
    const blankSummary = buildCaseSummary({
      id: "case-2",
      title: "华星科技上电冒烟客诉",
      currentStage: "D2",
      d1Status: "not_started",
      updatedAt: "2026-03-23T10:00:00.000Z",
    });
    const blankWorkflow = {
      ...buildCaseWorkflow(),
      caseId: "case-2",
      title: "华星科技上电冒烟客诉",
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
        {
          id: "msg-assistant-2",
          role: "assistant" as const,
          content:
            "我先帮你接下这个案件。\n我已提取到：客户现场发现上电冒烟；批次 B19；已暂停出货。\n当前还缺：首次发现时间、影响范围。\n下一步请直接补：客户现场数量和当前围堵范围。",
          messageType: "assistant_note" as const,
          createdAt: "2026-03-23T10:05:03.000Z",
        },
      ],
      knownFacts: [{ field: "batch", value: "B19" }],
      conversationMeta: {
        intents: ["evidence"],
        primaryStage: "D2",
        relatedStages: ["D2"],
        impactedStages: [],
        sourceShape: "fragmented_update",
        caseOperation: "attach_to_current_case",
        responseMode: "guide",
        thinking: {
          startedAt: "2026-03-23T10:05:00.000Z",
          finishedAt: "2026-03-23T10:05:03.000Z",
          etaLabel: "6-10 秒",
          mode: "processing_input",
          steps: ["识别新增事实", "检查是否影响前序判断", "更新当前分析与下一步"],
        },
      },
    };
    let latestCase2Payload: Record<string, unknown> = blankWorkflow;

    const fetchMock = stubFetch(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/cases" && !init?.method) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      if (url === "/api/cases" && init?.method === "POST") {
        return new Response(JSON.stringify(blankSummary), { status: 200 });
      }
      if (url === "/api/cases/case-2" && !init?.method) {
        return new Response(JSON.stringify(latestCase2Payload), { status: 200 });
      }
      if (url === "/api/cases/case-2/evidence") {
        latestCase2Payload = afterEvidenceWorkflow;
        return new Response(JSON.stringify(afterEvidenceWorkflow), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<Workspace />);

    await screen.findByTestId("entry-composer-card");
    fireEvent.change(screen.getByLabelText("证据输入框"), {
      target: { value: "客户现场发现上电冒烟，批次 B19，已暂停出货。" },
    });
    fireEvent.click(screen.getByRole("button", { name: "发送证据" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/cases", expect.objectContaining({ method: "POST" }));
    });

    const createCall = fetchMock.mock.calls.find(
      ([url, init]) => url === "/api/cases" && (init as RequestInit | undefined)?.method === "POST"
    );
    expect(createCall).toBeTruthy();
    expect((createCall?.[1] as RequestInit).body).not.toBe(JSON.stringify({ title: "新的调查" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/cases/case-2/evidence",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    await screen.findByRole("heading", { name: "华星科技上电冒烟客诉" });
    expect(screen.getByText("当前调查 #CASE-2")).toBeInTheDocument();
    expect(screen.queryByTestId("entry-composer-card")).not.toBeInTheDocument();
    expect(screen.getByTestId("composer-dock")).toBeInTheDocument();
  });

  it("keeps the shell chrome minimal even after cases exist", async () => {
    workspaceWithSingleCase();

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    expect(screen.queryByRole("button", { name: "快速新建调查" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "反馈" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "打开报告面板" })).not.toBeInTheDocument();
  });

  it("shows a fail-closed error and keeps composer content when evidence api is unavailable", async () => {
    const fetchMock = stubFetch(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/cases" && !init?.method) {
        return new Response(JSON.stringify([buildCaseSummary()]), { status: 200 });
      }
      if (url === "/api/cases/case-1" && !init?.method) {
        return new Response(JSON.stringify(buildCaseWorkflow()), { status: 200 });
      }
      if (url === "/api/cases/case-1/evidence") {
        return new Response(
          JSON.stringify({
            code: "llm_required_unavailable",
            error: "当前模型服务不可用，本次调查输入未被处理，请稍后重试。",
          }),
          { status: 503 }
        );
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<Workspace />);

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    fireEvent.change(screen.getByLabelText("证据输入框"), {
      target: { value: "客户现场发现上电冒烟，批次 B19，已暂停出货。" },
    });
    fireEvent.click(screen.getByRole("button", { name: "发送证据" }));

    expect(
      await screen.findByText("当前模型服务不可用，本次调查输入未被处理，请稍后重试。")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("证据输入框")).toHaveValue("客户现场发现上电冒烟，批次 B19，已暂停出货。");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/cases/case-1/evidence",
      expect.objectContaining({
        method: "POST",
      })
    );
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

    await screen.findByRole("button", { name: "加载演示案例" });
    fireEvent.click(screen.getByRole("button", { name: "加载演示案例" }));

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
    expect(screen.getByTestId("case-sidebar")).toBeInTheDocument();
  });

  it("creates a blank case from the sidebar and switches the workspace context to the new case", async () => {
    const casesQueue = [
      [buildCaseSummary()],
      [
        buildCaseSummary({
          id: "case-2",
          title: "新的空白调查",
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
      title: "新的空白调查",
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
              title: "新的空白调查",
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
    const sidebar = screen.getByTestId("case-sidebar");
    fireEvent.click(within(sidebar).getByRole("button", { name: "新建调查" }));
    fireEvent.change(within(sidebar).getByLabelText("调查标题"), {
      target: { value: "新的空白调查" },
    });
    fireEvent.click(within(sidebar).getByRole("button", { name: "创建调查" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/cases",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            title: "新的空白调查",
            seedCase: undefined,
          }),
        })
      );
    });

    await screen.findByRole("heading", { name: "新的空白调查" });
    expect(screen.getByText("当前调查 #CASE-2")).toBeInTheDocument();
    expect(screen.getByTestId("entry-composer-card")).toBeInTheDocument();
    expect(screen.queryByTestId("copilot-brief")).not.toBeInTheDocument();
    expect(screen.queryByTestId("composer-dock")).not.toBeInTheDocument();
    expect(screen.getByTestId("case-sidebar")).toBeInTheDocument();
  });

  it("uses a conversation-first chrome and removes the old summary strip and top report toolbar", async () => {
    workspaceWithSingleCase();

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    expect(screen.getByText("AI 协作区")).toBeInTheDocument();
    expect(screen.queryByTestId("summary-strip")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "打开报告工具" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "快速预览报告" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("result-recommendation-card")).not.toBeInTheDocument();
    expect(screen.getByText("当前建议")).toBeInTheDocument();
  });

  it("keeps the case list in a permanently visible sidebar on desktop", async () => {
    workspaceWithSingleCase();

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    const sidebar = screen.getByTestId("case-sidebar");
    expect(within(sidebar).getByText("新建调查")).toBeInTheDocument();
    expect(within(sidebar).getByLabelText("搜索调查")).toBeInTheDocument();
  });

  it("filters visible cases in the sidebar with a single search-first flow", async () => {
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
    const sidebar = screen.getByTestId("case-sidebar");
    const search = within(sidebar).getByLabelText("搜索调查");
    expect(within(sidebar).getByText("连接器虚焊异常")).toBeInTheDocument();
    expect(
      within(sidebar).getByRole("button", { name: /钽电容反向贴装客诉.*D3/i })
    ).toBeInTheDocument();

    fireEvent.change(search, { target: { value: "连接器" } });
    expect(within(sidebar).getByText("连接器虚焊异常")).toBeInTheDocument();
    expect(
      within(sidebar).queryByRole("button", { name: /钽电容反向贴装客诉.*D3/i })
    ).not.toBeInTheDocument();
  });

  it("keeps the sidebar visible after switching to another case", async () => {
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
    const sidebar = screen.getByTestId("case-sidebar");
    fireEvent.click(within(sidebar).getByRole("button", { name: /连接器虚焊异常.*D2/i }));

    await screen.findByRole("heading", { name: "连接器虚焊异常" });
    expect(screen.getByTestId("case-sidebar")).toBeInTheDocument();
  });

  it("clears an open preview drawer when creating a new case from the sidebar", async () => {
    const preview = buildPreview();
    const originalSummary = buildCaseSummary();
    const blankSummary = buildCaseSummary({
      id: "case-2",
      title: "新的空白调查",
      currentStage: "D2",
      d1Status: "not_started",
      updatedAt: "2026-03-23T10:00:00.000Z",
    });
    const blankWorkflow = {
      ...buildCaseWorkflow(),
      caseId: "case-2",
      title: "新的空白调查",
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
    const summaryWorkflow = {
      ...buildCaseWorkflow(),
      conversationMeta: {
        intents: ["summary_request"],
        primaryStage: "D3",
        relatedStages: ["D3"],
        impactedStages: [],
        thinking: {
          startedAt: "2026-03-22T12:00:06.000Z",
          finishedAt: "2026-03-22T12:00:12.000Z",
          etaLabel: "6-10 秒",
          mode: "summarizing_case",
          steps: ["汇总已确认事实", "区分判断与待验证项", "输出当前总结"],
        },
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
      if (url === "/api/cases/case-1/evidence") {
        return new Response(JSON.stringify(summaryWorkflow), { status: 200 });
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
      if (url === "/api/cases/case-1/evidence") {
        return new Response(JSON.stringify(summaryWorkflow), { status: 200 });
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
    fireEvent.change(screen.getByLabelText("证据输入框"), {
      target: { value: "帮我总结一下现在情况" },
    });
    fireEvent.click(screen.getByRole("button", { name: "发送证据" }));
    fireEvent.click(await screen.findByRole("button", { name: "整理分析结论" }));
    await screen.findByTestId("preview-drawer");
    const sidebar = screen.getByTestId("case-sidebar");
    fireEvent.click(within(sidebar).getByRole("button", { name: "新建调查" }));
    fireEvent.change(within(sidebar).getByLabelText("调查标题"), {
      target: { value: "新的空白调查" },
    });
    fireEvent.click(within(sidebar).getByRole("button", { name: "创建调查" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/cases",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            title: "新的空白调查",
            seedCase: undefined,
          }),
        })
      );
    });

    await screen.findByRole("heading", { name: "新的空白调查" });
    expect(screen.queryByTestId("preview-drawer")).not.toBeInTheDocument();
    expect(screen.getByTestId("entry-composer-card")).toBeInTheDocument();
    expect(screen.queryByTestId("result-recommendation-card")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "继续补信息" })).not.toBeInTheDocument();
  });

  it("keeps the preview drawer hidden by default and opens it from the conversation action card", async () => {
    const preview = buildPreview();
    const { fetchMock } = workspaceWithSingleCase(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/cases/case-1/evidence") {
        return new Response(
          JSON.stringify({
            ...buildCaseWorkflow(),
            conversationMeta: {
              intents: ["summary_request"],
              primaryStage: "D3",
              relatedStages: ["D3"],
              impactedStages: [],
              thinking: {
                startedAt: "2026-03-22T12:00:06.000Z",
                finishedAt: "2026-03-22T12:00:12.000Z",
                etaLabel: "6-10 秒",
                mode: "summarizing_case",
                steps: ["汇总已确认事实", "区分判断与待验证项", "输出当前总结"],
              },
            },
          }),
          { status: 200 }
        );
      }
      if (url === "/api/cases/case-1/report-preview?artifact=analysis_summary") {
        return new Response(JSON.stringify(preview), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    expect(screen.queryByTestId("preview-drawer")).not.toBeInTheDocument();
    expect(screen.queryByTestId("result-recommendation-card")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("证据输入框"), {
      target: { value: "帮我总结一下现在情况" },
    });
    fireEvent.click(screen.getByRole("button", { name: "发送证据" }));

    const actionCard = await screen.findByTestId("result-recommendation-card");
    expect(within(actionCard).getByRole("button", { name: "整理分析结论" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "整理分析结论" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/cases/case-1/report-preview?artifact=analysis_summary"
      );
    });

    const drawer = await screen.findByTestId("preview-drawer");
    expect(within(drawer).getAllByText("结果预览").length).toBeGreaterThan(0);
    expect(within(drawer).getByText("类型：24h 初版 8D / 快速响应版")).toBeInTheDocument();
    expect(within(drawer).getByText("已确认事实需继续回看原材料，待验证项不能直接写成结论。")).toBeInTheDocument();
    expect(within(drawer).getByTitle("24h 初版 8D预览")).toBeInTheDocument();
  });

  it("renders the desktop sidebar as part of the three-column workspace flow", async () => {
    workspaceWithSingleCase();

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    expect(screen.getByTestId("case-sidebar")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "关闭抽屉遮罩" })).not.toBeInTheDocument();
  });

  it("shows AI result recommendation actions in the assistant area instead of topbar controls", async () => {
    workspaceWithSingleCase();

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    expect(screen.queryByTestId("result-recommendation-card")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "整理分析结论" })).not.toBeInTheDocument();
    expect(screen.getByText("当前建议整理")).toBeInTheDocument();
    expect(screen.queryByLabelText("报告版本")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("文风")).not.toBeInTheDocument();
  });

  it("shows result recommendation actions only after a fresh summary-oriented interaction", async () => {
    const summaryWorkflow = {
      ...buildCaseWorkflow(),
      conversationMeta: {
        intents: ["summary_request"],
        primaryStage: "D3",
        relatedStages: ["D3"],
        impactedStages: [],
        thinking: {
          startedAt: "2026-03-22T12:00:06.000Z",
          finishedAt: "2026-03-22T12:00:12.000Z",
          etaLabel: "6-10 秒",
          mode: "summarizing_case",
          steps: ["汇总已确认事实", "区分判断与待验证项", "输出当前总结"],
        },
      },
    };

    stubFetch(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(JSON.stringify([buildCaseSummary()]), { status: 200 });
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(buildCaseWorkflow()), { status: 200 });
      }
      if (url === "/api/cases/case-1/evidence") {
        expect(init?.method).toBe("POST");
        return new Response(JSON.stringify(summaryWorkflow), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<Workspace />);

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });
    expect(screen.queryByTestId("result-recommendation-card")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("证据输入框"), {
      target: { value: "帮我总结一下现在情况" },
    });
    fireEvent.click(screen.getByRole("button", { name: "发送证据" }));

    const actionCard = await screen.findByTestId("result-recommendation-card");
    expect(within(actionCard).getByText("建议先整理分析结论")).toBeInTheDocument();
    expect(within(actionCard).getByRole("button", { name: "整理分析结论" })).toBeInTheDocument();
  });

  it("uses 24h initial 8D wording inside the assistant card for urgent complaint cases", async () => {
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

    expect(screen.getByText("当前建议整理")).toBeInTheDocument();
    expect(screen.getAllByText("24h 初版 8D").length).toBeGreaterThan(0);
    expect(screen.getAllByText("当前先把已确认事实、围堵状态和风险窗口整理成 24h 初版 8D，再继续补验证。").length).toBeGreaterThan(0);
    expect(screen.getByText("已知事实")).toBeInTheDocument();
    expect(screen.getByText("待验证假设")).toBeInTheDocument();
    expect(screen.getByText("来源：当前对话材料")).toBeInTheDocument();
  });

  it("shows an action-plan recommendation card after fresh evidence makes the case actionable", async () => {
    const actionPlanWorkflow = {
      ...buildCaseWorkflow(),
      currentStage: "D5",
      resultReadiness: {
        analysisSummary: true,
        actionPlan: true,
        eightD: false,
      },
      resultRecommendation: {
        kind: "action_plan" as const,
        title: "建议整理行动方案",
        rationale: "当前围堵和纠正方向已经成形，先把行动方案收口，再决定何时进入 8D。",
        primaryActionLabel: "整理行动方案",
        secondaryActionLabel: "继续补信息",
      },
      conversationMeta: {
        intents: ["evidence"],
        primaryStage: "D5",
        relatedStages: ["D5"],
        impactedStages: [],
        sourceShape: "fragmented_update",
        caseOperation: "attach_to_current_case",
        responseMode: "guide",
        thinking: {
          startedAt: "2026-03-22T12:00:06.000Z",
          finishedAt: "2026-03-22T12:00:12.000Z",
          etaLabel: "6-10 秒",
          mode: "processing_input",
          steps: ["识别新增事实", "检查是否影响前序判断", "更新当前分析与下一步"],
        },
      },
    };

    stubFetch(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(JSON.stringify([buildCaseSummary({ currentStage: "D5" })]), { status: 200 });
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(buildCaseWorkflow()), { status: 200 });
      }
      if (url === "/api/cases/case-1/evidence") {
        expect(init?.method).toBe("POST");
        return new Response(JSON.stringify(actionPlanWorkflow), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<Workspace />);

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });
    expect(screen.queryByTestId("result-recommendation-card")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("证据输入框"), {
      target: { value: "发生原因侧永久措施已经确定，流出原因侧也补了拦截和检查动作。" },
    });
    fireEvent.click(screen.getByRole("button", { name: "发送证据" }));

    const actionCard = await screen.findByTestId("result-recommendation-card");
    expect(within(actionCard).getByText("建议整理行动方案")).toBeInTheDocument();
    expect(within(actionCard).getByRole("button", { name: "整理行动方案" })).toBeInTheDocument();
  });

  it("keeps non-result guidance out of the result action card", async () => {
    const blankWorkflow = {
      ...buildCaseWorkflow(),
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
      conversationMeta: {
        intents: ["evidence"],
        primaryStage: "D2",
        relatedStages: ["D2"],
        impactedStages: [],
        sourceShape: "fragmented_update",
        caseOperation: "attach_to_current_case",
        responseMode: "guide",
        thinking: {
          startedAt: "2026-03-22T12:00:06.000Z",
          finishedAt: "2026-03-22T12:00:10.000Z",
          etaLabel: "6-10 秒",
          mode: "processing_input",
          steps: ["识别新增事实", "检查是否影响前序判断", "更新当前分析与下一步"],
        },
      },
    };

    stubFetch(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(JSON.stringify([buildCaseSummary()]), { status: 200 });
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(blankWorkflow), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<Workspace />);

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });
    expect(screen.queryByTestId("result-recommendation-card")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "继续补信息" })).not.toBeInTheDocument();
  });

  it("does not show a result action card when the response mode is informational only", async () => {
    const informationalWorkflow = {
      ...buildCaseWorkflow(),
      resultRecommendation: {
        kind: "analysis_summary" as const,
        title: "建议先整理分析结论",
        rationale: "当前已具备稳定事实，可以先沉淀分析结论。",
        primaryActionLabel: "整理分析结论",
        secondaryActionLabel: "继续补信息",
      },
      conversationMeta: {
        intents: ["question"],
        primaryStage: "D4",
        relatedStages: ["D4"],
        impactedStages: [],
        sourceShape: "question_only",
        caseOperation: "attach_to_current_case",
        responseMode: "inform",
        thinking: {
          startedAt: "2026-03-22T12:00:06.000Z",
          finishedAt: "2026-03-22T12:00:10.000Z",
          etaLabel: "6-10 秒",
          mode: "processing_input",
          steps: ["识别新增事实", "检查是否影响前序判断", "更新当前分析与下一步"],
        },
      },
    };

    stubFetch(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(JSON.stringify([buildCaseSummary()]), { status: 200 });
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(informationalWorkflow), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<Workspace />);

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });
    expect(screen.queryByTestId("result-recommendation-card")).not.toBeInTheDocument();
  });

  it("asks for confirmation before attaching a likely new complaint to the current case", async () => {
    const fetchMock = stubFetch(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/cases" && init?.method === "POST") {
        return new Response(
          JSON.stringify(
            buildCaseSummary({
              id: "case-2",
              title: "华星科技上电冒烟客诉",
              currentStage: "D2",
            })
          ),
          { status: 200 }
        );
      }
      if (url === "/api/cases") {
        return new Response(JSON.stringify([buildCaseSummary()]), { status: 200 });
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(buildCaseWorkflow()), { status: 200 });
      }
      if (url === "/api/cases/case-1/evidence") {
        return new Response(
          JSON.stringify({
            ...buildCaseWorkflow(),
            conversationMeta: {
              intents: ["evidence"],
              primaryStage: "D2",
              relatedStages: ["D2"],
              impactedStages: [],
              sourceShape: "long_document",
              caseOperation: "needs_case_confirmation",
              responseMode: "guide",
              thinking: {
                startedAt: "2026-03-22T12:00:06.000Z",
                finishedAt: "2026-03-22T12:00:12.000Z",
                etaLabel: "6-10 秒",
                mode: "processing_input",
                steps: ["识别新增事实", "检查是否影响前序判断", "更新当前分析与下一步"],
              },
            },
          }),
          { status: 200 }
        );
      }
      if (url === "/api/cases/case-2") {
        return new Response(
          JSON.stringify({
            ...buildCaseWorkflow(),
            caseId: "case-2",
            title: "华星科技上电冒烟客诉",
            currentStage: "D2",
            messages: [],
          }),
          { status: 200 }
        );
      }
      if (url === "/api/cases/case-2/evidence") {
        return new Response(
          JSON.stringify({
            ...buildCaseWorkflow(),
            caseId: "case-2",
            title: "华星科技上电冒烟客诉",
            currentStage: "D2",
            messages: [],
          }),
          { status: 200 }
        );
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<Workspace />);

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    fireEvent.change(screen.getByLabelText("证据输入框"), {
      target: {
        value:
          "客户华星科技邮件反馈：昨日客户端上线后出现 3 台板卡上电冒烟，涉及批次 B19，要求 24 小时内回复临时遏制与初步分析。当前客户现场已暂停投线，我司仓库已先冻结库存待排查。",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "发送证据" }));

    const confirmationCard = await screen.findByTestId("new-case-confirmation-card");
    expect(within(confirmationCard).getByText("我判断这更像另一条新调查")).toBeInTheDocument();
    expect(within(confirmationCard).getByRole("button", { name: "新建调查" })).toBeInTheDocument();
    expect(within(confirmationCard).getByRole("button", { name: "继续当前调查" })).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/cases/case-1/evidence",
      expect.objectContaining({ method: "POST" })
    );

    fireEvent.click(within(confirmationCard).getByRole("button", { name: "新建调查" }));

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
        "/api/cases/case-2/evidence",
        expect.objectContaining({
          method: "POST",
        })
      );
    });
  });

  it("also asks for confirmation when meeting notes look like a different case", async () => {
    const fetchMock = stubFetch(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(JSON.stringify([buildCaseSummary()]), { status: 200 });
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(buildCaseWorkflow()), { status: 200 });
      }
      if (url === "/api/cases/case-1/evidence") {
        expect(init?.method).toBe("POST");
        return new Response(
          JSON.stringify({
            ...buildCaseWorkflow(),
            conversationMeta: {
              intents: ["evidence"],
              primaryStage: "D2",
              relatedStages: ["D2"],
              impactedStages: [],
              sourceShape: "meeting_notes",
              caseOperation: "needs_case_confirmation",
              responseMode: "guide",
              thinking: {
                startedAt: "2026-03-22T12:00:06.000Z",
                finishedAt: "2026-03-22T12:00:12.000Z",
                etaLabel: "6-10 秒",
                mode: "processing_input",
                steps: ["识别新增事实", "检查是否影响前序判断", "更新当前分析与下一步"],
              },
            },
          }),
          { status: 200 }
        );
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<Workspace />);

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    fireEvent.change(screen.getByLabelText("证据输入框"), {
      target: {
        value:
          "会议纪要：客户华星科技今天会后确认，机种 MCU-900 在 B19 批次已有 3 台板卡上电冒烟，现场先停线并要求 24 小时内回复遏制措施。",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "发送证据" }));

    const confirmationCard = await screen.findByTestId("new-case-confirmation-card");
    expect(within(confirmationCard).getByText("我判断这更像另一条新调查")).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/cases/case-1/evidence",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("shows confirmation after the server flags a likely different case, then can continue on the current case", async () => {
    let evidenceRequestCount = 0;
    const fetchMock = stubFetch(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(JSON.stringify([buildCaseSummary()]), { status: 200 });
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(buildCaseWorkflow()), { status: 200 });
      }
      if (url === "/api/cases/case-1/evidence") {
        evidenceRequestCount += 1;
        const body = JSON.parse(String(init?.body ?? "{}"));
        if (evidenceRequestCount === 1) {
          expect(body.forceCaseConfirmation).toBeUndefined();
          return new Response(
            JSON.stringify({
              ...buildCaseWorkflow(),
              conversationMeta: {
                intents: ["evidence"],
                primaryStage: "D2",
                relatedStages: ["D2"],
                impactedStages: [],
                sourceShape: "long_document",
                caseOperation: "needs_case_confirmation",
                responseMode: "guide",
                thinking: {
                  startedAt: "2026-03-22T12:00:06.000Z",
                  finishedAt: "2026-03-22T12:00:12.000Z",
                  etaLabel: "6-10 秒",
                  mode: "processing_input",
                  steps: ["识别新增事实", "检查是否影响前序判断", "更新当前分析与下一步"],
                },
              },
            }),
            { status: 200 }
          );
        }

        expect(body.forceCaseConfirmation).toBe("attach_to_current_case");
        return new Response(JSON.stringify(buildCaseWorkflow()), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<Workspace />);

    await screen.findByText("我现在怎么看");

    fireEvent.change(screen.getByLabelText("证据输入框"), {
      target: {
        value:
          "客户华星科技邮件反馈：昨日客户端上线后出现 3 台板卡上电冒烟，涉及机种 MCU-900 与批次 B19，要求 24 小时内回复临时遏制与初步分析。",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "发送证据" }));

    const confirmationCard = await screen.findByTestId("new-case-confirmation-card");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/cases/case-1/evidence",
      expect.objectContaining({ method: "POST" })
    );

    fireEvent.click(within(confirmationCard).getByRole("button", { name: "继续当前调查" }));

    await waitFor(() => {
      expect(evidenceRequestCount).toBe(2);
    });
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

    expect(screen.getByText("调查认知已变化")).toBeInTheDocument();
    expect(
      screen.getAllByText("失效位置已从 C25 调整为连接器处，这条信息会影响 D3 / D4，需要回看。").length
    ).toBeGreaterThan(0);
    expect(screen.queryByText(/请先复审/)).not.toBeInTheDocument();
    const timeline = screen.getByTestId("stage-timeline");
    expect(within(timeline).getByText("D3 临时遏制")).toBeInTheDocument();
    expect(within(timeline).getAllByText("受影响").length).toBeGreaterThan(0);
  });

  it("keeps the composer in a column-bottom pane and lets the user expand and collapse it", async () => {
    workspaceWithSingleCase();

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    const dock = screen.getByTestId("composer-dock");
    const input = within(dock).getByLabelText("证据输入框");
    expect(dock).toHaveAttribute("data-dock-position", "column-bottom");
    expect(input).toHaveAttribute("rows", "3");
    expect(dock.className).not.toContain("expanded");
    expect(within(dock).getByRole("button", { name: "展开输入框" })).toBeInTheDocument();
    expect(within(dock).getByRole("button", { name: "发送证据" })).toBeInTheDocument();

    fireEvent.click(within(dock).getByRole("button", { name: "展开输入框" }));
    expect(dock.className).toContain("expanded");

    fireEvent.click(within(dock).getByRole("button", { name: "收起输入框" }));
    expect(dock.className).not.toContain("expanded");
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

  it("shows a current-state summary in the conversation when the user asks for a summary", async () => {
    const summaryWorkflow = {
      ...buildCaseWorkflow(),
      messages: [
        ...buildCaseWorkflow().messages,
        {
          id: "msg-summary-1",
          role: "assistant" as const,
          content:
            "当前情况总结\n当前阶段：D3\n\n已确认事实\n- 客户：大麦科技\n\n当前判断\n当前已具备一部分稳定事实，可以先沉淀分析结论，但仍需对关键假设继续验证。\n\n还缺什么\n- 还没有 change point 线索，需先确认替代料、换料、程序或检测参数变化。",
          messageType: "assistant_note" as const,
          createdAt: "2026-03-22T12:00:06.000Z",
        },
      ],
    };

    stubFetch(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(JSON.stringify([buildCaseSummary()]), { status: 200 });
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(buildCaseWorkflow()), { status: 200 });
      }
      if (url === "/api/cases/case-1/evidence") {
        expect(init?.method).toBe("POST");
        return new Response(JSON.stringify(summaryWorkflow), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<Workspace />);

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    fireEvent.change(screen.getByLabelText("证据输入框"), {
      target: { value: "帮我总结一下现在情况" },
    });
    fireEvent.click(screen.getByRole("button", { name: "发送证据" }));

    expect(
      await screen.findByText((content) => content.includes("当前情况总结"))
    ).toBeInTheDocument();
    await waitFor(
      () => {
        expect(screen.getByText("已确认事实")).toBeInTheDocument();
        expect(screen.getByText("当前判断")).toBeInTheDocument();
        expect(screen.getByText("还缺什么")).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it("submits fragmented updates with a direct question through the single composer flow", async () => {
    const mixedWorkflow = {
      ...buildCaseWorkflow(),
      conversationMeta: {
        intents: ["evidence", "question"],
        primaryStage: "D2",
        relatedStages: ["D2"],
        impactedStages: [],
        sourceShape: "mixed_input",
        caseOperation: "attach_to_current_case",
        responseMode: "guide",
        thinking: {
          startedAt: "2026-03-22T12:00:06.000Z",
          finishedAt: "2026-03-22T12:00:10.000Z",
          etaLabel: "6-10 秒",
          mode: "processing_input",
          steps: ["识别新增事实", "检查是否影响前序判断", "更新当前分析与下一步"],
        },
      },
      messages: [
        ...buildCaseWorkflow().messages,
        {
          id: "msg-mixed-1",
          role: "assistant" as const,
          content: "我先帮你接下这个案件。当前还缺失效位置、影响范围和围堵状态。",
          messageType: "assistant_note" as const,
          createdAt: "2026-03-22T12:00:08.000Z",
        },
      ],
    };

    const fetchMock = stubFetch(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(JSON.stringify([buildCaseSummary({ currentStage: "D2" })]), { status: 200 });
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(buildCaseWorkflow()), { status: 200 });
      }
      if (url === "/api/cases/case-1/evidence") {
        const body = JSON.parse(String(init?.body ?? "{}"));
        expect(body.content).toBe("客户补充 B19 先别放，现场已经停线了。现在先给客户怎么说？");
        return new Response(JSON.stringify(mixedWorkflow), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<Workspace />);

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    fireEvent.change(screen.getByLabelText("证据输入框"), {
      target: { value: "客户补充 B19 先别放，现场已经停线了。现在先给客户怎么说？" },
    });
    fireEvent.click(screen.getByRole("button", { name: "发送证据" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/cases/case-1/evidence",
        expect.objectContaining({ method: "POST" })
      );
    });
    expect(await screen.findByText("我先帮你接下这个案件。")).toBeInTheDocument();
    expect(await screen.findByText("当前还缺失效位置、影响范围和围堵状态。")).toBeInTheDocument();
    expect(screen.queryByTestId("new-case-confirmation-card")).not.toBeInTheDocument();
  });

  it("submits direct result requests through the conversation composer without inventing a new case branch", async () => {
    const decisionWorkflow = {
      ...buildCaseWorkflow(),
      resultRecommendation: {
        kind: "eight_d" as const,
        title: "建议生成 8D",
        rationale: "当前关键阶段已闭环，可以生成正式 8D。",
        primaryActionLabel: "生成 8D",
        secondaryActionLabel: "预览 8D",
      },
      conversationMeta: {
        intents: ["decision_signal"],
        primaryStage: "D8",
        relatedStages: ["D8"],
        impactedStages: [],
        sourceShape: "fragmented_update",
        caseOperation: "attach_to_current_case",
        responseMode: "result_action",
        thinking: {
          startedAt: "2026-03-22T12:00:06.000Z",
          finishedAt: "2026-03-22T12:00:10.000Z",
          etaLabel: "6-10 秒",
          mode: "processing_input",
          steps: ["识别新增事实", "检查是否影响前序判断", "更新当前分析与下一步"],
        },
      },
    };

    stubFetch(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(JSON.stringify([buildCaseSummary({ currentStage: "D8", d1Status: "complete" })]), { status: 200 });
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(buildCaseWorkflow()), { status: 200 });
      }
      if (url === "/api/cases/case-1/evidence") {
        const body = JSON.parse(String(init?.body ?? "{}"));
        expect(body.content).toBe("给我 8D 预览");
        expect(body.forceCaseConfirmation).toBeUndefined();
        return new Response(JSON.stringify(decisionWorkflow), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<Workspace />);

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    fireEvent.change(screen.getByLabelText("证据输入框"), {
      target: { value: "给我 8D 预览" },
    });
    fireEvent.click(screen.getByRole("button", { name: "发送证据" }));

    expect(await screen.findByTestId("result-recommendation-card")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "生成 8D" })).toBeInTheDocument();
    expect(screen.queryByTestId("new-case-confirmation-card")).not.toBeInTheDocument();
  });

  it("shows a thinking status card when the latest response includes conversation metadata", async () => {
    const workflowWithThinking = {
      ...buildCaseWorkflow(),
      conversationMeta: {
        intents: ["evidence", "correction"],
        primaryStage: "D2",
        relatedStages: ["D2", "D3", "D4"],
        impactedStages: ["D3", "D4"],
        thinking: {
          startedAt: "2026-03-22T12:00:06.000Z",
          finishedAt: "2026-03-22T12:00:15.000Z",
          etaLabel: "8-12 秒",
          mode: "reviewing_prior_judgement",
          steps: ["对比新旧信息", "标记受影响段落", "更新当前判断"],
        },
      },
    };

    stubFetch(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(JSON.stringify([buildCaseSummary()]), { status: 200 });
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(workflowWithThinking), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<Workspace />);

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });
    expect(screen.getByTestId("thinking-status-card")).toBeInTheDocument();
    expect(screen.getByText("正在回看前序判断")).toBeInTheDocument();
    expect(screen.getByText("预计 8-12 秒")).toBeInTheDocument();
    expect(screen.getByText("受影响阶段：D3 临时遏制 / D4 原因分析")).toBeInTheDocument();
  });

  it("shows a live thinking indicator while evidence is being sent", async () => {
    let resolveEvidence: ((response: Response) => void) | null = null;
    const pendingEvidence = new Promise<Response>((resolve) => {
      resolveEvidence = resolve;
    });

    stubFetch(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(JSON.stringify([buildCaseSummary()]), { status: 200 });
      }
      if (url === "/api/cases/case-1") {
        return new Response(JSON.stringify(buildCaseWorkflow()), { status: 200 });
      }
      if (url === "/api/cases/case-1/evidence") {
        expect(init?.method).toBe("POST");
        return pendingEvidence;
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<Workspace />);

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    fireEvent.change(screen.getByLabelText("证据输入框"), {
      target: { value: "等下，失效位置可能不是 C25，要回看前面判断。" },
    });
    fireEvent.click(screen.getByRole("button", { name: "发送证据" }));

    expect(await screen.findByText("正在回看前序判断")).toBeInTheDocument();

    act(() => {
      resolveEvidence?.(
        new Response(
          JSON.stringify({
            ...buildCaseWorkflow(),
            conversationMeta: {
              intents: ["evidence", "correction"],
              primaryStage: "D2",
              relatedStages: ["D2", "D3"],
              impactedStages: ["D3"],
              thinking: {
                startedAt: "2026-03-22T12:00:06.000Z",
                finishedAt: "2026-03-22T12:00:14.000Z",
                etaLabel: "8-12 秒",
                mode: "reviewing_prior_judgement",
                steps: ["对比新旧信息", "标记受影响段落", "更新当前判断"],
              },
            },
          }),
          { status: 200 }
        )
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("thinking-status-card")).toBeInTheDocument();
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
    expect(screen.getAllByText("24h 初版 8D").length).toBeGreaterThan(0);
    expect(screen.getAllByText("当前先把已确认事实、围堵状态和风险窗口整理成 24h 初版 8D，再继续补验证。").length).toBeGreaterThan(0);
    expect(screen.getByText("待验证假设")).toBeInTheDocument();
    expect(screen.getByText("来源：当前对话材料")).toBeInTheDocument();
    expect(screen.queryByTestId("summary-strip")).not.toBeInTheDocument();
  });

  it("exposes stable accessibility regions for the refactored conversation layout", async () => {
    workspaceWithSingleCase();

    await screen.findByRole("heading", { name: "钽电容反向贴装客诉" });

    expect(screen.getByLabelText("调查列表侧栏")).toBeInTheDocument();
    expect(screen.getByLabelText("调查上下文")).toBeInTheDocument();
    expect(screen.getByLabelText("AI 主分析卡")).toBeInTheDocument();
    expect(screen.getByLabelText("证据输入停靠区")).toBeInTheDocument();
    expect(screen.getByTestId("conversation-feed")).toHaveAttribute("data-has-floating-dock", "false");
  });

  it("shows an inline error instead of crashing when the initial case list load fails", async () => {
    stubFetch(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/cases") {
        return new Response(JSON.stringify({ error: "数据库查询失败" }), { status: 400 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<Workspace />);

    expect(await screen.findByText("数据库查询失败")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "把异常情况贴进来，我先帮你起调查" })).toBeInTheDocument();
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

    await screen.findByRole("heading", { name: "把异常情况贴进来，我先帮你起调查" });

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
