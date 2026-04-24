/**
 * Phase 36 Plan 01 — VIZ-10 wallpaper 5-cycle regression harness.
 *
 * Expected pre-fix behavior: FAILS on cycle 2+ (pixel-diff > 1%).
 * Expected post-fix (Plan 36-02): PASSES with delta ≤ 1% across all 5 cycles.
 *
 * Evidence source for ROOT-CAUSE.md: the emitted
 * `window.__textureLifecycleEvents` buffer captured at end-of-test.
 */
import { test, expect } from "@playwright/test";
import { setTestCamera, type CameraPose } from "../playwright-helpers/setTestCamera";
import { uploadTexture } from "../playwright-helpers/uploadTexture";
import { toggleViewMode } from "../playwright-helpers/toggleViewMode";
import { settle } from "../playwright-helpers/settle";
import { getLifecycleEvents } from "../playwright-helpers/lifecycleEvents";
import { setupPage } from "../playwright-helpers/setupPage";

const CAMERA: CameraPose = {
  position: [25, 10, 25],
  target: [10, 4, 8],
};

test.describe("VIZ-10 — wallpaper survives 5x 2D↔3D toggle", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test("uploaded wallpaper survives 5 mount cycles", async ({ page }) => {
    // 1. Seed a room with one wall via direct store action. This also trips
    //    the wallCount>0 effect in App.tsx → setHasStarted(true) → skips
    //    WelcomeScreen.
    await page.evaluate(async () => {
      // Use window.__cadStore — test-mode handle installed by src/stores/cadStore.ts.
      // Works in both chromium-dev (Vite dev server) and chromium-preview
      // (production-minified bundle with hashed chunk names). Plan 36-02.
      // @ts-expect-error — window.__cadStore installed in test mode
      (window as unknown as { __cadStore: { getState: () => { loadSnapshot: (s: unknown) => void } } }).__cadStore.getState().loadSnapshot({
        version: 2,
        rooms: {
          room_main: {
            id: "room_main",
            name: "Main Room",
            room: { width: 20, length: 16, wallHeight: 8 },
            walls: {
              wall_1: {
                id: "wall_1",
                start: { x: 2, y: 2 },
                end: { x: 18, y: 2 },
                thickness: 0.5,
                height: 8,
                openings: [],
              },
            },
            placedProducts: {},
          },
        },
        activeRoomId: "room_main",
      });
    });

    // Wait for App to leave WelcomeScreen and Toolbar to mount.
    await page.waitForSelector('[data-testid="view-mode-3d"]', { timeout: 10_000 });

    // 2. Upload fixture texture via Phase 34 __driveTextureUpload.
    const textureId = await uploadTexture(
      page,
      "tests/e2e/fixtures/sample-wallpaper.jpg",
      "Test Wallpaper",
      4,
      "image/jpeg",
    );

    // 3. Apply as wallpaper on side A of wall_1.
    await page.evaluate(
      async (args: { id: string }) => {
        // @ts-expect-error — window.__cadStore installed in test mode
        (window as unknown as { __cadStore: { getState: () => { setWallpaper: (id: string, side: string, wp: unknown) => void } } }).__cadStore.getState().setWallpaper("wall_1", "A", {
          kind: "pattern",
          userTextureId: args.id,
          scaleFt: 4,
        });
      },
      { id: textureId },
    );

    // 4. Run 5 toggle cycles, screenshotting each 3D mount.
    for (let cycle = 1; cycle <= 5; cycle++) {
      await toggleViewMode(page, "3d");
      // Wait for Three canvas to mount (Scene effect installs __setTestCamera).
      await page.waitForFunction(
        () => typeof (window as any).__setTestCamera === "function",
        { timeout: 10_000 },
      );
      await setTestCamera(page, CAMERA);
      await settle(page);
      await expect(page).toHaveScreenshot(`wallpaper-cycle-${cycle}.png`, {
        maxDiffPixelRatio: 0.01,
      });
      await toggleViewMode(page, "2d");
      await page.waitForTimeout(100);
    }

    // 5. Dump lifecycle events for ROOT-CAUSE.md audit.
    const events = await getLifecycleEvents(page);
    console.log("=== TEXTURE LIFECYCLE EVENTS (wallpaper) ===");
    console.log(JSON.stringify(events, null, 2));
    console.log("=== END EVENTS (count=" + events.length + ") ===");
  });
});
