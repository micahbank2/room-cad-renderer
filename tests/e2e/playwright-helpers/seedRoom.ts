// Phase 35 Plan 02 — shared seed helper for preset e2e specs.
// Waits for __cadStore (test-mode handle) to finish installing, seeds a
// canonical 20×16×8 room with one wall, and waits for the Toolbar to mount.
//
// This is the minimum setup the 5 preset specs need before entering 3D view.

import type { Page } from "@playwright/test";

export async function seedRoom(page: Page): Promise<void> {
  // Wait for cadStore module import to complete (installs window.__cadStore).
  await page.waitForFunction(
    () => typeof (window as unknown as { __cadStore?: unknown }).__cadStore !== "undefined",
    { timeout: 10_000 },
  );
  await page.evaluate(() => {
    (window as unknown as {
      __cadStore: { getState: () => { loadSnapshot: (s: unknown) => void } };
    }).__cadStore.getState().loadSnapshot({
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
}

/** After a view-mode switch to 3D, wait for Scene effects to install the
 *  test-mode window drivers (__applyCameraPreset et al). */
export async function waitForPresetDrivers(page: Page): Promise<void> {
  await page.waitForFunction(
    () =>
      typeof (window as unknown as { __applyCameraPreset?: unknown })
        .__applyCameraPreset === "function",
    { timeout: 10_000 },
  );
}
