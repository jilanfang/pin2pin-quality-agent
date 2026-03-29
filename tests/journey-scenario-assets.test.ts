import { describe, expect, it } from "vitest";

import structuredScenarioFixture from "@/docs/journeys/fireline-structured-scenarios.sample.json";
import { STRUCTURED_JOURNEY_SCENARIOS } from "@/lib/domain/journey-scenarios";

describe("journey scenario assets", () => {
  it("ships a machine-consumable json fixture for downstream benchmark and smoke consumers", () => {
    expect(Array.isArray(structuredScenarioFixture)).toBe(true);
    expect(structuredScenarioFixture.length).toBe(STRUCTURED_JOURNEY_SCENARIOS.length);
  });

  it("keeps the published json fixture aligned with the typed scenario module", () => {
    expect(structuredScenarioFixture.map((item) => item.scenarioId)).toEqual(
      STRUCTURED_JOURNEY_SCENARIOS.map((item) => item.scenarioId)
    );
  });

  it("publishes usage tags and priority consistently for downstream consumers", () => {
    expect(
      structuredScenarioFixture.map((item) => ({
        scenarioId: item.scenarioId,
        priority: item.priority,
        usageTags: item.usageTags,
      }))
    ).toEqual(
      STRUCTURED_JOURNEY_SCENARIOS.map((item) => ({
        scenarioId: item.scenarioId,
        priority: item.priority,
        usageTags: item.usageTags,
      }))
    );
  });
});
