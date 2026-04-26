import { test, expect } from "@playwright/test";

test.describe("Tree visibility cascade (D-12)", () => {
  test("hide room → all descendants opacity-50; restore preserves child hidden state", async ({ page }) => {
    await page.goto("/");
    // 1. Toggle child wall off via __driveTreeVisibility.
    // 2. Toggle parent room off.
    // 3. Toggle parent room ON.
    // 4. Assert child wall STILL hidden (D-12 preservation).
    // Stub: no-op until Plan 03 wires treeDrivers + RoomsTreePanel.
  });
});
