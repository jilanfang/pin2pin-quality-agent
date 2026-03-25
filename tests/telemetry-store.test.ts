import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("telemetry store", () => {
  const previousTelemetryPath = process.env.AI_QUALITY_TELEMETRY_PATH;
  let telemetryPath = "";

  beforeEach(() => {
    telemetryPath = join(tmpdir(), `ai-quality-telemetry-${crypto.randomUUID()}.jsonl`);
    process.env.AI_QUALITY_TELEMETRY_PATH = telemetryPath;
    vi.resetModules();
  });

  afterEach(async () => {
    await rm(telemetryPath, { force: true });
  });

  afterAll(() => {
    if (previousTelemetryPath === undefined) {
      delete process.env.AI_QUALITY_TELEMETRY_PATH;
    } else {
      process.env.AI_QUALITY_TELEMETRY_PATH = previousTelemetryPath;
    }
  });

  it("appends event and feedback entries as json lines", async () => {
    const { recordEvent, recordFeedback } = await import("@/lib/server/telemetry");

    await recordEvent({
      name: "workspace_opened",
      caseId: "case-1",
      metadata: { source: "workspace" },
    });
    await recordFeedback({
      category: "hard_to_understand",
      caseId: "case-1",
      note: "不知道下一步该补什么。",
    });

    const content = await readFile(telemetryPath, "utf8");
    const entries = content
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as Record<string, unknown>);

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      kind: "event",
      name: "workspace_opened",
      caseId: "case-1",
    });
    expect(entries[1]).toMatchObject({
      kind: "feedback",
      category: "hard_to_understand",
      caseId: "case-1",
      note: "不知道下一步该补什么。",
    });
  });
});
