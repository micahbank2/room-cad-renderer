// Phase 87 Plan 01 — E2E for theme toggle (THEME-03, THEME-04, THEME-05).
//
// Verifies:
//  1. Click gear → click Dark → <html> gains .dark class.
//  2. Reload → .dark persists on first paint (boot bridge).
//     Then click Light → class removed; reload → class still absent.
//  3. After Dark, HelpPage opens with <html class="dark"> intact (D-04 wrapper
//     removal — no .light force-wrapper overrides token cascade).

import { test, expect } from "@playwright/test";
import { setupPage } from "../playwright-helpers/setupPage";
import { seedRoom } from "../playwright-helpers/seedRoom";

test.describe("Theme toggle + persistence (Phase 87)", () => {
  // No beforeEach init-script reset — that would clobber localStorage on the
  // reload step in THEME-05, defeating the persistence check. Each test sets
  // its own theme explicitly via the gear UI and starts from a clean profile
  // (Playwright spins up a fresh browser context per test by default).

  test("THEME-03 — click gear → Dark adds .dark; Light removes it", async ({ page }) => {
    await setupPage(page);
    await seedRoom(page);

    const gear = page.locator('[data-testid="topbar-settings-button"]');
    await expect(gear).toBeVisible();
    await gear.click();

    const popover = page.locator('[data-testid="settings-popover"]');
    await expect(popover).toBeVisible();

    await popover.getByRole("radio", { name: "Dark" }).click();
    const hasDarkAfterClick = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    expect(hasDarkAfterClick).toBe(true);

    await popover.getByRole("radio", { name: "Light" }).click();
    const hasDarkAfterLight = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    expect(hasDarkAfterLight).toBe(false);
  });

  test("THEME-05 — choice persists across reload (no flash)", async ({ page }) => {
    await setupPage(page);
    await seedRoom(page);

    // Set Dark
    await page.locator('[data-testid="topbar-settings-button"]').click();
    await page
      .locator('[data-testid="settings-popover"]')
      .getByRole("radio", { name: "Dark" })
      .click();

    // Reload — boot bridge in index.html should add .dark before React mounts
    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    const hasDarkOnReload = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    expect(hasDarkOnReload).toBe(true);

    // Re-seed for the Light leg (page reload reset hasStarted)
    await seedRoom(page);

    // Now switch to Light, reload, verify .dark is absent
    await page.locator('[data-testid="topbar-settings-button"]').click();
    await page
      .locator('[data-testid="settings-popover"]')
      .getByRole("radio", { name: "Light" })
      .click();
    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    const hasDarkAfterReloadLight = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    expect(hasDarkAfterReloadLight).toBe(false);
  });

  test("THEME-04 — HelpPage inherits .dark cascade (no .light force-wrapper)", async ({
    page,
  }) => {
    await setupPage(page);
    await seedRoom(page);

    // Toggle Dark
    await page.locator('[data-testid="topbar-settings-button"]').click();
    await page
      .locator('[data-testid="settings-popover"]')
      .getByRole("radio", { name: "Dark" })
      .click();

    // Close settings popover (Escape) so Help button is clickable
    await page.keyboard.press("Escape");

    // Open Help
    await page.locator('[data-onboarding="help-button"]').click();

    // <html> still has .dark, AND no descendant has .light class on root chrome
    const hasDarkHtml = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    expect(hasDarkHtml).toBe(true);

    // Assert no node has class "light" as its standalone root-wrapper marker
    const lightWrappers = await page.evaluate(() => {
      // Look for any div whose className starts with "light " (force-wrapper pattern)
      const all = document.querySelectorAll("div");
      let count = 0;
      all.forEach((d) => {
        const cls = d.getAttribute("class") || "";
        if (cls.split(" ")[0] === "light") count++;
      });
      return count;
    });
    expect(lightWrappers).toBe(0);
  });
});
