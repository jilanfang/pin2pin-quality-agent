import {
  detectConversationCaseOperation,
  detectConversationIntents,
  detectConversationSourceShape,
  inferCaseTitleFromInput,
} from "@/lib/domain/conversation-input";

describe("conversation input helpers", () => {
  it("infers a practical case title from a complaint-like input", () => {
    expect(
      inferCaseTitleFromInput("客户华星科技邮件反馈：昨日客户端上线后出现 3 台板卡上电冒烟，涉及批次 B19。")
    ).toBe("华星科技上电冒烟客诉");
  });

  it("classifies long pasted complaint emails as long documents", () => {
    expect(
      detectConversationSourceShape(
        "客户华星科技邮件反馈：昨日客户端上线后出现 3 台板卡上电冒烟，涉及批次 B19，要求 24 小时内回复临时遏制与初步分析。当前客户现场已暂停投线，我司仓库已先冻结库存待排查。",
        ["evidence"]
      )
    ).toBe("long_document");
  });

  it("marks likely different complaint material as needing case confirmation", () => {
    expect(
      detectConversationCaseOperation({
        content:
          "客户华星科技邮件反馈：昨日客户端上线后出现 3 台板卡上电冒烟，涉及批次 B19，要求 24 小时内回复临时遏制与初步分析。当前客户现场已暂停投线，我司仓库已先冻结库存待排查。",
        currentCaseTitle: "钽电容反向贴装客诉",
        currentKnownFacts: [
          { field: "customer", value: "大麦科技" },
          { field: "batch", value: "B12" },
          { field: "model", value: "MCU-800" },
        ],
        sourceShape: "long_document",
        hasCurrentCase: true,
      })
    ).toBe("needs_case_confirmation");
  });

  it("treats the first complaint pasted into an empty case as the current case intake", () => {
    expect(
      detectConversationCaseOperation({
        content:
          "客户华星科技邮件反馈：昨日客户端上线后出现 3 台板卡上电冒烟，涉及批次 B19，要求 24 小时内回复临时遏制与初步分析。当前客户现场已暂停投线，我司仓库已先冻结库存待排查。",
        currentCaseTitle: "投诉邮件接案",
        currentKnownFacts: [],
        sourceShape: "long_document",
        hasCurrentCase: true,
      })
    ).toBe("attach_to_current_case");
  });

  it("classifies evidence plus a direct question as mixed input", () => {
    expect(
      detectConversationSourceShape("客户补充 B19 先别放，现场已经停线了。现在先给客户怎么说？", [
        "evidence",
        "question",
      ])
    ).toBe("mixed_input");
  });

  it("detects mixed evidence and question intents from fragmented field updates", () => {
    expect(detectConversationIntents("客户补充 B19 先别放，现场已经停线了。现在先给客户怎么说？")).toEqual([
      "evidence",
      "question",
    ]);
  });

  it("keeps direct result requests as decision signals instead of pretending they are new evidence", () => {
    expect(detectConversationIntents("给我 8D 预览")).toEqual(["decision_signal"]);
    expect(detectConversationIntents("先整理一下行动方案")).toEqual(["decision_signal"]);
  });

  it("keeps pure next-step questions as question-only input", () => {
    expect(detectConversationIntents("我下一步做什么？")).toEqual(["question"]);
    expect(detectConversationSourceShape("我下一步做什么？", ["question"])).toBe("question_only");
  });
});
