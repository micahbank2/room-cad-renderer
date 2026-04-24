// Phase 36 Plan 01 — common per-test setup for VIZ-10 harness specs.
// Clears texture IDB, disables onboarding overlay, navigates to app.
// Call this inside `test.beforeEach` instead of repeating in each spec.

import type { Page } from "@playwright/test";

export async function setupPage(page: Page): Promise<void> {
  // Pre-installed init script: disable onboarding on page load so the
  // pointer-events overlay doesn't block our Toolbar clicks.
  await page.addInitScript(() => {
    try {
      localStorage.setItem("room-cad-onboarding-completed", "1");
    } catch {
      /* localStorage may be unavailable on about:blank */
    }
  });

  await page.goto("/");
  // Purge the real browser IDB (Pitfall 3).
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase("room-cad-user-textures");
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  });
  await page.reload();
  await page.waitForLoadState("domcontentloaded");
}
