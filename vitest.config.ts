import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.{test,spec}.{ts,tsx}", "src/__tests__/**/*.{test,spec}.{ts,tsx}"],
    // Phase 36 Plan 01: exclude Playwright E2E specs so vitest never tries
    // to run them under happy-dom. Playwright uses real browser IDB, not
    // fake-indexeddb (see 36-RESEARCH.md Pitfall 3).
    exclude: ["node_modules/**", "dist/**", "tests/e2e/**"],
  },
});
