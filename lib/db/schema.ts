import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const casesTable = pgTable("cases", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  status: text("status").notNull(),
  currentStage: text("current_stage").notNull(),
  mode: text("mode").notNull(),
  d1Status: text("d1_status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const caseMessagesTable = pgTable("case_messages", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  messageType: text("message_type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const factSnapshotsTable = pgTable("fact_snapshots", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull(),
  knownFacts: jsonb("known_facts").notNull(),
  missingFields: jsonb("missing_fields").notNull(),
  assumptions: jsonb("assumptions").notNull(),
  riskFlags: jsonb("risk_flags").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const caseStagesTable = pgTable("case_stages", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull(),
  stage: text("stage").notNull(),
  workingContent: text("working_content").notNull(),
  confirmedContent: text("confirmed_content").notNull(),
  locked: boolean("locked").notNull(),
  impacted: boolean("impacted").notNull(),
  impactSummary: text("impact_summary"),
  lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
});

export const reportVersionsTable = pgTable("report_versions", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull(),
  reportStage: text("report_stage").notNull(),
  styleMode: text("style_mode").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const artifactsTable = pgTable("artifacts", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull(),
  artifactType: text("artifact_type").notNull(),
  storagePath: text("storage_path"),
  extractedText: text("extracted_text"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});
