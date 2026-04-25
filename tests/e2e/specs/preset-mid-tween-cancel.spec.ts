/**
 * Phase 35 CAM-02 — mid-tween cancel-and-restart.
 *
 * Fires 3 preset requests in sequence with a mid-tween interruption.
 * Asserts final activePreset matches the LAST request, final camera pose
 * is consistent with the corner preset (not the interrupted eye-level),
 * and no pageerror was emitted during the cancel-and-restart.
 */
import { test, expect } from "@playwright/test";
import {
  applyCameraPreset,
  getActivePreset,
  getCameraPose,
} from "../playwright-helpers/applyCameraPreset";
import { toggleViewMode } from "../playwright-helpers/toggleViewMode";
import { settle } from "../playwright-helpers/settle";
import { setupPage } from "../playwright-helpers/setupPage";
import { seedRoom, waitForPresetDrivers } from "../playwright-helpers/seedRoom";

test("CAM-02: mid-tween preset switch ends at latest pose", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await setupPage(page);
  await seedRoom(page);
  await toggleViewMode(page, "3d");
  await waitForPresetDrivers(page);
  await settle(page);

  // 1) Apply top-down, wait full settle.
  await applyCameraPreset(page, "top-down");
  await page.waitForTimeout(800);

  // 2) Apply eye-level, then corner MID-TWEEN.
  await applyCameraPreset(page, "eye-level");
  await page.waitForTimeout(200); // mid-tween (~33% through the 600ms eye-level tween)
  await applyCameraPreset(page, "corner");
  await page.waitForTimeout(900); // settle fully

  // 3) Final activePreset is corner (latest request wins).
  expect(await getActivePreset(page)).toBe("corner");

  // 4) Camera pose is consistent with corner preset for the seeded
  //    20×16×8 room: corner position = [width, H - 0.5, length] = [20, 7.5, 16]
  //    and target = [0, 7.5, 0]. Tolerate floating-point noise.
  const pose = await getCameraPose(page);
  expect(Math.abs(pose.position[0] - 20)).toBeLessThan(0.5);
  expect(Math.abs(pose.position[1] - 7.5)).toBeLessThan(0.5);
  expect(Math.abs(pose.position[2] - 16)).toBeLessThan(0.5);
  expect(Math.abs(pose.target[0] - 0)).toBeLessThan(0.5);
  expect(Math.abs(pose.target[1] - 7.5)).toBeLessThan(0.5);
  expect(Math.abs(pose.target[2] - 0)).toBeLessThan(0.5);

  // 5) No pageerror during the cancel-and-restart.
  expect(errors).toEqual([]);
});
