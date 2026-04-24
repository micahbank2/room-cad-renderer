// Phase 36 Plan 01 — D-02 deterministic settle before screenshotting.
// 200ms wait + two requestAnimationFrame ticks ensures:
//   - OrbitControls damping has stabilized
//   - any pending R3F work has drained
//   - HDR Environment / shadow maps have a chance to settle post-remount.

import type { Page } from "@playwright/test";

export async function settle(page: Page): Promise<void> {
  await page.waitForTimeout(200);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      }),
  );
}
