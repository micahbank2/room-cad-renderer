// Phase 36 Plan 01 — clicks one of the Toolbar view-mode buttons.
// Uses the data-testid attribute installed in `src/components/Toolbar.tsx`.

import type { Page } from "@playwright/test";

export type ViewMode = "2d" | "3d" | "split" | "library";

export async function toggleViewMode(page: Page, mode: ViewMode): Promise<void> {
  await page.click(`[data-testid="view-mode-${mode}"]`);
}
