import type {
  ActionPlan,
  AnalysisSummary,
  CaseAggregate,
  ExportCapabilities,
  OutputDocument,
  OutputSection,
  ResultReadiness,
  ResultRecommendation,
  ReportBuildOptions,
  WorkflowStage,
} from "@/lib/domain/types";
import { ACTIVE_WORKFLOW_STAGES, WORKFLOW_STAGES } from "@/lib/domain/types";
import { sectionTitle } from "@/lib/domain/workflow-engine";

function factValue(aggregate: CaseAggregate, field: string) {
  return aggregate.knownFacts.find((item) => item.field === field)?.value ?? "";
}

function isUrgentComplaint(aggregate: CaseAggregate) {
  return factValue(aggregate, "mode") === "customer_complaint_urgent";
}

function factLabel(field: string) {
  const labels: Record<string, string> = {
    customer: "客户",
    model: "机种",
    batch: "批次",
    work_order: "工单",
    impact: "影响范围",
    line: "线别",
    discovery_time: "首次发现时间",
    problem_symptom: "异常现象",
    containment_action: "围堵动作",
    containment_customer_site: "客户现场",
    containment_shipped: "已发货",
    containment_stock: "成品库存",
    containment_wip: "在制品",
    validation_record: "验证记录",
    project: "项目",
    lot: "批号",
    date_code: "Date Code",
    station: "工位",
    scenario: "场景",
  };
  return labels[field] ?? field;
}

function prioritizedFacts(aggregate: CaseAggregate) {
  const priority = [
    "customer",
    "model",
    "work_order",
    "batch",
    "impact",
    "failure_location",
    "containment_customer_site",
    "containment_shipped",
    "containment_stock",
    "containment_wip",
    "change_point",
    "line",
    "discovery_time",
    "problem_symptom",
    "containment_action",
  ];
  const ranking = new Map(priority.map((field, index) => [field, index]));
  return [...aggregate.knownFacts].sort((left, right) => {
    const leftRank = ranking.get(left.field) ?? 999;
    const rightRank = ranking.get(right.field) ?? 999;
    return leftRank - rightRank;
  });
}

function buildReasonedCapability(allowed: boolean, reasonCodes: string[]) {
  return {
    allowed,
    reasonCodes,
  };
}

function uniqueLines(lines: Array<string | null | undefined>) {
  return [...new Set(lines.map((item) => item?.trim()).filter(Boolean) as string[])];
}

function buildPendingItems(aggregate: CaseAggregate) {
  const items = aggregate.missingFields.map((item) => item.reason);
  if (aggregate.caseRecord.d1Status !== "complete") {
    items.push("D1 团队与责任信息尚未确认");
  }
  for (const stage of ACTIVE_WORKFLOW_STAGES) {
    if (aggregate.stages[stage].impacted) {
      items.push(`${stage} 受新证据影响，需重新复审`);
    } else if (!aggregate.stages[stage].locked) {
      items.push(`${stage} 尚未确认`);
    }
  }
  return [...new Set(items)];
}

function buildRebuildReview(aggregate: CaseAggregate) {
  const impactedStages = ACTIVE_WORKFLOW_STAGES.filter((stage) => aggregate.stages[stage].impacted);
  if (!impactedStages.length) return null;

  const changedWhat =
    aggregate.stages[impactedStages[0]]?.impactSummary ?? "前序判断受新增证据影响，需结合最新事实复审。";
  const revisitStages = impactedStages.join(" / ");
  const unstableConclusions =
    impactedStages.some((stage) => stage === "D3" || stage === "D4")
      ? "围堵边界、原因链判断"
      : "后续阶段结论";

  return {
    changedWhat,
    revisitStages,
    unstableConclusions,
  };
}

export function buildReportCapabilities(aggregate: CaseAggregate): ExportCapabilities {
  const initialReasons: string[] = [];
  const hasD2 = aggregate.stages.D2.locked;
  const hasD3 = aggregate.stages.D3.locked || !!factValue(aggregate, "containment_action");
  const hasAnalysisDirection =
    !!aggregate.stages.D4.workingContent.trim() || aggregate.assumptions.length > 0;

  if (!hasD2) initialReasons.push("d2_unconfirmed");
  if (!hasD3) initialReasons.push("containment_missing");
  if (!hasAnalysisDirection) initialReasons.push("analysis_direction_missing");

  const finalReasons: string[] = [];
  if (aggregate.caseRecord.d1Status !== "complete") {
    finalReasons.push("d1_incomplete");
  }
  if (ACTIVE_WORKFLOW_STAGES.some((stage) => aggregate.stages[stage].impacted)) {
    finalReasons.push("impacted_stages");
  }
  if (ACTIVE_WORKFLOW_STAGES.some((stage) => !aggregate.stages[stage].locked)) {
    finalReasons.push("stages_unconfirmed");
  }

  return {
    text: buildReasonedCapability(true, []),
    formalHtml: buildReasonedCapability(initialReasons.length === 0, initialReasons),
    finalReport: buildReasonedCapability(finalReasons.length === 0, finalReasons),
    pdf: buildReasonedCapability(initialReasons.length === 0, initialReasons),
  };
}

export function buildAnalysisSummary(aggregate: CaseAggregate): AnalysisSummary {
  const confirmedFacts = uniqueLines([
    factValue(aggregate, "customer") ? `客户：${factValue(aggregate, "customer")}` : null,
    factValue(aggregate, "model") ? `机种：${factValue(aggregate, "model")}` : null,
    factValue(aggregate, "batch") ? `批次：${factValue(aggregate, "batch")}` : null,
    factValue(aggregate, "impact") ? `影响范围：${factValue(aggregate, "impact")}` : null,
    factValue(aggregate, "failure_location") ? `失效位置：${factValue(aggregate, "failure_location")}` : null,
    ...aggregate.knownFacts.slice(0, 4).map((item) => `${factLabel(item.field)}：${item.value}`),
  ]).slice(0, 6);

  const openQuestions = uniqueLines([
    ...aggregate.missingFields.slice(0, 4).map((item) => item.reason),
    ...aggregate.assumptions.filter((item) => item.needsValidation).slice(0, 2).map((item) => item.statement),
  ]);

  const risks = uniqueLines([
    ...aggregate.riskFlags,
    aggregate.assumptions.some((item) => item.needsValidation) ? "未验证前不能把根因写死。" : null,
  ]);

  return {
    title: "分析结论",
    overview:
      confirmedFacts.length > 0
        ? "当前已具备一部分稳定事实，可以先沉淀分析结论，但仍需对关键假设继续验证。"
        : "当前事实仍不足，需先补关键现场信息后再整理分析结论。",
    confirmedFacts,
    openQuestions,
    risks,
  };
}

export function buildActionPlan(aggregate: CaseAggregate): ActionPlan | null {
  const immediateActions = uniqueLines([
    factValue(aggregate, "containment_action"),
    factValue(aggregate, "containment_customer_site") ? `客户现场：${cleanStructuredValue(factValue(aggregate, "containment_customer_site"))}` : null,
    factValue(aggregate, "containment_shipped") ? `已发货：${cleanStructuredValue(factValue(aggregate, "containment_shipped"))}` : null,
    factValue(aggregate, "containment_stock") ? `成品库存：${cleanStructuredValue(factValue(aggregate, "containment_stock"))}` : null,
    factValue(aggregate, "containment_wip") ? `在制品：${cleanStructuredValue(factValue(aggregate, "containment_wip"))}` : null,
  ]);

  const verificationChecks = uniqueLines([
    ...aggregate.missingFields.slice(0, 4).map((item) => item.reason),
    ...aggregate.assumptions.filter((item) => item.needsValidation).slice(0, 2).map((item) => item.statement),
  ]);

  if (!immediateActions.length && !verificationChecks.length) {
    return null;
  }

  const owners = uniqueLines([
    aggregate.stages.D1.confirmedContent || aggregate.stages.D1.workingContent,
  ])
    .flatMap((text) =>
      text
        .split(/[、,，\n]/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
    .slice(0, 4);

  return {
    title: "行动方案",
    overview: "先围堵风险窗口，再补关键验证，随后再决定是否进入正式 8D。",
    immediateActions: immediateActions.length ? immediateActions : ["当前围堵动作仍待补齐。"],
    owners,
    verificationChecks: verificationChecks.length ? verificationChecks : ["当前验证检查项待补充。"],
  };
}

export function buildResultReadiness(aggregate: CaseAggregate): ResultReadiness {
  const capabilities = buildReportCapabilities(aggregate);
  const analysisSummary = aggregate.knownFacts.length > 0;
  const hasCorrectiveLayer =
    ["D5", "D6", "D7"].some((stage) => {
      const record = aggregate.stages[stage as WorkflowStage];
      return Boolean(record?.confirmedContent.trim() || record?.workingContent.trim());
    }) || aggregate.stages.D4.locked;
  const actionPlan =
    Boolean(buildActionPlan(aggregate)?.immediateActions.length) &&
    (aggregate.stages.D3.locked || Boolean(factValue(aggregate, "containment_action"))) &&
    hasCorrectiveLayer;

  return {
    analysisSummary,
    actionPlan,
    eightD: capabilities.finalReport.allowed,
  };
}

export function buildResultRecommendation(aggregate: CaseAggregate): ResultRecommendation {
  const readiness = buildResultReadiness(aggregate);

  if (readiness.eightD) {
    return {
      kind: "eight_d",
      title: "建议生成 8D",
      rationale: "当前关键阶段已闭环，可以整理成正式 8D。",
      primaryActionLabel: "生成 8D",
      secondaryActionLabel: "预览 8D",
      deferActionLabel: "继续检查",
    };
  }

  if (readiness.actionPlan) {
    return {
      kind: "action_plan",
      title: "建议整理行动方案",
      rationale: "当前围堵和纠正方向已经成形，先把行动方案收口，再决定何时进入 8D。",
      primaryActionLabel: "整理行动方案",
      secondaryActionLabel: "继续补信息",
      deferActionLabel: "稍后再说",
    };
  }

  return {
    kind: "analysis_summary",
    title: "建议先整理分析结论",
    rationale: "当前已具备稳定事实，可以先沉淀分析结论；根因仍待验证，不建议直接生成 8D。",
    primaryActionLabel: "整理分析结论",
    secondaryActionLabel: "继续补信息",
    deferActionLabel: "稍后再说",
  };
}

export function renderAnalysisSummaryText(summary: AnalysisSummary) {
  return [
    summary.title,
    "",
    `当前判断\n${summary.overview}`,
    "",
    `已确认事实\n${summary.confirmedFacts.map((item) => `- ${item}`).join("\n") || "- 暂无"}`,
    "",
    `待确认 / 待补信息\n${summary.openQuestions.map((item) => `- ${item}`).join("\n") || "- 暂无"}`,
    "",
    `风险提醒\n${summary.risks.map((item) => `- ${item}`).join("\n") || "- 暂无"}`,
  ]
    .filter(Boolean)
    .join("\n")
    .trim();
}

export function renderActionPlanText(plan: ActionPlan) {
  return [
    plan.title,
    "",
    `执行判断\n${plan.overview}`,
    "",
    `立即动作\n${plan.immediateActions.map((item) => `- ${item}`).join("\n") || "- 暂无"}`,
    "",
    `责任角色\n${plan.owners.map((item) => `- ${item}`).join("\n") || "- 待补充"}`,
    "",
    `验证检查\n${plan.verificationChecks.map((item) => `- ${item}`).join("\n") || "- 暂无"}`,
  ]
    .filter(Boolean)
    .join("\n")
    .trim();
}

function initialReadinessSummary(aggregate: CaseAggregate) {
  const blockers: string[] = [];
  if (!aggregate.stages.D2.locked) blockers.push("问题描述未确认");
  if (!(aggregate.stages.D3.locked || !!factValue(aggregate, "containment_action"))) {
    blockers.push("围堵动作未具备");
  }
  const hasAnalysisDirection =
    !!aggregate.stages.D4.workingContent.trim() || aggregate.assumptions.length > 0;
  if (!hasAnalysisDirection) blockers.push("根因方向未形成");

  if (!blockers.length) return "问题描述已确认，围堵动作已具备，根因方向已形成。";
  return `还差${blockers.join("、")}。`;
}

function buildCurrentActions(aggregate: CaseAggregate) {
  const items = [
    ["客户现场", factValue(aggregate, "containment_customer_site")],
    ["已发货", factValue(aggregate, "containment_shipped")],
    ["成品库存", factValue(aggregate, "containment_stock")],
    ["在制品", factValue(aggregate, "containment_wip")],
  ].filter(([, value]) => value);

  if (items.length) {
    return items.map(([label, value]) => `${label}：${value}`).join("\n");
  }

  const containment = factValue(aggregate, "containment_action");
  if (containment) return containment;
  return "客户侧和厂内侧当前动作仍待补齐。";
}

function documentFactValue(document: OutputDocument, field: string) {
  return document.factBasis.find((item) => item.field === field)?.value ?? "";
}

function cleanStructuredValue(value: string) {
  return value.replace(/^已/u, "").trim() || value.trim();
}

function buildActionSummary(aggregate: CaseAggregate) {
  const lines = [
    ["客户现场", factValue(aggregate, "containment_customer_site")],
    ["已发货", factValue(aggregate, "containment_shipped")],
    ["成品库存", factValue(aggregate, "containment_stock")],
    ["在制品", factValue(aggregate, "containment_wip")],
  ]
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}：${cleanStructuredValue(String(value))}`);

  if (lines.length) return lines;

  const containment = factValue(aggregate, "containment_action");
  if (containment) return [containment];
  return ["客户侧和厂内侧当前动作仍待补齐。"];
}

function buildPreliminaryJudgementSummary(aggregate: CaseAggregate) {
  const lines: string[] = [];
  const changePoint = factValue(aggregate, "change_point");
  const d4Content = aggregate.stages.D4.confirmedContent || aggregate.stages.D4.workingContent;
  const hasD4 = d4Content.trim().length > 0;

  if (hasD4) {
    lines.push("发生原因链：待基于贴装、物料、程序或工艺证据继续确认。");
    lines.push("流出原因链：待基于 AOI / 检测 / 放行证据继续确认。");
    if (changePoint) {
      lines.push(`change point：${changePoint}`);
    }
    if (aggregate.assumptions.some((item) => item.needsValidation)) {
      lines.push("当前结论仍以高优先级假设为主，未验证前不写死根因。");
    } else {
      lines.push("当前仅形成初步方向，仍需继续验证。");
    }
    return lines;
  }

  return ["当前仅形成初步方向，尚不足以下结论。"];
}

function buildActionSummaryFromDocument(document: OutputDocument) {
  const lines = [
    ["客户现场", documentFactValue(document, "containment_customer_site")],
    ["已发货", documentFactValue(document, "containment_shipped")],
    ["成品库存", documentFactValue(document, "containment_stock")],
    ["在制品", documentFactValue(document, "containment_wip")],
  ]
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}：${cleanStructuredValue(String(value))}`);

  if (lines.length) return lines;

  const containment = documentFactValue(document, "containment_action");
  if (containment) return [containment];
  return ["客户侧和厂内侧当前动作仍待补齐。"];
}

function buildPreliminaryJudgementSummaryFromDocument(document: OutputDocument) {
  const d4Section = document.sections.find((section) => section.sectionKey === "D4");
  if (!d4Section?.content.trim()) {
    return ["当前仅形成初步方向，尚不足以下结论。"];
  }

  const lines = [
    "发生原因链：待基于贴装、物料、程序或工艺证据继续确认。",
    "流出原因链：待基于 AOI / 检测 / 放行证据继续确认。",
  ];
  const changePoint = documentFactValue(document, "change_point");
  if (changePoint) {
    lines.push(`change point：${changePoint}`);
  }
  if (document.validationNotes.assumptions.length) {
    lines.push("当前结论仍以高优先级假设为主，未验证前不写死根因。");
  } else {
    lines.push("当前仅形成初步方向，仍需继续验证。");
  }
  return lines;
}

function determineAudience(styleMode: ReportBuildOptions["styleMode"]) {
  if (styleMode === "customer_formal") return "customer";
  if (styleMode === "internal_direct") return "internal";
  return "mixed";
}

function determineSectionStatus(aggregate: CaseAggregate, stage: WorkflowStage) {
  const record = aggregate.stages[stage];
  if (record.locked) return "confirmed" as const;
  if (record.workingContent.trim()) return "assumed" as const;
  return "needs_validation" as const;
}

function determineSectionMaturity(aggregate: CaseAggregate, stage: WorkflowStage) {
  const record = aggregate.stages[stage];
  if (record.locked && !record.impacted) return "verified" as const;
  if (record.workingContent.trim()) return "ready" as const;
  return "draft" as const;
}

function buildSectionPendingItems(aggregate: CaseAggregate, stage: WorkflowStage) {
  const items: string[] = [];
  const record = aggregate.stages[stage];
  if (!record.locked && stage !== "D1") {
    items.push("待确认");
  }
  if (record.impacted) {
    items.push("受新增证据影响");
  }
  if (stage === "D1" && aggregate.caseRecord.d1Status !== "complete") {
    items.push("团队与责任信息待补齐");
  }
  return items;
}

function buildSectionWarnings(aggregate: CaseAggregate, stage: WorkflowStage) {
  const record = aggregate.stages[stage];
  const warnings: string[] = [];
  if (record.impacted && record.impactSummary) {
    warnings.push(record.impactSummary);
  }
  if (!record.locked && stage !== "D1") {
    warnings.push("当前章节仍处于工作稿状态。");
  }
  return warnings;
}

function extractStructuredLine(content: string, label: string) {
  const prefix = `${label}：`;
  const line = content
    .split("\n")
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix));

  return line ? line.slice(prefix.length).trim() : "";
}

function fallbackLine(value: string, fallback: string) {
  const normalized = value.trim();
  return normalized && normalized !== "待补充" ? normalized : fallback;
}

function buildD3FormalSection(aggregate: CaseAggregate) {
  const record = aggregate.stages.D3;
  const content = record.confirmedContent || record.workingContent;
  const customerSite = fallbackLine(
    extractStructuredLine(content, "客户现场") || factValue(aggregate, "containment_customer_site"),
    factValue(aggregate, "customer")
      ? `需同步 ${factValue(aggregate, "customer")} 现场隔离、停线状态与筛选动作`
      : "待补充"
  );
  const shipped = fallbackLine(
    extractStructuredLine(content, "已发货") || factValue(aggregate, "containment_shipped"),
    "待补充"
  );
  const stock = fallbackLine(
    extractStructuredLine(content, "成品库存") || factValue(aggregate, "containment_stock"),
    "待补充"
  );
  const wip = fallbackLine(
    extractStructuredLine(content, "在制品") || factValue(aggregate, "containment_wip"),
    "待补充"
  );
  const riskWindow = fallbackLine(
    extractStructuredLine(content, "当前风险窗口") ||
      extractStructuredLine(content, "已有围堵动作") ||
      factValue(aggregate, "containment_action"),
    "客户侧和厂内侧当前动作仍待补齐。"
  );
  const owner = extractStructuredLine(content, "责任人") || "待补充";
  const due = extractStructuredLine(content, "完成时点") || "待补充";
  const closeCondition = extractStructuredLine(content, "关闭条件") || "待补充";

  return [
    "客户侧围堵",
    `- 客户现场：${customerSite}`,
    "",
    "厂内侧围堵",
    `- 已发货：${shipped}`,
    `- 成品库存：${stock}`,
    `- 在制品：${wip}`,
    "",
    "当前围堵判断",
    `- ${riskWindow}`,
    "",
    "执行要求",
    `- 责任人：${owner}`,
    `- 完成时点：${due}`,
    `- 关闭条件：${closeCondition}`,
  ].join("\n");
}

function buildD4SystemicCause(changePoint: string) {
  if (changePoint) {
    return `需围绕 ${changePoint} 复核替代料导入、程序切换、检测放行和异常升级机制是否同步失效。`;
  }

  return "需继续复核替代料导入、程序切换、检测放行和异常升级机制是否存在系统性缺口。";
}

function buildD4FormalSection(aggregate: CaseAggregate) {
  const record = aggregate.stages.D4;
  const content = record.confirmedContent || record.workingContent;
  const changePoint = extractStructuredLine(content, "change point") || factValue(aggregate, "change_point");
  const occurrence = fallbackLine(
    extractStructuredLine(content, "发生原因链"),
    "待基于贴装、物料、程序或工艺证据继续确认。"
  );
  const escape = fallbackLine(
    extractStructuredLine(content, "流出原因链"),
    "待基于 AOI / 检测 / 放行证据继续确认。"
  );
  const evidence = fallbackLine(
    extractStructuredLine(content, "当前证据"),
    "待补充当前证据。"
  );
  const hypothesis = fallbackLine(
    extractStructuredLine(content, "高优先级假设"),
    aggregate.assumptions.find((item) => item.needsValidation)?.statement ??
      "待补充，未验证前不要直接写成结论。"
  );
  const pending = fallbackLine(
    extractStructuredLine(content, "待验证项"),
    "请继续区分已确认事实、高优先级假设与未验证结论。"
  );

  return [
    "发生原因",
    `- ${occurrence}`,
    "",
    "流出原因",
    `- ${escape}`,
    "",
    "系统性原因",
    `- ${buildD4SystemicCause(changePoint)}`,
    "",
    changePoint ? "关键变更点" : "",
    changePoint ? `- ${changePoint}` : "",
    changePoint ? "" : "",
    "当前证据",
    `- ${evidence}`,
    "",
    "当前高优先级判断",
    `- ${hypothesis}`,
    "",
    "待验证项",
    `- ${pending}`,
  ]
    .filter((line, index, lines) => {
      if (line !== "") return true;
      return lines[index - 1] !== "";
    })
    .join("\n");
}

function buildD5FormalSection(aggregate: CaseAggregate) {
  const record = aggregate.stages.D5;
  const content = record.confirmedContent || record.workingContent;
  const occurrenceAction = fallbackLine(
    extractStructuredLine(content, "发生原因侧永久措施"),
    "待补充。"
  );
  const escapeAction = fallbackLine(
    extractStructuredLine(content, "流出原因侧永久措施"),
    "待补充。"
  );
  const systemicAction = fallbackLine(
    extractStructuredLine(content, "系统性纠正措施"),
    "待补充。"
  );
  const boundary = fallbackLine(extractStructuredLine(content, "适用边界"), "待补充。");
  const ownerAndDue = fallbackLine(
    extractStructuredLine(content, "责任人/完成时点"),
    "待补充。"
  );
  const validationNeed = fallbackLine(
    extractStructuredLine(content, "验证要求"),
    "待补充。"
  );

  return [
    "发生原因侧永久措施",
    `- ${occurrenceAction}`,
    "",
    "流出原因侧永久措施",
    `- ${escapeAction}`,
    "",
    "系统性纠正措施",
    `- ${systemicAction}`,
    "",
    "适用边界与责任",
    `- 适用边界：${boundary}`,
    `- 责任人/完成时点：${ownerAndDue}`,
    "",
    "验证闭环要求",
    `- ${validationNeed}`,
  ].join("\n");
}

function buildD6FormalSection(aggregate: CaseAggregate) {
  const record = aggregate.stages.D6;
  const content = record.confirmedContent || record.workingContent;
  const implementation = fallbackLine(extractStructuredLine(content, "实施动作"), "待补充。");
  const validationMethod = fallbackLine(extractStructuredLine(content, "验证方法"), "待补充。");
  const sampleScope = fallbackLine(extractStructuredLine(content, "样本范围"), "待补充。");
  const passCriteria = fallbackLine(extractStructuredLine(content, "通过标准"), "待补充。");
  const fallbackPlan = fallbackLine(extractStructuredLine(content, "风险与回退"), "待补充。");

  return [
    "实施计划",
    `- 实施动作：${implementation}`,
    "",
    "验证安排",
    `- 验证方法：${validationMethod}`,
    `- 样本范围：${sampleScope}`,
    `- 通过标准：${passCriteria}`,
    `- 风险与回退：${fallbackPlan}`,
  ].join("\n");
}

function buildD7FormalSection(aggregate: CaseAggregate) {
  const record = aggregate.stages.D7;
  const content = record.confirmedContent || record.workingContent;
  const rollout = fallbackLine(extractStructuredLine(content, "横向展开"), "待补充。");
  const processUpdate = fallbackLine(extractStructuredLine(content, "流程/文件更新"), "待补充。");
  const trainingAudit = fallbackLine(extractStructuredLine(content, "培训与审计"), "待补充。");
  const controlPoint = fallbackLine(extractStructuredLine(content, "防呆与管控点"), "待补充。");
  const effectCheck = fallbackLine(extractStructuredLine(content, "生效确认"), "待补充。");

  return [
    "横向展开",
    `- ${rollout}`,
    "",
    "流程/文件更新",
    `- ${processUpdate}`,
    "",
    "培训与审计",
    `- ${trainingAudit}`,
    "",
    "防呆与管控点",
    `- ${controlPoint}`,
    "",
    "生效确认",
    `- ${effectCheck}`,
  ].join("\n");
}

function sectionContent(aggregate: CaseAggregate, stage: WorkflowStage) {
  if (stage === "D3") {
    return buildD3FormalSection(aggregate);
  }

  if (stage === "D4") {
    return buildD4FormalSection(aggregate);
  }

  if (stage === "D5") {
    return buildD5FormalSection(aggregate);
  }

  if (stage === "D6") {
    return buildD6FormalSection(aggregate);
  }

  if (stage === "D7") {
    return buildD7FormalSection(aggregate);
  }

  const record = aggregate.stages[stage];
  return record.confirmedContent || record.workingContent || "待补充";
}

function buildSections(aggregate: CaseAggregate): OutputSection[] {
  return WORKFLOW_STAGES.map((stage) => ({
    sectionKey: stage,
    sectionTitle: `${stage} ${sectionTitle(stage)}${
      aggregate.stages[stage].impacted ? " [待复审]" : ""
    }`,
    status: determineSectionStatus(aggregate, stage),
    maturity: determineSectionMaturity(aggregate, stage),
    warnings: buildSectionWarnings(aggregate, stage),
    pendingItems: buildSectionPendingItems(aggregate, stage),
    content: sectionContent(aggregate, stage),
  }));
}

export function buildOutputDocument(
  aggregate: CaseAggregate,
  options: ReportBuildOptions
): OutputDocument {
  const exportCapabilities = buildReportCapabilities(aggregate);
  const statusBadges = [
    options.reportStage === "final"
      ? "完整 8D"
      : options.reportStage === "interim"
        ? "阶段更新版"
        : "快速响应版",
    aggregate.caseRecord.status.toUpperCase(),
  ];

  return {
    documentId: `doc-${aggregate.caseRecord.id}-${options.reportStage}`,
    caseId: aggregate.caseRecord.id,
    language: "zh-CN",
    styleMode: options.styleMode,
    reportStage: options.reportStage,
    caseStatus: aggregate.caseRecord.status,
    audience: determineAudience(options.styleMode),
    summary: {
      title: aggregate.caseRecord.title,
      reportNo: `8D-${aggregate.caseRecord.id.slice(-6).toUpperCase()}`,
      reportVersion: options.reportStage,
      customerName: factValue(aggregate, "customer") || "待补充",
      productModel: factValue(aggregate, "model") || "待补充",
      workOrder: factValue(aggregate, "work_order") || "待补充",
      batch: factValue(aggregate, "batch") || "待补充",
      severity: aggregate.riskFlags.length ? "high" : "medium",
      statusBadges,
    },
    factBasis: prioritizedFacts(aggregate).slice(0, 12).map((item) => ({
      field: item.field,
      label: factLabel(item.field),
      value: item.value,
    })),
    validationNotes: {
      assumptions: aggregate.assumptions
        .filter((item) => item.needsValidation)
        .map((item) => item.statement),
      missingItems: aggregate.missingFields.map((item) => item.reason),
      riskFlags: aggregate.riskFlags,
    },
    sections: buildSections(aggregate),
    pendingItems: buildPendingItems(aggregate),
    riskFlags: aggregate.riskFlags,
    exportCapabilities,
    generatedAt: new Date().toISOString(),
  };
}

export function buildTextOutput(document: OutputDocument) {
  const isInitial = document.reportStage === "initial_24h";
  const header = [
    `${document.summary.title}`,
    `报告编号：${document.summary.reportNo}`,
    `版本：${document.reportStage}`,
    `客户：${document.summary.customerName}`,
    `机种：${document.summary.productModel}`,
    `工单：${document.summary.workOrder}`,
    `批次：${document.summary.batch}`,
  ].join("\n");

  const introductoryNotes = [
    isInitial ? "当前为快速响应版" : "",
    isInitial ? "以下结论仍待验证" : "",
  ]
    .filter(Boolean)
    .join("\n");

  const factBasis = document.factBasis.length
    ? `事实基础 / 已确认事实\n${document.factBasis.map((item) => `- ${item.label}：${item.value}`).join("\n")}`
    : "事实基础\n- 当前尚未沉淀出明确事实，请先补充现场信息。";

  const preliminary = `初步判断\n${buildPreliminaryJudgementSummaryFromDocument(document)
    .map((line) => `- ${line}`)
    .join("\n")}`;

  const currentActions = `客户侧/厂内侧当前动作\n${buildActionSummaryFromDocument(document)
    .map((line) => `- ${line}`)
    .join("\n")}`;

  const validationNotes = [
    document.validationNotes.assumptions.length
      ? `待验证假设\n${document.validationNotes.assumptions.map((item) => `- ${item}`).join("\n")}`
      : "",
    document.validationNotes.riskFlags.length
      ? `风险提醒\n${document.validationNotes.riskFlags.map((item) => `- ${item}`).join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const rebuildReview = document.sections
    .filter((section) => section.warnings.length)
    .flatMap((section) =>
      section.warnings.map((warning) => ({
        stage: section.sectionKey,
        warning,
      }))
    )
    .find((item) => item.warning.includes("建议回看"));

  const rebuildReviewBlock = rebuildReview
    ? [
        "复审提示",
        `- 变了什么：${rebuildReview.warning}`,
        `- 建议回看：${document.sections
          .filter((section) => section.warnings.includes(rebuildReview.warning))
          .map((section) => section.sectionKey)
          .join(" / ")}`,
        `- 暂时不稳的结论：${
          document.sections.some(
            (section) =>
              (section.sectionKey === "D3" || section.sectionKey === "D4") &&
              section.warnings.includes(rebuildReview.warning)
          )
            ? "围堵边界、原因链判断"
            : "后续阶段结论"
        }`,
      ].join("\n")
    : "";

  const sections = document.sections
    .map((section) => `${section.sectionTitle}\n${section.content}`)
    .join("\n\n");

  const pending = document.pendingItems.length
    ? `\n\n待补充 / 待验证项\n${document.pendingItems.map((item) => `- ${item}`).join("\n")}`
    : "";

  return [
    header,
    introductoryNotes,
    factBasis,
    preliminary,
    currentActions,
    rebuildReviewBlock,
    validationNotes,
    sections,
    pending,
  ]
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function styleTone(styleMode: OutputDocument["styleMode"]) {
  if (styleMode === "customer_formal") return "对客正式";
  if (styleMode === "internal_direct") return "内部直给";
  return "专业克制";
}

function escapeHtml(content: string) {
  return content
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("\n", "<br />");
}

export function renderAnalysisSummaryHtml(summary: AnalysisSummary, aggregate: CaseAggregate) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(summary.title)}</title>
    <style>
      body { font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif; background:#f5f7fb; color:#18202c; padding:24px; }
      .sheet { max-width: 880px; margin: 0 auto; background:#fff; border:1px solid #d7ddea; border-radius:20px; padding:24px; }
      h1, h2 { margin:0 0 12px; }
      h1 { font-size:24px; }
      h2 { font-size:16px; margin-top:20px; }
      .meta { color:#647287; font-size:12px; margin-bottom:16px; }
      ul { margin:0; padding-left:20px; }
      li { margin:6px 0; line-height:1.6; }
      .lead { line-height:1.7; }
    </style>
  </head>
  <body>
    <article class="sheet">
      <h1>${escapeHtml(summary.title)}</h1>
      <div class="meta">案件：${escapeHtml(aggregate.caseRecord.title)} | 状态：${escapeHtml(aggregate.caseRecord.status)}</div>
      <section>
        <h2>当前判断</h2>
        <p class="lead">${escapeHtml(summary.overview)}</p>
      </section>
      <section>
        <h2>已确认事实</h2>
        <ul>${summary.confirmedFacts.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>
      <section>
        <h2>待确认 / 待补信息</h2>
        <ul>${summary.openQuestions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>
      <section>
        <h2>风险提醒</h2>
        <ul>${summary.risks.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>
    </article>
  </body>
</html>`;
}

export function renderActionPlanHtml(plan: ActionPlan, aggregate: CaseAggregate) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(plan.title)}</title>
    <style>
      body { font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif; background:#f5f7fb; color:#18202c; padding:24px; }
      .sheet { max-width: 880px; margin: 0 auto; background:#fff; border:1px solid #d7ddea; border-radius:20px; padding:24px; }
      h1, h2 { margin:0 0 12px; }
      h1 { font-size:24px; }
      h2 { font-size:16px; margin-top:20px; }
      .meta { color:#647287; font-size:12px; margin-bottom:16px; }
      ul { margin:0; padding-left:20px; }
      li { margin:6px 0; line-height:1.6; }
      .lead { line-height:1.7; }
    </style>
  </head>
  <body>
    <article class="sheet">
      <h1>${escapeHtml(plan.title)}</h1>
      <div class="meta">案件：${escapeHtml(aggregate.caseRecord.title)} | 状态：${escapeHtml(aggregate.caseRecord.status)}</div>
      <section>
        <h2>执行判断</h2>
        <p class="lead">${escapeHtml(plan.overview)}</p>
      </section>
      <section>
        <h2>立即动作</h2>
        <ul>${plan.immediateActions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>
      <section>
        <h2>责任角色</h2>
        <ul>${plan.owners.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>
      <section>
        <h2>验证检查</h2>
        <ul>${plan.verificationChecks.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>
    </article>
  </body>
</html>`;
}

export function renderFormalHtml(document: OutputDocument) {
  const introBadges = [
    document.reportStage === "initial_24h" ? "当前为快速响应版" : "",
    document.reportStage === "initial_24h" ? "以下结论仍待验证" : "",
    document.summary.severity === "high" ? "需持续复审" : "",
  ].filter(Boolean);
  const sections = document.sections
    .map(
      (section) => `
        <section class="section">
          <div class="section-head">
            <h2>${escapeHtml(section.sectionTitle)}</h2>
            <span class="badge">${escapeHtml(
              section.sectionTitle.includes("[待复审]")
                ? "待复审"
                : section.maturity
            )}</span>
          </div>
          <div class="section-body">${escapeHtml(section.content)}</div>
          ${
            section.pendingItems.length
              ? `<div class="note"><strong>待处理：</strong>${escapeHtml(section.pendingItems.join("；"))}</div>`
              : ""
          }
          ${
            section.warnings.length
              ? `<div class="warn"><strong>提醒：</strong>${escapeHtml(section.warnings.join("；"))}</div>`
              : ""
          }
        </section>
      `
    )
    .join("");

  const pending = document.pendingItems.length
    ? `<section class="section"><h2>待补充 / 待验证项</h2><ul>${document.pendingItems
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join("")}</ul></section>`
    : "";

  const factBasis = document.factBasis.length
    ? `<section class="section">
        <h2>事实基础 / 已确认事实</h2>
        <ul>${document.factBasis
          .map((item) => `<li><strong>${escapeHtml(item.label)}：</strong>${escapeHtml(item.value)}</li>`)
          .join("")}</ul>
      </section>`
    : "";

  const analysisSection = `<section class="section">
        <h2>初步判断</h2>
        <div class="note">${escapeHtml(buildPreliminaryJudgementSummaryFromDocument(document).join("\n"))}</div>
      </section>`;
  const actionsSection = `<section class="section">
        <h2>客户侧 / 厂内侧当前动作</h2>
        ${
          buildActionSummaryFromDocument(document).length
            ? `<ul>${buildActionSummaryFromDocument(document)
                .map((line) => {
                  const [label, ...rest] = line.split("：");
                  return `<li><strong>${escapeHtml(label)}：</strong>${escapeHtml(rest.join("："))}</li>`;
                })
                .join("")}</ul>`
            : ""
        }
      </section>`;

  const validationNotes =
    document.validationNotes.assumptions.length ||
    document.validationNotes.riskFlags.length ||
    document.validationNotes.missingItems.length
      ? `<section class="section">
          <h2>待验证与风险说明</h2>
          ${
            document.validationNotes.assumptions.length
              ? `<div class="note"><strong>待验证假设：</strong>${escapeHtml(
                  document.validationNotes.assumptions.join("；")
                )}</div>`
              : ""
          }
          ${
            document.validationNotes.missingItems.length
              ? `<div class="note"><strong>待补信息：</strong>${escapeHtml(
                  document.validationNotes.missingItems.join("；")
                )}</div>`
              : ""
          }
          ${
            document.validationNotes.riskFlags.length
              ? `<div class="warn"><strong>风险提醒：</strong>${escapeHtml(
                  document.validationNotes.riskFlags.join("；")
                )}</div>`
              : ""
          }
        </section>`
      : "";

  const rebuildReview = document.sections
    .filter((section) => section.warnings.length)
    .flatMap((section) =>
      section.warnings.map((warning) => ({
        stage: section.sectionKey,
        warning,
      }))
    )
    .find((item) => item.warning.includes("建议回看"));

  const rebuildReviewSection = rebuildReview
    ? `<section class="section">
        <h2>复审提示</h2>
        <div class="warn"><strong>变了什么：</strong>${escapeHtml(rebuildReview.warning)}</div>
        <div class="note"><strong>建议回看：</strong>${escapeHtml(
          document.sections
            .filter((section) => section.warnings.includes(rebuildReview.warning))
            .map((section) => section.sectionKey)
            .join(" / ")
        )}</div>
        <div class="note"><strong>暂时不稳的结论：</strong>${escapeHtml(
          document.sections.some(
            (section) =>
              (section.sectionKey === "D3" || section.sectionKey === "D4") &&
              section.warnings.includes(rebuildReview.warning)
          )
            ? "围堵边界、原因链判断"
            : "后续阶段结论"
        )}</div>
      </section>`
    : "";

  return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(document.summary.title)}</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #1b2430;
        --muted: #66758a;
        --line: #d7ddea;
        --paper: #ffffff;
        --accent: #1844c7;
        --soft: #eff3fb;
        --warn: #915e12;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: #eef2f8;
        font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
        color: var(--ink);
      }
      .page {
        max-width: 960px;
        margin: 32px auto;
        background: var(--paper);
        padding: 40px;
        box-shadow: 0 24px 80px rgba(27, 36, 48, 0.08);
      }
      .hero {
        border-bottom: 1px solid var(--line);
        padding-bottom: 20px;
        margin-bottom: 24px;
      }
      .hero h1 { margin: 0 0 8px; font-size: 30px; }
      .sub {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        color: var(--muted);
        font-size: 14px;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 28px;
        padding: 0 10px;
        border-radius: 999px;
        background: var(--soft);
        color: var(--accent);
        font-size: 12px;
        font-weight: 700;
      }
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
        margin-top: 20px;
      }
      .card {
        padding: 14px;
        background: #f8fafe;
        border: 1px solid var(--line);
        border-radius: 16px;
      }
      .card span {
        display: block;
        color: var(--muted);
        font-size: 12px;
        margin-bottom: 6px;
      }
      .section { margin-top: 24px; }
      .section-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 10px;
      }
      .section h2 { margin: 0; font-size: 20px; }
      .section-body {
        border: 1px solid var(--line);
        border-radius: 18px;
        padding: 18px;
        background: #fff;
        line-height: 1.7;
      }
      .note,
      .warn {
        margin-top: 10px;
        border-radius: 14px;
        padding: 12px 14px;
        background: #fbfcfe;
        border: 1px solid var(--line);
        color: var(--muted);
      }
      .warn {
        background: #fff8ec;
        color: var(--warn);
        border-color: #efddb7;
      }
      ul { margin: 8px 0 0; padding-left: 20px; }
      @media print {
        body { background: white; }
        .page { box-shadow: none; margin: 0; max-width: none; padding: 0; }
      }
      @media (max-width: 900px) {
        .page { margin: 0; padding: 20px; }
        .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }
    </style>
  </head>
  <body>
      <main class="page">
        <header class="hero">
        <h1>${escapeHtml(document.summary.title)}</h1>
        <div class="sub">
          <span>报告编号：${escapeHtml(document.summary.reportNo)}</span>
          <span>版本：${escapeHtml(document.reportStage)}</span>
          <span>文风：${escapeHtml(styleTone(document.styleMode))}</span>
          <span>状态：${escapeHtml(document.caseStatus)}</span>
        </div>
        ${
          introBadges.length
            ? `<div class="sub">${introBadges
                .map((item) => `<span class="badge">${escapeHtml(item)}</span>`)
                .join("")}</div>`
            : ""
        }
        <div class="summary-grid">
          <div class="card"><span>客户</span>${escapeHtml(document.summary.customerName)}</div>
          <div class="card"><span>机种</span>${escapeHtml(document.summary.productModel)}</div>
          <div class="card"><span>工单</span>${escapeHtml(document.summary.workOrder)}</div>
          <div class="card"><span>批次</span>${escapeHtml(document.summary.batch)}</div>
        </div>
        </header>
        ${factBasis}
        ${analysisSection}
        ${actionsSection}
        ${rebuildReviewSection}
        ${validationNotes}
        ${sections}
        ${pending}
      </main>
    </body>
</html>`;
}
