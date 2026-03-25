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
  title: string;
  status: CaseStatus;
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
  messageType: "evidence" | "assistant_note" | "system";
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
  document: OutputDocument;
  text: string;
  html: string;
  warnings: string[];
}
