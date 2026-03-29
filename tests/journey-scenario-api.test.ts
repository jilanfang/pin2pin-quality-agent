import { afterEach, describe, expect, it, vi } from "vitest";

import { STRUCTURED_JOURNEY_SCENARIOS } from "@/lib/domain/journey-scenarios";
import { ACTIVE_WORKFLOW_STAGES } from "@/lib/domain/types";

describe("journey scenario api regression", () => {
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

  async function prepareScenarioCase(
    scenarioId: string,
    options?: {
      confirmThroughStage?: (typeof ACTIVE_WORKFLOW_STAGES)[number];
    }
  ) {
    const scenario = STRUCTURED_JOURNEY_SCENARIOS.find((item) => item.scenarioId === scenarioId);
    expect(scenario).toBeDefined();

    const { createCaseAggregate, confirmStage } = await import("@/lib/domain/workflow-engine");
    const { getCaseStore } = await import("@/lib/server/case-store");

    let aggregate = createCaseAggregate(scenario!.currentCaseTitle);
    aggregate.knownFacts = [...scenario!.currentKnownFacts];

    if (options?.confirmThroughStage) {
      for (const stage of ACTIVE_WORKFLOW_STAGES) {
        aggregate = confirmStage(aggregate, { stage, content: `${stage} 已确认` });
        if (stage === options.confirmThroughStage) break;
      }
    }

    const store = getCaseStore();
    await store.saveCase(aggregate);

    return { aggregate, scenario };
  }

  it("holds likely different cases for confirmation when a structured scenario says so", async () => {
    delete process.env.DATABASE_URL;
    process.env.AI_QUALITY_STORE_PATH = `/tmp/ai-quality-journey-api-${Date.now()}-1.json`;
    process.env.AI_QUALITY_LLM_ENABLED = "false";

    const { postEvidenceHandler } = await import("@/lib/server/api");
    const { aggregate, scenario } = await prepareScenarioCase("CQ-02-D2-01");
    const originalMessageCount = aggregate.messages.length;

    const payload = await postEvidenceHandler(aggregate.caseRecord.id, {
      content: scenario!.rawInput,
      contextStage: scenario!.stage,
    });

    expect(payload.conversationMeta?.caseOperation).toBe("needs_case_confirmation");
    expect(payload.conversationMeta?.sourceShape).toBe(scenario!.expectedSourceShape);
    expect(payload.messages.length).toBe(originalMessageCount);
  });

  it("returns a case summary for summary_request scenarios from the structured pack", async () => {
    delete process.env.DATABASE_URL;
    process.env.AI_QUALITY_STORE_PATH = `/tmp/ai-quality-journey-api-${Date.now()}-2.json`;
    process.env.AI_QUALITY_LLM_ENABLED = "false";

    const { postEvidenceHandler } = await import("@/lib/server/api");
    const { aggregate, scenario } = await prepareScenarioCase("CQ-01-D7-01", {
      confirmThroughStage: "D7",
    });

    const payload = await postEvidenceHandler(aggregate.caseRecord.id, {
      content: scenario!.rawInput,
      contextStage: scenario!.stage,
    });

    expect(payload.conversationMeta?.intents).toEqual(scenario!.expectedIntents);
    expect(payload.conversationMeta?.responseMode).toBe("result_action");
    expect(payload.messages.at(-1)?.content).toContain("当前情况总结");
  });

  it("keeps direct deliverable requests in result_action mode for structured decision scenarios", async () => {
    delete process.env.DATABASE_URL;
    process.env.AI_QUALITY_STORE_PATH = `/tmp/ai-quality-journey-api-${Date.now()}-3.json`;
    process.env.AI_QUALITY_LLM_ENABLED = "false";

    const { postEvidenceHandler } = await import("@/lib/server/api");
    const { aggregate, scenario } = await prepareScenarioCase("QE-01-D5-01", {
      confirmThroughStage: "D5",
    });

    const payload = await postEvidenceHandler(aggregate.caseRecord.id, {
      content: scenario!.rawInput,
      contextStage: scenario!.stage,
    });

    expect(payload.conversationMeta?.intents).toEqual(["decision_signal"]);
    expect(payload.conversationMeta?.responseMode).toBe("result_action");
    expect(payload.resultRecommendation.primaryActionLabel).toContain("行动方案");
  });

  it("marks impacted stages for p0 correction scenarios instead of silently keeping prior judgement", async () => {
    delete process.env.DATABASE_URL;
    process.env.AI_QUALITY_STORE_PATH = `/tmp/ai-quality-journey-api-${Date.now()}-4.json`;
    process.env.AI_QUALITY_LLM_ENABLED = "false";

    const { applyEvidence } = await import("@/lib/domain/workflow-engine");
    const { getCaseStore } = await import("@/lib/server/case-store");
    const { postEvidenceHandler } = await import("@/lib/server/api");
    const prepared = await prepareScenarioCase("CQ-01-D4-01", {
      confirmThroughStage: "D4",
    });
    const scenario = prepared.scenario;
    const aggregate = applyEvidence(prepared.aggregate, {
      content: "客户确认失效位置先按 C25 冒烟推进，围堵与原因链判断基于这个位置先行展开。",
      contextStage: "D2",
    });
    const store = getCaseStore();
    await store.saveCase(aggregate);

    const payload = await postEvidenceHandler(aggregate.caseRecord.id, {
      content: scenario!.rawInput,
      contextStage: scenario!.stage,
    });

    expect(scenario?.priority).toBe("p0");
    expect(payload.conversationMeta?.impactedStages).toEqual(expect.arrayContaining(["D3", "D4"]));
    expect(payload.conversationMeta?.thinking.mode).toBe("reviewing_prior_judgement");
  });

  it("keeps direct 8D requests in p0 scenarios from jumping straight to final output", async () => {
    delete process.env.DATABASE_URL;
    process.env.AI_QUALITY_STORE_PATH = `/tmp/ai-quality-journey-api-${Date.now()}-5.json`;
    process.env.AI_QUALITY_LLM_ENABLED = "false";

    const { postEvidenceHandler } = await import("@/lib/server/api");
    const { aggregate, scenario } = await prepareScenarioCase("SQE-02-D5-01", {
      confirmThroughStage: "D5",
    });

    const payload = await postEvidenceHandler(aggregate.caseRecord.id, {
      content: scenario!.rawInput,
      contextStage: scenario!.stage,
    });

    expect(scenario?.priority).toBe("p0");
    expect(payload.conversationMeta?.responseMode).toBe("result_action");
    expect(payload.resultRecommendation.kind).not.toBe("eight_d");
    expect(payload.resultRecommendation.primaryActionLabel).toContain("行动方案");
  });

  it("keeps one-line reply guidance in inform mode without inventing a confirmed root cause", async () => {
    delete process.env.DATABASE_URL;
    process.env.AI_QUALITY_STORE_PATH = `/tmp/ai-quality-journey-api-${Date.now()}-6.json`;
    process.env.AI_QUALITY_LLM_ENABLED = "false";

    const { postEvidenceHandler } = await import("@/lib/server/api");
    const { aggregate, scenario } = await prepareScenarioCase("SQE-01-D5-01", {
      confirmThroughStage: "D5",
    });

    const payload = await postEvidenceHandler(aggregate.caseRecord.id, {
      content: scenario!.rawInput,
      contextStage: scenario!.stage,
    });

    const latestMessage = payload.messages.at(-1)?.content ?? "";

    expect(scenario?.priority).toBe("p0");
    expect(payload.conversationMeta?.responseMode).toBe("inform");
    expect(latestMessage).not.toContain("根因已确认");
    expect(latestMessage).not.toContain("生成 8D");
  });

  it("treats p0 summary-plus-guidance scenarios as summary actions rather than plain chat replies", async () => {
    delete process.env.DATABASE_URL;
    process.env.AI_QUALITY_STORE_PATH = `/tmp/ai-quality-journey-api-${Date.now()}-7.json`;
    process.env.AI_QUALITY_LLM_ENABLED = "false";

    const { postEvidenceHandler } = await import("@/lib/server/api");
    const { aggregate, scenario } = await prepareScenarioCase("QE-02-D6-01", {
      confirmThroughStage: "D6",
    });

    const payload = await postEvidenceHandler(aggregate.caseRecord.id, {
      content: scenario!.rawInput,
      contextStage: scenario!.stage,
    });

    expect(scenario?.priority).toBe("p0");
    expect(payload.conversationMeta?.intents).toEqual(["evidence", "summary_request"]);
    expect(payload.conversationMeta?.responseMode).toBe("result_action");
    expect(payload.messages.at(-1)?.content).toContain("当前情况总结");
  });

  it("keeps meeting-note intake ambiguity in p0 scenarios behind case confirmation", async () => {
    delete process.env.DATABASE_URL;
    process.env.AI_QUALITY_STORE_PATH = `/tmp/ai-quality-journey-api-${Date.now()}-8.json`;
    process.env.AI_QUALITY_LLM_ENABLED = "false";

    const { postEvidenceHandler } = await import("@/lib/server/api");
    const { aggregate, scenario } = await prepareScenarioCase("SQE-02-D2-01");
    const originalMessageCount = aggregate.messages.length;

    const payload = await postEvidenceHandler(aggregate.caseRecord.id, {
      content: scenario!.rawInput,
      contextStage: scenario!.stage,
    });

    expect(scenario?.priority).toBe("p0");
    expect(payload.conversationMeta?.sourceShape).toBe("meeting_notes");
    expect(payload.conversationMeta?.caseOperation).toBe("needs_case_confirmation");
    expect(payload.messages.length).toBe(originalMessageCount);
  });
});
