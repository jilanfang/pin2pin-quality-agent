import path from "node:path";
import { execSync } from "node:child_process";

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const USE_EXISTING_SERVER = Boolean(process.env.E2E_BASE_URL);

export default async function globalTeardown() {
  if (USE_EXISTING_SERVER) {
    console.log("[e2e-browser] Reused existing server, skipping Docker teardown.");
    return;
  }

  console.log("[e2e-browser] Tearing down Docker Postgres...");
  execSync("docker compose -f docker-compose.test.yml down -v", {
    cwd: PROJECT_ROOT,
    stdio: "inherit",
  });
}
