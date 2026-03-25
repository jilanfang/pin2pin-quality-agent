import { afterEach, describe, expect, it, vi } from "vitest";

describe("server api report preview", () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousStorePath = process.env.AI_QUALITY_STORE_PATH;

  afterEach(() => {
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
    if (previousStorePath === undefined) delete process.env.AI_QUALITY_STORE_PATH;
    else process.env.AI_QUALITY_STORE_PATH = previousStorePath;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("returns an analysis-summary artifact for analysis_summary preview requests", async () => {
    delete process.env.DATABASE_URL;

    const { createCaseAggregate, applyEvidence, confirmStage } = await import("@/lib/domain/workflow-engine");
    const { getCaseStore } = await import("@/lib/server/case-store");
    const { reportPreviewHandler } = await import("@/lib/server/api");

    const store = getCaseStore();
    let aggregate = createCaseAggregate("分析预览");
    aggregate = applyEvidence(aggregate, {
      content: "客户反馈 MCU-800 上电冒烟，批次 B12，已暂停出货并隔离库存。",
      contextStage: "D2",
    });
    aggregate = confirmStage(aggregate, { stage: "D2" });
    await store.saveCase(aggregate);

    const payload = await reportPreviewHandler(
      aggregate.caseRecord.id,
      new URLSearchParams({ artifact: "analysis_summary" })
    );

    expect(payload.document.artifactKind).toBe("analysis_summary");
    expect(payload.text).toContain("分析结论");
    expect(payload.text).not.toContain("D1 团队与分工");
    expect(payload.html).toContain("分析结论");
    expect(payload.html).not.toContain("完整 8D");
  });

  it("returns interim html without persisting a final 8D document", async () => {
    delete process.env.DATABASE_URL;

    const { createCaseAggregate, applyEvidence, confirmStage } = await import("@/lib/domain/workflow-engine");
    const { getCaseStore } = await import("@/lib/server/case-store");
    const { reportHtmlHandler } = await import("@/lib/server/api");

    const store = getCaseStore();
    let aggregate = createCaseAggregate("行动方案预览");
    aggregate = applyEvidence(aggregate, {
      content: "客户现场已暂停上线，库存已隔离，临时围堵为更换疑似来料并追加筛选。",
      contextStage: "D3",
    });
    aggregate = confirmStage(aggregate, { stage: "D2", content: "客户端上电冒烟，需先围堵风险。" });
    aggregate = confirmStage(aggregate, { stage: "D3", content: "暂停出货，隔离库存，更换疑似来料并追加筛选。" });
    aggregate = confirmStage(aggregate, { stage: "D5", content: "先按来料批次切分措施并验证替换效果。" });
    await store.saveCase(aggregate);

    const saveReportSpy = vi.spyOn(store, "saveReport");
    const html = await reportHtmlHandler(
      aggregate.caseRecord.id,
      new URLSearchParams({ artifact: "action_plan" })
    );

    expect(html).toContain("行动方案");
    expect(saveReportSpy).not.toHaveBeenCalled();
  });
});
