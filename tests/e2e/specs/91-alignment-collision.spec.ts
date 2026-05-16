// Phase 91 Plan 91-01 — ALIGN-91-01 + ALIGN-91-03 e2e RED spec.
//
// Drives drag operations through real Fabric mouse events to assert that
// object-center alignment fires end-to-end:
//   1. Dragging product B near product A's center-X causes B.position.x to
//      snap to A.position.x (when bbox centers align).
//   2. Dragging a column near a product's center-X causes the column's
//      position.x to snap to the product's center-X.
//
// Drivers used (installed in Plan 91-01 Task 3 via src/test-utils/dragDrivers.ts):
//   __driveDragProduct(productId, toFt: {x, y}) → void
//   __driveDragColumn(columnId, toFt: {x, y}) → void
//
// Tests MUST fail against current main (no center-snap engine; no drag drivers).

import { test, expect } from "@playwright/test";
import { setupPage } from "../playwright-helpers/setupPage";
import { settle } from "../playwright-helpers/settle";

interface PlacedProduct {
  id: string;
  productId: string;
  position: { x: number; y: number };
  rotation: number;
  sizeScale?: number;
}
interface ColumnLike {
  id: string;
  position: { x: number; y: number };
}

async function seedRoomWithTwoProducts(page: import("@playwright/test").Page) {
  await page.waitForFunction(
    () =>
      typeof (window as unknown as { __cadStore?: unknown }).__cadStore !==
      "undefined",
    { timeout: 10_000 },
  );
  await page.evaluate(async () => {
    await (
      window as unknown as {
        __cadStore: {
          getState: () => { loadSnapshot: (s: unknown) => Promise<void> };
        };
      }
    ).__cadStore.getState().loadSnapshot({
      version: 10,
      rooms: {
        room_main: {
          id: "room_main",
          name: "Main",
          room: { width: 20, length: 16, wallHeight: 8 },
          walls: {},
          placedProducts: {
            pA: {
              id: "pA",
              productId: "prod_chair",
              position: { x: 6, y: 8 },
              rotation: 0,
            },
            pB: {
              id: "pB",
              productId: "prod_chair",
              position: { x: 12, y: 12 },
              rotation: 0,
            },
          },
          placedCustomElements: {},
          ceilings: {},
          columns: {},
          stairs: {},
        },
      },
      activeRoomId: "room_main",
    });
  });
  await settle(page);
}

test.describe("Phase 91-01 — object-center alignment guides (ALIGN-91-01)", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test("dragging product B near A snaps B's center-X to A's center-X", async ({
    page,
  }) => {
    await seedRoomWithTwoProducts(page);
    await page.waitForFunction(
      () =>
        typeof (window as unknown as { __driveDragProduct?: unknown })
          .__driveDragProduct === "function",
      { timeout: 10_000 },
    );

    // Drag B from (12, 12) → target (6.05, 12). Center-X 6.05 is within snap
    // tolerance of A.center-X = 6 → should snap to 6 exactly.
    await page.evaluate(() => {
      const w = window as unknown as {
        __driveDragProduct: (
          id: string,
          to: { x: number; y: number },
        ) => void;
      };
      w.__driveDragProduct("pB", { x: 6.05, y: 12 });
    });
    await settle(page);

    const bPos = await page.evaluate(() => {
      const w = window as unknown as {
        __cadStore: {
          getState: () => {
            rooms: Record<string, { placedProducts: Record<string, PlacedProduct> }>;
            activeRoomId: string;
          };
        };
      };
      const cad = w.__cadStore.getState();
      return cad.rooms[cad.activeRoomId].placedProducts["pB"].position;
    });
    expect(bPos.x).toBeCloseTo(6, 2);
  });
});

test.describe("Phase 91-01 — column as snap source (ALIGN-91-03)", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test("dragging a column near a product snaps column's center-X to product's center-X", async ({
    page,
  }) => {
    await page.waitForFunction(
      () =>
        typeof (window as unknown as { __cadStore?: unknown }).__cadStore !==
          "undefined" &&
        typeof (window as unknown as { __drivePlaceColumn?: unknown })
          .__drivePlaceColumn === "function",
      { timeout: 10_000 },
    );
    await page.evaluate(async () => {
      await (
        window as unknown as {
          __cadStore: {
            getState: () => { loadSnapshot: (s: unknown) => Promise<void> };
          };
        }
      ).__cadStore.getState().loadSnapshot({
        version: 10,
        rooms: {
          room_main: {
            id: "room_main",
            name: "Main",
            room: { width: 20, length: 16, wallHeight: 8 },
            walls: {},
            placedProducts: {
              pA: {
                id: "pA",
                productId: "prod_chair",
                position: { x: 10, y: 12 },
                rotation: 0,
              },
            },
            placedCustomElements: {},
            ceilings: {},
            columns: {},
            stairs: {},
          },
        },
        activeRoomId: "room_main",
      });
    });
    await settle(page);

    // Place a column at (10, 8) so it sits above the chair.
    const colId = await page.evaluate(() => {
      const w = window as unknown as {
        __drivePlaceColumn: (x: number, y: number) => string;
      };
      return w.__drivePlaceColumn(10.5, 8);
    });
    expect(colId).toMatch(/^col_/);
    await settle(page);

    await page.waitForFunction(
      () =>
        typeof (window as unknown as { __driveDragColumn?: unknown })
          .__driveDragColumn === "function",
      { timeout: 10_000 },
    );

    // Drag column to (10.05, 8) — center-X 10.05 within tolerance of chair
    // center-X 10. Column should snap.
    await page.evaluate((id) => {
      const w = window as unknown as {
        __driveDragColumn: (
          id: string,
          to: { x: number; y: number },
        ) => void;
      };
      w.__driveDragColumn(id, { x: 10.05, y: 8 });
    }, colId);
    await settle(page);

    const colPos = await page.evaluate((id) => {
      const w = window as unknown as {
        __cadStore: {
          getState: () => {
            rooms: Record<string, { columns: Record<string, ColumnLike> }>;
            activeRoomId: string;
          };
        };
      };
      const cad = w.__cadStore.getState();
      return cad.rooms[cad.activeRoomId].columns[id].position;
    }, colId);
    expect(colPos.x).toBeCloseTo(10, 2);
  });
});

// ---------------------------------------------------------------------------
// Phase 91 Plan 91-02 — object-vs-object collision (COL-91-01).
// Silent refuse per D-03: blocked drag does NOT update the store, no visual
// feedback. Touching edges (zero interior overlap) IS allowed.
// ---------------------------------------------------------------------------

async function seedRoomWithTwoChairs(
  page: import("@playwright/test").Page,
  positions: { aX: number; aY: number; bX: number; bY: number },
) {
  await page.waitForFunction(
    () =>
      typeof (window as unknown as { __cadStore?: unknown }).__cadStore !==
      "undefined",
    { timeout: 10_000 },
  );
  await page.evaluate(async (pos) => {
    await (
      window as unknown as {
        __cadStore: {
          getState: () => { loadSnapshot: (s: unknown) => Promise<void> };
        };
      }
    ).__cadStore.getState().loadSnapshot({
      version: 10,
      rooms: {
        room_main: {
          id: "room_main",
          name: "Main",
          room: { width: 30, length: 20, wallHeight: 8 },
          walls: {},
          placedProducts: {
            pA: {
              id: "pA",
              productId: "prod_chair",
              position: { x: pos.aX, y: pos.aY },
              rotation: 0,
            },
            pB: {
              id: "pB",
              productId: "prod_chair",
              position: { x: pos.bX, y: pos.bY },
              rotation: 0,
            },
          },
          placedCustomElements: {},
          ceilings: {},
          columns: {},
          stairs: {},
        },
      },
      activeRoomId: "room_main",
    });
  }, positions);
  await settle(page);
}

test.describe("Phase 91-02 — silent-refuse object collision (COL-91-01)", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test("Spec 3: dragging product A onto B refuses — A's final position is NOT inside B's bbox", async ({
    page,
  }) => {
    // Chair A at (5, 5), Chair B at (12, 5). Both default-sized.
    await seedRoomWithTwoChairs(page, { aX: 5, aY: 5, bX: 12, bY: 5 });
    await page.waitForFunction(
      () =>
        typeof (window as unknown as { __driveDragProduct?: unknown })
          .__driveDragProduct === "function",
      { timeout: 10_000 },
    );

    // Read B's bbox so the assertion knows what "inside" means.
    const bBox = await page.evaluate(() => {
      const w = window as unknown as {
        __cadStore: {
          getState: () => {
            rooms: Record<
              string,
              {
                placedProducts: Record<
                  string,
                  { position: { x: number; y: number }; rotation: number }
                >;
              }
            >;
            activeRoomId: string;
          };
        };
        __productStore?: {
          getState: () => {
            products: Array<{ id: string; width: number; depth: number }>;
          };
        };
      };
      const cad = w.__cadStore.getState();
      const pB = cad.rooms[cad.activeRoomId].placedProducts["pB"];
      const lib = w.__productStore?.getState().products ?? [];
      const cat = lib.find((p) => p.id === "prod_chair");
      const wft = cat?.width ?? 2;
      const dft = cat?.depth ?? 2;
      return {
        minX: pB.position.x - wft / 2,
        maxX: pB.position.x + wft / 2,
        minY: pB.position.y - dft / 2,
        maxY: pB.position.y + dft / 2,
      };
    });

    // Drag A directly onto B's center — collision check MUST refuse the move.
    await page.evaluate(() => {
      const w = window as unknown as {
        __driveDragProduct: (
          id: string,
          to: { x: number; y: number },
        ) => void;
      };
      w.__driveDragProduct("pA", { x: 12, y: 5 });
    });
    await settle(page);

    const aPos = await page.evaluate(() => {
      const w = window as unknown as {
        __cadStore: {
          getState: () => {
            rooms: Record<
              string,
              {
                placedProducts: Record<
                  string,
                  { position: { x: number; y: number } }
                >;
              }
            >;
            activeRoomId: string;
          };
        };
      };
      const cad = w.__cadStore.getState();
      return cad.rooms[cad.activeRoomId].placedProducts["pA"].position;
    });

    // A's bbox should NOT interior-overlap B's bbox.
    const aWidthHalf = 1; // default chair 2ft → half = 1
    const aDepthHalf = 1;
    const aMinX = aPos.x - aWidthHalf;
    const aMaxX = aPos.x + aWidthHalf;
    const aMinY = aPos.y - aDepthHalf;
    const aMaxY = aPos.y + aDepthHalf;
    const xOverlap = aMinX < bBox.maxX && aMaxX > bBox.minX;
    const yOverlap = aMinY < bBox.maxY && aMaxY > bBox.minY;
    expect(xOverlap && yOverlap).toBe(false);
  });

  test("Spec 4: dragging column onto product refuses — column NOT inside product bbox", async ({
    page,
  }) => {
    await page.waitForFunction(
      () =>
        typeof (window as unknown as { __cadStore?: unknown }).__cadStore !==
          "undefined" &&
        typeof (window as unknown as { __drivePlaceColumn?: unknown })
          .__drivePlaceColumn === "function",
      { timeout: 10_000 },
    );
    await page.evaluate(async () => {
      await (
        window as unknown as {
          __cadStore: {
            getState: () => { loadSnapshot: (s: unknown) => Promise<void> };
          };
        }
      ).__cadStore.getState().loadSnapshot({
        version: 10,
        rooms: {
          room_main: {
            id: "room_main",
            name: "Main",
            room: { width: 30, length: 20, wallHeight: 8 },
            walls: {},
            placedProducts: {
              pA: {
                id: "pA",
                productId: "prod_chair",
                position: { x: 12, y: 5 },
                rotation: 0,
              },
            },
            placedCustomElements: {},
            ceilings: {},
            columns: {},
            stairs: {},
          },
        },
        activeRoomId: "room_main",
      });
    });
    await settle(page);

    // Place column at (5, 5) — safe distance from product.
    const colId = await page.evaluate(() => {
      const w = window as unknown as {
        __drivePlaceColumn: (x: number, y: number) => string;
      };
      return w.__drivePlaceColumn(5, 5);
    });
    await settle(page);

    await page.waitForFunction(
      () =>
        typeof (window as unknown as { __driveDragColumn?: unknown })
          .__driveDragColumn === "function",
      { timeout: 10_000 },
    );

    // Try to drag column directly onto product center — must refuse.
    await page.evaluate((id) => {
      const w = window as unknown as {
        __driveDragColumn: (id: string, to: { x: number; y: number }) => void;
      };
      w.__driveDragColumn(id, { x: 12, y: 5 });
    }, colId);
    await settle(page);

    const result = await page.evaluate((id) => {
      const w = window as unknown as {
        __cadStore: {
          getState: () => {
            rooms: Record<
              string,
              {
                placedProducts: Record<
                  string,
                  { position: { x: number; y: number } }
                >;
                columns: Record<
                  string,
                  {
                    position: { x: number; y: number };
                    widthFt: number;
                    depthFt: number;
                  }
                >;
              }
            >;
            activeRoomId: string;
          };
        };
      };
      const cad = w.__cadStore.getState();
      const room = cad.rooms[cad.activeRoomId];
      return {
        col: room.columns[id],
        prod: room.placedProducts["pA"].position,
      };
    }, colId);

    // Column's bbox should NOT overlap product's bbox.
    const colMinX = result.col.position.x - result.col.widthFt / 2;
    const colMaxX = result.col.position.x + result.col.widthFt / 2;
    const colMinY = result.col.position.y - result.col.depthFt / 2;
    const colMaxY = result.col.position.y + result.col.depthFt / 2;
    const prodMinX = result.prod.x - 1;
    const prodMaxX = result.prod.x + 1;
    const prodMinY = result.prod.y - 1;
    const prodMaxY = result.prod.y + 1;
    const xOverlap = colMinX < prodMaxX && colMaxX > prodMinX;
    const yOverlap = colMinY < prodMaxY && colMaxY > prodMinY;
    expect(xOverlap && yOverlap).toBe(false);
  });

  test("Spec 5: edge-touching IS allowed — flush placement not refused", async ({
    page,
  }) => {
    // Chair A 2ft wide at (5, 5); Chair B 2ft wide at (9, 5).
    // Drag A so its right edge (at center 7 + 1 = 8) butts flush against B's
    // left edge (at center 9 - 1 = 8). Touching at x=8 is NOT a collision.
    await seedRoomWithTwoChairs(page, { aX: 5, aY: 5, bX: 9, bY: 5 });
    await page.waitForFunction(
      () =>
        typeof (window as unknown as { __driveDragProduct?: unknown })
          .__driveDragProduct === "function",
      { timeout: 10_000 },
    );

    await page.evaluate(() => {
      const w = window as unknown as {
        __driveDragProduct: (
          id: string,
          to: { x: number; y: number },
        ) => void;
      };
      // Target center-X = 7 → A's right edge at x=8, B's left edge at x=8 → touch.
      w.__driveDragProduct("pA", { x: 7, y: 5 });
    });
    await settle(page);

    const aPos = await page.evaluate(() => {
      const w = window as unknown as {
        __cadStore: {
          getState: () => {
            rooms: Record<
              string,
              {
                placedProducts: Record<
                  string,
                  { position: { x: number; y: number } }
                >;
              }
            >;
            activeRoomId: string;
          };
        };
      };
      const cad = w.__cadStore.getState();
      return cad.rooms[cad.activeRoomId].placedProducts["pA"].position;
    });

    // Touching-flush position MUST be accepted — A's center moves to 7.
    expect(aPos.x).toBeCloseTo(7, 2);
  });

  test("Spec 6: refused-drag single-undo invariant — past.length grows by exactly 1", async ({
    page,
  }) => {
    await seedRoomWithTwoChairs(page, { aX: 5, aY: 5, bX: 12, bY: 5 });
    await page.waitForFunction(
      () =>
        typeof (window as unknown as { __driveDragProduct?: unknown })
          .__driveDragProduct === "function",
      { timeout: 10_000 },
    );

    const before = await page.evaluate(() => {
      const w = window as unknown as {
        __cadStore: { getState: () => { past: unknown[] } };
      };
      return w.__cadStore.getState().past.length;
    });

    // Drag onto colliding position — must refuse but still push exactly ONE
    // history entry (drag-start empty update).
    await page.evaluate(() => {
      const w = window as unknown as {
        __driveDragProduct: (
          id: string,
          to: { x: number; y: number },
        ) => void;
      };
      w.__driveDragProduct("pA", { x: 12, y: 5 });
    });
    await settle(page);

    const after = await page.evaluate(() => {
      const w = window as unknown as {
        __cadStore: { getState: () => { past: unknown[] } };
      };
      return w.__cadStore.getState().past.length;
    });

    expect(after - before).toBe(1);
  });
});

