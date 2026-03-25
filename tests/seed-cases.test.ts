import { buildReportCapabilities } from "@/lib/domain/report-builder";
import { buildSeedCase } from "@/lib/domain/seed-cases";

describe("seedCases", () => {
  it("loads the tantalum complaint case as a 24h draft instead of a late-stage closure case", () => {
    const aggregate = buildSeedCase("tantalum_reverse_polarity");
    const capabilities = buildReportCapabilities(aggregate);

    expect(aggregate.caseRecord.currentStage).toBe("D4");
    expect(aggregate.stages.D2.locked).toBe(true);
    expect(aggregate.stages.D3.locked).toBe(true);
    expect(aggregate.stages.D4.locked).toBe(false);
    expect(aggregate.stages.D4.workingContent).toContain("发生原因");
    expect(aggregate.stages.D4.workingContent).toContain("流出原因");
    expect(capabilities.formalHtml.allowed).toBe(true);
    expect(capabilities.finalReport.allowed).toBe(false);
  });
});
