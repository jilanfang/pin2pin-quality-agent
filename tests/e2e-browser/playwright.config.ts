import path from "node:path";

import { defineConfig } from "@playwright/test";

const E2E_DATABASE_URL =
  "postgres://test_user:test_pass@localhost:5433/ai_quality_test";
const PROJECT_ROOT = path.resolve(__dirname, "../..");

export default defineConfig({
  testDir: ".",
  timeout: 60_000,
  retries: 1,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3099",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  globalSetup: "./global-setup.ts",
  globalTeardown: "./global-teardown.ts",
  webServer: {
    command: [
      `DATABASE_URL=${E2E_DATABASE_URL}`,
      "AI_QUALITY_LLM_ENABLED=true",
      "AI_QUALITY_LLM_CONVERSATION_TIMEOUT_MS=20000",
      "AI_QUALITY_LLM_COPILOT_TIMEOUT_MS=20000",
      "WATCHPACK_POLLING=true",
      "next dev --hostname 127.0.0.1 --port 3099",
    ].join(" "),
    cwd: PROJECT_ROOT,
    url: "http://127.0.0.1:3099/api/health",
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
  },
});
