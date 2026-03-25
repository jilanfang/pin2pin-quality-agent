import {
  buildOutputDocument,
  buildReportCapabilities,
  buildTextOutput,
  renderFormalHtml,
} from "@/lib/domain/report-builder";
import type {
  CaseAggregate,
  ReportBuildOptions,
} from "@/lib/domain/types";
import { buildCaseWorkflowView } from "@/lib/domain/workflow-engine";

export function serializeCaseSummary(aggregate: CaseAggregate) {
  return {
    id: aggregate.caseRecord.id,
    title: aggregate.caseRecord.title,
    status: aggregate.caseRecord.status,
    currentStage: aggregate.caseRecord.currentStage,
    mode: aggregate.caseRecord.mode,
    d1Status: aggregate.caseRecord.d1Status,
    updatedAt: aggregate.caseRecord.updatedAt,
  };
}

export function serializeCaseWorkflow(aggregate: CaseAggregate) {
  const view = buildCaseWorkflowView(aggregate);
  return {
    ...view,
    reportCapabilities: buildReportCapabilities(aggregate),
  };
}

export function serializeReportPreview(
  aggregate: CaseAggregate,
  options: ReportBuildOptions
) {
  const document = buildOutputDocument(aggregate, options);
  return {
    document,
    text: buildTextOutput(document),
    html: renderFormalHtml(document),
    warnings: aggregate.warnings,
  };
}
