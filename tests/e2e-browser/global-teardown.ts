import { execSync } from "node:child_process";

export default async function globalTeardown() {
  console.log("[e2e-browser] Tearing down Docker Postgres...");
  execSync("docker compose -f docker-compose.test.yml down -v", {
    stdio: "inherit",
  });
}
