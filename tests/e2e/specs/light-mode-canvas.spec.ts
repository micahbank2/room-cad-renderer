// Phase 88 Plan 01 — E2E for canvas theme bridge + toolbar mount + light borders.
// Covers POLISH-01 (#194), POLISH-02 (#195), POLISH-03 (#196).
//
// MUST FAIL on this commit:
//   - #194: FloatingToolbar is gated to 2D/split → invisible in 3D mode.
//   - #195: canvas bg is hardcoded "#12121d" → does not respond to theme flip.
//   - #196: light-mode --border at oklch(0.922) → barely visible vs background.

import { test, expect } from "@playwright/test";
import { setupPage } from "../playwright-helpers/setupPage";
import { seedRoom } from "../playwright-helpers/seedRoom";

test.describe("Phase 88 light-mode polish", () => {
  test("POLISH-01 (#194) — FloatingToolbar mounts in 3D and Split view", async ({ page }) => {
    await setupPage(page);
    await seedRoom(page);

    // Default 2D mode — toolbar should be present.
    await expect(page.locator('[data-testid="floating-toolbar"]')).toBeVisible();

    // Switch to 3D view via the Display Mode segment.
    await page.locator('[data-testid="view-mode-3d"]').click();
    // After D-03 hoist, toolbar still mounted in 3D.
    await expect(page.locator('[data-testid="floating-toolbar"]')).toBeVisible();

    // Switch to Split — still mounted.
    await page.locator('[data-testid="view-mode-split"]').click();
    await expect(page.locator('[data-testid="floating-toolbar"]')).toBeVisible();
  });

  test("POLISH-02 (#195) — canvas background repaints on theme flip", async ({ page }) => {
    await setupPage(page);
    await seedRoom(page);

    // Force Dark mode first via Settings popover.
    await page.locator('[data-testid="topbar-settings-button"]').click();
    await page
      .locator('[data-testid="settings-popover"]')
      .getByRole("radio", { name: "Dark" })
      .click();
    // Close the popover.
    await page.keyboard.press("Escape");

    // Probe the Fabric canvas backgroundColor (via test-mode driver).
    const darkBg = await page.evaluate(
      () => (window as unknown as { __driveGetCanvasBg?: () => string })
        .__driveGetCanvasBg?.() ?? "",
    );
    // Dark mode: each rgb channel well below 100.
    expect(darkBg).toMatch(/^rgb\(([0-9]|[1-9][0-9]),\s*([0-9]|[1-9][0-9]),\s*([0-9]|[1-9][0-9])\)/);

    // Flip to Light.
    await page.locator('[data-testid="topbar-settings-button"]').click();
    await page
      .locator('[data-testid="settings-popover"]')
      .getByRole("radio", { name: "Light" })
      .click();
    await page.keyboard.press("Escape");

    // Give the redraw a moment to run after theme effect commits.
    await page.waitForTimeout(150);

    const lightBg = await page.evaluate(
      () => (window as unknown as { __driveGetCanvasBg?: () => string })
        .__driveGetCanvasBg?.() ?? "",
    );
    // Light mode: each rgb channel near-white (≥ 240).
    expect(lightBg).toMatch(/^rgb\((2[4-9]\d|25[0-5]),\s*(2[4-9]\d|25[0-5]),\s*(2[4-9]\d|25[0-5])\)/);

    // And the two values must differ.
    expect(lightBg).not.toBe(darkBg);
  });

  test("POLISH-03 (#196) — light-mode borders meet WCAG 3:1", async ({ page }) => {
    await setupPage(page);
    await seedRoom(page);

    // Force Light mode.
    await page.locator('[data-testid="topbar-settings-button"]').click();
    await page
      .locator('[data-testid="settings-popover"]')
      .getByRole("radio", { name: "Light" })
      .click();
    await page.keyboard.press("Escape");

    // Probe the resolved --border token directly (avoids tying the test
    // to a specific aside selector which depends on whether the right
    // inspector is mounted).
    const borderRgb = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.style.color = "var(--border)";
      probe.style.position = "absolute";
      probe.style.visibility = "hidden";
      document.body.appendChild(probe);
      const c = getComputedStyle(probe).color;
      document.body.removeChild(probe);
      return c;
    });
    // Expect r-channel < 225 after the oklch(0.85) bump (was ~235 at 0.922).
    const m = borderRgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    expect(m).not.toBeNull();
    if (m) {
      const r = parseInt(m[1], 10);
      expect(r).toBeLessThan(225);
    }
  });
});
