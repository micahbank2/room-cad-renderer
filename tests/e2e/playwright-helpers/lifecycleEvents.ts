// Phase 36 Plan 01 — drains the texture lifecycle event buffer.
// IMPORTANT (Anti-Patterns §): read at END of each test only — NEVER
// mid-test. The full cross-cycle sequence is the audit value that feeds
// ROOT-CAUSE.md evidence. Do NOT clear the buffer between cycles.

import type { Page } from "@playwright/test";

export type LifecycleEvent = {
  t: number;
  event: string;
  id?: string;
  uuid?: string;
  context?: Record<string, unknown>;
};

export async function getLifecycleEvents(page: Page): Promise<LifecycleEvent[]> {
  return await page.evaluate(() => {
    return (window as unknown as { __textureLifecycleEvents?: LifecycleEvent[] })
      .__textureLifecycleEvents ?? [];
  });
}
