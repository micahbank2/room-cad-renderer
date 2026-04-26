import { test, expect } from "@playwright/test";

test.describe("Phase 47 — display-mode cycle (DISPLAY-01)", () => {
  test.beforeEach(async ({ page }) => {
    // D-07 mandates instant switching — reduce-motion not strictly needed but
    // eliminates Phase 35 preset-tween interference in the smoke flow.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    // Clear any prior localStorage state to enforce default-normal entry.
    await page.evaluate(() => localStorage.removeItem("gsd:displayMode"));
  });

  test("cycles NORMAL → EXPLODE → SOLO → NORMAL with correct aria-pressed and store state", async ({ page }) => {
    // Switch to 3D so Toolbar segmented control is visible (D-01 gate).
    // Plan 03 + Plan 02 wire the buttons; this assertion is RED until both land.
    // Method: click EXPLODE button.
    await page.getByTestId("display-mode-explode").click();
    await expect(page.getByTestId("display-mode-explode")).toHaveAttribute("aria-pressed", "true");
    const explodeMode = await page.evaluate(() => (window as { __getDisplayMode?: () => string }).__getDisplayMode?.());
    expect(explodeMode).toBe("explode");

    // Switch to SOLO.
    await page.getByTestId("display-mode-solo").click();
    await expect(page.getByTestId("display-mode-solo")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("display-mode-explode")).toHaveAttribute("aria-pressed", "false");
    const soloMode = await page.evaluate(() => (window as { __getDisplayMode?: () => string }).__getDisplayMode?.());
    expect(soloMode).toBe("solo");

    // Switch to NORMAL.
    await page.getByTestId("display-mode-normal").click();
    await expect(page.getByTestId("display-mode-normal")).toHaveAttribute("aria-pressed", "true");
    const normalMode = await page.evaluate(() => (window as { __getDisplayMode?: () => string }).__getDisplayMode?.());
    expect(normalMode).toBe("normal");
  });

  test("D-05 persistence — selecting SOLO and reloading restores SOLO from localStorage", async ({ page }) => {
    await page.getByTestId("display-mode-solo").click();
    // Verify localStorage write
    const stored = await page.evaluate(() => localStorage.getItem("gsd:displayMode"));
    expect(stored).toBe("solo");

    await page.reload();
    await page.emulateMedia({ reducedMotion: "reduce" });

    // After reload, displayMode should still be solo (hydrated from localStorage).
    const restoredMode = await page.evaluate(() => (window as { __getDisplayMode?: () => string }).__getDisplayMode?.());
    expect(restoredMode).toBe("solo");
    await expect(page.getByTestId("display-mode-solo")).toHaveAttribute("aria-pressed", "true");
  });

  test("D-05 garbage localStorage value falls back to NORMAL", async ({ page }) => {
    await page.evaluate(() => localStorage.setItem("gsd:displayMode", "BLAHBLAH"));
    await page.reload();
    await page.emulateMedia({ reducedMotion: "reduce" });
    const mode = await page.evaluate(() => (window as { __getDisplayMode?: () => string }).__getDisplayMode?.());
    expect(mode).toBe("normal");
    await expect(page.getByTestId("display-mode-normal")).toHaveAttribute("aria-pressed", "true");
  });
});
