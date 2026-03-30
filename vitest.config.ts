import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    exclude: ["tests/e2e/**", "tests/e2e-browser/**"],
    maxWorkers: 1,
  },
  resolve: {
    alias: {
      "@": new URL("./", import.meta.url).pathname,
    },
  },
});
