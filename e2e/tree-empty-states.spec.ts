import { test, expect } from "@playwright/test";

test.describe("Tree empty states (UI-SPEC § Empty States)", () => {
  test("blank room shows 3 empty-state strings verbatim", async ({ page }) => {
    // Skip welcome screen — App.tsx setHasStarted(true) gate is wallCount>0.
    // We need the room loaded but with NO walls, products, or custom elements
    // so that the 3 group-children arrays are empty and empty-state copy renders.
    await page.addInitScript(() => {
      try {
        localStorage.setItem("room-cad-onboarding-completed", "1");
      } catch {
        /* unavailable on about:blank */
      }
    });

    await page.goto("/");

    // Seed an empty room directly via test-mode store handle.
    await page.evaluate(async () => {
      // @ts-expect-error — window.__cadStore installed in test mode
      (window as unknown as { __cadStore: { getState: () => { loadSnapshot: (s: unknown) => void } } }).__cadStore.getState().loadSnapshot({
        version: 2,
        rooms: {
          room_empty: {
            id: "room_empty",
            name: "Empty Room",
            room: { width: 20, length: 16, wallHeight: 8 },
            walls: {},
            placedProducts: {},
            placedCustomElements: {},
          },
        },
        activeRoomId: "room_empty",
      });
    });

    // Expand the room so its 4 group children render.
    await page.waitForFunction(
      () => typeof (window as unknown as { __driveTreeExpand?: unknown }).__driveTreeExpand === "function",
      { timeout: 10_000 },
    );
    // Default state per D-02: active room expanded already. But if persisted
    // collapsed from a prior run, force-expand.
    await page.evaluate(() => {
      const stored = localStorage.getItem("gsd:tree:room:room_empty:expanded");
      if (stored === "false") {
        // @ts-expect-error — driver installed in test mode
        (window as unknown as { __driveTreeExpand: (id: string) => void }).__driveTreeExpand("room_empty");
      }
    });

    // Verify the 3 empty-state strings render verbatim.
    await expect(page.getByText("No walls yet")).toBeVisible();
    await expect(page.getByText("No products placed")).toBeVisible();
    await expect(page.getByText("No custom elements placed")).toBeVisible();
  });
});
