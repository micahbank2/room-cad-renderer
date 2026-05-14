/**
 * Phase 82 Plan 82-02 — E2E spec for per-entity tab system (IA-04, D-05).
 *
 * Asserts:
 *   - Selecting a wall surfaces 3 tabs (Geometry / Material / Openings) in
 *     a real browser, with Geometry active by default.
 *   - Clicking the Material tab activates it (aria-selected="true").
 *   - Selecting a different wall resets the active tab to Geometry (D-03).
 *   - Selecting a product surfaces Dimensions / Material / Rotation.
 *
 * This is the headless complement to the RTL unit suite at
 * tests/RightInspector.tabs.test.tsx — exercises the production app shell
 * (App.tsx → RightInspector mount path) in an actual browser.
 */
import { test, expect } from "@playwright/test";
import { settle } from "../playwright-helpers/settle";
import { setupPage } from "../playwright-helpers/setupPage";

test.describe("Phase 82-02 RightInspector tabs (IA-04 D-05)", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test("Wall tabs render in order [Geometry, Material, Openings] with Geometry active; switch + reset on selection swap (D-03)", async ({
    page,
  }) => {
    // Seed two walls + a product so we can test wall→wall and wall→product
    // tab transitions.
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
        version: 2,
        rooms: {
          room_main: {
            id: "room_main",
            name: "Main Room",
            room: { width: 20, length: 16, wallHeight: 8 },
            walls: {
              wall_a: {
                id: "wall_a",
                start: { x: 2, y: 2 },
                end: { x: 18, y: 2 },
                thickness: 0.5,
                height: 8,
                openings: [],
              },
              wall_b: {
                id: "wall_b",
                start: { x: 2, y: 10 },
                end: { x: 18, y: 10 },
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
    await page.waitForSelector('[data-testid="view-mode-3d"]', {
      timeout: 10_000,
    });
    await settle(page);

    // Select wall A via the ui store directly (no canvas pixel hunting).
    await page.evaluate(() => {
      (
        window as unknown as { __uiStore: { setState: (s: unknown) => void } }
      ).__uiStore.setState({ activeTool: "select", selectedIds: ["wall_a"] });
    });
    await settle(page);

    // 3 tabs render in documented order.
    const tabTexts = await page.locator('[role="tab"]').allTextContents();
    expect(tabTexts.map((t) => t.trim())).toEqual([
      "Geometry",
      "Material",
      "Openings",
    ]);

    // Geometry is active by default.
    const initialActive = await page
      .locator('[role="tab"][aria-selected="true"]')
      .innerText();
    expect(initialActive.trim()).toBe("Geometry");

    // Click Material tab → it becomes active.
    await page.locator('[role="tab"]:has-text("Material")').click();
    await settle(page);
    const afterClickActive = await page
      .locator('[role="tab"][aria-selected="true"]')
      .innerText();
    expect(afterClickActive.trim()).toBe("Material");

    // D-03: select wall B → fresh mount → Geometry becomes active again.
    await page.evaluate(() => {
      (
        window as unknown as { __uiStore: { setState: (s: unknown) => void } }
      ).__uiStore.setState({ activeTool: "select", selectedIds: ["wall_b"] });
    });
    await settle(page);
    const resetActive = await page
      .locator('[role="tab"][aria-selected="true"]')
      .innerText();
    expect(resetActive.trim()).toBe("Geometry");
  });

  test("Product tabs render in order [Dimensions, Material, Rotation] with Dimensions active", async ({
    page,
  }) => {
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
        version: 2,
        rooms: {
          room_main: {
            id: "room_main",
            name: "Main Room",
            room: { width: 20, length: 16, wallHeight: 8 },
            walls: {},
            placedProducts: {
              pp_sofa: {
                id: "pp_sofa",
                productId: "prod_sofa",
                position: { x: 5, y: 5 },
                rotation: 0,
                sizeScale: 1,
              },
            },
          },
        },
        activeRoomId: "room_main",
      });
    });
    await page.waitForSelector('[data-testid="view-mode-3d"]', {
      timeout: 10_000,
    });
    await settle(page);

    await page.evaluate(() => {
      (
        window as unknown as { __uiStore: { setState: (s: unknown) => void } }
      ).__uiStore.setState({ activeTool: "select", selectedIds: ["pp_sofa"] });
    });
    await settle(page);

    const tabTexts = await page.locator('[role="tab"]').allTextContents();
    expect(tabTexts.map((t) => t.trim())).toEqual([
      "Dimensions",
      "Material",
      "Rotation",
    ]);

    const initialActive = await page
      .locator('[role="tab"][aria-selected="true"]')
      .innerText();
    expect(initialActive.trim()).toBe("Dimensions");
  });
});
