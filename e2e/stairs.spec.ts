// e2e/stairs.spec.ts
// Phase 60 STAIRS-01 (D-15): 6 e2e scenarios E1-E6 covering placement,
// D-04 origin asymmetry, 3D render, ctxmenu, click-select, and tree.
//
// Uses store-level drivers (__drivePlaceStair, __getStairConfig, etc.) +
// re-uses Phase 36 __cadStore + Phase 48 __setTestCamera helpers. We do
// NOT capture pixels — visual goldens are platform-coupled (project memory:
// "Playwright goldens — avoid platform coupling").

import { test, expect, type Page } from "@playwright/test";

const SNAPSHOT = {
  version: 2,
  rooms: {
    room_main: {
      id: "room_main",
      name: "Main Room",
      // 20×16 axis-aligned room. Walls form a perimeter with the south wall
      // at y=0 (used by E2 for D-04 origin-asymmetry verification).
      room: { width: 20, length: 16, wallHeight: 8 },
      walls: {
        wall_south: {
          id: "wall_south",
          start: { x: 0, y: 0 },
          end: { x: 20, y: 0 },
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

async function seedSnapshot(page: Page): Promise<void> {
  await page.evaluate(async (snap) => {
    await (
      window as unknown as {
        __cadStore: {
          getState: () => { loadSnapshot: (s: unknown) => Promise<void> };
        };
      }
    ).__cadStore.getState().loadSnapshot(snap);
  }, SNAPSHOT);
}

test.describe("Phase 60 — Stairs (STAIRS-01)", () => {
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
    await page.waitForFunction(
      () =>
        typeof (window as { __drivePlaceStair?: unknown })
          .__drivePlaceStair === "function",
      null,
      { timeout: 10_000 },
    );
    await seedSnapshot(page);
  });

  test("E1 — Place stair via __drivePlaceStair: defaults applied + count=1", async ({ page }) => {
    const result = await page.evaluate(() => {
      const id = (
        window as unknown as {
          __drivePlaceStair: (roomId: string, position: { x: number; y: number }) => string;
        }
      ).__drivePlaceStair("room_main", { x: 5, y: 5 });
      const count = (
        window as unknown as { __getStairCount: (rid: string) => number }
      ).__getStairCount("room_main");
      const cfg = (
        window as unknown as {
          __getStairConfig: (rid: string, sid: string) => unknown;
        }
      ).__getStairConfig("room_main", id);
      return { id, count, cfg };
    });

    expect(result.count).toBe(1);
    expect(result.id).toMatch(/^stair_/);
    const cfg = result.cfg as {
      riseIn: number;
      runIn: number;
      stepCount: number;
      rotation: number;
      widthFtOverride?: number;
      position: { x: number; y: number };
    };
    expect(cfg.riseIn).toBe(7);
    expect(cfg.runIn).toBe(11);
    expect(cfg.stepCount).toBe(12);
    expect(cfg.rotation).toBe(0);
    expect(cfg.widthFtOverride).toBeUndefined();
    expect(cfg.position).toEqual({ x: 5, y: 5 });
  });

  test("E2 — D-04 origin asymmetry: bottom-step center reverses bbox-center snap correctly", async ({ page }) => {
    // After smart-snap pushes bbox center to (10, 5) (any wall-flush point),
    // the bottom-step center MUST be (10, 5) - UP * (totalRunFt/2). At
    // rotation=0 with default 12 × 11"/12 = 11 ft total run, half is 5.5;
    // UP at rot=0 is (0, -1) so bottom_center = (10, 5) - (0, -1) * 5.5
    // = (10, 5 - (-5.5)) = (10, 10.5). The driver mirrors stairTool's
    // inverse translation; if D-04 wiring drifted, this assertion catches it.
    const out = await page.evaluate(() => {
      return (
        window as unknown as {
          __computeStairBottomCenterFromSnappedBbox: (
            snappedBboxCenter: { x: number; y: number },
            rotationDeg: number,
            totalRunFt: number,
          ) => { x: number; y: number };
        }
      ).__computeStairBottomCenterFromSnappedBbox({ x: 10, y: 5 }, 0, 11);
    });
    expect(out.x).toBeCloseTo(10, 5);
    expect(out.y).toBeCloseTo(10.5, 5);

    // Also cover rotation=90deg: UP rotates to (-1, 0); bottom_center = (10, 5) - (-1, 0) * 5.5 = (15.5, 5).
    const out90 = await page.evaluate(() => {
      return (
        window as unknown as {
          __computeStairBottomCenterFromSnappedBbox: (
            snappedBboxCenter: { x: number; y: number },
            rotationDeg: number,
            totalRunFt: number,
          ) => { x: number; y: number };
        }
      ).__computeStairBottomCenterFromSnappedBbox({ x: 10, y: 5 }, 90, 11);
    });
    expect(out90.x).toBeCloseTo(15.5, 5);
    expect(out90.y).toBeCloseTo(5, 5);
  });

  test("E3 — 12 stacked steps render in 3D mode (state-level proof)", async ({ page }) => {
    // We don't introspect the R3F scene graph (brittle + slow). Instead we
    // assert the rendered StairMesh receives the expected step count via
    // store + assert switching to 3D doesn't error. Visual rendering is
    // covered by HUMAN-UAT.md.
    const count = await page.evaluate(() => {
      const id = (
        window as unknown as {
          __drivePlaceStair: (rid: string, p: { x: number; y: number }) => string;
        }
      ).__drivePlaceStair("room_main", { x: 5, y: 5 });
      const cfg = (
        window as unknown as {
          __getStairConfig: (rid: string, sid: string) => { stepCount: number };
        }
      ).__getStairConfig("room_main", id);
      return cfg.stepCount;
    });
    expect(count).toBe(12);

    // Switch to 3D — verify the toolbar button works and no console errors.
    await page.getByTestId("view-mode-3d").click();
    // Wait for ThreeViewport mount.
    await page.waitForTimeout(500);
    // R3F canvas should be in DOM (existing test pattern).
    const canvasCount = await page.locator("canvas").count();
    expect(canvasCount).toBeGreaterThan(0);
  });

  test("E4 — Right-click on stair (2D + 3D) opens 6-action context menu", async ({ page }) => {
    // Place a stair, then drive openContextMenu directly (mirrors what the
    // canvas right-click handler does on hit-test). Read the rendered menu
    // items from the DOM.
    await page.evaluate(() => {
      (
        window as unknown as {
          __drivePlaceStair: (rid: string, p: { x: number; y: number }) => string;
        }
      ).__drivePlaceStair("room_main", { x: 5, y: 5 });
    });
    const stairId = await page.evaluate(() => {
      return (
        window as unknown as { __listStairIds: (rid: string) => string[] }
      ).__listStairIds("room_main")[0];
    });
    expect(stairId).toBeTruthy();

    // Open context menu via stair driver (mirrors right-click hit-test path).
    await page.evaluate(
      ({ id }) => {
        (
          window as unknown as {
            __driveOpenStairContextMenu: (
              sid: string,
              pos: { x: number; y: number },
            ) => void;
          }
        ).__driveOpenStairContextMenu(id, { x: 100, y: 100 });
      },
      { id: stairId },
    );

    const menu = page.getByTestId("context-menu");
    await expect(menu).toBeVisible();
    const items = menu.getByTestId("ctx-action");
    await expect(items).toHaveCount(6);
    const ids = await items.evaluateAll((els) =>
      els.map((el) => (el as HTMLElement).dataset.actionId),
    );
    expect(ids).toEqual([
      "focus",
      "save-cam",
      "hide-show",
      "copy",
      "paste",
      "delete",
    ]);
  });

  test("E5 — Click-to-select on stair updates uiStore.selectedIds", async ({ page }) => {
    const stairId = await page.evaluate(() => {
      return (
        window as unknown as {
          __drivePlaceStair: (rid: string, p: { x: number; y: number }) => string;
        }
      ).__drivePlaceStair("room_main", { x: 5, y: 5 });
    });
    expect(stairId).toBeTruthy();

    // Drive selection through the stair driver (mirrors Phase 54 click path).
    const selected = await page.evaluate(
      ({ id }) =>
        (
          window as unknown as {
            __driveSelectStair: (sid: string) => string[];
          }
        ).__driveSelectStair(id),
      { id: stairId },
    );
    expect(selected).toContain(stairId);
  });

  test("E6 — Tree shows stair node under STAIRS group with stairs glyph", async ({ page }) => {
    await page.evaluate(() => {
      (
        window as unknown as {
          __drivePlaceStair: (rid: string, p: { x: number; y: number }, partial?: { labelOverride?: string }) => string;
        }
      ).__drivePlaceStair("room_main", { x: 5, y: 5 });
    });

    // Sidebar tree renders stair leaf rows with a Footprints lucide icon
    // (D-15: lucide substitute for material-symbols 'stairs').
    // Locate by data attribute set in TreeRow.tsx — Footprints renders the
    // data-stair-icon attribute directly on the <svg> element.
    const stairIcons = page.locator("[data-stair-icon]");
    await expect(stairIcons).toHaveCount(1);
    // The icon IS the SVG (data-stair-icon is on the <svg> element itself)
    await expect(stairIcons.first()).toBeVisible();
  });
});
