import { z } from "zod";

import type {
  ConversationCaseOperation,
  ConversationIntent,
  ConversationMeta,
  ConversationResponseMode,
  ConversationSourceShape,
  ConversationThinkingState,
  ReportBuildOptions,
  ResultArtifactKind,
  StyleMode,
  WorkflowStage,
} from "@/lib/domain/types";
import { buildActionPlan, buildAnalysisSummary, buildOutputDocument } from "@/lib/domain/report-builder";
import {
  detectConversationCaseOperation,
  detectConversationIntents,
  detectConversationSourceShape,
} from "@/lib/domain/conversation-input";
import {
  applyEvidence,
  confirmStage,
  revalidateStage,
  unlockStage,
} from "@/lib/domain/workflow-engine";
import { type SeedCaseKey } from "@/lib/domain/seed-cases";
import { getCaseStore } from "@/lib/server/case-store";
import { askCopilotWithLlm, extractEvidenceWithLlm } from "@/lib/server/llm";
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

const updateCaseSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    archived: z.boolean().optional(),
  })
  .refine((value) => value.title !== undefined || value.archived !== undefined, {
    message: "至少提供一个更新字段",
  });

const evidenceSchema = z.object({
  content: z.string().trim().min(1),
  contextStage: z
    .enum(["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"])
    .optional() as z.ZodType<WorkflowStage | undefined>,
  forceCaseConfirmation: z.enum(["attach_to_current_case"]).optional(),
});

const stageActionSchema = z.object({
  content: z.string().trim().optional(),
});

const reportQuerySchema = z.object({
  reportStage: z.enum(["initial_24h", "interim", "final"]).default("initial_24h"),
  styleMode: z
    .enum(["professional_neutral", "customer_formal", "internal_direct"])
    .default("professional_neutral") as z.ZodType<StyleMode>,
  artifact: z.enum(["analysis_summary", "action_plan", "eight_d"]).optional() as z.ZodType<
    ResultArtifactKind | undefined
  >,
});

function normalizeReportOptions(parsed: z.infer<typeof reportQuerySchema>): ReportBuildOptions {
  if (parsed.artifact === "analysis_summary") {
    return {
      reportStage: "initial_24h",
      styleMode: "professional_neutral",
    };
  }

  if (parsed.artifact === "action_plan") {
    return {
      reportStage: "interim",
      styleMode: "professional_neutral",
    };
  }

  if (parsed.artifact === "eight_d") {
    return {
      reportStage: "final",
      styleMode: "professional_neutral",
    };
  }

  return parsed as ReportBuildOptions;
}

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
  caseId: z.string().trim().nullable().optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

const feedbackSchema = z.object({
  category: z.enum(["hard_to_understand", "not_professional_enough", "bug", "other"]),
  caseId: z.string().trim().nullable().optional(),
  note: z.string().trim().max(1000).optional(),
});

const copilotSchema = z.object({
  prompt: z.string().trim().min(1),
});

export type RequestUserContext = {
  userId: string | null;
  isAuthenticated: boolean;
};

function buildThinkingState(intents: ConversationIntent[]): ConversationThinkingState {
  const startedAt = new Date().toISOString();
  const finishedAt = new Date().toISOString();

  if (intents.includes("summary_request")) {
    return {
      startedAt,
      finishedAt,
      etaLabel: "6-10 秒",
      mode: "summarizing_case",
      steps: ["汇总已确认事实", "区分判断与待验证项", "输出当前总结"],
    };
  }

  if (intents.includes("correction")) {
    return {
      startedAt,
      finishedAt,
      etaLabel: "8-12 秒",
      mode: "reviewing_prior_judgement",
      steps: ["对比新旧信息", "标记受影响段落", "更新当前判断"],
    };
  }

  return {
    startedAt,
    finishedAt,
    etaLabel: "6-10 秒",
    mode: "processing_input",
    steps: ["识别新增事实", "检查是否影响前序判断", "更新当前分析与下一步"],
  };
}

function determineResponseMode(
  intents: ConversationIntent[],
  _next: ReturnType<typeof applyEvidence>
): ConversationResponseMode {
  if (intents.includes("decision_signal") || intents.includes("summary_request")) {
    return "result_action";
  }

  if (intents.includes("question") && !intents.includes("evidence")) {
    return "inform";
  }

  return "guide";
}

function buildConversationMeta(
  intents: ConversationIntent[],
  primaryStage: WorkflowStage,
  next: ReturnType<typeof applyEvidence>,
  options: {
    sourceShape: ConversationSourceShape;
    caseOperation: ConversationCaseOperation;
  }
): ConversationMeta {
  const impactedStages = (["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"] as WorkflowStage[]).filter(
    (stage) => next.stages[stage].impacted
  );
  const relatedStages = Array.from(
    new Set<WorkflowStage>([primaryStage, ...impactedStages])
  );

  return {
    intents,
    primaryStage,
    relatedStages,
    impactedStages,
    sourceShape: options.sourceShape,
    caseOperation: options.caseOperation,
    responseMode: determineResponseMode(intents, next),
    thinking: buildThinkingState(intents),
  };
}

function buildConversationSummary(next: ReturnType<typeof applyEvidence>) {
  const analysisSummary = buildAnalysisSummary(next);
  const actionPlan = buildActionPlan(next);
  const confirmedFacts =
    analysisSummary.confirmedFacts.slice(0, 4).map((item) => `- ${item}`).join("\n") || "- 暂无稳定事实";
  const openQuestions =
    analysisSummary.openQuestions.slice(0, 4).map((item) => `- ${item}`).join("\n") || "- 当前没有明显待补项";
  const currentJudgement = actionPlan
    ? "当前已经可以先收口行动方案，但仍建议继续补关键验证，再决定何时进入正式 8D。"
    : analysisSummary.overview;

  return [
    "当前情况总结",
    `当前阶段：${next.caseRecord.currentStage}`,
    "",
    "已确认事实",
    confirmedFacts,
    "",
    "当前判断",
    currentJudgement,
    "",
    "还缺什么",
    openQuestions,
  ].join("\n");
}

export async function listCasesHandler(context?: RequestUserContext) {
  const store = getCaseStore();
  const cases = await store.listCases(context?.userId ?? undefined);
  return cases.map((item) => ({
    id: item.id,
    title: item.title,
    status: item.status,
    archivedAt: item.archivedAt,
    currentStage: item.currentStage,
    mode: item.mode,
    d1Status: item.d1Status,
    updatedAt: item.updatedAt,
  }));
}

export async function getOverviewHandler(context?: RequestUserContext) {
  const store = getCaseStore();
  const cases = await store.listCases(context?.userId ?? undefined);
  const activeCases = cases.filter((item) => !item.archivedAt);
  const recentInvestigations = activeCases.slice(0, 5).map((item) => ({
    id: item.id,
    title: item.title,
    stageLabel: item.currentStage,
    statusLabel: item.status === "open" ? "进行中" : "已关闭",
    updatedAtLabel: new Date(item.updatedAt).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
    href: `/investigations/${item.id}`,
  }));

  const artifactHighlights = [];
  for (const item of activeCases.slice(0, 3)) {
    const aggregate = await store.getCase(item.id, context?.userId ?? undefined);
    if (!aggregate) continue;
    const analysisSummary = buildAnalysisSummary(aggregate);
    if (analysisSummary.confirmedFacts.length > 0) {
      artifactHighlights.push({
        caseId: item.id,
        caseTitle: item.title,
        artifactKind: "analysis_summary" as const,
        artifactLabel: "分析结论",
        href: `/investigations/${item.id}?preview=analysis_summary`,
      });
      continue;
    }

    const actionPlan = buildActionPlan(aggregate);
    if (actionPlan) {
      artifactHighlights.push({
        caseId: item.id,
        caseTitle: item.title,
        artifactKind: "action_plan" as const,
        artifactLabel: "行动方案",
        href: `/investigations/${item.id}?preview=action_plan`,
      });
    }
  }

  return {
    stats: {
      activeInvestigations: activeCases.length,
      pendingEvidence: activeCases.filter((item) => item.currentStage !== "D8").length,
      readyArtifacts: artifactHighlights.length,
    },
    recentInvestigations,
    artifactHighlights,
  };
}

export async function createCaseHandler(payload: unknown, context?: RequestUserContext) {
  const parsed = createCaseSchema.parse(payload);
  const store = getCaseStore();
  const aggregate = await store.createCase(parsed.title, parsed.seedCase, context?.userId ?? undefined);
  await safeRecordEvent({
    name: parsed.seedCase ? "seed_case_loaded" : "case_created",
    caseId: aggregate.caseRecord.id,
    metadata: parsed.seedCase ? { seedCase: parsed.seedCase } : { source: "blank_case" },
  });
  return serializeCaseSummary(aggregate);
}

export async function getCaseHandler(caseId: string, context?: RequestUserContext) {
  const store = getCaseStore();
  const aggregate = await store.getCase(caseId, context?.userId ?? undefined);
  if (!aggregate) {
    throw new Error("Case not found");
  }
  return serializeCaseWorkflow(aggregate);
}

export async function updateCaseHandler(caseId: string, payload: unknown, context?: RequestUserContext) {
  const parsed = updateCaseSchema.parse(payload);
  const store = getCaseStore();
  const aggregate = await store.updateCase(caseId, parsed, context?.userId ?? undefined);
  if (!aggregate) {
    throw new Error("Case not found");
  }
  return serializeCaseSummary(aggregate);
}

export async function deleteCaseHandler(caseId: string, context?: RequestUserContext) {
  const store = getCaseStore();
  const deleted = await store.deleteCase(caseId, context?.userId ?? undefined);
  if (!deleted) {
    throw new Error("Case not found");
  }
  return { ok: true as const };
}

export async function postEvidenceHandler(caseId: string, payload: unknown, context?: RequestUserContext) {
  const parsed = evidenceSchema.parse(payload);
  const store = getCaseStore();
  const aggregate = await store.getCase(caseId, context?.userId ?? undefined);
  if (!aggregate) {
    throw new Error("Case not found");
  }
  const intents = detectConversationIntents(parsed.content);
  const sourceShape = detectConversationSourceShape(parsed.content, intents);
  const isFirstTurn = aggregate.messages.filter((item) => item.role === "user").length === 0;
  const caseOperation = detectConversationCaseOperation({
    content: parsed.content,
    currentCaseTitle: aggregate.caseRecord.title,
    currentKnownFacts: aggregate.knownFacts,
    sourceShape,
    hasCurrentCase: true,
  });
  const shouldHoldForConfirmation =
    caseOperation === "needs_case_confirmation" && parsed.forceCaseConfirmation !== "attach_to_current_case";
  if (shouldHoldForConfirmation) {
    const conversationMeta = buildConversationMeta(
      intents,
      parsed.contextStage ?? aggregate.caseRecord.currentStage,
      aggregate,
      {
        sourceShape,
        caseOperation,
      }
    );
    return serializeCaseWorkflow(aggregate, conversationMeta);
  }
  const llmExtraction = await extractEvidenceWithLlm(parsed);
  const next = applyEvidence(aggregate, parsed, {
    llmExtraction,
    inputContext: {
      sourceShape,
      isFirstTurn,
    },
  });
  if (intents.includes("summary_request")) {
    next.messages.push({
      id: `msg-${Math.random().toString(36).slice(2, 10)}`,
      role: "assistant",
      content: buildConversationSummary(next),
      messageType: "assistant_note",
      createdAt: new Date().toISOString(),
    });
  }
  await store.saveCase(next);
  await safeRecordEvent({
    name: "evidence_sent",
    caseId,
    metadata: { contextStage: parsed.contextStage ?? "D2" },
  });
  const conversationMeta = buildConversationMeta(
    intents,
    parsed.contextStage ?? next.caseRecord.currentStage,
    next,
    {
      sourceShape,
      caseOperation,
    }
  );
  return serializeCaseWorkflow(next, conversationMeta);
}

export async function postCopilotHandler(payload: unknown) {
  const parsed = copilotSchema.parse(payload);
  const answer = await askCopilotWithLlm(parsed.prompt);

  return {
    answer:
      answer ??
      "当前未接通在线模型，请先根据既有质量体系与内部规范进行判断。建议你优先确认问题定义、临时遏制、根因链路和验证方式，再继续推进 8D。",
  };
}

export async function stageActionHandler(
  caseId: string,
  stage: WorkflowStage,
  action: "confirm" | "unlock" | "revalidate",
  payload: unknown,
  context?: RequestUserContext
) {
  const parsed = stageActionSchema.parse(payload);
  const store = getCaseStore();
  const aggregate = await store.getCase(caseId, context?.userId ?? undefined);
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

export async function reportPreviewHandler(
  caseId: string,
  searchParams: URLSearchParams,
  context?: RequestUserContext
) {
  const parsed = reportQuerySchema.parse(Object.fromEntries(searchParams.entries()));
  const options = normalizeReportOptions(parsed);
  const store = getCaseStore();
  const aggregate = await store.getCase(caseId, context?.userId ?? undefined);
  if (!aggregate) {
    throw new Error("Case not found");
  }
  await safeRecordEvent({
    name: "report_preview_generated",
    caseId,
    metadata: {
      reportStage: options.reportStage,
      styleMode: options.styleMode,
      artifact: parsed.artifact ?? null,
    },
  });
  return serializeReportPreview(aggregate, options);
}

export async function reportHtmlHandler(
  caseId: string,
  searchParams: URLSearchParams,
  context?: RequestUserContext
) {
  const parsed = reportQuerySchema.parse(Object.fromEntries(searchParams.entries()));
  const options = normalizeReportOptions(parsed);
  const store = getCaseStore();
  const aggregate = await store.getCase(caseId, context?.userId ?? undefined);
  if (!aggregate) {
    throw new Error("Case not found");
  }
  const preview = serializeReportPreview(aggregate, options);
  if (options.reportStage !== "final") {
    return preview.html;
  }

  if (!("exportCapabilities" in preview.document) || !preview.document.exportCapabilities.finalReport.allowed) {
    throw new Error("Case is not ready for final report export.");
  }

  await store.saveReport(preview.document);
  return preview.html;
}

export async function closeCaseForFinalReport(
  caseId: string,
  searchParams: URLSearchParams,
  context?: RequestUserContext
) {
  const parsed = reportQuerySchema.parse(Object.fromEntries(searchParams.entries()));
  const options = normalizeReportOptions(parsed);
  if (options.reportStage !== "final") {
    throw new Error("Only final report can close a case.");
  }
  const store = getCaseStore();
  const aggregate = await store.getCase(caseId, context?.userId ?? undefined);
  if (!aggregate) {
    throw new Error("Case not found");
  }
  const previewDocument = buildOutputDocument(aggregate, options);
  if (!previewDocument.exportCapabilities.finalReport.allowed) {
    throw new Error("Case is not ready for final report export.");
  }
  aggregate.caseRecord.status = "closed";
  aggregate.caseRecord.updatedAt = new Date().toISOString();
  const document = buildOutputDocument(aggregate, options);
  if (!document.exportCapabilities.finalReport.allowed) {
    throw new Error("Case is not ready for final report export.");
  }
  await store.saveCase(aggregate);
  await store.saveReport(document);
  await safeRecordEvent({
    name: "final_report_generated",
    caseId,
    metadata: {
      reportStage: options.reportStage,
      styleMode: options.styleMode,
      artifact: parsed.artifact ?? "eight_d",
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
