import { test, expect } from "@playwright/test";
import { seedRoom } from "../playwright-helpers/seedRoom";

// Phase 83 Plan 01 e2e coverage:
// 1. Banded 5-group labels visible (IA-07).
// 2. Hover on a tool button shows its name tooltip (IA-06 hover-label requirement).
// 3. At 1024x768, all tool + view-mode testids stay visible AND no horizontal scroll
//    (IA-06 responsive-wrap requirement).
test.describe("FloatingToolbar Phase 83 redesign", () => {
  test("renders 5 banded group labels", async ({ page }) => {
    await seedRoom(page);
    for (const label of ["Drawing", "Measure", "Structure", "View", "Utility"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test("hover on tool button shows name tooltip", async ({ page }) => {
    await seedRoom(page);
    await page.locator('[data-testid="tool-wall"]').hover();
    // Radix Tooltip delayDuration={200} (project default). Generous 1.5s timeout for CI.
    await expect(page.getByText(/Wall tool/i)).toBeVisible({ timeout: 1500 });
  });

  test("at 1024x768 every tool stays visible and no horizontal scroll", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await seedRoom(page);
    const ids = [
      "tool-select",
      "tool-wall",
      "tool-door",
      "tool-window",
      "tool-ceiling",
      "tool-stair",
      "tool-measure",
      "tool-label",
      "tool-product",
      "view-mode-2d",
      "view-mode-3d",
      "view-mode-split",
      "view-mode-library",
      "toolbar-undo",
      "toolbar-redo",
    ];
    for (const id of ids) {
      await expect(page.locator(`[data-testid="${id}"]`)).toBeVisible();
    }
    const overflowing = await page.evaluate(
      () => document.body.scrollWidth > window.innerWidth + 1,
    );
    expect(overflowing).toBe(false);
  });
});
