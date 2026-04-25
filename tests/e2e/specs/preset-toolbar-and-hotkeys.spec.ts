/**
 * Phase 35 CAM-01 — toolbar + hotkeys round-trip.
 *
 * Asserts all 4 preset buttons apply via (a) click and (b) bare-key hotkeys,
 * and that the active button gets the `bg-accent/20` class (D-02 indicator).
 */
import { test, expect } from "@playwright/test";
import { getActivePreset } from "../playwright-helpers/applyCameraPreset";
import { toggleViewMode } from "../playwright-helpers/toggleViewMode";
import { settle } from "../playwright-helpers/settle";
import { setupPage } from "../playwright-helpers/setupPage";
import { seedRoom, waitForPresetDrivers } from "../playwright-helpers/seedRoom";

const PRESETS = ["eye-level", "top-down", "three-quarter", "corner"] as const;
const HOTKEYS = ["1", "2", "3", "4"] as const;

test.describe("CAM-01 preset toolbar + hotkeys", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
    await seedRoom(page);
    await toggleViewMode(page, "3d");
    await waitForPresetDrivers(page);
    await settle(page);
  });

  test("toolbar click applies preset + highlights button", async ({ page }) => {
    for (const id of PRESETS) {
      await page.click(`[data-testid="preset-${id}"]`);
      await page.waitForTimeout(700); // tween settle
      await settle(page);
      expect(await getActivePreset(page)).toBe(id);
      const btn = page.locator(`[data-testid="preset-${id}"]`);
      await expect(btn).toHaveClass(/bg-accent\/20/);
    }
  });

  test("hotkey applies preset + sets activePreset", async ({ page }) => {
    for (let i = 0; i < PRESETS.length; i++) {
      await page.keyboard.press(HOTKEYS[i]);
      await page.waitForTimeout(700);
      await settle(page);
      expect(await getActivePreset(page)).toBe(PRESETS[i]);
    }
  });
});
