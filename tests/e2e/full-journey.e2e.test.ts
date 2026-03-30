import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { assertChineseText, assertFactExtracted, E2E_DATABASE_URL, truncateAllTables } from "./e2e-helpers";

describe("full journey e2e", () => {
  const savedEnv: Record<string, string | undefined> = {};
  const ENV_KEYS = [
    "DATABASE_URL",
    "AI_QUALITY_STORE_PATH",
    "AI_QUALITY_LLM_ENABLED",
    "AI_QUALITY_LLM_RULE_BASELINE",
    "AI_QUALITY_LLM_CONVERSATION_TIMEOUT_MS",
  ];

  beforeEach(async () => {
    for (const key of ENV_KEYS) savedEnv[key] = process.env[key];

    process.env.DATABASE_URL = E2E_DATABASE_URL;
    delete process.env.AI_QUALITY_STORE_PATH;
    process.env.AI_QUALITY_LLM_ENABLED = "true";
    delete process.env.AI_QUALITY_LLM_RULE_BASELINE;
    process.env.AI_QUALITY_LLM_CONVERSATION_TIMEOUT_MS = "20000";

    vi.resetModules();
    await truncateAllTables();
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
    vi.restoreAllMocks();
    vi.resetModules();
    delete (globalThis as Record<string, unknown>).__aiQualitySql;
    delete (globalThis as Record<string, unknown>).__aiQualityDb;
  });

  it("completes a full investigation journey: create → evidence → correct → summary → confirm → report", { timeout: 120_000 }, async () => {
    const { createCaseAggregate } = await import("@/lib/domain/workflow-engine");
    const { getCaseStore } = await import("@/lib/server/case-store");
    const { postEvidenceHandler, stageActionHandler, reportPreviewHandler } = await import("@/lib/server/api");

    const store = getCaseStore();

    // Step 1: Create case
    const aggregate = createCaseAggregate("E2E 全流程测试 - 华星科技客诉");
    await store.saveCase(aggregate);
    const caseId = aggregate.caseRecord.id;

    // Step 2: Submit complaint email evidence
    const evidenceResult = await postEvidenceHandler(caseId, {
      content:
        "客户华星科技邮件反馈：昨日客户端上线后出现 3 台板卡上电冒烟，涉及机种 MCU-800 与批次 B19，要求 24 小时内回复临时遏制与初步分析。当前客户现场已暂停投线，我司仓库已先冻结库存待排查。",
      contextStage: "D2",
    });

    expect(evidenceResult.conversationMeta?.intents).toContain("evidence");
    expect(evidenceResult.conversationMeta?.analysisSource).toBe("llm");
    assertFactExtracted(evidenceResult.knownFacts, "customer", "华星");
    expect(evidenceResult.messages.length).toBeGreaterThan(0);

    // Step 3: Submit a correction
    const correctionResult = await postEvidenceHandler(caseId, {
      content: "更正：经复盘确认并非板卡冒烟，实际是连接器处瞬间打火，失效位置需要修正。",
      contextStage: "D2",
    });

    expect(correctionResult.conversationMeta?.intents).toContain("correction");

    // Step 4: Request summary
    const summaryResult = await postEvidenceHandler(caseId, {
      content: "帮我总结一下目前情况",
      contextStage: "D2",
    });

    expect(summaryResult.conversationMeta?.intents).toContain("summary_request");
    const summaryMsg = summaryResult.messages.at(-1);
    expect(summaryMsg?.content).toContain("当前情况总结");

    // Step 5: Confirm D2 stage
    const confirmResult = await stageActionHandler(caseId, "D2", "confirm", {});
    expect(confirmResult.stages.find((s) => s.stage === "D2")?.locked).toBe(true);

    // Step 6: Generate analysis summary report preview
    const reportResult = await reportPreviewHandler(
      caseId,
      new URLSearchParams({ artifact: "analysis_summary" })
    );
    expect(reportResult).toBeDefined();
    expect(reportResult.document).toBeDefined();

    // Step 7: Verify persistence consistency
    const finalCase = await store.getCase(caseId);
    expect(finalCase).not.toBeNull();
    expect(finalCase!.messages.length).toBeGreaterThanOrEqual(4); // user+assistant pairs
    expect(finalCase!.knownFacts.length).toBeGreaterThan(0);
    expect(finalCase!.stages.D2.locked).toBe(true);
  });
});
