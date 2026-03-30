import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { assertChineseText, E2E_DATABASE_URL } from "./e2e-helpers";

describe("copilot llm e2e", () => {
  const savedEnv: Record<string, string | undefined> = {};
  const ENV_KEYS = [
    "DATABASE_URL",
    "AI_QUALITY_LLM_ENABLED",
    "AI_QUALITY_LLM_RULE_BASELINE",
    "AI_QUALITY_LLM_COPILOT_TIMEOUT_MS",
  ];

  beforeEach(async () => {
    for (const key of ENV_KEYS) savedEnv[key] = process.env[key];

    process.env.DATABASE_URL = E2E_DATABASE_URL;
    process.env.AI_QUALITY_LLM_ENABLED = "true";
    delete process.env.AI_QUALITY_LLM_RULE_BASELINE;
    process.env.AI_QUALITY_LLM_COPILOT_TIMEOUT_MS = "20000";

    vi.resetModules();
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

  it("answers a D4 root cause analysis question in Chinese with domain terms", async () => {
    const { askCopilotWithLlm } = await import("@/lib/server/llm");

    const answer = await askCopilotWithLlm("D4 阶段应该怎么做根因分析？有哪些常用工具？");

    expect(answer).not.toBeNull();
    assertChineseText(answer!, 50);
    // Should mention at least one relevant method
    const domainTerms = ["根因", "root cause", "5Why", "鱼骨图", "因果图", "故障树", "FTA"];
    const containsDomainTerm = domainTerms.some((term) =>
      answer!.toLowerCase().includes(term.toLowerCase())
    );
    expect(containsDomainTerm).toBe(true);
  });

  it("answers an FMEA severity question with relevant terminology", async () => {
    const { askCopilotWithLlm } = await import("@/lib/server/llm");

    const answer = await askCopilotWithLlm("FMEA 怎么评估严重度？评分标准是什么？");

    expect(answer).not.toBeNull();
    assertChineseText(answer!, 50);
    const fmeaTerms = ["FMEA", "严重度", "severity", "评分", "等级", "RPN"];
    const containsFmeaTerm = fmeaTerms.some((term) =>
      answer!.toLowerCase().includes(term.toLowerCase())
    );
    expect(containsFmeaTerm).toBe(true);
  });
});
