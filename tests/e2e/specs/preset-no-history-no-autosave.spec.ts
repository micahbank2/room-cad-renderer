/**
 * Phase 35 CAM-03 — preset switches never push to undo history.
 *
 * Fires 10 preset hotkeys and asserts cadStore.past.length is unchanged
 * from the baseline. Preset state lives in uiStore, so the cadStore (and
 * therefore undo history + autosave trigger) must stay quiescent during
 * a preset-switch loop.
 */
import { test, expect } from "@playwright/test";
import { toggleViewMode } from "../playwright-helpers/toggleViewMode";
import { settle } from "../playwright-helpers/settle";
import { setupPage } from "../playwright-helpers/setupPage";
import { seedRoom, waitForPresetDrivers } from "../playwright-helpers/seedRoom";

test("CAM-03: 10 preset switches do not push cadStore history", async ({ page }) => {
  await setupPage(page);
  await seedRoom(page);
  await toggleViewMode(page, "3d");
  await waitForPresetDrivers(page);
  await settle(page);

  // Let any startup autosave settle.
  await page.waitForTimeout(1500);

  // 1) Snapshot baseline history length.
  const pastLen0 = await page.evaluate(() => {
    const fn = (window as unknown as {
      __getCADHistoryLength?: () => number;
    }).__getCADHistoryLength;
    if (!fn) throw new Error("__getCADHistoryLength not installed");
    return fn();
  });
  expect(pastLen0).toBeGreaterThanOrEqual(0);

  // 2) 10 preset switches via deterministic hotkey cycling.
  //    (Deterministic order beats random — avoids flake if Math.random
  //    sequences repeat the same hotkey and the test no-ops.)
  const hotkeys = ["1", "2", "3", "4"];
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press(hotkeys[i % 4]);
    await page.waitForTimeout(50); // mid-tween (50ms leaves 550ms for the tween)
  }
  // Allow final tween + any autosave debounce to settle.
  await page.waitForTimeout(2000);

  // 3) History unchanged — CAM-03 primary assertion.
  const pastLen1 = await page.evaluate(() => {
    return (window as unknown as {
      __getCADHistoryLength?: () => number;
    }).__getCADHistoryLength!();
  });
  expect(pastLen1).toBe(pastLen0);
});
