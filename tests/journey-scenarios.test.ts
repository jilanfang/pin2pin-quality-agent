import { describe, expect, it } from "vitest";

import {
  detectConversationCaseOperation,
  detectConversationIntents,
  detectConversationSourceShape,
} from "@/lib/domain/conversation-input";
import { STRUCTURED_JOURNEY_SCENARIOS } from "@/lib/domain/journey-scenarios";

describe("structured journey scenarios", () => {
  it("covers the mixed Fireline segments with a reusable high-value sample pack", () => {
    expect(STRUCTURED_JOURNEY_SCENARIOS.length).toBeGreaterThanOrEqual(24);

    const segments = new Set(STRUCTURED_JOURNEY_SCENARIOS.map((item) => item.segment));
    const families = new Set(STRUCTURED_JOURNEY_SCENARIOS.map((item) => item.caseFamily));

    expect(segments).toEqual(new Set(["customer_quality", "factory_qe", "sqe"]));
    expect(families).toEqual(
      new Set([
        "customer_smoke_line_stop",
        "customer_intermittent_function",
        "line_solder_bridge_batch",
        "reliability_intermittent_reset",
        "incoming_mlcc_microcrack",
        "supplier_8d_review_connector",
      ])
    );
  });

  it("keeps sample pack focused on the high-value intents discussed for regression", () => {
    const counts = {
      correction: 0,
      summary_request: 0,
      decision_signal: 0,
      needs_case_confirmation: 0,
      reply_guidance: 0,
    };

    for (const scenario of STRUCTURED_JOURNEY_SCENARIOS) {
      if (scenario.expectedIntents.includes("correction")) counts.correction += 1;
      if (scenario.expectedIntents.includes("summary_request")) counts.summary_request += 1;
      if (scenario.expectedIntents.includes("decision_signal")) counts.decision_signal += 1;
      if (scenario.expectedCaseOperation === "needs_case_confirmation") counts.needs_case_confirmation += 1;
      if (scenario.rawInput.includes("一句") || scenario.rawInput.includes("怎么回") || scenario.rawInput.includes("怎么说")) {
        counts.reply_guidance += 1;
      }
    }

    expect(counts.correction).toBeGreaterThanOrEqual(6);
    expect(counts.summary_request).toBeGreaterThanOrEqual(6);
    expect(counts.decision_signal).toBeGreaterThanOrEqual(6);
    expect(counts.needs_case_confirmation).toBeGreaterThanOrEqual(4);
    expect(counts.reply_guidance).toBeGreaterThanOrEqual(6);
  });

  it("maps structured scenarios cleanly onto the existing conversation classification helpers", () => {
    for (const scenario of STRUCTURED_JOURNEY_SCENARIOS) {
      const intents = detectConversationIntents(scenario.rawInput);
      const sourceShape = detectConversationSourceShape(scenario.rawInput, intents);
      const caseOperation = detectConversationCaseOperation({
        content: scenario.rawInput,
        currentCaseTitle: scenario.currentCaseTitle,
        currentKnownFacts: [...scenario.currentKnownFacts],
        sourceShape,
        hasCurrentCase: scenario.hasCurrentCase,
      });

      expect(intents).toEqual(scenario.expectedIntents);
      expect(sourceShape).toBe(scenario.expectedSourceShape);
      expect(caseOperation).toBe(scenario.expectedCaseOperation);
    }
  });

  it("labels scenarios with explicit release-facing usage tags and priority", () => {
    const p0Regression = STRUCTURED_JOURNEY_SCENARIOS.filter(
      (item) => item.priority === "p0" && item.usageTags.includes("regression")
    );
    const p0Smoke = STRUCTURED_JOURNEY_SCENARIOS.filter(
      (item) => item.priority === "p0" && item.usageTags.includes("smoke")
    );

    for (const scenario of STRUCTURED_JOURNEY_SCENARIOS) {
      expect(scenario.usageTags.length).toBeGreaterThan(0);
      expect(new Set(scenario.usageTags).size).toBe(scenario.usageTags.length);
    }

    expect(p0Regression.length).toBeGreaterThanOrEqual(5);
    expect(p0Smoke.length).toBeGreaterThanOrEqual(3);
  });
});
