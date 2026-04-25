/**
 * Phase 35 CAM-02 — view-mode change mid-tween does not throw.
 *
 * Starts a preset tween, switches 3D → 2D mid-tween (unmounting Scene),
 * then re-enters 3D. Asserts no pageerror + canvas re-mounts cleanly.
 */
import { test, expect } from "@playwright/test";
import { applyCameraPreset } from "../playwright-helpers/applyCameraPreset";
import { toggleViewMode } from "../playwright-helpers/toggleViewMode";
import { settle } from "../playwright-helpers/settle";
import { setupPage } from "../playwright-helpers/setupPage";
import { seedRoom, waitForPresetDrivers } from "../playwright-helpers/seedRoom";

test("CAM-02: view-mode change mid-tween does not throw", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await setupPage(page);
  await seedRoom(page);
  await toggleViewMode(page, "3d");
  await waitForPresetDrivers(page);
  await settle(page);

  // 1) Start a preset tween.
  await applyCameraPreset(page, "eye-level");
  await page.waitForTimeout(100); // MID-TWEEN

  // 2) Switch to 2D — Scene unmounts while tween is in flight.
  await toggleViewMode(page, "2d");
  await page.waitForTimeout(800);

  // 3) Switch back to 3D — Scene re-mounts cleanly.
  await toggleViewMode(page, "3d");
  await waitForPresetDrivers(page);
  await settle(page);

  // 4) No pageerror during the unmount-while-tweening cycle.
  expect(errors).toEqual([]);

  // 5) Canvas visible (re-mount succeeded, no error overlay).
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
});
