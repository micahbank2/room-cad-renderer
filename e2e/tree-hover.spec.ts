/**
 * Phase 81 Plan 02 (D-02) — Tree-to-canvas hover highlight e2e.
 *
 * Verifies the IA-03 verifiable criterion:
 *   "Hover 'North wall' in the tree → north wall briefly glows on the 2D canvas."
 *
 * Strategy: seed a wall via `__driveSeedWall` (skips WelcomeScreen), then
 * hover the corresponding row in the Rooms tree. We assert via the
 * `__driveTreeHover` test driver (state-based) rather than screenshot
 * diff — goldens couple to platform pixel-rendering per the project memory
 * note `feedback_playwright_goldens_ci`.
 *
 * The hover setter inside uiStore is RAF-coalesced (research §"Pitfall 3");
 * `page.waitForFunction` retries until the next frame flush lands.
 */
import { test, expect } from "@playwright/test";

declare global {
  interface Window {
    __driveSeedWall?: (
      wallId: string,
      partial: {
        start: { x: number; y: number };
        end: { x: number; y: number };
        thickness?: number;
      },
    ) => void;
    __driveTreeHover?: {
      enter: (id: string) => void;
      leave: () => void;
      getHoveredId: () => string | null;
    };
  }
}

test.describe("Tree-to-canvas hover highlight (Phase 81 Plan 02, D-02)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("room-cad-onboarding-completed", "1");
      } catch {
        /* noop */
      }
    });
    await page.goto("/");
    // Purge IDB so each run starts clean.
    await page.evaluate(async () => {
      const dbs = [
        "room-cad-user-textures",
        "room-cad-materials",
        "keyval-store",
      ];
      await Promise.all(
        dbs.map(
          (name) =>
            new Promise<void>((resolve) => {
              const req = indexedDB.deleteDatabase(name);
              req.onsuccess = () => resolve();
              req.onerror = () => resolve();
              req.onblocked = () => resolve();
            }),
        ),
      );
    });
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
  });

  test("hovering a wall row writes hoveredEntityId; moving off clears it", async ({
    page,
  }) => {
    // 1. Seed a wall so the Rooms tree has a leaf row to hover.
    await page.evaluate(() => {
      const drive = window.__driveSeedWall;
      if (!drive)
        throw new Error("__driveSeedWall not installed — check --mode test");
      drive("test_wall_hover_1", {
        start: { x: 2, y: 2 },
        end: { x: 12, y: 2 },
        thickness: 0.5,
      });
    });

    // 2. Wait for the tree row to render. Each row has data-tree-node + kind.
    const wallRow = page.locator(
      '[data-tree-node="test_wall_hover_1"][data-tree-kind="wall"]',
    );
    await wallRow.waitFor({ state: "attached", timeout: 10_000 });

    // 3. Initially no hover.
    const initial = await page.evaluate(() =>
      window.__driveTreeHover?.getHoveredId() ?? null,
    );
    expect(initial).toBeNull();

    // 4. Hover the wall row — the row container (parent of the inner button)
    //    owns the mouseenter handler. page.hover targets the row's bbox.
    await wallRow.hover();

    // 5. Assert hoveredEntityId === wall id. RAF-coalesced setter writes
    //    within one frame; waitForFunction polls until satisfied.
    await page.waitForFunction(
      (expectedId) =>
        window.__driveTreeHover?.getHoveredId() === expectedId,
      "test_wall_hover_1",
      { timeout: 2_000 },
    );

    // 6. Move cursor off the tree entirely → hoveredEntityId clears to null.
    await page.mouse.move(0, 0);
    await page.waitForFunction(
      () => window.__driveTreeHover?.getHoveredId() === null,
      undefined,
      { timeout: 2_000 },
    );
  });

  test("hovering a room or group header row does NOT set hoveredEntityId", async ({
    page,
  }) => {
    // Seed a wall to ensure the room + walls group appear in the tree.
    await page.evaluate(() => {
      const drive = window.__driveSeedWall;
      if (!drive) throw new Error("__driveSeedWall not installed");
      drive("test_wall_hover_2", {
        start: { x: 2, y: 4 },
        end: { x: 10, y: 4 },
      });
    });

    // The room row is the top-most data-tree-kind="room". Hovering it must
    // NOT write hoveredEntityId — rooms have no single canvas counterpart.
    // Target the inner row chrome div (first child of data-tree-node) so
    // we hover the row itself, not the bbox of the container which
    // includes nested child rows.
    const roomRowChrome = page.locator('[data-tree-kind="room"] > div').first();
    await roomRowChrome.waitFor({ state: "attached", timeout: 10_000 });

    await roomRowChrome.hover();

    // Settle one RAF tick.
    await page.waitForTimeout(50);

    const afterRoomHover = await page.evaluate(() =>
      window.__driveTreeHover?.getHoveredId() ?? null,
    );
    expect(afterRoomHover).toBeNull();

    // Group header rows (e.g. "Walls", "Products") similarly do not hover.
    // Same drill — target the inner row chrome, not the data-tree-node
    // container (which wraps the group's children including leaf wall rows).
    const groupRowChrome = page.locator('[data-tree-kind="group"] > div').first();
    if (await groupRowChrome.count() > 0) {
      await groupRowChrome.hover();
      await page.waitForTimeout(50);
      const afterGroupHover = await page.evaluate(() =>
        window.__driveTreeHover?.getHoveredId() ?? null,
      );
      expect(afterGroupHover).toBeNull();
    }
  });
});
