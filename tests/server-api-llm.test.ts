import { afterEach, describe, expect, it, vi } from "vitest";

import { buildConversationLlmResponse } from "@/tests/test-helpers/conversation-llm";

describe("server api llm integration", () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousStorePath = process.env.AI_QUALITY_STORE_PATH;
  const previousLlmEnabled = process.env.AI_QUALITY_LLM_ENABLED;
  const previousRuleBaseline = process.env.AI_QUALITY_LLM_RULE_BASELINE;
  const previousProvider = process.env.AI_QUALITY_LLM_PROVIDER;
  const previousDashscopeKey = process.env.DASHSCOPE_API_KEY;
  const previousModel = process.env.AI_QUALITY_LLM_MODEL_EXTRACT;

  afterEach(() => {
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
    if (previousStorePath === undefined) delete process.env.AI_QUALITY_STORE_PATH;
    else process.env.AI_QUALITY_STORE_PATH = previousStorePath;
    if (previousLlmEnabled === undefined) delete process.env.AI_QUALITY_LLM_ENABLED;
    else process.env.AI_QUALITY_LLM_ENABLED = previousLlmEnabled;
    if (previousRuleBaseline === undefined) delete process.env.AI_QUALITY_LLM_RULE_BASELINE;
    else process.env.AI_QUALITY_LLM_RULE_BASELINE = previousRuleBaseline;
    if (previousProvider === undefined) delete process.env.AI_QUALITY_LLM_PROVIDER;
    else process.env.AI_QUALITY_LLM_PROVIDER = previousProvider;
    if (previousDashscopeKey === undefined) delete process.env.DASHSCOPE_API_KEY;
    else process.env.DASHSCOPE_API_KEY = previousDashscopeKey;
    if (previousModel === undefined) delete process.env.AI_QUALITY_LLM_MODEL_EXTRACT;
    else process.env.AI_QUALITY_LLM_MODEL_EXTRACT = previousModel;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("uses llm extraction before applying evidence when llm is enabled", async () => {
    delete process.env.DATABASE_URL;
    process.env.AI_QUALITY_STORE_PATH = `/tmp/ai-quality-server-api-llm-${Date.now()}-1.json`;
    process.env.AI_QUALITY_LLM_ENABLED = "true";
    process.env.AI_QUALITY_LLM_PROVIDER = "qwen";
    process.env.DASHSCOPE_API_KEY = "test-key";
    process.env.AI_QUALITY_LLM_MODEL_EXTRACT = "qwen-plus";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions") {
        return new Response(
          buildConversationLlmResponse({
            content: "客户那边又炸了，情况很急。",
            contextStage: "D2",
            currentCaseTitle: "LLM API",
            currentKnownFacts: [],
            knownFacts: [{ field: "customer", value: "大麦科技", confidence: 0.96 }],
          }),
          { status: 200 }
        );
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { createCaseAggregate } = await import("@/lib/domain/workflow-engine");
    const { getCaseStore } = await import("@/lib/server/case-store");
    const { postEvidenceHandler } = await import("@/lib/server/api");

    const store = getCaseStore();
    const aggregate = createCaseAggregate("LLM API");
    await store.saveCase(aggregate);

    const payload = await postEvidenceHandler(aggregate.caseRecord.id, {
      content: "客户那边又炸了，情况很急。",
      contextStage: "D2",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      expect.any(Object)
    );
    expect(payload.knownFacts.find((item) => item.field === "customer")?.value).toBe("大麦科技");
    expect(payload.conversationMeta?.analysisSource).toBe("llm");
    expect(payload.conversationMeta?.analysisVersion).toBeTruthy();
  }, 15000);

  it("fails closed without mutating the case when conversation llm is disabled", async () => {
    delete process.env.DATABASE_URL;
    process.env.AI_QUALITY_STORE_PATH = `/tmp/ai-quality-server-api-llm-${Date.now()}-blocked.json`;
    process.env.AI_QUALITY_LLM_ENABLED = "false";

    const { createCaseAggregate } = await import("@/lib/domain/workflow-engine");
    const { getCaseStore } = await import("@/lib/server/case-store");
    const { postEvidenceHandler } = await import("@/lib/server/api");

    const store = getCaseStore();
    const aggregate = createCaseAggregate("LLM blocked");
    await store.saveCase(aggregate);

    await expect(
      postEvidenceHandler(aggregate.caseRecord.id, {
        content: "客户大麦科技反馈 MCU-800 产线停线。",
        contextStage: "D2",
      })
    ).rejects.toMatchObject({
      code: "llm_required_unavailable",
    });

    const reloaded = await store.getCase(aggregate.caseRecord.id);
    expect(reloaded?.messages).toHaveLength(0);
    expect(reloaded?.knownFacts).toHaveLength(0);
  });

  it("returns a current-state summary when the user asks for a summary mid-conversation", async () => {
    delete process.env.DATABASE_URL;
    process.env.AI_QUALITY_STORE_PATH = `/tmp/ai-quality-server-api-llm-${Date.now()}-2.json`;
    process.env.AI_QUALITY_LLM_ENABLED = "false";
    process.env.AI_QUALITY_LLM_RULE_BASELINE = "true";

    const { getCaseStore } = await import("@/lib/server/case-store");
    const { buildSeedCase } = await import("@/lib/domain/seed-cases");
    const { confirmStage } = await import("@/lib/domain/workflow-engine");
    const { postEvidenceHandler } = await import("@/lib/server/api");

    const aggregate = confirmStage(buildSeedCase("tantalum_reverse_polarity"), { stage: "D4" });
    const store = getCaseStore();
    await store.saveCase(aggregate);

    const payload = await postEvidenceHandler(aggregate.caseRecord.id, {
      content: "帮我总结一下现在情况",
      contextStage: "D4",
    });

    expect(payload.conversationMeta?.intents).toEqual(["summary_request"]);
    expect(payload.conversationMeta?.primaryStage).toBe("D4");
    expect(payload.conversationMeta?.thinking.mode).toBe("summarizing_case");
    expect(payload.conversationMeta?.thinking.steps.length).toBeGreaterThan(0);

    const latestMessage = payload.messages.at(-1);
    expect(latestMessage?.role).toBe("assistant");
    expect(latestMessage?.content).toContain("当前情况总结");
    expect(latestMessage?.content).toContain("已确认事实");
    expect(latestMessage?.content).toContain("当前判断");
    expect(latestMessage?.content).toContain("还缺什么");
  });

  it("absorbs new evidence first and then summarizes when the user mixes facts with a summary request", async () => {
    delete process.env.DATABASE_URL;
    process.env.AI_QUALITY_STORE_PATH = `/tmp/ai-quality-server-api-llm-${Date.now()}-3.json`;
    process.env.AI_QUALITY_LLM_ENABLED = "false";
    process.env.AI_QUALITY_LLM_RULE_BASELINE = "true";

    const { getCaseStore } = await import("@/lib/server/case-store");
    const { createCaseAggregate } = await import("@/lib/domain/workflow-engine");
    const { postEvidenceHandler } = await import("@/lib/server/api");

    const aggregate = createCaseAggregate("Mixed summary");
    const store = getCaseStore();
    await store.saveCase(aggregate);

    const payload = await postEvidenceHandler(aggregate.caseRecord.id, {
      content: "客户大麦科技反馈MCU-800冒烟，批次B12。顺便帮我总结一下现在情况。",
      contextStage: "D2",
    });

    expect(payload.conversationMeta?.intents).toEqual(["evidence", "summary_request"]);
    expect(payload.conversationMeta?.primaryStage).toBe("D2");
    expect(payload.conversationMeta?.thinking.mode).toBe("summarizing_case");
    expect(payload.knownFacts.find((item) => item.field === "customer")?.value).toBe("大麦科技");
    expect(payload.messages.at(-1)?.content).toContain("当前情况总结");
    expect(payload.messages.some((item) => item.messageType === "evidence")).toBe(true);
  });

  it("classifies direct why-or-what-next turns as question and returns conversation metadata", async () => {
    delete process.env.DATABASE_URL;
    process.env.AI_QUALITY_STORE_PATH = `/tmp/ai-quality-server-api-llm-${Date.now()}-4.json`;
    process.env.AI_QUALITY_LLM_ENABLED = "false";
    process.env.AI_QUALITY_LLM_RULE_BASELINE = "true";

    const { getCaseStore } = await import("@/lib/server/case-store");
    const { buildSeedCase } = await import("@/lib/domain/seed-cases");
    const { confirmStage } = await import("@/lib/domain/workflow-engine");
    const { postEvidenceHandler } = await import("@/lib/server/api");

    const aggregate = confirmStage(buildSeedCase("tantalum_reverse_polarity"), { stage: "D4" });
    const store = getCaseStore();
    await store.saveCase(aggregate);

    const payload = await postEvidenceHandler(aggregate.caseRecord.id, {
      content: "为什么你现在还停在 D4，还缺什么最关键？",
      contextStage: "D4",
    });

    expect(payload.conversationMeta?.intents).toEqual(["question"]);
    expect(payload.conversationMeta?.primaryStage).toBe("D4");
    expect(payload.conversationMeta?.thinking.mode).toBe("processing_input");
    expect(payload.conversationMeta?.impactedStages).toEqual([]);
  });

  it("marks upstream stages as impacted when correction-style evidence overturns prior judgement", async () => {
    delete process.env.DATABASE_URL;
    process.env.AI_QUALITY_STORE_PATH = `/tmp/ai-quality-server-api-llm-${Date.now()}-5.json`;
    process.env.AI_QUALITY_LLM_ENABLED = "false";
    process.env.AI_QUALITY_LLM_RULE_BASELINE = "true";

    const { getCaseStore } = await import("@/lib/server/case-store");
    const { buildSeedCase } = await import("@/lib/domain/seed-cases");
    const { confirmStage } = await import("@/lib/domain/workflow-engine");
    const { postEvidenceHandler } = await import("@/lib/server/api");

    const aggregate = confirmStage(buildSeedCase("tantalum_reverse_polarity"), { stage: "D4" });
    const store = getCaseStore();
    await store.saveCase(aggregate);

    const payload = await postEvidenceHandler(aggregate.caseRecord.id, {
      content: "等下，客户复盘后确认并非 C25 冒烟，而是连接器处瞬间打火，前面的失效位置判断要回看。",
      contextStage: "D2",
    });

    expect(payload.conversationMeta?.intents).toEqual(["evidence", "correction"]);
    expect(payload.conversationMeta?.primaryStage).toBe("D2");
    expect(payload.conversationMeta?.thinking.mode).toBe("reviewing_prior_judgement");
    expect(payload.conversationMeta?.impactedStages).toContain("D3");
    expect(payload.conversationMeta?.impactedStages).toContain("D4");
  });

  it("treats a pasted complaint email as intake-style input and returns a case-taking reply", async () => {
    delete process.env.DATABASE_URL;
    process.env.AI_QUALITY_STORE_PATH = `/tmp/ai-quality-server-api-llm-${Date.now()}-6.json`;
    process.env.AI_QUALITY_LLM_ENABLED = "false";
    process.env.AI_QUALITY_LLM_RULE_BASELINE = "true";

    const { getCaseStore } = await import("@/lib/server/case-store");
    const { createCaseAggregate } = await import("@/lib/domain/workflow-engine");
    const { postEvidenceHandler } = await import("@/lib/server/api");

    const aggregate = createCaseAggregate("投诉邮件接案");
    const store = getCaseStore();
    await store.saveCase(aggregate);

    const payload = await postEvidenceHandler(aggregate.caseRecord.id, {
      content:
        "客户华星科技邮件反馈：昨日客户端上线后出现 3 台板卡上电冒烟，涉及批次 B19，要求 24 小时内回复临时遏制与初步分析。当前客户现场已暂停投线，我司仓库已先冻结库存待排查。",
      contextStage: "D2",
    });

    expect(payload.conversationMeta?.intents).toEqual(["evidence"]);
    expect(payload.conversationMeta?.sourceShape).toBe("long_document");
    expect(payload.conversationMeta?.caseOperation).toBe("attach_to_current_case");
    expect(payload.conversationMeta?.responseMode).toBe("guide");

    const latestMessage = payload.messages.at(-1);
    expect(latestMessage?.role).toBe("assistant");
    expect(latestMessage?.content).toContain("我先帮你接下这个案件");
    expect(latestMessage?.content).toContain("我已提取到");
    expect(latestMessage?.content).toContain("当前还缺");
    expect(latestMessage?.content).toContain("你只需要补");
  });

  it("classifies fragmented chat-style updates without pretending they are full documents", async () => {
    delete process.env.DATABASE_URL;
    process.env.AI_QUALITY_STORE_PATH = `/tmp/ai-quality-server-api-llm-${Date.now()}-7.json`;
    process.env.AI_QUALITY_LLM_ENABLED = "false";
    process.env.AI_QUALITY_LLM_RULE_BASELINE = "true";

    const { getCaseStore } = await import("@/lib/server/case-store");
    const { createCaseAggregate } = await import("@/lib/domain/workflow-engine");
    const { postEvidenceHandler } = await import("@/lib/server/api");

    const aggregate = createCaseAggregate("微信碎片补充");
    const store = getCaseStore();
    await store.saveCase(aggregate);

    const payload = await postEvidenceHandler(aggregate.caseRecord.id, {
      content: "客户又补了一句，B19 先别放，现场已经停线了。",
      contextStage: "D2",
    });

    expect(payload.conversationMeta?.intents).toEqual(["evidence"]);
    expect(payload.conversationMeta?.sourceShape).toBe("fragmented_update");
    expect(payload.conversationMeta?.caseOperation).toBe("attach_to_current_case");
    expect(payload.conversationMeta?.responseMode).toBe("guide");
  });

  it("treats fragmented updates with a direct question as mixed input and still guides the case forward", async () => {
    delete process.env.DATABASE_URL;
    process.env.AI_QUALITY_STORE_PATH = `/tmp/ai-quality-server-api-llm-${Date.now()}-8.json`;
    process.env.AI_QUALITY_LLM_ENABLED = "false";
    process.env.AI_QUALITY_LLM_RULE_BASELINE = "true";

    const { getCaseStore } = await import("@/lib/server/case-store");
    const { createCaseAggregate } = await import("@/lib/domain/workflow-engine");
    const { postEvidenceHandler } = await import("@/lib/server/api");

    const aggregate = createCaseAggregate("碎片输入混合提问");
    const store = getCaseStore();
    await store.saveCase(aggregate);

    const payload = await postEvidenceHandler(aggregate.caseRecord.id, {
      content: "客户补充 B19 先别放，现场已经停线了。现在先给客户怎么说？",
      contextStage: "D2",
    });

    expect(payload.conversationMeta?.intents).toEqual(["evidence", "question"]);
    expect(payload.conversationMeta?.sourceShape).toBe("mixed_input");
    expect(payload.conversationMeta?.caseOperation).toBe("attach_to_current_case");
    expect(payload.conversationMeta?.responseMode).toBe("guide");

    const latestMessage = payload.messages.at(-1);
    expect(latestMessage?.role).toBe("assistant");
    expect(latestMessage?.content).toContain("我先帮你接下这个案件");
    expect(latestMessage?.content).toContain("当前还缺");
  });

  it("returns confirmation semantics without mutating the current case when the input likely belongs to another case", async () => {
    delete process.env.DATABASE_URL;
    process.env.AI_QUALITY_STORE_PATH = `/tmp/ai-quality-server-api-llm-${Date.now()}-9.json`;
    process.env.AI_QUALITY_LLM_ENABLED = "false";
    process.env.AI_QUALITY_LLM_RULE_BASELINE = "true";

    const { getCaseStore } = await import("@/lib/server/case-store");
    const { buildSeedCase } = await import("@/lib/domain/seed-cases");
    const { postEvidenceHandler } = await import("@/lib/server/api");

    const aggregate = buildSeedCase("tantalum_reverse_polarity");
    const originalMessageCount = aggregate.messages.length;
    const store = getCaseStore();
    await store.saveCase(aggregate);

    const payload = await postEvidenceHandler(aggregate.caseRecord.id, {
      content:
        "客户华星科技邮件反馈：昨日客户端上线后出现 3 台板卡上电冒烟，涉及机种 MCU-900 与批次 B19，要求 24 小时内回复临时遏制与初步分析。当前客户现场已暂停投线，我司仓库已先冻结库存待排查。",
      contextStage: "D2",
    });

    expect(payload.conversationMeta?.caseOperation).toBe("needs_case_confirmation");
    expect(payload.messages.length).toBe(originalMessageCount);

    const reloaded = await store.getCase(aggregate.caseRecord.id);
    expect(reloaded?.messages.length).toBe(originalMessageCount);
    expect(reloaded?.knownFacts.find((item) => item.value.includes("华星科技"))).toBeUndefined();
  });
});
