import path from "node:path";
import { execSync } from "node:child_process";

const PROJECT_ROOT = path.resolve(__dirname, "../..");

export default async function globalTeardown() {
  console.log("[e2e-browser] Tearing down Docker Postgres...");
  execSync("docker compose -f docker-compose.test.yml down -v", {
    cwd: PROJECT_ROOT,
    stdio: "inherit",
  });
}
