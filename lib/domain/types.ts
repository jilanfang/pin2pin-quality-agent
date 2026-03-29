export const ACTIVE_WORKFLOW_STAGES = ["D2", "D3", "D4", "D5", "D6", "D7", "D8"] as const;
export const WORKFLOW_STAGES = ["D1", ...ACTIVE_WORKFLOW_STAGES] as const;

export type WorkflowStage = (typeof WORKFLOW_STAGES)[number];
export type ActiveWorkflowStage = (typeof ACTIVE_WORKFLOW_STAGES)[number];
export type D1Status = "missing" | "partial" | "complete";
export type WorkflowMode = "normal";
export type Priority = "high" | "medium" | "low";
export type SectionStatus = "confirmed" | "assumed" | "needs_validation";
export type StyleMode =
  | "professional_neutral"
  | "customer_formal"
  | "internal_direct";
export type ReportStage = "initial_24h" | "interim" | "final";
export type CaseStatus = "open" | "closed";
export type ExportTarget = "text" | "formalHtml" | "finalReport" | "pdf";
export type ResultArtifactKind = "analysis_summary" | "action_plan" | "eight_d";

export interface FactItem {
  field: string;
  value: string;
  confidence?: number;
  source?: string;
}

export interface GapItem {
  field: string;
  reason: string;
  priority: Priority;
}

export interface AssumptionItem {
  statement: string;
  needsValidation: boolean;
}

export interface GuidedThinkingResult {
  focusArea: ActiveWorkflowStage;
  thinkingGoal: string;
  guidanceText: string;
  suggestedQuestions: string[];
  checkpoints: string[];
  warnings: string[];
}

export interface StageRecord {
  stage: WorkflowStage;
  workingContent: string;
  confirmedContent: string;
  locked: boolean;
  impacted: boolean;
  impactSummary: string | null;
  lastReviewedAt: string | null;
}

export interface CaseRecord {
  id: string;
  ownerUserId: string | null;
  title: string;
  status: CaseStatus;
  archivedAt: string | null;
  currentStage: ActiveWorkflowStage;
  mode: WorkflowMode;
  d1Status: D1Status;
  createdAt: string;
  updatedAt: string;
}

export interface CaseMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  messageType: "evidence" | "conversation" | "assistant_note" | "system";
  createdAt: string;
}

export interface CaseAggregate {
  caseRecord: CaseRecord;
  stages: Record<WorkflowStage, StageRecord>;
  messages: CaseMessage[];
  knownFacts: FactItem[];
  missingFields: GapItem[];
  assumptions: AssumptionItem[];
  riskFlags: string[];
  warnings: string[];
}

export interface ExportCapability {
  allowed: boolean;
  reasonCodes: string[];
}

export interface ExportCapabilities {
  text: ExportCapability;
  formalHtml: ExportCapability;
  finalReport: ExportCapability;
  pdf: ExportCapability;
}

export interface AnalysisSummary {
  title: "分析结论";
  overview: string;
  confirmedFacts: string[];
  openQuestions: string[];
  risks: string[];
}

export interface ActionPlan {
  title: "行动方案";
  overview: string;
  immediateActions: string[];
  owners: string[];
  verificationChecks: string[];
}

export interface ResultReadiness {
  analysisSummary: boolean;
  actionPlan: boolean;
  eightD: boolean;
}

export interface ResultRecommendation {
  kind: ResultArtifactKind;
  title: string;
  rationale: string;
  primaryActionLabel: string;
  secondaryActionLabel?: string;
  deferActionLabel?: string;
}

export interface OutputSection {
  sectionKey: WorkflowStage;
  sectionTitle: string;
  status: SectionStatus;
  maturity: "draft" | "ready" | "verified";
  warnings: string[];
  pendingItems: string[];
  content: string;
}

export interface OutputDocument {
  documentId: string;
  caseId: string;
  language: "zh-CN";
  styleMode: StyleMode;
  reportStage: ReportStage;
  caseStatus: CaseStatus;
  audience: "customer" | "internal" | "mixed";
  summary: {
    title: string;
    reportNo: string;
    reportVersion: ReportStage;
    customerName: string;
    productModel: string;
    workOrder: string;
    batch: string;
    severity: "high" | "medium" | "low";
    statusBadges: string[];
  };
  factBasis: Array<{
    field: string;
    label: string;
    value: string;
  }>;
  validationNotes: {
    assumptions: string[];
    missingItems: string[];
    riskFlags: string[];
  };
  sections: OutputSection[];
  pendingItems: string[];
  riskFlags: string[];
  exportCapabilities: ExportCapabilities;
  generatedAt: string;
}

export interface EvidencePayload {
  content: string;
  contextStage?: WorkflowStage;
  forceCaseConfirmation?: "attach_to_current_case";
}

export interface EvidenceExtraction {
  knownFacts: FactItem[];
  assumptions: AssumptionItem[];
  riskFlags: string[];
}

export interface ApplyEvidenceOptions {
  llmExtraction?: EvidenceExtraction | null;
}

export interface StageActionPayload {
  stage: WorkflowStage;
  content?: string;
}

export interface ReportBuildOptions {
  reportStage: ReportStage;
  styleMode: StyleMode;
}

export interface ReportPreview {
  document:
    | OutputDocument
    | {
        artifactKind: ResultArtifactKind;
        title: string;
        caseStatus: CaseStatus;
        generatedAt: string;
      };
  text: string;
  html: string;
  warnings: string[];
}

export type ConversationIntent =
  | "evidence"
  | "question"
  | "summary_request"
  | "correction"
  | "decision_signal";

export type ConversationSourceShape =
  | "long_document"
  | "fragmented_update"
  | "meeting_notes"
  | "question_only"
  | "mixed_input";

export type ConversationCaseOperation =
  | "create_new_case"
  | "attach_to_current_case"
  | "needs_case_confirmation";

export type ConversationResponseMode = "inform" | "guide" | "result_action";

export type ThinkingMode =
  | "processing_input"
  | "reviewing_prior_judgement"
  | "summarizing_case"
  | "preparing_artifact";

export interface ConversationThinkingState {
  startedAt: string;
  finishedAt: string;
  etaLabel: string;
  mode: ThinkingMode;
  steps: string[];
}

export interface ConversationMeta {
  intents: ConversationIntent[];
  primaryStage: WorkflowStage;
  relatedStages: WorkflowStage[];
  impactedStages: WorkflowStage[];
  sourceShape: ConversationSourceShape;
  caseOperation: ConversationCaseOperation;
  responseMode: ConversationResponseMode;
  thinking: ConversationThinkingState;
}

export interface ConversationInputContext {
  sourceShape: ConversationSourceShape;
  isFirstTurn: boolean;
}

export type JourneyScenarioSegment = "customer_quality" | "factory_qe" | "sqe";

export type JourneyScenarioCaseFamily =
  | "customer_smoke_line_stop"
  | "customer_intermittent_function"
  | "line_solder_bridge_batch"
  | "reliability_intermittent_reset"
  | "incoming_mlcc_microcrack"
  | "supplier_8d_review_connector";

export type JourneyScenarioBusinessPriority = "critical" | "high" | "medium";

export type JourneyScenarioSourceType =
  | "email"
  | "wechat"
  | "feishu"
  | "phone_recap"
  | "meeting_notes"
  | "site_observation"
  | "test_summary"
  | "customer_portal"
  | "supplier_reply"
  | "manager_ping"
  | "system_note";

export type JourneyScenarioSpeakerRole =
  | "user"
  | "customer_quality_manager"
  | "customer_engineer"
  | "sales"
  | "fae"
  | "factory_supervisor"
  | "process_engineer"
  | "rd_engineer"
  | "test_engineer"
  | "reliability_engineer"
  | "supplier_quality_engineer"
  | "supplier_sales"
  | "manager"
  | "lab_engineer"
  | "warehouse"
  | "operator";

export type JourneyScenarioRawInputLanguageStyle =
  | "formal_email"
  | "chat_fragment"
  | "spoken_recap"
  | "meeting_minutes"
  | "lab_summary"
  | "pressure_request"
  | "customer_portal_note"
  | "supplier_8d_excerpt";

export type JourneyScenarioUsageTag = "benchmark" | "regression" | "smoke";
export type JourneyScenarioPriority = "p0" | "p1";

export interface StructuredJourneyScenario {
  scenarioId: string;
  segment: JourneyScenarioSegment;
  caseFamily: JourneyScenarioCaseFamily;
  stage: ActiveWorkflowStage;
  businessPriority: JourneyScenarioBusinessPriority;
  sourceType: JourneyScenarioSourceType;
  speakerRole: JourneyScenarioSpeakerRole;
  timestampOffset: string;
  rawInput: string;
  rawInputLanguageStyle: JourneyScenarioRawInputLanguageStyle;
  knownFacts: string[];
  assumptions: string[];
  misleadingSignals: string[];
  expectedIntents: ConversationIntent[];
  expectedPrimaryStage: ActiveWorkflowStage;
  expectedRelatedStages: ActiveWorkflowStage[];
  expectedImpactedStages: ActiveWorkflowStage[];
  expectedCaseOperation: ConversationCaseOperation;
  expectedResponseMode: ConversationResponseMode;
  expectedSourceShape: ConversationSourceShape;
  expectedNextQuestions: string[];
  expectedSafeBoundaries: string[];
  expectedArtifactsReady: ResultArtifactKind[];
  antiGoals: string[];
  usageTags: JourneyScenarioUsageTag[];
  priority: JourneyScenarioPriority;
  currentCaseTitle: string;
  currentKnownFacts: readonly FactItem[];
  hasCurrentCase: boolean;
}
