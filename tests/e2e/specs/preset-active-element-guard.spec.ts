/**
 * Phase 35 CAM-01 — activeElement guard acceptance spec.
 *
 * Negative test: while focus is in an <input>, the `1/2/3/4` hotkeys must
 * NOT change activePreset (App.tsx guard chain). After blur, hotkeys resume.
 */
import { test, expect } from "@playwright/test";
import { getActivePreset } from "../playwright-helpers/applyCameraPreset";
import { toggleViewMode } from "../playwright-helpers/toggleViewMode";
import { settle } from "../playwright-helpers/settle";
import { setupPage } from "../playwright-helpers/setupPage";
import { seedRoom, waitForPresetDrivers } from "../playwright-helpers/seedRoom";

test("CAM-01: hotkey inert when focus is in a form input", async ({ page }) => {
  await setupPage(page);
  await seedRoom(page);
  await toggleViewMode(page, "3d");
  await waitForPresetDrivers(page);
  await settle(page);

  // 1) Baseline: press "1" → eye-level applied
  await page.keyboard.press("1");
  await page.waitForTimeout(700);
  expect(await getActivePreset(page)).toBe("eye-level");

  // 2) Focus a number input (RoomSettings width/length/height). Guard chain
  //    in App.tsx:133-137 skips keys when activeElement is INPUT/TEXTAREA/SELECT.
  const numInput = page.locator('input[type="number"]').first();
  await numInput.focus();

  // 3) While focused, press "3" — activePreset must NOT change.
  await page.keyboard.press("3");
  await page.waitForTimeout(200);
  expect(await getActivePreset(page)).toBe("eye-level");

  // 4) Blur (click the canvas) + press "3" → activePreset now changes.
  await page.locator("canvas").first().click({ position: { x: 5, y: 5 } });
  await settle(page);
  await page.keyboard.press("3");
  await page.waitForTimeout(700);
  expect(await getActivePreset(page)).toBe("three-quarter");
});
