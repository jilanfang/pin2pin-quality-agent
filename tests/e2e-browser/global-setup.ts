import path from "node:path";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const E2E_DATABASE_URL =
  "postgres://test_user:test_pass@localhost:5433/ai_quality_test";
const PROJECT_ROOT = path.resolve(__dirname, "../..");
const USE_EXISTING_SERVER = Boolean(process.env.E2E_BASE_URL);
const LOCAL_ENV_PATH = path.join(PROJECT_ROOT, ".env.local");

function readDatabaseUrlFromEnvLocal() {
  if (!existsSync(LOCAL_ENV_PATH)) return null;
  const content = execSync(`cat ${LOCAL_ENV_PATH}`, { cwd: PROJECT_ROOT, encoding: "utf8" });
  const match = content.match(/^DATABASE_URL="?(.+?)"?$/m);
  return match?.[1] ?? null;
}

export default async function globalSetup() {
  if (USE_EXISTING_SERVER) {
    const existingDatabaseUrl = process.env.DATABASE_URL || readDatabaseUrlFromEnvLocal();
    if (!existingDatabaseUrl) {
      console.log("[e2e-browser] Reusing existing server without DATABASE_URL bootstrap.");
      return;
    }

    try {
      execSync(
        `DATABASE_URL='${existingDatabaseUrl}' node scripts/manage-auth-user.mjs create fireline-demo-01 'Pin2pin!2026' || true`,
        {
          cwd: PROJECT_ROOT,
          stdio: "inherit",
          shell: "/bin/zsh",
        }
      );
      execSync(
        `DATABASE_URL='${existingDatabaseUrl}' node scripts/manage-auth-user.mjs set-password fireline-demo-01 'Pin2pin!2026'`,
        {
          cwd: PROJECT_ROOT,
          stdio: "inherit",
          shell: "/bin/zsh",
        }
      );
      console.log("[e2e-browser] Reusing existing server and refreshed smoke account.");
    } catch (error) {
      console.log(
        `[e2e-browser] Skipped smoke account refresh for existing server: ${
          error instanceof Error ? error.message : "unexpected error"
        }`
      );
    }
    return;
  }

  console.log("[e2e-browser] Ensuring Docker Postgres is running...");
  execSync("docker compose -f docker-compose.test.yml up -d --wait", {
    cwd: PROJECT_ROOT,
    stdio: "inherit",
  });

  console.log("[e2e-browser] Pushing schema...");
  execSync(`DATABASE_URL=${E2E_DATABASE_URL} npm run db:push`, {
    cwd: PROJECT_ROOT,
    stdio: "inherit",
  });

  // Truncate before browser tests
  const postgres = (await import("postgres")).default;
  const sql = postgres(E2E_DATABASE_URL, { max: 1 });
  try {
    await sql`TRUNCATE cases, case_messages, case_stages, fact_snapshots, report_versions, artifacts CASCADE`;
  } finally {
    await sql.end();
  }

  execSync(
    `DATABASE_URL=${E2E_DATABASE_URL} node scripts/manage-auth-user.mjs create fireline-demo-01 'Pin2pin!2026'`,
    {
      cwd: PROJECT_ROOT,
      stdio: "inherit",
      shell: "/bin/zsh",
    }
  );

  console.log("[e2e-browser] Ready.");
}
