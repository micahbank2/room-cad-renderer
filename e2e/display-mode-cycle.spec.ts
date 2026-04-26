import { test, expect } from "@playwright/test";

test.describe("Phase 47 — display-mode cycle (DISPLAY-01)", () => {
  test.beforeEach(async ({ page }) => {
    // D-07 mandates instant switching — reduce-motion not strictly needed but
    // eliminates Phase 35 preset-tween interference in the smoke flow.
    await page.emulateMedia({ reducedMotion: "reduce" });

    // Skip onboarding overlay so it doesn't block clicks.
    await page.addInitScript(() => {
      try {
        localStorage.setItem("room-cad-onboarding-completed", "1");
      } catch {
        /* unavailable on about:blank */
      }
    });

    await page.goto("/");

    // Seed a project with one wall — bypasses WelcomeScreen (App.tsx
    // setHasStarted gate is wallCount>0 OR placedCount>0).
    await page.evaluate(async () => {
      // @ts-expect-error — window.__cadStore installed in test mode
      (window as unknown as { __cadStore: { getState: () => { loadSnapshot: (s: unknown) => void } } }).__cadStore.getState().loadSnapshot({
        version: 2,
        rooms: {
          room_main: {
            id: "room_main",
            name: "Main Room",
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
        activeRoomId: "room_main",
      });
    });

    // Wait for the Toolbar to mount, then switch to 3D view so the
    // display-mode segmented control is visible (D-01 gate).
    await page.getByTestId("view-mode-3d").click();

    // Reset displayMode to default-normal entry for each test.
    await page.evaluate(() => localStorage.removeItem("gsd:displayMode"));
  });

  test("cycles NORMAL → EXPLODE → SOLO → NORMAL with correct aria-pressed and store state", async ({ page }) => {
    await page.getByTestId("display-mode-explode").click();
    await expect(page.getByTestId("display-mode-explode")).toHaveAttribute("aria-pressed", "true");
    const explodeMode = await page.evaluate(() => (window as { __getDisplayMode?: () => string }).__getDisplayMode?.());
    expect(explodeMode).toBe("explode");

    await page.getByTestId("display-mode-solo").click();
    await expect(page.getByTestId("display-mode-solo")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("display-mode-explode")).toHaveAttribute("aria-pressed", "false");
    const soloMode = await page.evaluate(() => (window as { __getDisplayMode?: () => string }).__getDisplayMode?.());
    expect(soloMode).toBe("solo");

    await page.getByTestId("display-mode-normal").click();
    await expect(page.getByTestId("display-mode-normal")).toHaveAttribute("aria-pressed", "true");
    const normalMode = await page.evaluate(() => (window as { __getDisplayMode?: () => string }).__getDisplayMode?.());
    expect(normalMode).toBe("normal");
  });

  test("D-05 persistence — selecting SOLO and reloading restores SOLO from localStorage", async ({ page }) => {
    await page.getByTestId("display-mode-solo").click();
    const stored = await page.evaluate(() => localStorage.getItem("gsd:displayMode"));
    expect(stored).toBe("solo");

    await page.reload();
    await page.emulateMedia({ reducedMotion: "reduce" });

    // After reload, App boots in 2D — switch to 3D so the buttons are visible again.
    await page.getByTestId("view-mode-3d").click();

    const restoredMode = await page.evaluate(() => (window as { __getDisplayMode?: () => string }).__getDisplayMode?.());
    expect(restoredMode).toBe("solo");
    await expect(page.getByTestId("display-mode-solo")).toHaveAttribute("aria-pressed", "true");
  });

  test("D-05 garbage localStorage value falls back to NORMAL", async ({ page }) => {
    await page.evaluate(() => localStorage.setItem("gsd:displayMode", "BLAHBLAH"));
    await page.reload();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.getByTestId("view-mode-3d").click();

    const mode = await page.evaluate(() => (window as { __getDisplayMode?: () => string }).__getDisplayMode?.());
    expect(mode).toBe("normal");
    await expect(page.getByTestId("display-mode-normal")).toHaveAttribute("aria-pressed", "true");
  });
});
