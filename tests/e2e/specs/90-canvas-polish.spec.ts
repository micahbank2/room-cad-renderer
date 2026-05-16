// Phase 90 Plan 01 — E2E for theme backdrop flip (#201) + toolbar viewport reservation (#202).
//
// MUST FAIL on this commit:
//   - #201: Theme toggle does not flip the 2D canvas backdrop (the canvas keeps
//           painting the OLD theme's --background because getCanvasTheme() reads
//           stale CSS tokens before <html class="dark"> has flushed).
//   - #202: The 2D canvas wrapper has no bottom padding, so the FloatingToolbar
//           (fixed bottom-6, ~80px tall) overlaps the floor plan at every
//           viewport size.

import { test, expect } from "@playwright/test";
import { setupPage } from "../playwright-helpers/setupPage";
import { seedRoom } from "../playwright-helpers/seedRoom";

test.describe.parallel("Phase 90 canvas polish", () => {
  test("#201 — theme toggle flips canvas backdrop without reload", async ({ page }) => {
    await setupPage(page);
    await seedRoom(page);

    // Force Light mode first so we start from a known state.
    await page.locator('[data-testid="topbar-settings-button"]').click();
    await page
      .locator('[data-testid="settings-popover"]')
      .getByRole("radio", { name: "Light" })
      .click();
    await page.keyboard.press("Escape");
    // Allow the (currently-buggy) redraw to settle.
    await page.waitForTimeout(150);

    const lightBg = await page.evaluate(
      () =>
        (window as unknown as { __driveGetCanvasBg?: () => string }).__driveGetCanvasBg?.() ?? "",
    );
    // Light: near-white (each channel ≥ 240).
    expect(lightBg).toMatch(/^rgb\((2[4-9]\d|25[0-5]),\s*(2[4-9]\d|25[0-5]),\s*(2[4-9]\d|25[0-5])\)/);

    // Flip to Dark — the BUG: canvas bg does NOT update after this flip
    // (until something else forces a redraw).
    await page.locator('[data-testid="topbar-settings-button"]').click();
    await page
      .locator('[data-testid="settings-popover"]')
      .getByRole("radio", { name: "Dark" })
      .click();
    await page.keyboard.press("Escape");

    // Critically — do NOT wait long or trigger a redraw via pan/click/etc.
    // The fix must flip the canvas bg on its own. Allow up to ~2 rAFs.
    await expect
      .poll(
        async () =>
          page.evaluate(
            () =>
              (window as unknown as { __driveGetCanvasBg?: () => string }).__driveGetCanvasBg?.() ??
              "",
          ),
        { timeout: 500, intervals: [16, 32, 50, 100, 200] },
      )
      // Dark: each channel below 100.
      .toMatch(/^rgb\(([0-9]|[1-9][0-9]),\s*([0-9]|[1-9][0-9]),\s*([0-9]|[1-9][0-9])\)/);

    const darkBg = await page.evaluate(
      () =>
        (window as unknown as { __driveGetCanvasBg?: () => string }).__driveGetCanvasBg?.() ?? "",
    );
    expect(darkBg).not.toBe(lightBg);

    // Flip back to Light. Must also flip without reload.
    await page.locator('[data-testid="topbar-settings-button"]').click();
    await page
      .locator('[data-testid="settings-popover"]')
      .getByRole("radio", { name: "Light" })
      .click();
    await page.keyboard.press("Escape");

    await expect
      .poll(
        async () =>
          page.evaluate(
            () =>
              (window as unknown as { __driveGetCanvasBg?: () => string }).__driveGetCanvasBg?.() ??
              "",
          ),
        { timeout: 500, intervals: [16, 32, 50, 100, 200] },
      )
      .toMatch(/^rgb\((2[4-9]\d|25[0-5]),\s*(2[4-9]\d|25[0-5]),\s*(2[4-9]\d|25[0-5])\)/);
  });

  for (const viewportHeight of [800, 1200, 1600]) {
    test(`#202 — canvas viewport reserves space below toolbar (h=${viewportHeight}px)`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: viewportHeight });
      await setupPage(page);
      await seedRoom(page);

      // FloatingToolbar should be mounted; read its top edge.
      const toolbar = page.locator('[data-testid="floating-toolbar"]');
      await expect(toolbar).toBeVisible();
      const toolbarBox = await toolbar.boundingBox();
      expect(toolbarBox).not.toBeNull();
      if (!toolbarBox) return;

      // The fabric <canvas> element renders at the wrapper's full size. Read
      // its bottom edge in viewport coordinates.
      const canvasBox = await page.locator("canvas").first().boundingBox();
      expect(canvasBox).not.toBeNull();
      if (!canvasBox) return;

      // Canvas bottom must sit ABOVE toolbar top with at least a 4px buffer.
      // (Toolbar covers canvas if canvasBottom > toolbarTop.)
      const canvasBottom = canvasBox.y + canvasBox.height;
      const toolbarTop = toolbarBox.y;
      expect(canvasBottom).toBeLessThanOrEqual(toolbarTop - 4);
    });
  }
});
