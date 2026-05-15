// tests/e2e/specs/sidebar-contextual-visibility.spec.ts
//
// Phase 84 Plan 01 (IA-08) — Sidebar contextual visibility.
//
// Verifies the D-02 + D-04 gating from a real-browser perspective:
//   - Switching to product tool exposes sidebar-custom-elements AND opens
//     sidebar-product-library regardless of persisted state.
//   - Switching to wall tool hides sidebar-custom-elements,
//     sidebar-framed-art, sidebar-wainscoting from the DOM (full unmount).
//
// uiStore exposes window.__uiStore in test mode (uiStore.ts L489–501).
// Per project memory (feedback_playwright_goldens_ci), we do NOT use
// toHaveScreenshot — DOM presence + aria-expanded assertions are stable.
import { test, expect } from "@playwright/test";
import { setupPage } from "../playwright-helpers/setupPage";
import { seedRoom } from "../playwright-helpers/seedRoom";

test.describe("Sidebar contextual visibility (Phase 84 IA-08)", () => {
  test("product tool exposes Custom Elements + auto-opens Product Library", async ({
    page,
  }) => {
    await setupPage(page);
    await seedRoom(page);

    // Pre-seed: collapse product library so we can prove forceOpen overrides it.
    await page.evaluate(() => {
      localStorage.setItem(
        "ui:propertiesPanel:sections",
        JSON.stringify({ "sidebar-product-library": false }),
      );
    });

    // Switch to product tool.
    await page.evaluate(() => {
      type UIStoreT = {
        setState: (s: { activeTool: string; selectedIds: string[] }) => void;
      };
      const store = (window as unknown as { __uiStore: UIStoreT }).__uiStore;
      store.setState({ activeTool: "product", selectedIds: [] });
    });

    // Custom Elements present.
    await expect(
      page.locator('[data-panel-id="sidebar-custom-elements"]'),
    ).toHaveCount(1);

    // Product Library is forced open (aria-expanded === "true") even though
    // localStorage persisted state is "false".
    const productLibraryBtn = page.locator(
      '[data-panel-id="sidebar-product-library"] button',
    );
    await expect(productLibraryBtn).toHaveAttribute("aria-expanded", "true");

    // Switching back to select restores persisted (collapsed) state.
    await page.evaluate(() => {
      type UIStoreT = {
        setState: (s: { activeTool: string; selectedIds: string[] }) => void;
      };
      const store = (window as unknown as { __uiStore: UIStoreT }).__uiStore;
      store.setState({ activeTool: "select", selectedIds: [] });
    });
    await expect(productLibraryBtn).toHaveAttribute("aria-expanded", "false");
  });

  test("wall tool hides Custom Elements + Framed Art + Wainscoting", async ({
    page,
  }) => {
    await setupPage(page);
    await seedRoom(page);

    await page.evaluate(() => {
      type UIStoreT = {
        setState: (s: { activeTool: string; selectedIds: string[] }) => void;
      };
      const store = (window as unknown as { __uiStore: UIStoreT }).__uiStore;
      store.setState({ activeTool: "wall", selectedIds: [] });
    });

    await expect(
      page.locator('[data-panel-id="sidebar-custom-elements"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('[data-panel-id="sidebar-framed-art"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('[data-panel-id="sidebar-wainscoting"]'),
    ).toHaveCount(0);
  });
});
