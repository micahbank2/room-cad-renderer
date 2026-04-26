import { test, expect } from "@playwright/test";

test.describe("Tree empty states (UI-SPEC § Empty States)", () => {
  // Note: a room with zero walls keeps the WelcomeScreen mounted (App.tsx
  // setHasStarted gate is wallCount>0 OR placedCount>0). So this e2e seeds
  // a room with ONE wall and verifies the 2 group-children empty strings
  // we can render that way. The third string ("No walls yet") is covered
  // by the component-level test at src/components/__tests__/RoomsTreePanel.empty.test.tsx.
  test("expanded room with no products/custom shows empty-state strings verbatim", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("room-cad-onboarding-completed", "1");
      } catch {
        /* unavailable on about:blank */
      }
    });

    await page.goto("/");

    await page.evaluate(async () => {
      // @ts-expect-error — window.__cadStore installed in test mode
      (window as unknown as { __cadStore: { getState: () => { loadSnapshot: (s: unknown) => void } } }).__cadStore.getState().loadSnapshot({
        version: 2,
        rooms: {
          room_empty_groups: {
            id: "room_empty_groups",
            name: "Empty Groups Room",
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
            placedCustomElements: {},
          },
        },
        activeRoomId: "room_empty_groups",
      });
    });

    await page.waitForFunction(
      () => typeof (window as unknown as { __driveTreeExpand?: unknown }).__driveTreeExpand === "function",
      { timeout: 10_000 },
    );

    // Force-expand if persisted state from a prior run left it collapsed.
    await page.evaluate(() => {
      const stored = localStorage.getItem("gsd:tree:room:room_empty_groups:expanded");
      if (stored === "false") {
        // @ts-expect-error — driver installed in test mode
        (window as unknown as { __driveTreeExpand: (id: string) => void }).__driveTreeExpand("room_empty_groups");
      }
    });

    await expect(page.getByText("No products placed")).toBeVisible();
    await expect(page.getByText("No custom elements placed")).toBeVisible();
  });
});
