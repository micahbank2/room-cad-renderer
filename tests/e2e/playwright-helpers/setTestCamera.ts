// Phase 36 Plan 01 — deterministic camera pose for screenshot stability.
// Mirrors Phase 31 `window.__drive*` convention. Calls the test-mode-only
// `window.__setTestCamera` helper installed in `src/three/ThreeViewport.tsx`.
//
// Must be called AFTER the 3D viewport has mounted (OrbitControls created).

import type { Page } from "@playwright/test";

export type CameraPose = {
  position: [number, number, number];
  target: [number, number, number];
};

export async function setTestCamera(page: Page, pose: CameraPose): Promise<void> {
  await page.evaluate((p: CameraPose) => {
    const fn = (window as unknown as {
      __setTestCamera?: (pose: CameraPose) => void;
    }).__setTestCamera;
    if (!fn) {
      throw new Error(
        "__setTestCamera not installed — ensure Vite dev server is running with --mode test",
      );
    }
    fn(p);
  }, pose);
}
