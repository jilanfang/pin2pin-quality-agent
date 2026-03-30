import {
  buildActionPlan,
  buildAnalysisSummary,
  buildCasePresentation,
  buildOutputDocument,
  buildReportCapabilities,
  buildResultReadiness,
  buildResultRecommendation,
  buildTextOutput,
  renderActionPlanHtml,
  renderActionPlanText,
  renderAnalysisSummaryHtml,
  renderAnalysisSummaryText,
  renderFormalHtml,
} from "@/lib/domain/report-builder";
import type {
  CaseAggregate,
  ConversationMeta,
  ReportBuildOptions,
} from "@/lib/domain/types";
import { buildCaseWorkflowView } from "@/lib/domain/workflow-engine";

export function serializeCaseSummary(aggregate: CaseAggregate) {
  return {
    id: aggregate.caseRecord.id,
    title: aggregate.caseRecord.title,
    status: aggregate.caseRecord.status,
    archivedAt: aggregate.caseRecord.archivedAt,
    currentStage: aggregate.caseRecord.currentStage,
    mode: aggregate.caseRecord.mode,
    d1Status: aggregate.caseRecord.d1Status,
    updatedAt: aggregate.caseRecord.updatedAt,
  };
}

export function serializeCaseWorkflow(aggregate: CaseAggregate, conversationMeta?: ConversationMeta) {
  const view = buildCaseWorkflowView(aggregate);
  return {
    ...view,
    analysisSummary: buildAnalysisSummary(aggregate),
    actionPlan: buildActionPlan(aggregate),
    presentation: buildCasePresentation(aggregate),
    resultReadiness: buildResultReadiness(aggregate),
    resultRecommendation: buildResultRecommendation(aggregate),
    reportCapabilities: buildReportCapabilities(aggregate),
    conversationMeta: conversationMeta ?? null,
  };
}

export function serializeReportPreview(
  aggregate: CaseAggregate,
  options: ReportBuildOptions
) {
  if (options.reportStage === "initial_24h") {
    const summary = buildAnalysisSummary(aggregate);
    const presentation = buildCasePresentation(aggregate);
    return {
      document: {
        artifactKind: "analysis_summary" as const,
        displayArtifactLabel: presentation.primaryArtifactLabel,
        trustSummary: "已确认事实需继续回看原材料，待验证项不能直接写成结论。",
        title: presentation.isUrgentCustomerComplaint ? "24h 初版 8D" : summary.title,
        caseStatus: aggregate.caseRecord.status,
        generatedAt: new Date().toISOString(),
      },
      text: renderAnalysisSummaryText(summary),
      html: renderAnalysisSummaryHtml(summary, aggregate),
      warnings: aggregate.warnings,
    };
  }

  if (options.reportStage === "interim") {
    const plan = buildActionPlan(aggregate);
    if (!plan) {
      throw new Error("Action plan is not ready.");
    }
    return {
      document: {
        artifactKind: "action_plan" as const,
        title: plan.title,
        caseStatus: aggregate.caseRecord.status,
        generatedAt: new Date().toISOString(),
      },
      text: renderActionPlanText(plan),
      html: renderActionPlanHtml(plan, aggregate),
      warnings: aggregate.warnings,
    };
  }

  const document = buildOutputDocument(aggregate, options);
  return {
    document: {
      ...document,
      artifactKind: "eight_d" as const,
    },
    text: buildTextOutput(document),
    html: renderFormalHtml(document),
    warnings: aggregate.warnings,
  };
}
