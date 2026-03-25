import { z } from "zod";

import type { ReportBuildOptions, StyleMode, WorkflowStage } from "@/lib/domain/types";
import { buildOutputDocument } from "@/lib/domain/report-builder";
import {
  applyEvidence,
  confirmStage,
  revalidateStage,
  unlockStage,
} from "@/lib/domain/workflow-engine";
import { type SeedCaseKey } from "@/lib/domain/seed-cases";
import { getCaseStore } from "@/lib/server/case-store";
import { extractEvidenceWithLlm } from "@/lib/server/llm";
import {
  serializeCaseSummary,
  serializeCaseWorkflow,
  serializeReportPreview,
} from "@/lib/server/serializers";
import { safeRecordEvent, safeRecordFeedback } from "@/lib/server/telemetry";

const createCaseSchema = z.object({
  title: z.string().trim().min(1),
  seedCase: z
    .enum(["tantalum_reverse_polarity", "fragmented_regression_case"])
    .optional() as z.ZodType<SeedCaseKey | undefined>,
});

const evidenceSchema = z.object({
  content: z.string().trim().min(1),
  contextStage: z
    .enum(["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"])
    .optional() as z.ZodType<WorkflowStage | undefined>,
});

const stageActionSchema = z.object({
  content: z.string().trim().optional(),
});

const reportQuerySchema = z.object({
  reportStage: z.enum(["initial_24h", "interim", "final"]).default("initial_24h"),
  styleMode: z
    .enum(["professional_neutral", "customer_formal", "internal_direct"])
    .default("professional_neutral") as z.ZodType<StyleMode>,
});

const telemetryEventSchema = z.object({
  name: z.enum([
    "workspace_opened",
    "case_created",
    "seed_case_loaded",
    "evidence_sent",
    "report_preview_generated",
    "final_report_generated",
    "app_error",
  ]),
  caseId: z.string().trim().optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

const feedbackSchema = z.object({
  category: z.enum(["hard_to_understand", "not_professional_enough", "bug", "other"]),
  caseId: z.string().trim().optional(),
  note: z.string().trim().max(1000).optional(),
});

export async function listCasesHandler() {
  const store = getCaseStore();
  const cases = await store.listCases();
  return cases.map((item) => ({
    id: item.id,
    title: item.title,
    status: item.status,
    currentStage: item.currentStage,
    mode: item.mode,
    d1Status: item.d1Status,
    updatedAt: item.updatedAt,
  }));
}

export async function createCaseHandler(payload: unknown) {
  const parsed = createCaseSchema.parse(payload);
  const store = getCaseStore();
  const aggregate = await store.createCase(parsed.title, parsed.seedCase);
  await safeRecordEvent({
    name: parsed.seedCase ? "seed_case_loaded" : "case_created",
    caseId: aggregate.caseRecord.id,
    metadata: parsed.seedCase ? { seedCase: parsed.seedCase } : { source: "blank_case" },
  });
  return serializeCaseSummary(aggregate);
}

export async function getCaseHandler(caseId: string) {
  const store = getCaseStore();
  const aggregate = await store.getCase(caseId);
  if (!aggregate) {
    throw new Error("Case not found");
  }
  return serializeCaseWorkflow(aggregate);
}

export async function postEvidenceHandler(caseId: string, payload: unknown) {
  const parsed = evidenceSchema.parse(payload);
  const store = getCaseStore();
  const aggregate = await store.getCase(caseId);
  if (!aggregate) {
    throw new Error("Case not found");
  }
  const llmExtraction = await extractEvidenceWithLlm(parsed);
  const next = applyEvidence(aggregate, parsed, { llmExtraction });
  await store.saveCase(next);
  await safeRecordEvent({
    name: "evidence_sent",
    caseId,
    metadata: { contextStage: parsed.contextStage ?? "D2" },
  });
  return serializeCaseWorkflow(next);
}

export async function stageActionHandler(
  caseId: string,
  stage: WorkflowStage,
  action: "confirm" | "unlock" | "revalidate",
  payload: unknown
) {
  const parsed = stageActionSchema.parse(payload);
  const store = getCaseStore();
  const aggregate = await store.getCase(caseId);
  if (!aggregate) {
    throw new Error("Case not found");
  }

  let next = aggregate;
  if (action === "confirm") {
    next = confirmStage(aggregate, { stage, content: parsed.content });
  } else if (action === "unlock") {
    next = unlockStage(aggregate, { stage, content: parsed.content });
  } else {
    next = revalidateStage(aggregate, { stage, content: parsed.content });
  }

  await store.saveCase(next);
  return serializeCaseWorkflow(next);
}

export async function reportPreviewHandler(caseId: string, searchParams: URLSearchParams) {
  const parsed = reportQuerySchema.parse(Object.fromEntries(searchParams.entries()));
  const store = getCaseStore();
  const aggregate = await store.getCase(caseId);
  if (!aggregate) {
    throw new Error("Case not found");
  }
  await safeRecordEvent({
    name: "report_preview_generated",
    caseId,
    metadata: {
      reportStage: parsed.reportStage,
      styleMode: parsed.styleMode,
    },
  });
  return serializeReportPreview(aggregate, parsed as ReportBuildOptions);
}

export async function reportHtmlHandler(caseId: string, searchParams: URLSearchParams) {
  const parsed = reportQuerySchema.parse(Object.fromEntries(searchParams.entries()));
  const store = getCaseStore();
  const aggregate = await store.getCase(caseId);
  if (!aggregate) {
    throw new Error("Case not found");
  }
  const preview = serializeReportPreview(aggregate, parsed as ReportBuildOptions);
  if (parsed.reportStage === "final" && !preview.document.exportCapabilities.finalReport.allowed) {
    throw new Error("Case is not ready for final report export.");
  }
  await store.saveReport(preview.document);
  return preview.html;
}

export async function closeCaseForFinalReport(caseId: string, searchParams: URLSearchParams) {
  const parsed = reportQuerySchema.parse(Object.fromEntries(searchParams.entries()));
  if (parsed.reportStage !== "final") {
    throw new Error("Only final report can close a case.");
  }
  const store = getCaseStore();
  const aggregate = await store.getCase(caseId);
  if (!aggregate) {
    throw new Error("Case not found");
  }
  const previewDocument = buildOutputDocument(aggregate, parsed as ReportBuildOptions);
  if (!previewDocument.exportCapabilities.finalReport.allowed) {
    throw new Error("Case is not ready for final report export.");
  }
  aggregate.caseRecord.status = "closed";
  aggregate.caseRecord.updatedAt = new Date().toISOString();
  const document = buildOutputDocument(aggregate, parsed as ReportBuildOptions);
  if (!document.exportCapabilities.finalReport.allowed) {
    throw new Error("Case is not ready for final report export.");
  }
  await store.saveCase(aggregate);
  await store.saveReport(document);
  await safeRecordEvent({
    name: "final_report_generated",
    caseId,
    metadata: {
      reportStage: parsed.reportStage,
      styleMode: parsed.styleMode,
    },
  });
  return serializeCaseWorkflow(aggregate);
}

export async function postTelemetryHandler(payload: unknown) {
  const parsed = telemetryEventSchema.parse(payload);
  await safeRecordEvent(parsed);
}

export async function postFeedbackHandler(payload: unknown) {
  const parsed = feedbackSchema.parse(payload);
  await safeRecordFeedback(parsed);
}
