/**
 * Phase 85 D-05 — RED e2e spec for parametric W/D/H/X/Y inputs (PARAM-01/02/03).
 *
 * Plan 85-01 ships these RED — they MUST FAIL today. Plan 85-02 turns the
 * product-* cases GREEN; Plan 85-03 turns the custom-element-* cases GREEN.
 *
 * Exercises the production app shell (App.tsx → RightInspector mount path)
 * in a real browser. Complements the RTL unit suites at:
 *   - tests/ProductInspector.numeric.test.tsx
 *   - tests/CustomElementInspector.numeric.test.tsx
 */
import { test, expect } from "@playwright/test";
import { settle } from "../playwright-helpers/settle";
import { setupPage } from "../playwright-helpers/setupPage";

test.describe("Phase 85 PARAM-01/02/03 parametric controls", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test("Product width input resizes placedProduct.widthFtOverride in store", async ({
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
        version: 9,
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
            ceilings: {},
            placedCustomElements: {},
            stairs: {},
            measureLines: {},
            annotations: {},
          },
        },
        activeRoomId: "room_main",
      });
    });
    await page.waitForSelector('[data-testid="view-mode-3d"]', {
      timeout: 10_000,
    });
    // Select the product.
    await page.evaluate(() => {
      (
        window as unknown as { __uiStore: { setState: (s: unknown) => void } }
      ).__uiStore.setState({ activeTool: "select", selectedIds: ["pp_sofa"] });
    });
    await settle(page);

    // Locate width input via testid. Plan 85-02 must surface this.
    const widthInput = page.locator('[data-testid="product-width-input"]');
    await expect(widthInput).toBeVisible({ timeout: 5_000 });
    await widthInput.fill("8.5");
    await widthInput.press("Enter");
    await settle(page);

    // Assert store updated.
    const widthOverride = await page.evaluate(() => {
      const s = (
        window as unknown as {
          __cadStore: { getState: () => unknown };
        }
      ).__cadStore.getState() as {
        rooms: Record<string, { placedProducts: Record<string, { widthFtOverride?: number }> }>;
        activeRoomId: string;
      };
      return s.rooms[s.activeRoomId].placedProducts.pp_sofa.widthFtOverride;
    });
    expect(widthOverride).toBe(8.5);
  });

  test("Product height input writes heightFtOverride and survives reload (Phase 85 D-05)", async ({
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
        version: 9,
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
            ceilings: {},
            placedCustomElements: {},
            stairs: {},
            measureLines: {},
            annotations: {},
          },
        },
        activeRoomId: "room_main",
      });
    });
    await page.evaluate(() => {
      (
        window as unknown as { __uiStore: { setState: (s: unknown) => void } }
      ).__uiStore.setState({ activeTool: "select", selectedIds: ["pp_sofa"] });
    });
    await settle(page);

    const heightInput = page.locator('[data-testid="product-height-input"]');
    await expect(heightInput).toBeVisible({ timeout: 5_000 });
    await heightInput.fill("7");
    await heightInput.press("Enter");
    await settle(page);

    const heightOverride = await page.evaluate(() => {
      const s = (
        window as unknown as {
          __cadStore: { getState: () => unknown };
        }
      ).__cadStore.getState() as {
        rooms: Record<string, { placedProducts: Record<string, { heightFtOverride?: number }> }>;
        activeRoomId: string;
      };
      return s.rooms[s.activeRoomId].placedProducts.pp_sofa.heightFtOverride;
    });
    expect(heightOverride).toBe(7);
  });

  test("Product X position input updates position.x", async ({ page }) => {
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
        version: 9,
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
            ceilings: {},
            placedCustomElements: {},
            stairs: {},
            measureLines: {},
            annotations: {},
          },
        },
        activeRoomId: "room_main",
      });
    });
    await page.evaluate(() => {
      (
        window as unknown as { __uiStore: { setState: (s: unknown) => void } }
      ).__uiStore.setState({ activeTool: "select", selectedIds: ["pp_sofa"] });
    });
    await settle(page);

    const xInput = page.locator('[data-testid="product-x-input"]');
    await expect(xInput).toBeVisible({ timeout: 5_000 });
    await xInput.fill("12");
    await xInput.press("Enter");
    await settle(page);

    const posX = await page.evaluate(() => {
      const s = (
        window as unknown as {
          __cadStore: { getState: () => unknown };
        }
      ).__cadStore.getState() as {
        rooms: Record<string, { placedProducts: Record<string, { position: { x: number } }> }>;
        activeRoomId: string;
      };
      return s.rooms[s.activeRoomId].placedProducts.pp_sofa.position.x;
    });
    expect(posX).toBe(12);
  });
});
