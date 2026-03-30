import type { FactItem } from "@/lib/domain/types";

export const E2E_DATABASE_URL =
  "postgres://test_user:test_pass@localhost:5433/ai_quality_test";

export async function truncateAllTables(): Promise<void> {
  const postgres = (await import("postgres")).default;
  const sql = postgres(E2E_DATABASE_URL, { max: 1 });
  try {
    // Keep in sync with lib/db/schema.ts table definitions
    await sql`TRUNCATE cases, case_messages, case_stages, fact_snapshots, report_versions, artifacts CASCADE`;
  } finally {
    await sql.end();
  }
}

export function assertFactExtracted(
  facts: FactItem[],
  field: string,
  expectedValuePattern: string | RegExp
): void {
  const match = facts.find((f) => f.field === field);
  if (!match) {
    throw new Error(
      `Expected knownFacts to contain field "${field}", got fields: [${facts.map((f) => f.field).join(", ")}]`
    );
  }
  if (typeof expectedValuePattern === "string") {
    if (!match.value.includes(expectedValuePattern)) {
      throw new Error(
        `Expected fact "${field}" value to include "${expectedValuePattern}", got "${match.value}"`
      );
    }
  } else {
    if (!expectedValuePattern.test(match.value)) {
      throw new Error(
        `Expected fact "${field}" value to match ${expectedValuePattern}, got "${match.value}"`
      );
    }
  }
}

export function assertChineseText(text: string, minLength = 10): void {
  if (!text || text.length < minLength) {
    throw new Error(
      `Expected Chinese text with min length ${minLength}, got ${text?.length ?? 0} chars`
    );
  }
  // At least some CJK characters present
  const cjkPattern = /[\u4e00-\u9fff]/u;
  if (!cjkPattern.test(text)) {
    throw new Error(`Expected text to contain Chinese characters, got: "${text.slice(0, 100)}"`);
  }
}
