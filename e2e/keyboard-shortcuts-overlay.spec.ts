/**
 * Phase 52 (HOTKEY-01) — keyboard shortcuts overlay regression spec.
 *
 * Asserts the 5 acceptance behaviors from REQUIREMENTS.md:
 *   1. Pressing ? opens HelpModal directly to the SHORTCUTS section
 *   2. Escape closes the modal
 *   3. Backdrop click closes the modal
 *   4. ? is inert when a text input has focus (CAM-01 active-element guard)
 *   5. Reduced-motion: modal opens instantly (no animation delay measurable)
 *
 * Does NOT use toHaveScreenshot — per feedback_playwright_goldens_ci.md.
 */
import { test, expect, type Page } from "@playwright/test";

// Minimal snapshot used across Phase 47/48/49/50 specs — bypasses WelcomeScreen.
const SNAPSHOT = {
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
};

async function seedScene(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("room-cad-onboarding-completed", "1");
    } catch {
      /* unavailable on about:blank */
    }
  });
  await page.goto("/");
  await page.evaluate(async (snap) => {
    // @ts-expect-error — window.__cadStore installed in test mode (Phase 36)
    (window as unknown as { __cadStore: { getState: () => { loadSnapshot: (s: unknown) => void } } }).__cadStore.getState().loadSnapshot(snap);
  }, SNAPSHOT);
  // Wait for canvas-bearing layout to render (sidebar + viewport)
  await page.waitForLoadState("domcontentloaded");
}

test.describe("HOTKEY-01 — keyboard shortcuts overlay", () => {
  test("? opens HelpModal to the SHORTCUTS section", async ({ page }) => {
    await seedScene(page);

    // Press ? — registry calls openHelp("shortcuts") explicitly
    await page.keyboard.press("?");

    // The shortcuts section is identified by the SHORTCUTS nav button label
    // (helpContent.tsx:11 — { id: "shortcuts", label: "SHORTCUTS", icon: "keyboard" }).
    // The section's content header in helpContent.tsx renders "Keyboard Shortcuts" h2.
    await expect(
      page.getByRole("heading", { name: /keyboard shortcuts/i }).first()
    ).toBeVisible({ timeout: 2000 });
  });

  test("Escape closes the modal", async ({ page }) => {
    await seedScene(page);
    await page.keyboard.press("?");
    const heading = page.getByRole("heading", { name: /keyboard shortcuts/i }).first();
    await expect(heading).toBeVisible({ timeout: 2000 });

    await page.keyboard.press("Escape");
    await expect(heading).not.toBeVisible({ timeout: 1000 });
  });

  test("backdrop click closes the modal", async ({ page }) => {
    await seedScene(page);
    await page.keyboard.press("?");
    const heading = page.getByRole("heading", { name: /keyboard shortcuts/i }).first();
    await expect(heading).toBeVisible({ timeout: 2000 });

    // Click a corner far from the modal panel.
    // Backdrop is `fixed inset-0 bg-obsidian-deepest/80 backdrop-blur-sm` and has
    // its own onClick={closeHelp}.
    await page.mouse.click(5, 5);
    await expect(heading).not.toBeVisible({ timeout: 1000 });
  });

  test("? is inert when a number input has focus (active-element guard)", async ({ page }) => {
    await seedScene(page);

    // RoomSettings is always rendered in the sidebar with width/length/height
    // <input type="number"> fields. Focus the first one.
    const input = page.locator('input[type="number"]').first();
    await input.waitFor({ state: "visible", timeout: 5000 });
    await input.focus();

    await page.keyboard.press("?");

    // Modal must NOT open
    await expect(
      page.getByRole("heading", { name: /keyboard shortcuts/i }).first()
    ).not.toBeVisible({ timeout: 500 });
  });

  test("reduced-motion: modal renders without entrance animation (D-03)", async ({ page }) => {
    // D-03 verification: HelpModal mounts via `if (!showHelp) return null` —
    // no CSS animation/transition class is present. Reduced-motion is moot
    // because there's no animation to guard. Asserting the structural invariant
    // is more reliable than measuring elapsed time (Playwright polling adds noise).
    await page.emulateMedia({ reducedMotion: "reduce" });
    await seedScene(page);

    await page.keyboard.press("?");
    const heading = page.getByRole("heading", { name: /keyboard shortcuts/i }).first();
    await expect(heading).toBeVisible({ timeout: 2000 });

    // Walk up from the heading to the modal root and confirm no animate-* /
    // transition-* utility class is present. If a future contributor adds an
    // entrance animation without a useReducedMotion guard, this test fails.
    const animationClasses = await heading.evaluate((el) => {
      let node: Element | null = el;
      const found: string[] = [];
      while (node && node !== document.body) {
        for (const cls of Array.from(node.classList)) {
          if (
            cls.startsWith("animate-") ||
            cls.startsWith("transition-") ||
            cls === "transition" ||
            cls.startsWith("duration-") ||
            cls.startsWith("ease-")
          ) {
            found.push(cls);
          }
        }
        node = node.parentElement;
      }
      return found;
    });
    expect(animationClasses, "HelpModal must not have entrance animation classes per D-03").toEqual([]);
  });
});
