// Phase 35 Plan 02 — Playwright helpers for preset motion e2e specs.
// Mirrors Phase 36 `setTestCamera.ts` shape: thin `page.evaluate` bridges
// to the test-mode-only window drivers installed in
// `src/three/ThreeViewport.tsx`. All three drivers are gated on
// `import.meta.env.MODE === "test"` — if Playwright isn't running
// `npx vite --mode test`, these helpers throw with a clear message.

import type { Page } from "@playwright/test";
import type { PresetId } from "../../../src/three/cameraPresets";

/** Fire a preset request via the test-mode-only window.__applyCameraPreset
 *  driver. Production code path: same as clicking a Toolbar preset button —
 *  goes through useUIStore.requestPreset(). The driver is a thin shim
 *  (Research §4 Option B — no parallel test-only motion engine). */
export async function applyCameraPreset(page: Page, presetId: PresetId): Promise<void> {
  await page.evaluate((id: PresetId) => {
    const fn = (window as unknown as {
      __applyCameraPreset?: (id: PresetId) => void;
    }).__applyCameraPreset;
    if (!fn) {
      throw new Error(
        "__applyCameraPreset not installed — ensure Playwright webServer runs with `--mode test`",
      );
    }
    fn(id);
  }, presetId);
}

/** Read uiStore.activePreset without going through React subscription. */
export async function getActivePreset(page: Page): Promise<PresetId | null> {
  return await page.evaluate(() => {
    const fn = (window as unknown as {
      __getActivePreset?: () => PresetId | null;
    }).__getActivePreset;
    if (!fn) {
      throw new Error(
        "__getActivePreset not installed — ensure Playwright webServer runs with `--mode test`",
      );
    }
    return fn();
  });
}

/** Read the live camera pose from orbitControlsRef. Used by mid-tween-cancel
 *  spec to confirm the tween settled at the latest-requested preset. */
export async function getCameraPose(page: Page): Promise<{
  position: [number, number, number];
  target: [number, number, number];
}> {
  const pose = await page.evaluate(() => {
    const fn = (window as unknown as {
      __getCameraPose?: () =>
        | { position: [number, number, number]; target: [number, number, number] }
        | null;
    }).__getCameraPose;
    if (!fn) {
      throw new Error(
        "__getCameraPose not installed — ensure Playwright webServer runs with `--mode test`",
      );
    }
    return fn();
  });
  if (!pose) throw new Error("getCameraPose: orbitControlsRef not ready");
  return pose;
}
