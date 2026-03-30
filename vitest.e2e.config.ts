import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/e2e/**/*.e2e.test.ts"],
    testTimeout: 30_000,
    retry: 2,
    maxWorkers: 1,
    globalSetup: ["tests/e2e/e2e-setup.ts"],
    setupFiles: [],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": new URL("./", import.meta.url).pathname,
    },
  },
});
