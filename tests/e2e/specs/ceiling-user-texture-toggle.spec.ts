/**
 * Phase 36 Plan 01 — VIZ-10 ceiling user-texture 2-cycle smoke.
 * Lightweight scenario — exercises `CeilingMesh.tsx` user-texture branch.
 */
import { test, expect } from "@playwright/test";
import { setTestCamera, type CameraPose } from "../playwright-helpers/setTestCamera";
import { uploadTexture } from "../playwright-helpers/uploadTexture";
import { toggleViewMode } from "../playwright-helpers/toggleViewMode";
import { settle } from "../playwright-helpers/settle";
import { getLifecycleEvents } from "../playwright-helpers/lifecycleEvents";
import { setupPage } from "../playwright-helpers/setupPage";
import { comparePng } from "../playwright-helpers/pixelDiff";

const CAMERA: CameraPose = {
  position: [20, 4, 20],
  target: [10, 8, 8],
};

test.describe("VIZ-10 — ceiling user-texture 2-cycle smoke", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test("ceiling user-texture survives 2 mount cycles", async ({ page }) => {
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
            ceilings: {
              ceil_1: {
                id: "ceil_1",
                points: [
                  { x: 2, y: 2 },
                  { x: 18, y: 2 },
                  { x: 18, y: 14 },
                  { x: 2, y: 14 },
                ],
                height: 8,
                material: "#f5f5f5",
              },
            },
          },
        },
        activeRoomId: "room_main",
      });
    });

    await page.waitForSelector('[data-testid="view-mode-3d"]', { timeout: 10_000 });

    const textureId = await uploadTexture(
      page,
      "tests/e2e/fixtures/sample-wallpaper.jpg",
      "Ceiling Tex",
      4,
      "image/jpeg",
    );

    await page.evaluate(
      async (args: { id: string }) => {
        // @ts-expect-error — window.__cadStore installed in test mode
        (window as unknown as { __cadStore: { getState: () => { updateCeiling: (id: string, patch: unknown) => void } } }).__cadStore.getState().updateCeiling("ceil_1", {
          userTextureId: args.id,
        });
      },
      { id: textureId },
    );

    let baseline: Buffer | null = null;
    for (let cycle = 1; cycle <= 2; cycle++) {
      await toggleViewMode(page, "3d");
      await page.waitForFunction(
        () => typeof (window as any).__setTestCamera === "function",
        { timeout: 10_000 },
      );
      await setTestCamera(page, CAMERA);
      await settle(page);
      const actual = await page.screenshot({ fullPage: false });
      if (cycle === 1) {
        baseline = actual;
      } else {
        const diff = comparePng(actual, baseline!);
        expect(
          diff.mismatchRatio,
          `cycle ${cycle} drifted from cycle 1 by ${(diff.mismatchRatio * 100).toFixed(3)}% ` +
            `(${diff.diffPixels}/${diff.totalPixels} px) — VIZ-10 regression signal`,
        ).toBeLessThanOrEqual(0.01);
      }
      await toggleViewMode(page, "2d");
      await page.waitForTimeout(100);
    }

    const events = await getLifecycleEvents(page);
    console.log("=== TEXTURE LIFECYCLE EVENTS (ceiling) ===");
    console.log(JSON.stringify(events, null, 2));
    console.log("=== END EVENTS (count=" + events.length + ") ===");
  });
});
