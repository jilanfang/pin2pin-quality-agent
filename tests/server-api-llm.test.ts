import { afterEach, describe, expect, it, vi } from "vitest";

describe("server api llm integration", () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousStorePath = process.env.AI_QUALITY_STORE_PATH;
  const previousLlmEnabled = process.env.AI_QUALITY_LLM_ENABLED;
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
    process.env.AI_QUALITY_LLM_ENABLED = "true";
    process.env.AI_QUALITY_LLM_PROVIDER = "qwen";
    process.env.DASHSCOPE_API_KEY = "test-key";
    process.env.AI_QUALITY_LLM_MODEL_EXTRACT = "qwen-plus";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions") {
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    knownFacts: [{ field: "customer", value: "大麦科技", confidence: 0.96 }],
                    assumptions: [],
                    riskFlags: [],
                  }),
                },
              },
            ],
          }),
          { status: 200 }
        );
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { createCaseAggregate, applyEvidence } = await import("@/lib/domain/workflow-engine");
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
  });
});
