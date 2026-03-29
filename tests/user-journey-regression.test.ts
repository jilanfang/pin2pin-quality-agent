import { afterEach, describe, expect, it, vi } from "vitest";

describe("user journey regression", () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousStorePath = process.env.AI_QUALITY_STORE_PATH;
  const previousLlmEnabled = process.env.AI_QUALITY_LLM_ENABLED;

  afterEach(() => {
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
    if (previousStorePath === undefined) delete process.env.AI_QUALITY_STORE_PATH;
    else process.env.AI_QUALITY_STORE_PATH = previousStorePath;
    if (previousLlmEnabled === undefined) delete process.env.AI_QUALITY_LLM_ENABLED;
    else process.env.AI_QUALITY_LLM_ENABLED = previousLlmEnabled;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("handles a complaint email plus reply-guidance question in one turn", async () => {
    delete process.env.DATABASE_URL;
    process.env.AI_QUALITY_STORE_PATH = `/tmp/ai-quality-user-journey-${Date.now()}-1.json`;
    process.env.AI_QUALITY_LLM_ENABLED = "false";

    const { createCaseAggregate } = await import("@/lib/domain/workflow-engine");
    const { getCaseStore } = await import("@/lib/server/case-store");
    const { postEvidenceHandler } = await import("@/lib/server/api");

    const aggregate = createCaseAggregate("客户投诉邮件");
    const store = getCaseStore();
    await store.saveCase(aggregate);

    const payload = await postEvidenceHandler(aggregate.caseRecord.id, {
      content:
        "客户华星科技邮件反馈：昨日客户端上线后出现 3 台板卡上电冒烟，涉及批次 B19，要求 24 小时内回复临时遏制与初步分析。当前客户现场已暂停投线，我司仓库已先冻结库存待排查。客户 24 小时内要回复，我现在先怎么说？",
      contextStage: "D2",
    });

    expect(payload.conversationMeta?.intents).toEqual(["evidence", "question"]);
    expect(payload.conversationMeta?.sourceShape).toBe("long_document");
    expect(payload.conversationMeta?.responseMode).toBe("guide");
    expect(payload.messages.at(-1)?.content).toContain("我先帮你接下这个案件");
    expect(payload.messages.at(-1)?.content).toContain("你只需要补");
  });

  it("keeps meeting-note material on hold when it likely belongs to another case", async () => {
    delete process.env.DATABASE_URL;
    process.env.AI_QUALITY_STORE_PATH = `/tmp/ai-quality-user-journey-${Date.now()}-2.json`;
    process.env.AI_QUALITY_LLM_ENABLED = "false";

    const { buildSeedCase } = await import("@/lib/domain/seed-cases");
    const { getCaseStore } = await import("@/lib/server/case-store");
    const { postEvidenceHandler } = await import("@/lib/server/api");

    const aggregate = buildSeedCase("tantalum_reverse_polarity");
    const originalMessageCount = aggregate.messages.length;
    const store = getCaseStore();
    await store.saveCase(aggregate);

    const payload = await postEvidenceHandler(aggregate.caseRecord.id, {
      content:
        "会议纪要：客户华星科技今天会后确认，机种 MCU-900 在 B19 批次已有 3 台板卡上电冒烟，现场先停线并要求 24 小时内回复遏制措施。",
      contextStage: "D2",
    });

    expect(payload.conversationMeta?.sourceShape).toBe("meeting_notes");
    expect(payload.conversationMeta?.caseOperation).toBe("needs_case_confirmation");
    expect(payload.messages.length).toBe(originalMessageCount);
  });

  it("marks locked downstream stages as impacted when D5-era cases receive D2 correction evidence", async () => {
    delete process.env.DATABASE_URL;
    process.env.AI_QUALITY_STORE_PATH = `/tmp/ai-quality-user-journey-${Date.now()}-3.json`;
    process.env.AI_QUALITY_LLM_ENABLED = "false";

    const { buildSeedCase } = await import("@/lib/domain/seed-cases");
    const { confirmStage } = await import("@/lib/domain/workflow-engine");
    const { getCaseStore } = await import("@/lib/server/case-store");
    const { postEvidenceHandler } = await import("@/lib/server/api");

    let aggregate = buildSeedCase("tantalum_reverse_polarity");
    aggregate = confirmStage(aggregate, { stage: "D2" });
    aggregate = confirmStage(aggregate, { stage: "D3" });
    aggregate = confirmStage(aggregate, { stage: "D4" });
    aggregate = confirmStage(aggregate, { stage: "D5" });

    const store = getCaseStore();
    await store.saveCase(aggregate);

    const payload = await postEvidenceHandler(aggregate.caseRecord.id, {
      content: "等下，客户复盘后确认并非 C25 冒烟，而是连接器处瞬间打火，这会影响前面的判断。",
      contextStage: "D2",
    });

    expect(payload.conversationMeta?.intents).toEqual(["evidence", "correction"]);
    expect(payload.conversationMeta?.impactedStages).toEqual(expect.arrayContaining(["D3", "D4", "D5"]));
  });

  it("returns a current-state summary and still allows analysis preview afterwards", async () => {
    delete process.env.DATABASE_URL;
    process.env.AI_QUALITY_STORE_PATH = `/tmp/ai-quality-user-journey-${Date.now()}-4.json`;
    process.env.AI_QUALITY_LLM_ENABLED = "false";

    const { buildSeedCase } = await import("@/lib/domain/seed-cases");
    const { confirmStage } = await import("@/lib/domain/workflow-engine");
    const { getCaseStore } = await import("@/lib/server/case-store");
    const { postEvidenceHandler, reportPreviewHandler } = await import("@/lib/server/api");

    let aggregate = buildSeedCase("tantalum_reverse_polarity");
    aggregate = confirmStage(aggregate, { stage: "D4" });
    const store = getCaseStore();
    await store.saveCase(aggregate);

    const summaryPayload = await postEvidenceHandler(aggregate.caseRecord.id, {
      content: "帮我总结一下现在情况",
      contextStage: "D4",
    });
    const previewPayload = await reportPreviewHandler(
      aggregate.caseRecord.id,
      new URLSearchParams({ artifact: "analysis_summary" })
    );

    expect(summaryPayload.messages.at(-1)?.content).toContain("当前情况总结");
    expect(previewPayload.document.artifactKind).toBe("analysis_summary");
    expect(previewPayload.text).toContain("分析结论");
  });

  it("supports action-plan preview for mature cases after the user asks for the next deliverable", async () => {
    delete process.env.DATABASE_URL;
    process.env.AI_QUALITY_STORE_PATH = `/tmp/ai-quality-user-journey-${Date.now()}-5.json`;
    process.env.AI_QUALITY_LLM_ENABLED = "false";

    const { createCaseAggregate, applyEvidence, confirmStage } = await import("@/lib/domain/workflow-engine");
    const { getCaseStore } = await import("@/lib/server/case-store");
    const { postEvidenceHandler, reportHtmlHandler } = await import("@/lib/server/api");

    let aggregate = createCaseAggregate("行动方案旅程");
    aggregate = applyEvidence(aggregate, {
      content:
        "客户现场已暂停上线，库存已隔离，发生原因侧永久措施已经确定为切回正确贴装角度并锁定程序，流出原因侧补 AOI 阈值回调和出货前加严检查。",
      contextStage: "D5",
    });
    aggregate = confirmStage(aggregate, { stage: "D2", content: "客户端上电冒烟，需先围堵风险。" });
    aggregate = confirmStage(aggregate, { stage: "D3", content: "暂停出货，隔离库存，客户现场停线排查。" });
    aggregate = confirmStage(aggregate, { stage: "D4", content: "发生原因与流出原因已分开收敛。" });
    aggregate = confirmStage(aggregate, { stage: "D5", content: "发生原因侧改贴装角度，流出原因侧回调 AOI 阈值。" });
    const store = getCaseStore();
    await store.saveCase(aggregate);

    const questionPayload = await postEvidenceHandler(aggregate.caseRecord.id, {
      content: "我下一步做什么？",
      contextStage: "D5",
    });
    const actionPlanHtml = await reportHtmlHandler(
      aggregate.caseRecord.id,
      new URLSearchParams({ artifact: "action_plan" })
    );

    expect(questionPayload.conversationMeta?.intents).toEqual(["question"]);
    expect(questionPayload.conversationMeta?.sourceShape).toBe("question_only");
    expect(actionPlanHtml).toContain("行动方案");
  });

  it("holds mixed multi-complaint intake for case confirmation instead of silently merging them", async () => {
    delete process.env.DATABASE_URL;
    process.env.AI_QUALITY_STORE_PATH = `/tmp/ai-quality-user-journey-${Date.now()}-6.json`;
    process.env.AI_QUALITY_LLM_ENABLED = "false";

    const { buildSeedCase } = await import("@/lib/domain/seed-cases");
    const { getCaseStore } = await import("@/lib/server/case-store");
    const { postEvidenceHandler } = await import("@/lib/server/api");

    const aggregate = buildSeedCase("tantalum_reverse_polarity");
    const originalMessageCount = aggregate.messages.length;
    const store = getCaseStore();
    await store.saveCase(aggregate);

    const payload = await postEvidenceHandler(aggregate.caseRecord.id, {
      content:
        "客户华星科技邮件反馈：MCU-900 在 B19 批次上电冒烟，要求 24 小时内回复。另一个客户远航电子今天又补了一条，电源板在 C22 位号短路，要求同步拉通原因分析。",
      contextStage: "D2",
    });

    expect(payload.conversationMeta?.caseOperation).toBe("needs_case_confirmation");
    expect(payload.messages.length).toBe(originalMessageCount);
  });

  it("keeps hypothesis-style input as an assumption instead of confirmed fact", async () => {
    delete process.env.DATABASE_URL;
    process.env.AI_QUALITY_STORE_PATH = `/tmp/ai-quality-user-journey-${Date.now()}-7.json`;
    process.env.AI_QUALITY_LLM_ENABLED = "false";

    const { createCaseAggregate } = await import("@/lib/domain/workflow-engine");
    const { getCaseStore } = await import("@/lib/server/case-store");
    const { postEvidenceHandler } = await import("@/lib/server/api");

    const aggregate = createCaseAggregate("假设输入");
    const store = getCaseStore();
    await store.saveCase(aggregate);

    const payload = await postEvidenceHandler(aggregate.caseRecord.id, {
      content: "我先猜一下，可能是替代料导致的，但还没有验证，只是目前怀疑和换料有关。",
      contextStage: "D4",
    });

    expect(payload.assumptions.some((item) => item.needsValidation)).toBe(true);
    expect(
      payload.analysisSummary.confirmedFacts.some((item) => item.includes("替代料导致"))
    ).toBe(false);
  });

  it("does not overpromise a validated root cause when the user asks for a 24h customer commitment", async () => {
    delete process.env.DATABASE_URL;
    process.env.AI_QUALITY_STORE_PATH = `/tmp/ai-quality-user-journey-${Date.now()}-8.json`;
    process.env.AI_QUALITY_LLM_ENABLED = "false";

    const { createCaseAggregate } = await import("@/lib/domain/workflow-engine");
    const { getCaseStore } = await import("@/lib/server/case-store");
    const { postEvidenceHandler } = await import("@/lib/server/api");

    const aggregate = createCaseAggregate("24h 承诺");
    const store = getCaseStore();
    await store.saveCase(aggregate);

    const payload = await postEvidenceHandler(aggregate.caseRecord.id, {
      content:
        "客户现在要求 24 小时内直接给根因。现阶段只知道 B19 批次上电冒烟并已停线，我现在能怎么回复？",
      contextStage: "D2",
    });

    const latestMessage = payload.messages.at(-1)?.content ?? "";
    expect(payload.conversationMeta?.intents).toEqual(["evidence", "question"]);
    expect(latestMessage).not.toContain("根因已确认");
    expect(latestMessage).toContain("当前还缺");
  });

  it("updates risk posture when prior containment is rolled back by new input", async () => {
    delete process.env.DATABASE_URL;
    process.env.AI_QUALITY_STORE_PATH = `/tmp/ai-quality-user-journey-${Date.now()}-9.json`;
    process.env.AI_QUALITY_LLM_ENABLED = "false";

    const { createCaseAggregate, applyEvidence } = await import("@/lib/domain/workflow-engine");
    const { getCaseStore } = await import("@/lib/server/case-store");
    const { postEvidenceHandler } = await import("@/lib/server/api");

    let aggregate = createCaseAggregate("围堵撤回");
    aggregate = applyEvidence(aggregate, {
      content: "客户 MCU-800 批次 B12 上电冒烟，已暂停出货并隔离库存，客户现场先停线。",
      contextStage: "D3",
    });
    const store = getCaseStore();
    await store.saveCase(aggregate);

    const payload = await postEvidenceHandler(aggregate.caseRecord.id, {
      content: "更新一下，仓库那边刚确认库存其实还没有完全冻结，现场也还没全检完成。",
      contextStage: "D3",
    });

    expect(payload.riskFlags.length).toBeGreaterThan(0);
    expect(payload.analysisSummary.openQuestions.length).toBeGreaterThan(0);
  });
});
