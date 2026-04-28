import { test, expect } from "@playwright/test";

test.describe("Tree expand persistence (D-03)", () => {
  test("reload preserves expanded state per room", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("room-cad-onboarding-completed", "1");
      } catch {
        /* unavailable on about:blank */
      }
    });

    await page.goto("/");

    // Seed a project with one room (must have ≥1 wall so App leaves WelcomeScreen).
    await page.evaluate(async () => {
      // @ts-expect-error — window.__cadStore installed in test mode
      await (window as unknown as { __cadStore: { getState: () => { loadSnapshot: (s: unknown) => Promise<void> } } }).__cadStore.getState().loadSnapshot({
        version: 2,
        rooms: {
          room_persist: {
            id: "room_persist",
            name: "Persist Room",
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
        activeRoomId: "room_persist",
      });
    });

    // Wait for tree drivers to attach.
    await page.waitForFunction(
      () => typeof (window as unknown as { __driveTreeExpand?: unknown }).__driveTreeExpand === "function",
      { timeout: 10_000 },
    );

    // Toggle expand state to flip default → write to localStorage.
    await page.evaluate(() => {
      // @ts-expect-error — driver installed in test mode
      (window as unknown as { __driveTreeExpand: (id: string) => void }).__driveTreeExpand("room_persist");
    });

    // Reload page and confirm storage key was written and survived reload.
    await page.reload();
    const persisted = await page.evaluate(() =>
      localStorage.getItem("gsd:tree:room:room_persist:expanded"),
    );
    expect(persisted).toBeTruthy();
  });
});
