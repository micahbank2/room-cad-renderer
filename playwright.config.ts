// playwright.config.ts
// Phase 36 Plan 01 — VIZ-10 investigation harness.
// Two projects: chromium-dev (active for Plan 36-01 investigation) and
// chromium-preview (scaffolded, inactive until Plan 36-02 activates the preview webServer).
//
// CRITICAL: webServer uses `npm run dev -- --mode test` so that
// `import.meta.env.MODE === "test"` is truthy and test-mode globals
// (window.__setTestCamera, window.__driveTextureUpload, etc.) install.
// Without --mode test, Phase 31/34 drivers never attach and Playwright
// helpers throw TypeError on first call.
//
// Texture caches are module-level singletons, so tests MUST run serially
// (fullyParallel: false) within a single worker.

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e/specs",
  // Texture caches are module-level singletons — isolate serial.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    trace: "retain-on-failure",
    baseURL: "http://localhost:5173",
  },
  expect: {
    // ROADMAP mandate: ≤1% pixel delta tolerance for 2D↔3D toggle regression.
    toHaveScreenshot: { maxDiffPixelRatio: 0.01 },
  },
  projects: [
    {
      name: "chromium-dev",
      use: { ...devices["Desktop Chrome"] },
      // Dev-mode Vite w/ --mode test: Playwright process sets MODE=test so
      // `import.meta.env.MODE === "test"` gates activate. Phase 31 pattern.
    },
    // Plan 36-02 wires the preview webServer + activates chromium-preview project.
    // Left scaffolded (not in `projects` list) until prod-mode test-globals
    // behavior is characterized. See 36-RESEARCH.md Open Question 1.
  ],
  webServer: [
    {
      command: "npm run dev -- --mode test --port 5173",
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    // Plan 36-02 adds preview server here:
    // { command: "npm run build && npm run preview -- --mode test --port 4173", port: 4173, ... }
  ],
});
