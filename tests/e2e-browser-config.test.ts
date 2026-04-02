import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("e2e browser configuration", () => {
  it("keeps the Playwright dev server on the isolated dist dir", async () => {
    const config = await readFile(
      path.resolve(process.cwd(), "tests/e2e-browser/playwright.config.ts"),
      "utf8"
    );

    expect(config).toContain('"NEXT_DIST_DIR=.next-dev"');
    expect(config).toContain('"next dev --hostname localhost --port 3099"');
  });

  it("bootstraps the smoke account before resetting its password on reused servers", async () => {
    const setup = await readFile(
      path.resolve(process.cwd(), "tests/e2e-browser/global-setup.ts"),
      "utf8"
    );

    const createIndex = setup.indexOf(
      "node scripts/manage-auth-user.mjs create fireline-demo-01 'Pin2pin!2026' || true"
    );
    const resetIndex = setup.indexOf(
      "node scripts/manage-auth-user.mjs set-password fireline-demo-01 'Pin2pin!2026'"
    );

    expect(createIndex).toBeGreaterThanOrEqual(0);
    expect(resetIndex).toBeGreaterThan(createIndex);
  });
});
