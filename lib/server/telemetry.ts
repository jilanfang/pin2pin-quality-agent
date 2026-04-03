import { appendFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

type TelemetryEventName =
  | "workspace_opened"
  | "case_created"
  | "seed_case_loaded"
  | "evidence_sent"
  | "report_preview_generated"
  | "final_report_generated"
  | "register_success"
  | "register_failed"
  | "app_error";

type FeedbackCategory =
  | "hard_to_understand"
  | "not_professional_enough"
  | "bug"
  | "other";

type TelemetryEntry =
  | {
      kind: "event";
      createdAt: string;
      name: TelemetryEventName;
      caseId?: string | null;
      metadata?: Record<string, string | number | boolean | null>;
    }
  | {
      kind: "feedback";
      createdAt: string;
      category: FeedbackCategory;
      caseId?: string | null;
      note?: string;
    };

type EventInput = Omit<Extract<TelemetryEntry, { kind: "event" }>, "kind" | "createdAt">;
type FeedbackInput = Omit<Extract<TelemetryEntry, { kind: "feedback" }>, "kind" | "createdAt">;

function telemetryPath() {
  return process.env.AI_QUALITY_TELEMETRY_PATH || join(tmpdir(), "ai-quality-telemetry.jsonl");
}

async function appendTelemetryEntry(entry: TelemetryEntry) {
  const path = telemetryPath();
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, `${JSON.stringify(entry)}\n`, "utf8");
}

export async function recordEvent(input: EventInput) {
  await appendTelemetryEntry({
    kind: "event",
    createdAt: new Date().toISOString(),
    ...input,
  });
}

export async function recordFeedback(input: FeedbackInput) {
  await appendTelemetryEntry({
    kind: "feedback",
    createdAt: new Date().toISOString(),
    ...input,
  });
}

export async function safeRecordEvent(input: EventInput) {
  try {
    await recordEvent(input);
  } catch (error) {
    console.error(
      `[telemetry] event_write_failed: ${error instanceof Error ? error.message : "unexpected error"}`
    );
  }
}

export async function safeRecordFeedback(input: FeedbackInput) {
  try {
    await recordFeedback(input);
  } catch (error) {
    console.error(
      `[telemetry] feedback_write_failed: ${error instanceof Error ? error.message : "unexpected error"}`
    );
  }
}

export type { FeedbackCategory, TelemetryEventName };
