import path from "node:path";

import { defineConfig } from "@playwright/test";

const E2E_DATABASE_URL =
  "postgres://test_user:test_pass@localhost:5433/ai_quality_test";
const PROJECT_ROOT = path.resolve(__dirname, "../..");
const E2E_BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3099";
const SHOULD_USE_EXISTING_SERVER = Boolean(process.env.E2E_BASE_URL);

export default defineConfig({
  testDir: ".",
  timeout: 60_000,
  retries: 1,
  workers: 1,
  use: {
    baseURL: E2E_BASE_URL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  globalSetup: "./global-setup.ts",
  globalTeardown: "./global-teardown.ts",
  webServer: SHOULD_USE_EXISTING_SERVER
    ? undefined
    : {
        command: [
          `DATABASE_URL=${E2E_DATABASE_URL}`,
          "NEXT_DIST_DIR=.next-dev",
          "AI_QUALITY_LLM_ENABLED=true",
          "AI_QUALITY_LLM_CONVERSATION_TIMEOUT_MS=20000",
          "AI_QUALITY_LLM_COPILOT_TIMEOUT_MS=20000",
          "WATCHPACK_POLLING=true",
          "next dev --hostname localhost --port 3099",
        ].join(" "),
        cwd: PROJECT_ROOT,
        url: E2E_BASE_URL + "/api/health",
        timeout: 60_000,
        reuseExistingServer: !process.env.CI,
      },
});
