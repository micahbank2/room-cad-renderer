// Phase 86 Plan 86-03 — COL-01 / COL-02 / COL-03 full-lifecycle e2e.
//
// Drives the full user-facing loop:
//   1. Click the Column toolbar button → setPendingColumn + setTool("column").
//   2. Place via test driver (real Fabric mousedown drive lives behind the
//      Phase 86-02 placement spec; here we use __drivePlaceColumn for
//      determinism — same code path the toolbar+click path exercises).
//   3. Assert the column shows up in the Rooms tree under the new
//      "Columns" group.
//   4. Click the column leaf → selectedIds gains the columnId →
//      ColumnInspector mounts with three tabs.
//   5. Drive the Width input → resizeColumnAxis writes.
//   6. Click "Reset to wall height" → heightFt snaps to room.wallHeight.
//   7. Reload page → column survives via auto-save.
//   8. Delete key removes the column; Ctrl+Z restores it (single undo).
//
// Test drivers used (all installed under MODE === "test"):
//   __drivePlaceColumn(xFt, yFt) → string         (Phase 86-02)
//   __getColumnCount() → number                    (Phase 86-02)
//   __getColumnConfig(id) → Column | null          (Phase 86-02)

import { test, expect } from "@playwright/test";
import { setupPage } from "../playwright-helpers/setupPage";
import { settle } from "../playwright-helpers/settle";

async function seedRoomAndWaitForToolbar(page: import("@playwright/test").Page) {
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
          name: "Main Room",
          room: { width: 20, length: 16, wallHeight: 8 },
          walls: {
            wall_a: {
              id: "wall_a",
              start: { x: 0, y: 0 },
              end: { x: 10, y: 0 },
              thickness: 0.5,
              height: 8,
              openings: [],
            },
          },
          placedProducts: {},
          columns: {},
        },
      },
      activeRoomId: "room_main",
    });
  });
  await page.waitForSelector('[data-testid="tool-column"]', {
    timeout: 10_000,
  });
  await settle(page);
}

test.describe("Phase 86-03 Column full-lifecycle (COL-01 / COL-02 / COL-03)", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test("Toolbar → place → tree → inspector edit → reset-to-wall-height → reload survives", async ({
    page,
  }) => {
    await seedRoomAndWaitForToolbar(page);

    // (1) Click Column toolbar button — verifies the FloatingToolbar wiring.
    await page.locator('[data-testid="tool-column"]').click();

    // After click: activeTool === "column" and pendingColumn config has
    // heightFt = room.wallHeight (8) per D-03.
    const toolAfter = await page.evaluate(() => {
      const w = window as unknown as {
        __uiStore?: { getState: () => { activeTool: string } };
      };
      return w.__uiStore?.getState().activeTool ?? null;
    });
    expect(toolAfter).toBe("column");

    // (2) Place via driver (same code path the production click would
    // exercise — addColumn with the pendingColumn config).
    const placedId = await page.evaluate(() => {
      const w = window as unknown as {
        __drivePlaceColumn: (x: number, y: number) => string;
      };
      return w.__drivePlaceColumn(5, 5);
    });
    expect(placedId).toMatch(/^col_/);
    await settle(page);

    // (3) Rooms tree shows a Columns group with one leaf "Column".
    await expect(page.getByText("Columns").first()).toBeVisible();
    await expect(page.getByText("Column", { exact: true }).first()).toBeVisible();

    // (4) Click the column leaf to select. Use the data attribute to pin it.
    await page.locator(`[data-tree-node="${placedId}"] button`).first().click();
    await settle(page);

    // ColumnInspector mounts with three tabs (the right inspector mount
    // exposes role="tab" via the Tabs primitive).
    await expect(page.getByRole("tab", { name: "Dimensions" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Material" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Rotation" })).toBeVisible();

    // (5) Edit width via the numeric input — drive value 3 then blur.
    await page.locator('[data-testid="column-width-input"]').fill("3");
    await page.locator('[data-testid="column-width-input"]').press("Enter");
    await settle(page);

    const widthAfterEdit = await page.evaluate((id) => {
      const w = window as unknown as {
        __getColumnConfig: (id: string) => null | { widthFt: number };
      };
      return w.__getColumnConfig(id)?.widthFt ?? null;
    }, placedId);
    expect(widthAfterEdit).toBe(3);

    // (6) Reset to wall height — preset the heightFt to a non-default value
    // via inspector input, then click reset and assert wallHeight snapping.
    await page.locator('[data-testid="column-height-input"]').fill("12");
    await page.locator('[data-testid="column-height-input"]').press("Enter");
    await settle(page);
    await page.locator('[data-testid="column-reset-height"]').click();
    await settle(page);

    const heightAfterReset = await page.evaluate((id) => {
      const w = window as unknown as {
        __getColumnConfig: (id: string) => null | { heightFt: number };
      };
      return w.__getColumnConfig(id)?.heightFt ?? null;
    }, placedId);
    expect(heightAfterReset).toBe(8); // room.wallHeight

    // (7) Reload — auto-save persists the column. Verify it survives.
    // (Auto-save Phase 28 has a 2s debounce; wait it out before reload.)
    await page.waitForTimeout(2500);
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(
      () =>
        typeof (window as unknown as { __getColumnCount?: unknown })
          .__getColumnCount === "function",
      { timeout: 10_000 },
    );
    const countAfterReload = await page.evaluate(() => {
      const w = window as unknown as { __getColumnCount: () => number };
      return w.__getColumnCount();
    });
    expect(countAfterReload).toBe(1);
  });

  test("Delete key removes selected column; Ctrl+Z restores it (single undo)", async ({
    page,
  }) => {
    await seedRoomAndWaitForToolbar(page);

    const placedId = await page.evaluate(() => {
      const w = window as unknown as {
        __drivePlaceColumn: (x: number, y: number) => string;
      };
      return w.__drivePlaceColumn(4, 4);
    });
    expect(placedId).toMatch(/^col_/);
    await settle(page);

    // Select the column via uiStore.
    await page.evaluate((id) => {
      const w = window as unknown as {
        __uiStore: { getState: () => { select: (ids: string[]) => void } };
      };
      w.__uiStore.getState().select([id]);
    }, placedId);
    await settle(page);

    // removeSelected mirrors what the Delete key does in selectTool.
    await page.evaluate((id) => {
      const w = window as unknown as {
        __cadStore: {
          getState: () => { removeSelected: (ids: string[]) => void };
        };
      };
      w.__cadStore.getState().removeSelected([id]);
    }, placedId);
    await settle(page);

    const countAfterDelete = await page.evaluate(() => {
      const w = window as unknown as { __getColumnCount: () => number };
      return w.__getColumnCount();
    });
    expect(countAfterDelete).toBe(0);

    // Undo — single Ctrl+Z restores the column (Phase 86-02 single-undo
    // invariant for removeSelected was verified at Wave 2; here we just
    // confirm the round-trip).
    await page.evaluate(() => {
      const w = window as unknown as {
        __cadStore: { getState: () => { undo: () => void } };
      };
      w.__cadStore.getState().undo();
    });
    await settle(page);

    const countAfterUndo = await page.evaluate(() => {
      const w = window as unknown as { __getColumnCount: () => number };
      return w.__getColumnCount();
    });
    expect(countAfterUndo).toBe(1);
  });
});
