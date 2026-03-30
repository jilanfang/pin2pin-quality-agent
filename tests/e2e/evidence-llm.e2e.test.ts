import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  assertChineseText,
  assertFactExtracted,
  E2E_DATABASE_URL,
  truncateAllTables,
} from "./e2e-helpers";

describe("evidence llm e2e", () => {
  // Save original env
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
    // Clear the DB singleton so next test gets a fresh connection
    delete (globalThis as Record<string, unknown>).__aiQualitySql;
    delete (globalThis as Record<string, unknown>).__aiQualityDb;
  });

  it("extracts customer and model from a complaint email via real LLM", async () => {
    const { createCaseAggregate } = await import("@/lib/domain/workflow-engine");
    const { getCaseStore } = await import("@/lib/server/case-store");
    const { postEvidenceHandler } = await import("@/lib/server/api");

    const store = getCaseStore();
    const aggregate = createCaseAggregate("华星科技客诉 E2E");
    await store.saveCase(aggregate);

    const payload = await postEvidenceHandler(aggregate.caseRecord.id, {
      content:
        "客户华星科技邮件反馈：昨日客户端上线后出现 3 台板卡上电冒烟，涉及机种 MCU-800 与批次 B19，要求 24 小时内回复临时遏制与初步分析。当前客户现场已暂停投线，我司仓库已先冻结库存待排查。",
      contextStage: "D2",
    });

    // Structure assertions (hard)
    expect(payload.conversationMeta?.intents).toContain("evidence");
    expect(payload.conversationMeta?.sourceShape).toBe("long_document");
    expect(payload.conversationMeta?.caseOperation).toBe("attach_to_current_case");
    expect(payload.conversationMeta?.analysisSource).toBe("llm");

    // Content assertions (strict)
    assertFactExtracted(payload.knownFacts, "customer", "华星");
    assertChineseText(
      payload.messages.find((m) => m.role === "assistant")?.content ?? "",
      10
    );

    // Persistence assertions: re-read from Postgres
    const reloaded = await store.getCase(aggregate.caseRecord.id);
    expect(reloaded).not.toBeNull();
    expect(reloaded!.knownFacts.length).toBeGreaterThan(0);
    expect(reloaded!.messages.length).toBeGreaterThan(0);
    assertFactExtracted(reloaded!.knownFacts, "customer", "华星");
  });

  it("classifies a fragmented chat update correctly via real LLM", async () => {
    const { createCaseAggregate } = await import("@/lib/domain/workflow-engine");
    const { getCaseStore } = await import("@/lib/server/case-store");
    const { postEvidenceHandler } = await import("@/lib/server/api");

    const store = getCaseStore();
    const aggregate = createCaseAggregate("碎片更新 E2E");
    await store.saveCase(aggregate);

    const payload = await postEvidenceHandler(aggregate.caseRecord.id, {
      content: "客户又补了一句，B19 先别放，现场已经停线了。",
      contextStage: "D2",
    });

    expect(payload.conversationMeta?.intents).toContain("evidence");
    expect(["fragmented_update", "mixed_input"]).toContain(
      payload.conversationMeta?.sourceShape
    );
    expect(payload.conversationMeta?.responseMode).toBe("guide");
  });

  it("detects correction intent via real LLM", async () => {
    const { createCaseAggregate } = await import("@/lib/domain/workflow-engine");
    const { getCaseStore } = await import("@/lib/server/case-store");
    const { postEvidenceHandler } = await import("@/lib/server/api");

    const store = getCaseStore();
    const aggregate = createCaseAggregate("纠偏检测 E2E");
    await store.saveCase(aggregate);

    // First submit some evidence to establish context
    await postEvidenceHandler(aggregate.caseRecord.id, {
      content: "客户华星科技反馈 MCU-800 C25 冒烟。",
      contextStage: "D2",
    });

    // Then submit a correction
    const payload = await postEvidenceHandler(aggregate.caseRecord.id, {
      content:
        "等下，之前的判断不对，实际上不是 C25 冒烟而是连接器处瞬间打火，前面的失效位置判断需要修正。",
      contextStage: "D2",
    });

    expect(payload.conversationMeta?.intents).toContain("correction");
    expect(payload.conversationMeta?.thinking.mode).toBe("reviewing_prior_judgement");
  });

  it("generates a summary when requested via real LLM", async () => {
    const { createCaseAggregate } = await import("@/lib/domain/workflow-engine");
    const { getCaseStore } = await import("@/lib/server/case-store");
    const { postEvidenceHandler } = await import("@/lib/server/api");

    const store = getCaseStore();
    const aggregate = createCaseAggregate("摘要请求 E2E");
    await store.saveCase(aggregate);

    // First submit some evidence
    await postEvidenceHandler(aggregate.caseRecord.id, {
      content: "客户华星科技 MCU-800 上电冒烟，批次 B19，已停线围堵。",
      contextStage: "D2",
    });

    // Then ask for a summary
    const payload = await postEvidenceHandler(aggregate.caseRecord.id, {
      content: "帮我总结一下目前情况",
      contextStage: "D2",
    });

    // summaryRequested is on ConversationTurnAnalysis, not on the serialized payload.
    // Assert via observable effect: buildConversationSummary produces this heading.
    const summaryMessage = payload.messages.at(-1);
    expect(summaryMessage?.role).toBe("assistant");
    expect(summaryMessage?.content).toContain("当前情况总结");
  });

  it("holds for case confirmation when input is unrelated to current case via real LLM", async () => {
    const { getCaseStore } = await import("@/lib/server/case-store");
    const { buildSeedCase } = await import("@/lib/domain/seed-cases");
    const { postEvidenceHandler } = await import("@/lib/server/api");

    const store = getCaseStore();
    const aggregate = buildSeedCase("tantalum_reverse_polarity");
    await store.saveCase(aggregate);
    const originalMessageCount = aggregate.messages.length;

    const payload = await postEvidenceHandler(aggregate.caseRecord.id, {
      content:
        "另一个客户大麦科技反馈了完全不同的问题：PCB 翘曲导致 BGA 脱焊，涉及不同产品线 PX-500。",
      contextStage: "D2",
    });

    expect(payload.conversationMeta?.caseOperation).toBe("needs_case_confirmation");
    // Case should NOT be mutated (fail-closed)
    expect(payload.messages.length).toBe(originalMessageCount);
  });
});
