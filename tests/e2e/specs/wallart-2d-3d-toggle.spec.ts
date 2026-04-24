/**
 * Phase 36 Plan 01 — VIZ-10 wallArt 5-cycle regression harness.
 * Same structure as wallpaper spec; exercises the `wallArtTextureCache`
 * branch instead of the wallpaper/userTexture path.
 */
import { test, expect } from "@playwright/test";
import { setTestCamera, type CameraPose } from "../playwright-helpers/setTestCamera";
import { toggleViewMode } from "../playwright-helpers/toggleViewMode";
import { settle } from "../playwright-helpers/settle";
import { getLifecycleEvents } from "../playwright-helpers/lifecycleEvents";
import { setupPage } from "../playwright-helpers/setupPage";
import { comparePng } from "../playwright-helpers/pixelDiff";
import { readFileSync } from "node:fs";

const CAMERA: CameraPose = {
  position: [25, 10, 25],
  target: [10, 4, 8],
};

test.describe("VIZ-10 — wallArt survives 5x 2D↔3D toggle", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test("uploaded wallArt survives 5 mount cycles", async ({ page }) => {
    // Seed room + wall.
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

    // Load fixture PNG as a data URL (WallArt stores imageUrl directly, not
    // a user-texture id — this exercises the wallArtTextureCache path).
    const pngBytes = readFileSync("tests/e2e/fixtures/sample-wallart.png");
    const pngB64 = pngBytes.toString("base64");
    const dataUrl = `data:image/png;base64,${pngB64}`;

    await page.evaluate(
      async (url: string) => {
        // @ts-expect-error — window.__cadStore installed in test mode
        (window as unknown as { __cadStore: { getState: () => { addWallArt: (id: string, art: unknown) => void } } }).__cadStore.getState().addWallArt("wall_1", {
          offset: 8,
          centerY: 4,
          width: 3,
          height: 2,
          imageUrl: url,
          side: "A",
        });
      },
      dataUrl,
    );

    let baseline: Buffer | null = null;
    for (let cycle = 1; cycle <= 5; cycle++) {
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
    console.log("=== TEXTURE LIFECYCLE EVENTS (wallart) ===");
    console.log(JSON.stringify(events, null, 2));
    console.log("=== END EVENTS (count=" + events.length + ") ===");
  });
});
