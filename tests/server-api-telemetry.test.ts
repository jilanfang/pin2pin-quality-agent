import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { postFeedbackHandler, postTelemetryHandler } from "@/lib/server/api";

describe("server api telemetry handlers", () => {
  const previousTelemetryPath = process.env.AI_QUALITY_TELEMETRY_PATH;
  let telemetryPath = "";

  beforeEach(() => {
    telemetryPath = join(tmpdir(), `ai-quality-api-telemetry-${crypto.randomUUID()}.jsonl`);
    process.env.AI_QUALITY_TELEMETRY_PATH = telemetryPath;
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

  it("accepts telemetry events without a bound case id", async () => {
    await postTelemetryHandler({
      name: "workspace_opened",
      caseId: null,
      metadata: { source: "workspace" },
    });

    const content = await readFile(telemetryPath, "utf8");
    const entries = content
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as Record<string, unknown>);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      kind: "event",
      name: "workspace_opened",
      caseId: null,
    });
  });

  it("accepts feedback submissions without a bound case id", async () => {
    await postFeedbackHandler({
      category: "other",
      caseId: null,
      note: "首屏先想给一个总体反馈。",
    });

    const content = await readFile(telemetryPath, "utf8");
    const entries = content
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as Record<string, unknown>);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      kind: "feedback",
      category: "other",
      caseId: null,
      note: "首屏先想给一个总体反馈。",
    });
  });

  it("accepts registration audit events", async () => {
    await postTelemetryHandler({
      name: "register_success",
      caseId: null,
      metadata: { username: "new-user", ip: "203.0.113.7" },
    });
    await postTelemetryHandler({
      name: "register_failed",
      caseId: null,
      metadata: { username: "existing-user", reason: "duplicate_username" },
    });

    const content = await readFile(telemetryPath, "utf8");
    const entries = content
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as Record<string, unknown>);

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      kind: "event",
      name: "register_success",
    });
    expect(entries[1]).toMatchObject({
      kind: "event",
      name: "register_failed",
    });
  });
});
