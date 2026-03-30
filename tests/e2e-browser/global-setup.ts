import { execSync } from "node:child_process";

const E2E_DATABASE_URL =
  "postgres://test_user:test_pass@localhost:5433/ai_quality_test";

export default async function globalSetup() {
  console.log("[e2e-browser] Ensuring Docker Postgres is running...");
  execSync("docker compose -f docker-compose.test.yml up -d --wait", {
    stdio: "inherit",
  });

  console.log("[e2e-browser] Pushing schema...");
  execSync(`DATABASE_URL=${E2E_DATABASE_URL} npm run db:push`, {
    stdio: "inherit",
  });

  // Truncate before browser tests
  const postgres = (await import("postgres")).default;
  const sql = postgres(E2E_DATABASE_URL, { max: 1 });
  await sql`TRUNCATE cases, case_messages, case_stages, fact_snapshots, report_versions, artifacts CASCADE`;
  await sql.end();

  console.log("[e2e-browser] Ready.");
}
