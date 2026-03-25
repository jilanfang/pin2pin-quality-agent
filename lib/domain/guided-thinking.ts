import type {
  ActiveWorkflowStage,
  FactItem,
  GapItem,
  GuidedThinkingResult,
} from "@/lib/domain/types";

function factValue(knownFacts: FactItem[], field: string) {
  return knownFacts.find((item) => item.field === field)?.value;
}

export function buildGuidedThinking(
  currentStage: ActiveWorkflowStage,
  missingFields: GapItem[],
  knownFacts: FactItem[] = []
): GuidedThinkingResult | null {
  const urgentComplaint = factValue(knownFacts, "mode") === "customer_complaint_urgent";
  const missingSet = new Set(missingFields.map((item) => item.field));

  if (currentStage === "D2") {
    if (urgentComplaint) {
      const missingFailureLocation = missingSet.has("failure_location");
      const missingContainment = missingSet.has("containment_status");
      const missingBatchTrace = missingSet.has("batch_trace");
      const suggestedQuestion = missingFailureLocation
        ? "先确认失效位置或失效部位，先不要抢跑根因。"
        : missingContainment
          ? "客户现场、已发货、成品库存、在制品目前各自怎么处理，哪一块还没控住、责任人是谁、预计何时关窗？"
          : missingBatchTrace
            ? "这批异常对应哪个工单、批次、线别或生产时间？"
            : "当前可以开始确认 change point，并准备进入 D3 / D4 的分析。";
      const guidanceText = missingFailureLocation
        ? "当前是客户停线级异常，先把失效位置钉住，再决定围堵边界。"
        : missingContainment
          ? "失效位置已有了，下一步先确认四类对象的围堵状态，不要抢跑根因结论。"
          : missingBatchTrace
            ? "围堵信息已有基础，下一步先把追溯边界钉住，避免影响范围失真。"
            : "问题边界已有基础，可以开始转入围堵复核和原因链分析。";

      return {
        focusArea: "D2",
        thinkingGoal: "先把现场止血，再决定快速响应版怎么写。",
        guidanceText,
        suggestedQuestions: [suggestedQuestion],
        checkpoints: [
          "是否已经明确失效位置或失效部位",
          "是否已覆盖客户现场、已发货、库存、在制品的围堵状态",
          "是否具备最基本的追溯边界",
        ],
        warnings: missingFields.length ? ["当前是高压客诉，先止血，再追因。"] : [],
      };
    }

    const missingFailureLocation = missingSet.has("failure_location");
    const missingImpact = missingSet.has("impact");
    const missingBatchTrace = missingSet.has("batch") || missingSet.has("discovery_time");
    const hasFailurePoint = !!factValue(knownFacts, "failure_location");
    const hasImpact = !!factValue(knownFacts, "impact");

    if (missingFailureLocation) {
      return {
        focusArea: "D2",
        thinkingGoal: "先把失效位置钉住，再决定后面往哪条分析链走。",
        guidanceText: "现在还在碎片收束阶段，先别急着判断原因，先把失效位置或失效部位说清楚。",
        suggestedQuestions: ["先确认失效位置或失效部位，避免后面整条分析链都建立在模糊前提上。"],
        checkpoints: [
          "是否已经明确失效位置或失效部位",
          "是否区分现场事实和初步猜测",
          "是否具备继续判断影响范围的基础",
        ],
        warnings: missingFields.length ? ["先钉住失效点，再往后推影响和原因。"] : [],
      };
    }

    if (hasFailurePoint && missingImpact) {
      return {
        focusArea: "D2",
        thinkingGoal: "先把影响范围钉住，避免把局部问题误判成整批风险或反过来低估风险。",
        guidanceText: "失效点已经有了，下一步先判断这次异常到底波及哪些批次、数量、客户或产线。",
        suggestedQuestions: ["这次异常当前影响了哪些批次、数量、客户或产线，先把影响范围钉住。"],
        checkpoints: [
          "是否明确数量和波及范围",
          "是否区分已确认影响和待扩查影响",
          "是否具备继续追溯的边界基础",
        ],
        warnings: missingFields.length ? ["影响范围还没钉住，先别急着扩大或缩小判断。"] : [],
      };
    }

    if (hasFailurePoint && hasImpact && missingBatchTrace) {
      return {
        focusArea: "D2",
        thinkingGoal: "先把追溯边界钉住，避免后面围堵和分析都漂。",
        guidanceText: "失效点和影响范围已有基础，下一步优先补工单、批次、线别或生产时间。",
        suggestedQuestions: ["先补工单、批次、线别或生产时间，把追溯边界钉住。"],
        checkpoints: [
          "是否具备最基本的工单或批次边界",
          "是否能把异常拉回具体生产时段或线体",
          "是否已具备进入围堵或进一步分析的基础",
        ],
        warnings: missingFields.length ? ["追溯边界还不稳，先别把围堵范围写死。"] : [],
      };
    }

    return {
      focusArea: "D2",
      thinkingGoal: "先把问题边界定义清楚，再进入分析。",
      guidanceText: "请先不要急着解释原因，先把现象、时间、批次、影响范围和客户场景说清楚。",
      suggestedQuestions: ["异常是客户现场发现，还是内部测试发现？"],
      checkpoints: [
        "现象描述是否可复述给他人而不产生歧义",
        "事实和猜测是否已经分开",
        "是否具备最基本的时间、批次、影响信息",
      ],
      warnings: missingFields.length ? ["问题定义还不完整，先补事实再推进。"] : [],
    };
  }

  if (currentStage === "D3") {
    if (urgentComplaint) {
      return {
        focusArea: "D3",
        thinkingGoal: "先把四类对象的风险窗口收住，再继续追因。",
        guidanceText:
          "临时围堵必须覆盖客户现场、已发货、成品库存和在制品，并明确责任人、完成时点和关闭条件。",
        suggestedQuestions: [
          "客户现场、已发货、成品库存、在制品目前各自怎么处理，哪一块还没控住、责任人是谁、预计何时关窗？",
        ],
        checkpoints: [
          "四类对象是否都已覆盖",
          "是否明确责任人和完成时点",
          "是否定义围堵关闭条件",
        ],
        warnings: [],
      };
    }

    return {
      focusArea: "D3",
      thinkingGoal: "先把风险控住，再继续追因。",
      guidanceText: "当前重点是隔离、暂停出货、库存筛选和客户端遏制动作，确保问题不会继续扩散。",
      suggestedQuestions: ["客户端、在制品、库存和已出货各自如何处理？"],
      checkpoints: [
        "是否覆盖库存、在制品、已出货和客户端库存",
        "是否明确动作状态和责任人",
        "是否存在仍未控制的风险窗口",
      ],
      warnings: [],
    };
  }

  if (currentStage === "D4") {
    if (urgentComplaint) {
      return {
        focusArea: "D4",
        thinkingGoal: "把发生原因、流出原因和待验证假设分开，不抢跑结论。",
        guidanceText: "优先确认 change point，并把发生原因、流出原因、当前证据和待验证项分成两条链路。",
        suggestedQuestions: [
          "先确认这次异常的 change point 是什么，以及发生原因和流出原因各自被什么证据支持。",
        ],
        checkpoints: [
          "是否区分发生原因和流出原因",
          "是否明确哪些只是高优先级假设",
          "是否保留待验证项而非提前闭环",
        ],
        warnings: [],
      };
    }

    return {
      focusArea: "D4",
      thinkingGoal: "区分发生根因、逃逸根因与待验证假设。",
      guidanceText: "先明确失效机理，再做 Is / Is Not 与差异点分析，避免把猜测直接写成已验证根因。",
      suggestedQuestions: ["什么条件下会发生，什么条件下不会发生？"],
      checkpoints: [
        "是否区分机理、现象、原因链",
        "是否区分发生根因和逃逸根因",
        "是否保留待验证项而非提前闭环",
      ],
      warnings: [],
    };
  }

  return {
    focusArea: currentStage,
    thinkingGoal: "在当前阶段保持证据链完整。",
    guidanceText: "请继续补充当前阶段需要的证据、行动和验证结果，避免把计划写成完成。",
    suggestedQuestions: ["当前阶段还有哪些关键动作未完成？"],
    checkpoints: [
      "事实、假设、结论是否分层",
      "动作与结果是否区分",
      "报告状态是否与当前证据成熟度一致",
    ],
    warnings: [],
  };
}
