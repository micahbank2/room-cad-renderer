/**
 * Phase 36 Plan 01 — VIZ-10 floor user-texture 2-cycle smoke.
 * Lightweight scenario — same `userTextureCache` plumbing as wallpaper but
 * exercised on the floor branch of `FloorMesh.tsx`.
 */
import { test, expect } from "@playwright/test";
import { setTestCamera, type CameraPose } from "../playwright-helpers/setTestCamera";
import { uploadTexture } from "../playwright-helpers/uploadTexture";
import { toggleViewMode } from "../playwright-helpers/toggleViewMode";
import { settle } from "../playwright-helpers/settle";
import { getLifecycleEvents } from "../playwright-helpers/lifecycleEvents";
import { setupPage } from "../playwright-helpers/setupPage";

const CAMERA: CameraPose = {
  position: [20, 12, 20],
  target: [10, 0.1, 8],
};

test.describe("VIZ-10 — floor user-texture 2-cycle smoke", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test("floor user-texture survives 2 mount cycles", async ({ page }) => {
    await page.evaluate(async () => {
      // Use window.__cadStore — test-mode handle works in both dev + preview (Plan 36-02).
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

    await page.waitForSelector('[data-testid="view-mode-3d"]', { timeout: 10_000 });

    const textureId = await uploadTexture(
      page,
      "tests/e2e/fixtures/sample-wallpaper.jpg",
      "Floor Tex",
      4,
      "image/jpeg",
    );

    await page.evaluate(
      async (args: { id: string }) => {
        // @ts-expect-error — window.__cadStore installed in test mode
        (window as unknown as { __cadStore: { getState: () => { setFloorMaterial: (m: unknown) => void } } }).__cadStore.getState().setFloorMaterial({
          kind: "user-texture",
          userTextureId: args.id,
          scaleFt: 4,
          rotationDeg: 0,
        });
      },
      { id: textureId },
    );

    for (let cycle = 1; cycle <= 2; cycle++) {
      await toggleViewMode(page, "3d");
      await page.waitForFunction(
        () => typeof (window as any).__setTestCamera === "function",
        { timeout: 10_000 },
      );
      await setTestCamera(page, CAMERA);
      await settle(page);
      await expect(page).toHaveScreenshot(`floor-cycle-${cycle}.png`, {
        maxDiffPixelRatio: 0.01,
      });
      await toggleViewMode(page, "2d");
      await page.waitForTimeout(100);
    }

    const events = await getLifecycleEvents(page);
    console.log("=== TEXTURE LIFECYCLE EVENTS (floor) ===");
    console.log(JSON.stringify(events, null, 2));
    console.log("=== END EVENTS (count=" + events.length + ") ===");
  });
});
