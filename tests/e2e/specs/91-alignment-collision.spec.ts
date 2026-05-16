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
