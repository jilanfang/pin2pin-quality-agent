import { execSync } from "node:child_process";

const E2E_DATABASE_URL = "postgres://test_user:test_pass@localhost:5433/ai_quality_test";

function checkDocker() {
  try {
    execSync("docker compose version", { stdio: "pipe" });
  } catch {
    throw new Error(
      "E2E tests require Docker Compose v2. Install: https://docs.docker.com/compose/install/"
    );
  }
}

function checkLlmKeys() {
  const provider = process.env.AI_QUALITY_LLM_PROVIDER || "qwen";
  const hasKey =
    (provider === "qwen" && process.env.DASHSCOPE_API_KEY) ||
    (provider === "deepseek" && process.env.DEEPSEEK_API_KEY) ||
    (provider === "ark" && process.env.AI_QUALITY_ARK_API_KEY) ||
    process.env.AI_QUALITY_LLM_API_KEY;

  if (!hasKey) {
    throw new Error(
      `E2E tests require a real LLM API key. Set DASHSCOPE_API_KEY, DEEPSEEK_API_KEY, or AI_QUALITY_ARK_API_KEY in .env`
    );
  }
}

export async function setup() {
  checkDocker();
  checkLlmKeys();

  console.log("[e2e] Starting Docker Postgres on :5433...");
  execSync("docker compose -f docker-compose.test.yml up -d --wait", {
    stdio: "inherit",
  });

  console.log("[e2e] Pushing schema to test database...");
  execSync(`DATABASE_URL=${E2E_DATABASE_URL} npm run db:push`, {
    stdio: "inherit",
  });

  // LLM reachability probe — skip suite if provider is down
  console.log("[e2e] Checking LLM provider reachability...");
  process.env.DATABASE_URL = E2E_DATABASE_URL;
  process.env.AI_QUALITY_LLM_ENABLED = "true";
  process.env.AI_QUALITY_LLM_COPILOT_TIMEOUT_MS = "10000";
  try {
    const { askCopilotWithLlm } = await import("@/lib/server/llm");
    await askCopilotWithLlm("ping");
    console.log("[e2e] LLM provider is reachable.");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(
      `[e2e] LLM provider unreachable, skipping E2E suite. Error: ${msg}\n` +
      `Check your .env API keys and provider availability.`
    );
  }

  console.log("[e2e] Infrastructure ready.");
}

export async function teardown() {
  console.log("[e2e] Tearing down Docker Postgres...");
  execSync("docker compose -f docker-compose.test.yml down -v", {
    stdio: "inherit",
  });
}
