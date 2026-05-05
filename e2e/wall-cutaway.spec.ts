// Phase 59 CUTAWAY-01 e2e — 5 scenarios E1-E5 per D-10 + plan spec.
//
// Drivers used (test-mode only, gated by MODE === "test"):
//   __driveSetCutawayMode  — toolbar bypass
//   __getCutawayMode       — verify current mode
//   __getCutawayWallId     — read auto-detected wall id per room
//   __toggleCutawayManualWall — right-click bypass
//   __isCutawayManualWall  — read manual-set membership
//   __getWallExpectedOpacity — derived opacity (mirror of WallMesh logic)
//   __setTestCamera        — Phase 36 deterministic pose helper
//
// We do NOT capture pixels — visual regression goldens are platform-coupled
// (per project memory: "Playwright goldens — avoid platform coupling"). All
// assertions are state/logic-level via the drivers.

import { test, expect, type Page } from "@playwright/test";

const SNAPSHOT = {
  version: 2,
  rooms: {
    room_main: {
      id: "room_main",
      name: "Main Room",
      // 10×10 axis-aligned room centered at (5, 5) in plan space.
      room: { width: 10, length: 10, wallHeight: 8 },
      walls: {
        wall_south: {
          id: "wall_south",
          start: { x: 0, y: 0 },
          end: { x: 10, y: 0 },
          thickness: 0.5,
          height: 8,
          openings: [],
        },
        wall_east: {
          id: "wall_east",
          start: { x: 10, y: 0 },
          end: { x: 10, y: 10 },
          thickness: 0.5,
          height: 8,
          openings: [],
        },
        wall_north: {
          id: "wall_north",
          start: { x: 10, y: 10 },
          end: { x: 0, y: 10 },
          thickness: 0.5,
          height: 8,
          openings: [],
        },
        wall_west: {
          id: "wall_west",
          start: { x: 0, y: 10 },
          end: { x: 0, y: 0 },
          thickness: 0.5,
          height: 8,
          openings: [],
        },
      },
      placedProducts: {},
      placedCustomElements: {},
    },
  },
  activeRoomId: "room_main",
};

async function seedAndEnter3D(page: Page): Promise<void> {
  await page.evaluate(async (snap) => {
    // @ts-expect-error — window.__cadStore is installed in test mode
    await (window as unknown as { __cadStore: { getState: () => { loadSnapshot: (s: unknown) => Promise<void> } } }).__cadStore.getState().loadSnapshot(snap);
  }, SNAPSHOT);
  await page.getByTestId("view-mode-3d").click();
  // Wait for the toolbar Cutaway button to render (3D-only).
  await page.getByTestId("cutaway-toggle").waitFor({ state: "attached" });
}

async function setCamera(page: Page, position: [number, number, number], target: [number, number, number]): Promise<void> {
  // Wait for the test-camera helper to install (OrbitControls mounts via Suspense).
  await page.waitForFunction(
    () => typeof (window as { __setTestCamera?: unknown }).__setTestCamera === "function",
    null,
    { timeout: 5000 },
  );
  await page.evaluate(
    ({ position, target }) => {
      const fn = (window as { __setTestCamera?: (p: { position: [number, number, number]; target: [number, number, number] }) => void }).__setTestCamera;
      if (!fn) throw new Error("__setTestCamera not installed");
      fn({ position, target });
    },
    { position, target },
  );
  // Wait many animation frames so R3F's frameloop schedules + runs the
  // cutaway useFrame block with the new camera pose. OrbitControls damping
  // (factor 0.1) requires ~30 frames to converge from a 50-unit position
  // change. We wait 60 frames (~1 second at 60fps) to ensure stability
  // for any reasonable camera relocation distance.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        let n = 0;
        const tick = () => {
          n++;
          if (n >= 60) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );
}

test.describe("Phase 59 — Wall Cutaway Mode (CUTAWAY-01)", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => {
      try {
        localStorage.setItem("room-cad-onboarding-completed", "1");
      } catch {
        /* noop */
      }
    });
    await page.goto("/");
    await seedAndEnter3D(page);
    // Reset cutaway state to default off + empty sets between tests.
    await page.evaluate(() => {
      (window as { __driveSetCutawayMode?: (m: "off" | "auto") => void }).__driveSetCutawayMode?.("off");
    });
  });

  test("E1 — Toolbar cycling: aria-pressed false → true → false", async ({ page }) => {
    const button = page.getByTestId("cutaway-toggle");

    // Initially off.
    await expect(button).toHaveAttribute("aria-pressed", "false");
    let mode = await page.evaluate(() => (window as { __getCutawayMode?: () => string }).__getCutawayMode?.());
    expect(mode).toBe("off");

    // Click → auto. Active state has accent border (Phase 47 displayMode style mirror).
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    mode = await page.evaluate(() => (window as { __getCutawayMode?: () => string }).__getCutawayMode?.());
    expect(mode).toBe("auto");
    // Active class assertion: bg-accent/10 in className when active.
    await expect(button).toHaveClass(/bg-accent\/10/);

    // Click → off again.
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "false");
    mode = await page.evaluate(() => (window as { __getCutawayMode?: () => string }).__getCutawayMode?.());
    expect(mode).toBe("off");
  });

  test("E2 — Auto orbit: camera on +Z ghosts north wall; camera on -X ghosts west wall", async ({ page }) => {
    // Enable auto cutaway via driver (toolbar cycle is covered in E1).
    await page.evaluate(() => {
      (window as { __driveSetCutawayMode?: (m: "off" | "auto") => void }).__driveSetCutawayMode?.("auto");
    });

    // Camera on +Z axis facing the room center.
    // Room is 10x10 with corner at origin → bbox center = (5, 5) in plan = (5, _, 5) in 3D.
    await setCamera(page, [5, 5, 30], [5, 5, 5]);
    let detected = await page.evaluate(() =>
      (window as { __getCutawayWallId?: (id: string) => string | null }).__getCutawayWallId?.("room_main"),
    );
    expect(detected).toBe("wall_north");

    // Camera on -X axis facing room center.
    await setCamera(page, [-25, 5, 5], [5, 5, 5]);
    detected = await page.evaluate(() =>
      (window as { __getCutawayWallId?: (id: string) => string | null }).__getCutawayWallId?.("room_main"),
    );
    expect(detected).toBe("wall_west");
  });

  test("E3 — Manual hide via right-click toggle: opacity 1.0 → 0.15 → 1.0", async ({ page }) => {
    // Cutaway off; manual hide should still ghost the wall (D-05: independent
    // of auto detection). Note the spec says toggling cutawayMode to off CLEARS
    // manual hides (D-05 side-effect), so we must START in auto mode for the
    // manual hide to persist between tests OR call toggle while in off-mode
    // and assert the immediate toggle.
    //
    // Simplest path: leave cutawayMode at "off" but exercise the toggle
    // directly — the manual set is independent of mode; only "off" SETTER
    // call clears it (and the test's beforeEach already called it).
    await page.evaluate(() => {
      // Set auto mode first so subsequent "off" toggle later won't surprise us.
      (window as { __driveSetCutawayMode?: (m: "off" | "auto") => void }).__driveSetCutawayMode?.("auto");
    });

    // Initial opacity = 1.0 (auto won't pick the south wall when camera is at default 3D pose).
    // We pick wall_south specifically because the default 3D camera looks at the room
    // from a positive angle and is unlikely to auto-pick south. But to be safe, use the
    // manual-only flow: read expected opacity AFTER toggling.

    // Toggle manual hide on wall_east.
    await page.evaluate(() => {
      (window as { __toggleCutawayManualWall?: (id: string) => void }).__toggleCutawayManualWall?.("wall_east");
    });
    let isManual = await page.evaluate(() =>
      (window as { __isCutawayManualWall?: (id: string) => boolean }).__isCutawayManualWall?.("wall_east"),
    );
    expect(isManual).toBe(true);

    let opacity = await page.evaluate(() =>
      (window as { __getWallExpectedOpacity?: (wid: string, rid: string) => number }).__getWallExpectedOpacity?.(
        "wall_east",
        "room_main",
      ),
    );
    expect(opacity).toBe(0.15);

    // Toggle again → restore.
    await page.evaluate(() => {
      (window as { __toggleCutawayManualWall?: (id: string) => void }).__toggleCutawayManualWall?.("wall_east");
    });
    isManual = await page.evaluate(() =>
      (window as { __isCutawayManualWall?: (id: string) => boolean }).__isCutawayManualWall?.("wall_east"),
    );
    expect(isManual).toBe(false);
    opacity = await page.evaluate(() =>
      (window as { __getWallExpectedOpacity?: (wid: string, rid: string) => number }).__getWallExpectedOpacity?.(
        "wall_east",
        "room_main",
      ),
    );
    expect(opacity).toBe(1.0);
  });

  test("E4 — Top-down camera (elevation > 70°) → no auto-cutaway", async ({ page }) => {
    await page.evaluate(() => {
      (window as { __driveSetCutawayMode?: (m: "off" | "auto") => void }).__driveSetCutawayMode?.("auto");
    });

    // Looking nearly straight down: cam high above room, target at floor center.
    // Use a tiny X/Z offset (0.0001) to satisfy three.js lookAt non-collinear
    // requirement without changing the elevation appreciably (asin(-fwd.y) > 70°
    // when fwd.y < -sin(70°) ≈ -0.9397).
    await setCamera(page, [5.0001, 50, 5], [5, 0, 5]);
    const detected = await page.evaluate(() =>
      (window as { __getCutawayWallId?: (id: string) => string | null }).__getCutawayWallId?.("room_main"),
    );
    expect(detected).toBeNull();

    // All four walls should report opacity 1.0 (auto-detected wall is null;
    // no manual hides set; cutawayMode is "auto" but no wall qualifies).
    for (const wallId of ["wall_north", "wall_east", "wall_south", "wall_west"]) {
      const opacity = await page.evaluate(
        ({ wallId }) =>
          (window as { __getWallExpectedOpacity?: (wid: string, rid: string) => number }).__getWallExpectedOpacity?.(
            wallId,
            "room_main",
          ),
        { wallId },
      );
      expect(opacity).toBe(1.0);
    }
  });

  test("E5 — Walk mode disables cutaway entirely", async ({ page }) => {
    await page.evaluate(() => {
      (window as { __driveSetCutawayMode?: (m: "off" | "auto") => void }).__driveSetCutawayMode?.("auto");
    });

    // Confirm a wall IS auto-ghosted at side view first (sanity check).
    await setCamera(page, [5, 5, 30], [5, 5, 5]);
    let detected = await page.evaluate(() =>
      (window as { __getCutawayWallId?: (id: string) => string | null }).__getCutawayWallId?.("room_main"),
    );
    expect(detected).toBe("wall_north");

    // Switch to walk mode. The useFrame guard should bail; expected-opacity
    // helper also gates on cameraMode === "walk".
    await page.evaluate(() => {
      (window as { __driveSetCameraMode?: (m: "orbit" | "walk") => void }).__driveSetCameraMode?.("walk");
    });

    // Re-set camera and re-tick.
    await setCamera(page, [5, 5, 30], [5, 5, 5]);

    // The expected-opacity helper now returns 1.0 for ALL walls regardless of
    // what auto-detected may say — D-08.
    for (const wallId of ["wall_north", "wall_east", "wall_south", "wall_west"]) {
      const opacity = await page.evaluate(
        ({ wallId }) =>
          (window as { __getWallExpectedOpacity?: (wid: string, rid: string) => number }).__getWallExpectedOpacity?.(
            wallId,
            "room_main",
          ),
        { wallId },
      );
      expect(opacity).toBe(1.0);
    }

    // Cleanup: back to orbit so subsequent tests start clean.
    await page.evaluate(() => {
      (window as { __driveSetCameraMode?: (m: "orbit" | "walk") => void }).__driveSetCameraMode?.("orbit");
    });
    detected = await page.evaluate(() =>
      (window as { __getCutawayWallId?: (id: string) => string | null }).__getCutawayWallId?.("room_main"),
    );
    // After mode flip, the next frame's loop should restore detection.
    // We don't strictly require a value here — just that walk mode has been exited.
  });
});
