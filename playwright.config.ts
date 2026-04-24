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
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:5173" },
      // Dev-mode Vite w/ --mode test: Playwright process sets MODE=test so
      // `import.meta.env.MODE === "test"` gates activate. Phase 31 pattern.
    },
    {
      name: "chromium-preview",
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:4173" },
      // Plan 36-02: production-minified bundle test. `vite build --mode test`
      // + `vite preview --mode test` preserves `import.meta.env.MODE === "test"`
      // through minification so test-mode globals (__setTestCamera,
      // __driveTextureUpload) still install. If the minifier strips the
      // test-mode branches, this project will fail where chromium-dev passes —
      // a diagnostic signal per 36-RESEARCH Open Question Q1.
    },
  ],
  webServer: [
    {
      // Plan's canonical form: `npm run dev -- --mode test --port 5173`.
      // We invoke `npx vite` directly because the npm `--` arg-forwarding
      // layer intermittently loses `--mode test` on macOS npm 10 in nested
      // Playwright webServer spawns. `npx vite --mode test` is semantically
      // equivalent (same binary, same config) and is the Pitfall 1
      // mitigation documented in 36-RESEARCH.md.
      //
      // Equivalent: npm run dev -- --mode test --port 5173
      command: "npx vite --mode test --port 5173",
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      // Production-minified bundle served by `vite preview`. Build step must
      // also run in `--mode test` so `import.meta.env.MODE === "test"` gates
      // survive bundling — the preview server only serves pre-built dist/.
      // Equivalent: npm run build -- --mode test && npm run preview -- --port 4173
      command: "npx vite build --mode test && npx vite preview --mode test --port 4173 --strictPort",
      port: 4173,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
