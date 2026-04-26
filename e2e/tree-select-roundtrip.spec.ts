import { test, expect } from "@playwright/test";

test.describe("Tree → 3D round-trip (D-07/08/09/10)", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
  });
  test("clicking a wall row writes selectedIds and dispatches camera", async ({ page }) => {
    // Plan 03/04 wires; assertion via window.__getTreeState() and uiStore.pendingCameraTarget.
    // Stub: no-op until RoomsTreePanel + treeDrivers are wired in Plan 03.
  });
});
