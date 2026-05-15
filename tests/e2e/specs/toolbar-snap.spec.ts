// tests/e2e/specs/toolbar-snap.spec.ts
//
// Phase 83 D-04 — FloatingToolbar Snap popover.
// Verifies:
//  1. Default gridSnap (0.5) renders "Snap: 6 inch" in tooltip.
//  2. Clicking the popover "1 foot" option writes uiStore.gridSnap = 1.
//  3. Clicking the "Off" option writes gridSnap = 0 and clears the
//     button's data-active attribute.
//
// uiStore exposes window.__uiStore in test mode (uiStore.ts L489–501).
import { test, expect } from "@playwright/test";
import { setupPage } from "../playwright-helpers/setupPage";
import { seedRoom } from "../playwright-helpers/seedRoom";

test.describe("FloatingToolbar Snap popover (Phase 83 D-04)", () => {
  test("default snap value displays in tooltip", async ({ page }) => {
    await setupPage(page);
    await seedRoom(page);
    const snapBtn = page.locator('[data-testid="toolbar-snap"]');
    await expect(snapBtn).toBeVisible();
    await snapBtn.hover();
    await expect(page.getByText(/Snap:\s*6 inch/i)).toBeVisible({ timeout: 1500 });
  });

  test("clicking popover option updates gridSnap and closes popover", async ({ page }) => {
    await setupPage(page);
    await seedRoom(page);
    await page.locator('[data-testid="toolbar-snap"]').click();
    const option1ft = page.locator('[data-testid="toolbar-snap-option-1"]');
    await expect(option1ft).toBeVisible();
    await option1ft.click();
    // Popover closed
    await expect(option1ft).not.toBeVisible();
    // Store updated
    const val = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((window as any).__uiStore as { getState: () => { gridSnap: number } })
        .getState().gridSnap;
    });
    expect(val).toBe(1);
  });

  test("selecting Off clears active state on Snap button", async ({ page }) => {
    await setupPage(page);
    await seedRoom(page);
    await page.locator('[data-testid="toolbar-snap"]').click();
    await page.locator('[data-testid="toolbar-snap-option-0"]').click();
    const val = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((window as any).__uiStore as { getState: () => { gridSnap: number } })
        .getState().gridSnap;
    });
    expect(val).toBe(0);
    // Button no longer marked active
    await expect(page.locator('[data-testid="toolbar-snap"][data-active]')).toHaveCount(0);
  });
});
