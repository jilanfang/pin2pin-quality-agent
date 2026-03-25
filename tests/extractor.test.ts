import { extractCaseState, recomputeCaseState } from "@/lib/domain/extractor";

describe("extractCaseState", () => {
  it("extracts key electronics quality facts from fragmented input", () => {
    const result = extractCaseState(
      "客户大麦科技反馈 MCU-800 冒烟异常，批次B12，2026-03-21发现，影响120台，工单WO-260320，线别SMT2。"
    );

    expect(result.knownFacts.find((item) => item.field === "batch")?.value).toBe("B12");
    expect(result.knownFacts.find((item) => item.field === "impact")?.value).toContain("120台");
    expect(result.knownFacts.find((item) => item.field === "work_order")?.value).toBe("WO-260320");
    expect(result.knownFacts.find((item) => item.field === "line")?.value).toBe("SMT2");
    expect(result.missingFields.some((item) => item.field === "discovery_time")).toBe(false);
  });

  it("keeps high-priority gaps when evidence is thin", () => {
    const result = extractCaseState("客户反馈黑屏异常。");

    expect(result.missingFields.map((item) => item.field)).toEqual(
      expect.arrayContaining(["batch", "discovery_time", "impact"])
    );
  });

  it("detects an urgent customer complaint and prioritizes business-critical gaps", () => {
    const result = extractCaseState(
      "客户大麦科技今天早上产线停线，MCU-800 主控板连续 3 片上电爆板冒烟并有火花，要求立即停止发货并在24小时内回复。"
    );

    expect(result.knownFacts.find((item) => item.field === "mode")?.value).toBe("customer_complaint_urgent");
    expect(result.knownFacts.find((item) => item.field === "severity")?.value).toBe("high");
    expect(result.knownFacts.find((item) => item.field === "customer")?.value).toBe("大麦科技");
    expect(result.knownFacts.find((item) => item.field === "model")?.value).toBe("MCU-800");
    expect(result.knownFacts.find((item) => item.field === "impact")?.value).toContain("客户产线停线");
    expect(result.missingFields.map((item) => item.field)).toEqual(
      expect.arrayContaining([
        "failure_location",
        "containment_status",
        "batch_trace",
        "change_point",
      ])
    );
    expect(result.missingFields.find((item) => item.field === "failure_location")?.reason).toContain(
      "失效位置"
    );
  });

  it("extracts structured containment statuses for customer site shipped stock and wip", () => {
    const result = extractCaseState(
      "客户现场已封存待检，已发货批次正在冻结追查，成品库存已扣留，在制品暂停投线并等待复判。"
    );

    expect(result.knownFacts.find((item) => item.field === "containment_customer_site")?.value).toBe(
      "已封存待检"
    );
    expect(result.knownFacts.find((item) => item.field === "containment_shipped")?.value).toBe(
      "已冻结追查"
    );
    expect(result.knownFacts.find((item) => item.field === "containment_stock")?.value).toBe("已扣留");
    expect(result.knownFacts.find((item) => item.field === "containment_wip")?.value).toBe(
      "暂停投线并等待复判"
    );
  });
});

describe("recomputeCaseState", () => {
  it("rebuilds the missing fields from the fact list", () => {
    const result = recomputeCaseState([
      { field: "problem_symptom", value: "冒烟", source: "user_input", confidence: 0.8 },
      { field: "batch", value: "B12", source: "user_input", confidence: 0.9 },
    ]);

    expect(result.missingFields.map((item) => item.field)).toEqual(
      expect.arrayContaining(["discovery_time", "impact"])
    );
  });
});
