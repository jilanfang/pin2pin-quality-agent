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
    const hasBatch = !!factValue(knownFacts, "batch");
    const hasDiscoveryTime = !!factValue(knownFacts, "discovery_time");

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
        thinkingGoal: "问题边界已经够用了，先补一条追溯线索，然后继续往围堵走。",
        guidanceText: "现在不用停在 D2 等资料补齐。先补你手上最容易拿到的一条追溯信息，例如批次、发现时间、线别或工单，然后我继续往下推。",
        suggestedQuestions: [
          hasBatch && !hasDiscoveryTime
            ? "先回一句：这次最早是什么时间发现的？如果时间还不准，先给白班 / 夜班或大概时段也行。"
            : !hasBatch && hasDiscoveryTime
              ? "先回一句：这次先锁到哪个批次、工单或线别？哪怕只有一个也行。"
              : "先回一句你现在最确定的一条追溯信息：批次、发现时间、线别或工单，先给一个也能继续往下走。",
        ],
        checkpoints: [
          "是否已经拿到至少一条可追溯线索",
          "是否还能继续补围堵范围或现场动作",
          "是否已经具备进入 D3 的最低基础",
        ],
        warnings: missingFields.length ? ["追溯边界还不完整，但不需要卡在这里等补齐。"] : [],
      };
    }

    return {
      focusArea: "D2",
      thinkingGoal: "先把问题边界拉到能推进的程度，不用一次补全。",
      guidanceText: "不用先把 D2 填满。你只要再补一条最确定的现场事实，我就继续往下推。",
      suggestedQuestions: ["先回一句：这次是谁先发现的，现场看到的现象是什么？"],
      checkpoints: [
        "现象描述是否已经能让别人复述",
        "事实和猜测是否已经分开",
        "是否已有至少一条可继续追查的边界信息",
      ],
      warnings: missingFields.length ? ["问题定义还不完整，但不用停在这里等全部补齐。"] : [],
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
