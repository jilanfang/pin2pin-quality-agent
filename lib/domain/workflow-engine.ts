import { buildGuidedThinking } from "@/lib/domain/guided-thinking";
import { extractCaseState, recomputeCaseState } from "@/lib/domain/extractor";
import type {
  ActiveWorkflowStage,
  ApplyEvidenceOptions,
  AssumptionItem,
  CaseAggregate,
  ConversationInputContext,
  EvidencePayload,
  FactItem,
  GapItem,
  StageActionPayload,
  StageRecord,
  WorkflowStage,
} from "@/lib/domain/types";
import {
  ACTIVE_WORKFLOW_STAGES,
  WORKFLOW_STAGES,
} from "@/lib/domain/types";

const SECTION_TITLES: Record<WorkflowStage, string> = {
  D1: "团队建立",
  D2: "问题描述",
  D3: "临时遏制措施",
  D4: "根本原因分析",
  D5: "永久纠正措施",
  D6: "实施与验证",
  D7: "预防再发生",
  D8: "团队表彰与结案",
};

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function createEmptyStage(stage: WorkflowStage): StageRecord {
  return {
    stage,
    workingContent: "",
    confirmedContent: "",
    locked: false,
    impacted: false,
    impactSummary: null,
    lastReviewedAt: null,
  };
}

function mergeKnownFacts(existing: FactItem[], incoming: FactItem[]) {
  const merged = new Map(existing.map((item) => [item.field, item]));
  for (const item of incoming) {
    merged.set(item.field, item);
  }
  return [...merged.values()];
}

function uniqueAssumptions(items: AssumptionItem[]) {
  const merged = new Map(items.map((item) => [item.statement, item]));
  return [...merged.values()];
}

function mergeText(existing: string, incoming?: string) {
  const left = existing.trim();
  const right = (incoming ?? "").trim();
  if (!right) return left;
  if (!left) return right;
  if (left.includes(right)) return left;
  return `${left}\n${right}`.trim();
}

function factMap(knownFacts: FactItem[]) {
  return Object.fromEntries(knownFacts.map((item) => [item.field, item.value]));
}

function factLabel(field: string) {
  const labels: Record<string, string> = {
    failure_location: "失效位置",
    impact: "影响范围",
    batch: "批次",
    work_order: "工单",
    line: "线别",
    change_point: "change point",
  };
  return labels[field] ?? field;
}

function buildImpactReason(
  previousFacts: FactItem[],
  nextFacts: FactItem[],
  targetStage: WorkflowStage
) {
  const previousMap = factMap(previousFacts);
  const nextMap = factMap(nextFacts);
  const trackedFields = ["failure_location", "impact", "batch", "work_order", "line", "change_point"];

  const changedField = trackedFields.find((field) => {
    const previousValue = previousMap[field];
    const nextValue = nextMap[field];
    return previousValue && nextValue && previousValue !== nextValue;
  });

  if (changedField) {
    const changedSummary = `${factLabel(changedField)}已从 ${previousMap[changedField]} 调整为 ${nextMap[changedField]}`;
    const rebuildReason =
      targetStage === "D2" && (changedField === "failure_location" || changedField === "change_point")
        ? "原先围堵边界和原因链判断需要重算"
        : "原先基于旧证据形成的阶段判断需要重算";
    return `${changedSummary}，${rebuildReason}，建议回看 ${
      targetStage === "D2" ? "D3 / D4" : `${targetStage} 之后阶段`
    }。`;
  }

  const filledField = trackedFields.find((field) => !previousMap[field] && nextMap[field]);
  if (filledField) {
    return `${factLabel(filledField)}已补充为 ${nextMap[filledField]}，建议回看 ${
      targetStage === "D2" ? "D3 / D4" : `${targetStage} 之后阶段`
    }。`;
  }

  return `新增证据可能影响 ${targetStage} 之后阶段的结论，请复审。`;
}

export function buildD2ContentFromFacts(knownFacts: FactItem[]) {
  const facts = factMap(knownFacts);
  return [
    "D2 问题描述",
    `异常现象：${facts.problem_symptom ?? "待补充"}`,
    `异常批次：${facts.batch ?? "待补充"}`,
    `首次发现时间：${facts.discovery_time ?? "待补充"}`,
    `影响范围：${facts.impact ?? "待补充"}`,
  ].join("\n");
}

function buildStageFallback(
  stage: ActiveWorkflowStage,
  knownFacts: FactItem[],
  userInput: string,
  confirmedContext: string
) {
  const facts = factMap(knownFacts);
  const urgentComplaint = facts.mode === "customer_complaint_urgent";
  if (stage === "D2") {
    return buildD2ContentFromFacts(knownFacts);
  }
  const userTail = userInput.trim() ? `\n当前补充：${userInput.trim()}` : "";
  const contextTail = confirmedContext.trim() ? `\n已确认上下文：\n${confirmedContext.trim()}` : "";
  const containment = facts.containment_action ? `\n已有围堵动作：${facts.containment_action}` : "";
  const issue = facts.problem_symptom ?? "当前异常";
  const changePointHint = facts.change_point ? facts.change_point : "待确认替代料、换料、程序或检测参数变化";

  if (urgentComplaint && stage === "D3") {
    return [
      "D3 临时遏制措施工作稿",
      "当前目标：先控住客户现场与批次风险，避免异常继续流出。",
      "每项请补充：当前动作 / 责任人 / 完成时点 / 关闭条件",
      `客户现场：${facts.customer ? `需同步 ${facts.customer} 现场隔离、停线状态与筛选动作` : "待补充"}`,
      "已发货：待补充",
      "成品库存：待补充",
      "在制品：待补充",
      `当前风险窗口：${facts.containment_action ?? "围堵状态未完整，仍存在风险窗口。"}`,
      "责任人：待补充",
      "完成时点：待补充",
      "关闭条件：待补充",
      containment ? `已有围堵动作：${facts.containment_action}` : "",
      userTail.trim() ? `当前补充：${userInput.trim()}` : "",
      contextTail.trim() ? `已确认上下文：\n${confirmedContext.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (urgentComplaint && stage === "D4") {
    return [
      "D4 根本原因分析工作稿",
      "当前目标：先分开站稳发生原因链和流出原因链，再决定哪些内容可以写成结论。",
      `change point：${changePointHint}`,
      "发生原因链：待基于贴装、物料、程序或工艺证据继续确认。",
      "流出原因链：待基于 AOI / 检测 / 放行证据继续确认。",
      `当前证据：${userInput.trim() || issue}`,
      "高优先级假设：待补充，未验证前不要直接写成结论。",
      "待验证项：请继续区分已确认事实、高优先级假设与未验证结论。",
      contextTail.trim() ? `已确认上下文：\n${confirmedContext.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  const templates: Record<ActiveWorkflowStage, string> = {
    D2: buildD2ContentFromFacts(knownFacts),
    D3: `D3 临时遏制措施建议\n请基于已确认的 D2，明确隔离范围、暂停出货、库存处置和客户端围堵。${containment}${userTail}${contextTail}`,
    D4: `D4 根本原因分析建议\n请围绕“发生原因 / 逃逸原因 / 证据 / 待验证项”分析 ${issue}。${userTail}${contextTail}`,
    D5: [
      "D5 永久纠正措施工作稿",
      "当前目标：把发生原因、流出原因和系统性原因分别对应到长期措施，不要把临时止血动作写成永久纠正。",
      "发生原因侧永久措施：待补充",
      "流出原因侧永久措施：待补充",
      "系统性纠正措施：待补充",
      "适用边界：待补充",
      "责任人/完成时点：待补充",
      "验证要求：待补充",
      userTail.trim() ? `当前补充：${userInput.trim()}` : "",
      contextTail.trim() ? `已确认上下文：\n${confirmedContext.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    D6: [
      "D6 实施与验证计划工作稿",
      "当前目标：把实施动作、验证方法、样本范围和通过标准写实，不要把计划写成已经完成。",
      "实施动作：待补充",
      "验证方法：待补充",
      "样本范围：待补充",
      "通过标准：待补充",
      "风险与回退：待补充",
      userTail.trim() ? `当前补充：${userInput.trim()}` : "",
      contextTail.trim() ? `已确认上下文：\n${confirmedContext.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    D7: [
      "D7 预防再发生工作稿",
      "当前目标：把横向展开、流程/文件更新、培训与审计、防呆与管控点写清楚，避免问题换个批次再回来。",
      "横向展开：待补充",
      "流程/文件更新：待补充",
      "培训与审计：待补充",
      "防呆与管控点：待补充",
      "生效确认：待补充",
      userTail.trim() ? `当前补充：${userInput.trim()}` : "",
      contextTail.trim() ? `已确认上下文：\n${confirmedContext.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    D8: `D8 结案建议\n请基于 D1-D7 的完成情况，说明经验沉淀、关闭条件与后续跟踪。${userTail}${contextTail}`,
  };
  return templates[stage];
}

function buildConfirmedContext(aggregate: CaseAggregate, excludeStage?: WorkflowStage) {
  return WORKFLOW_STAGES.filter((stage) => stage !== excludeStage)
    .map((stage) => aggregate.stages[stage])
    .filter((record) => record.locked && record.confirmedContent)
    .map((record) => `${record.stage}\n${record.confirmedContent}`)
    .join("\n\n");
}

function computeD1Status(stage: StageRecord): "missing" | "partial" | "complete" {
  const text = (stage.confirmedContent || stage.workingContent).trim();
  if (!text) return "missing";
  if (stage.locked && stage.confirmedContent.trim()) return "complete";
  return "partial";
}

function rebuildWarnings(
  aggregate: CaseAggregate,
  missingFields: GapItem,
  // dummy overload placeholder
) {
  return aggregate;
}

function nextStage(stage: ActiveWorkflowStage): ActiveWorkflowStage {
  const index = ACTIVE_WORKFLOW_STAGES.indexOf(stage);
  if (index === ACTIVE_WORKFLOW_STAGES.length - 1) return "D8";
  return ACTIVE_WORKFLOW_STAGES[index + 1];
}

function shouldAutoAdvanceFromD2(aggregate: CaseAggregate) {
  if (aggregate.caseRecord.currentStage !== "D2") return false;

  const facts = factMap(aggregate.knownFacts);
  const isUrgentComplaint = facts.mode === "customer_complaint_urgent";
  if (!isUrgentComplaint) return false;

  const missing = new Set(aggregate.missingFields.map((item) => item.field));
  return !missing.has("failure_location") && !missing.has("containment_status");
}

function shouldAutoAdvanceFromD3(aggregate: CaseAggregate) {
  if (aggregate.caseRecord.currentStage !== "D3") return false;

  const facts = factMap(aggregate.knownFacts);
  const isUrgentComplaint = facts.mode === "customer_complaint_urgent";
  if (!isUrgentComplaint) return false;

  return Boolean(
    facts.containment_customer_site &&
      facts.containment_shipped &&
      facts.containment_stock &&
      facts.containment_wip
  );
}

function shouldAutoAdvanceFromD4(aggregate: CaseAggregate, userInput: string) {
  if (aggregate.caseRecord.currentStage !== "D4") return false;

  const facts = factMap(aggregate.knownFacts);
  const isUrgentComplaint = facts.mode === "customer_complaint_urgent";
  if (!isUrgentComplaint) return false;

  const normalizedInput = userInput.replace(/\s+/g, "");
  const mentionsDualCauseChain =
    (normalizedInput.includes("发生原因") || normalizedInput.includes("occurrence")) &&
    (
      normalizedInput.includes("流出原因") ||
      normalizedInput.includes("逃逸原因") ||
      normalizedInput.includes("escape")
    );

  return Boolean(facts.change_point && mentionsDualCauseChain);
}

function shouldAutoAdvanceFromD5(aggregate: CaseAggregate, userInput: string) {
  if (aggregate.caseRecord.currentStage !== "D5") return false;

  const facts = factMap(aggregate.knownFacts);
  const isUrgentComplaint = facts.mode === "customer_complaint_urgent";
  if (!isUrgentComplaint) return false;

  const normalizedInput = userInput.replace(/\s+/g, "");
  const hasOccurrenceAction =
    normalizedInput.includes("发生原因侧永久措施") ||
    (normalizedInput.includes("发生原因") && normalizedInput.includes("永久措施"));
  const hasEscapeAction =
    normalizedInput.includes("流出原因侧永久措施") ||
    normalizedInput.includes("逃逸原因侧永久措施") ||
    ((normalizedInput.includes("流出原因") || normalizedInput.includes("逃逸原因")) &&
      normalizedInput.includes("永久措施"));
  const hasSystemicAction =
    normalizedInput.includes("系统性纠正措施") ||
    (normalizedInput.includes("系统性") && normalizedInput.includes("纠正措施"));

  return hasOccurrenceAction && hasEscapeAction && hasSystemicAction;
}

function advanceCaseStage(
  aggregate: CaseAggregate,
  next: ActiveWorkflowStage,
  options?: {
    userInput?: string;
    confirmedContext?: string;
  }
) {
  aggregate.caseRecord.currentStage = next;
  if (!aggregate.stages[next].workingContent.trim()) {
    aggregate.stages[next].workingContent = buildStageFallback(
      next,
      aggregate.knownFacts,
      options?.userInput ?? "",
      options?.confirmedContext ?? buildConfirmedContext(aggregate)
    );
  }
}

function getGuidedThinking(aggregate: CaseAggregate) {
  return buildGuidedThinking(
    aggregate.caseRecord.currentStage,
    aggregate.missingFields,
    aggregate.knownFacts
  );
}

function markImpactedStagesAfter(aggregate: CaseAggregate, stage: WorkflowStage, reason: string) {
  const index = ACTIVE_WORKFLOW_STAGES.indexOf(stage as ActiveWorkflowStage);
  if (index === -1) return;
  for (const laterStage of ACTIVE_WORKFLOW_STAGES.slice(index + 1)) {
    if (aggregate.stages[laterStage].locked) {
      aggregate.stages[laterStage] = {
        ...aggregate.stages[laterStage],
        impacted: true,
        impactSummary: reason,
      };
    }
  }
}

function cloneAggregate(aggregate: CaseAggregate): CaseAggregate {
  return {
    ...aggregate,
    caseRecord: { ...aggregate.caseRecord },
    knownFacts: [...aggregate.knownFacts],
    missingFields: [...aggregate.missingFields],
    assumptions: [...aggregate.assumptions],
    riskFlags: [...aggregate.riskFlags],
    warnings: [...aggregate.warnings],
    messages: aggregate.messages.map((item) => ({ ...item })),
    stages: Object.fromEntries(
      WORKFLOW_STAGES.map((stage) => [stage, { ...aggregate.stages[stage] }])
    ) as CaseAggregate["stages"],
  };
}

function syncCaseState(aggregate: CaseAggregate) {
  aggregate.caseRecord.d1Status = computeD1Status(aggregate.stages.D1);
  aggregate.caseRecord.updatedAt = nowIso();
  const warnings: string[] = [];
  if (aggregate.caseRecord.d1Status !== "complete") {
    warnings.push("D1 尚未完整确认，final 报告不可用。");
  }
  const impactedStages = ACTIVE_WORKFLOW_STAGES.filter((stage) => aggregate.stages[stage].impacted);
  if (impactedStages.length) {
    warnings.push(`以下阶段受新增证据影响，需复审：${impactedStages.join(", ")}。`);
  }
  const unlockedStages = ACTIVE_WORKFLOW_STAGES.filter((stage) => !aggregate.stages[stage].locked);
  if (unlockedStages.length) {
    warnings.push(`以下阶段尚未确认：${unlockedStages.join(", ")}。`);
  }
  const guided = getGuidedThinking(aggregate);
  if (guided?.warnings.length) {
    warnings.push(...guided.warnings);
  }
  aggregate.warnings = [...new Set(warnings)];
}

function pushAssistantNote(aggregate: CaseAggregate, content: string) {
  const message = content.trim();
  if (!message) return;
  aggregate.messages.push({
    id: makeId("msg"),
    role: "assistant",
    content: message,
    messageType: "assistant_note",
    createdAt: nowIso(),
  });
}

function buildAssistantResponseForEvidence(
  aggregate: CaseAggregate,
  targetStage: WorkflowStage,
  inputContext?: ConversationInputContext
) {
  const guided = getGuidedThinking(aggregate);
  const activeStage = aggregate.caseRecord.currentStage;
  const stageRecord = aggregate.stages[targetStage];
  const missing = aggregate.missingFields.slice(0, 2).map((item) => item.reason);
  const nextQuestion = guided?.suggestedQuestions[0];
  const facts = factMap(aggregate.knownFacts);
  const urgentComplaint = facts.mode === "customer_complaint_urgent";
  const impactedStages = ACTIVE_WORKFLOW_STAGES.filter((stage) => aggregate.stages[stage].impacted);
  const isFirstTurn = Boolean(inputContext?.isFirstTurn);
  const sourceShape = inputContext?.sourceShape ?? "fragmented_update";
  const impactHint =
    impactedStages.length && targetStage === "D2"
      ? aggregate.stages[impactedStages[0]]?.impactSummary ??
        `前序判断受影响，建议回看 ${impactedStages.filter((stage) => stage === "D3" || stage === "D4").join(" / ") || impactedStages.join(" / ")}。`
      : "";
  const extractedFacts = aggregate.knownFacts
    .filter((item) =>
      ["customer", "problem_symptom", "batch", "impact", "containment_action", "discovery_time"].includes(item.field)
    )
    .slice(0, 4)
    .map((item) => item.value);
  const factSummary = extractedFacts.join("；") || "当前异常现象与现场状态";
  const nextNeedText = nextQuestion ?? "客户现场数量、影响范围和当前围堵范围";
  const missingText = missing.join("；") || "暂无明显缺口，可继续补充更具体现场信息";

  if (isFirstTurn) {
    const opening =
      sourceShape === "long_document"
        ? "我先帮你接下这个案件，并把这份材料当成首轮案情输入。"
        : "我先帮你接下这个案件。";
    if (urgentComplaint) {
      return [
        opening,
        "高优先级异常响应：先把现场止血，再决定怎么写快速响应版。",
        `我已提取到：${factSummary}。`,
        `我现在怎么看：${guided?.guidanceText ?? "当前先控住影响范围。"}${impactHint ? ` ${impactHint}` : ""}`,
        `为什么先问这个：${guided?.thinkingGoal ?? "失效位置和围堵状态决定你能不能先交差。"}${
          facts.change_point ? " 当前还要同时盯住 change point。" : ""
        }`,
        `当前还缺：${missingText}。`,
        `你只需要补：${nextNeedText}。`,
      ].join("\n");
    }

    return [
      opening,
      `我已提取到：${factSummary}。`,
      `当前主要推进：${activeStage === "D2" ? "D2 问题定义" : activeStage}${impactHint ? `；${impactHint}` : ""}`,
      `当前还缺：${missingText}。`,
      `下一步请直接补：${nextNeedText}。`,
    ].join("\n");
  }

  if (urgentComplaint) {
    return [
      "高优先级异常响应：先把现场止血，再决定怎么写快速响应版。",
      `我现在怎么看：${guided?.guidanceText ?? "当前先控住影响范围。"}${impactHint ? ` ${impactHint}` : ""}`,
      `为什么先问这个：${guided?.thinkingGoal ?? "失效位置和围堵状态决定你能不能先交差。"}${
        facts.change_point ? " 当前还要同时盯住 change point。" : ""
      }`,
      `你只需要补：${nextQuestion ?? "补齐失效位置和围堵状态。"}${missing.length ? ` 当前还差：${missing.join("；")}` : ""}`,
      stageRecord.workingContent.trim() ? "工作稿已更新，可继续补证据或确认本阶段。" : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    `已收到新证据，当前继续聚焦 ${activeStage}。`,
    guided?.thinkingGoal ? `目标：${guided.thinkingGoal}` : "",
    stageRecord.workingContent.trim() ? `工作稿已更新，可继续补证据或确认本阶段。` : "",
    missing.length ? `关键缺口：${missing.join("；")}` : "",
    nextQuestion ? `下一步建议：${nextQuestion}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildAssistantResponseForStageAction(
  aggregate: CaseAggregate,
  stage: WorkflowStage,
  action: "confirm" | "unlock" | "revalidate"
) {
  if (action === "confirm") {
    if (stage === "D8") {
      return "当前阶段已确认。你可以继续检查待补项，或准备生成最终报告。";
    }
    return `已确认 ${stage}，当前推进到 ${aggregate.caseRecord.currentStage}。请继续围绕新阶段补充证据或推进分析。`;
  }

  if (action === "unlock") {
    return `已解锁 ${stage}。你可以重新整理这一阶段内容，后续相关阶段请留意是否需要复审。`;
  }

  return `已将 ${stage} 标记为复审中。请基于最新证据重新检查这一阶段的结论与行动。`;
}

export function createCaseAggregate(title: string): CaseAggregate {
  const createdAt = nowIso();
  const stages = Object.fromEntries(
    WORKFLOW_STAGES.map((stage) => [stage, createEmptyStage(stage)])
  ) as Record<WorkflowStage, StageRecord>;

  return {
    caseRecord: {
      id: makeId("case"),
      ownerUserId: null,
      title,
      status: "open",
      archivedAt: null,
      currentStage: "D2",
      mode: "normal",
      d1Status: "missing",
      createdAt,
      updatedAt: createdAt,
    },
    stages,
    messages: [],
    knownFacts: [],
    missingFields: [],
    assumptions: [],
    riskFlags: [],
    warnings: [],
  };
}

export function applyEvidence(
  source: CaseAggregate,
  payload: EvidencePayload,
  options: ApplyEvidenceOptions & { inputContext?: ConversationInputContext } = {}
): CaseAggregate {
  const aggregate = cloneAggregate(source);
  const isFirstTurn = aggregate.messages.filter((item) => item.role === "user").length === 0;
  const previousFacts = [...aggregate.knownFacts];
  const targetStage =
    payload.contextStage && WORKFLOW_STAGES.includes(payload.contextStage)
      ? payload.contextStage
      : aggregate.caseRecord.currentStage;

  aggregate.messages.push({
    id: makeId("msg"),
    role: "user",
    content: payload.content,
    messageType: "evidence",
    createdAt: nowIso(),
  });

  const extracted = extractCaseState(payload.content);
  const mergedExtraction = {
    knownFacts: [...extracted.knownFacts, ...(options.llmExtraction?.knownFacts ?? [])],
    assumptions: [...extracted.assumptions, ...(options.llmExtraction?.assumptions ?? [])],
    riskFlags: [...extracted.riskFlags, ...(options.llmExtraction?.riskFlags ?? [])],
  };

  aggregate.knownFacts = mergeKnownFacts(aggregate.knownFacts, mergedExtraction.knownFacts);
  aggregate.assumptions = uniqueAssumptions([...aggregate.assumptions, ...mergedExtraction.assumptions]);
  aggregate.riskFlags = [...new Set([...aggregate.riskFlags, ...mergedExtraction.riskFlags])];

  const recomputed = recomputeCaseState(
    aggregate.knownFacts,
    aggregate.assumptions,
    aggregate.riskFlags
  );
  aggregate.missingFields = recomputed.missingFields;
  aggregate.assumptions = recomputed.assumptions;

  if (targetStage === "D1") {
    aggregate.stages.D1.workingContent = mergeText(
      aggregate.stages.D1.workingContent,
      payload.content
    );
    syncCaseState(aggregate);
    return aggregate;
  }

  const stage = aggregate.stages[targetStage as ActiveWorkflowStage];
  if (!stage.locked) {
    const confirmedContext = buildConfirmedContext(aggregate);
    stage.workingContent = buildStageFallback(
      targetStage as ActiveWorkflowStage,
      aggregate.knownFacts,
      payload.content,
      confirmedContext
    );
  }

  const impactReason = buildImpactReason(previousFacts, aggregate.knownFacts, targetStage);
  markImpactedStagesAfter(
    aggregate,
    targetStage,
    impactReason
  );

  if (shouldAutoAdvanceFromD2(aggregate)) {
    advanceCaseStage(aggregate, "D3", {
      userInput: payload.content,
      confirmedContext: buildConfirmedContext(aggregate),
    });
  } else if (shouldAutoAdvanceFromD3(aggregate)) {
    advanceCaseStage(aggregate, "D4", {
      userInput: payload.content,
      confirmedContext: buildConfirmedContext(aggregate),
    });
  } else if (shouldAutoAdvanceFromD4(aggregate, payload.content)) {
    advanceCaseStage(aggregate, "D5", {
      userInput: payload.content,
      confirmedContext: buildConfirmedContext(aggregate),
    });
  } else if (shouldAutoAdvanceFromD5(aggregate, payload.content)) {
    advanceCaseStage(aggregate, "D6", {
      userInput: payload.content,
      confirmedContext: buildConfirmedContext(aggregate),
    });
  }

  syncCaseState(aggregate);
  pushAssistantNote(
    aggregate,
    buildAssistantResponseForEvidence(aggregate, targetStage, {
      sourceShape: options.inputContext?.sourceShape ?? "fragmented_update",
      isFirstTurn,
    })
  );
  return aggregate;
}

export function confirmStage(
  source: CaseAggregate,
  payload: StageActionPayload
): CaseAggregate {
  const aggregate = cloneAggregate(source);
  const impactedStages = ACTIVE_WORKFLOW_STAGES.filter((stage) => aggregate.stages[stage].impacted);
  if (impactedStages.length) {
    throw new Error("Impacted stages require revalidation before further confirmation.");
  }

  const record = aggregate.stages[payload.stage];
  if (payload.content) {
    record.workingContent = payload.content;
  }
  record.confirmedContent = (payload.content ?? record.workingContent).trim();
  record.locked = true;
  record.impacted = false;
  record.impactSummary = null;
  record.lastReviewedAt = nowIso();

  if (payload.stage === "D1") {
    aggregate.caseRecord.d1Status = "complete";
  } else if (payload.stage !== "D8") {
    const next = nextStage(payload.stage as ActiveWorkflowStage);
    advanceCaseStage(aggregate, next);
  }

  syncCaseState(aggregate);
  pushAssistantNote(aggregate, buildAssistantResponseForStageAction(aggregate, payload.stage, "confirm"));
  return aggregate;
}

export function unlockStage(
  source: CaseAggregate,
  payload: StageActionPayload
): CaseAggregate {
  const aggregate = cloneAggregate(source);
  const record = aggregate.stages[payload.stage];
  record.locked = false;
  record.lastReviewedAt = null;
  if (payload.content) {
    record.workingContent = payload.content;
  }
  if (payload.stage !== "D1") {
    aggregate.caseRecord.currentStage = payload.stage as ActiveWorkflowStage;
    markImpactedStagesAfter(aggregate, payload.stage, "上游阶段已解锁修改，后续阶段需复审。");
  }
  syncCaseState(aggregate);
  pushAssistantNote(aggregate, buildAssistantResponseForStageAction(aggregate, payload.stage, "unlock"));
  return aggregate;
}

export function revalidateStage(
  source: CaseAggregate,
  payload: StageActionPayload
): CaseAggregate {
  const aggregate = cloneAggregate(source);
  const record = aggregate.stages[payload.stage];
  record.locked = false;
  record.impacted = false;
  record.impactSummary = null;
  record.lastReviewedAt = null;
  if (payload.stage !== "D1") {
    record.workingContent = payload.content
      ? payload.content
      : buildStageFallback(
          payload.stage as ActiveWorkflowStage,
          aggregate.knownFacts,
          record.workingContent,
          buildConfirmedContext(aggregate, payload.stage)
        );
    aggregate.caseRecord.currentStage = payload.stage as ActiveWorkflowStage;
  }
  syncCaseState(aggregate);
  pushAssistantNote(aggregate, buildAssistantResponseForStageAction(aggregate, payload.stage, "revalidate"));
  return aggregate;
}

export function buildCaseWorkflowView(aggregate: CaseAggregate) {
  const view = {
    caseId: aggregate.caseRecord.id,
    title: aggregate.caseRecord.title,
    status: aggregate.caseRecord.status,
    archivedAt: aggregate.caseRecord.archivedAt,
    currentStage: aggregate.caseRecord.currentStage,
    mode: aggregate.caseRecord.mode,
    d1Status: aggregate.caseRecord.d1Status,
    stages: WORKFLOW_STAGES.map((stage) => aggregate.stages[stage]),
    warnings: aggregate.warnings,
    missingFields: aggregate.missingFields,
    guidedThinking: getGuidedThinking(aggregate),
    knownFacts: aggregate.knownFacts,
    messages: aggregate.messages,
    assumptions: aggregate.assumptions,
    riskFlags: aggregate.riskFlags,
  };

  return view;
}

export function sectionTitle(stage: WorkflowStage) {
  return SECTION_TITLES[stage];
}
