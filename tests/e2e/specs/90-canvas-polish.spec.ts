// Phase 90 Plan 01 — E2E for theme backdrop flip (#201) + toolbar viewport reservation (#202).
//
// MUST FAIL on this commit:
//   - #201: Theme toggle does not flip the 2D canvas backdrop (the canvas keeps
//           painting the OLD theme's --background because getCanvasTheme() reads
//           stale CSS tokens before <html class="dark"> has flushed).
//   - #202: The 2D canvas wrapper has no bottom padding, so the FloatingToolbar
//           (fixed bottom-6, ~80px tall) overlaps the floor plan at every
//           viewport size.

import { test, expect } from "@playwright/test";
import { setupPage } from "../playwright-helpers/setupPage";
import { seedRoom } from "../playwright-helpers/seedRoom";

// Parse rgb(r, g, b) OR oklch(L c h) and return a 0-1 perceptual lightness.
// Chromium-dev returns oklch strings directly from getComputedStyle; older
// browsers (and the Phase 88 test assumption) get rgb. Handle both.
//
// For rgb: lightness ≈ (r + g + b) / (3 * 255).
// For oklch: lightness is the first component (already 0-1).
function parseLightness(color: string): number | null {
  const oklch = color.match(/^oklch\(\s*([\d.]+)/);
  if (oklch) return parseFloat(oklch[1]);
  const rgb = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgb) {
    return (parseInt(rgb[1], 10) + parseInt(rgb[2], 10) + parseInt(rgb[3], 10)) / (3 * 255);
  }
  return null;
}

test.describe.parallel("Phase 90 canvas polish", () => {
  test("#201 — theme toggle flips canvas backdrop without reload", async ({ page }) => {
    await setupPage(page);
    await seedRoom(page);

    // Force Light mode first so we start from a known state.
    await page.locator('[data-testid="topbar-settings-button"]').click();
    await page
      .locator('[data-testid="settings-popover"]')
      .getByRole("radio", { name: "Light" })
      .click();
    await page.keyboard.press("Escape");
    // Allow the redraw to settle (post-fix this is the rAF tick).
    await page.waitForTimeout(150);

    const lightBg = await page.evaluate(
      () =>
        (window as unknown as { __driveGetCanvasBg?: () => string }).__driveGetCanvasBg?.() ?? "",
    );
    const lightL = parseLightness(lightBg);
    expect(lightL).not.toBeNull();
    // Light backgrounds are near-white (≥ 0.9).
    expect(lightL ?? 0).toBeGreaterThanOrEqual(0.9);

    // Flip to Dark — the BUG: canvas bg does NOT update after this flip
    // (until something else forces a redraw).
    await page.locator('[data-testid="topbar-settings-button"]').click();
    await page
      .locator('[data-testid="settings-popover"]')
      .getByRole("radio", { name: "Dark" })
      .click();
    await page.keyboard.press("Escape");

    // Critically — do NOT trigger a redraw via pan/click/etc.
    // The fix must flip the canvas bg on its own (rAF deferral). Poll up to 500ms.
    await expect
      .poll(
        async () => {
          const bg = await page.evaluate(
            () =>
              (window as unknown as { __driveGetCanvasBg?: () => string }).__driveGetCanvasBg?.() ??
              "",
          );
          return parseLightness(bg);
        },
        { timeout: 1000, intervals: [16, 32, 50, 100, 200] },
      )
      // Dark backgrounds are dark (≤ 0.3).
      .toBeLessThanOrEqual(0.3);

    const darkBg = await page.evaluate(
      () =>
        (window as unknown as { __driveGetCanvasBg?: () => string }).__driveGetCanvasBg?.() ?? "",
    );
    expect(darkBg).not.toBe(lightBg);

    // Flip back to Light. Must also flip without reload.
    await page.locator('[data-testid="topbar-settings-button"]').click();
    await page
      .locator('[data-testid="settings-popover"]')
      .getByRole("radio", { name: "Light" })
      .click();
    await page.keyboard.press("Escape");

    await expect
      .poll(
        async () => {
          const bg = await page.evaluate(
            () =>
              (window as unknown as { __driveGetCanvasBg?: () => string }).__driveGetCanvasBg?.() ??
              "",
          );
          return parseLightness(bg);
        },
        { timeout: 1000, intervals: [16, 32, 50, 100, 200] },
      )
      .toBeGreaterThanOrEqual(0.9);
  });

  for (const viewportHeight of [800, 1200, 1600]) {
    test(`#202 — canvas viewport reserves space below toolbar (h=${viewportHeight}px)`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: viewportHeight });
      await setupPage(page);
      await seedRoom(page);

      // FloatingToolbar should be mounted; read its top edge.
      const toolbar = page.locator('[data-testid="floating-toolbar"]');
      await expect(toolbar).toBeVisible();
      const toolbarBox = await toolbar.boundingBox();
      expect(toolbarBox).not.toBeNull();
      if (!toolbarBox) return;

      // The fabric <canvas> element renders at the wrapper's full size. Read
      // its bottom edge in viewport coordinates.
      const canvasBox = await page.locator("canvas").first().boundingBox();
      expect(canvasBox).not.toBeNull();
      if (!canvasBox) return;

      // Canvas bottom must sit ABOVE toolbar top with at least a 4px buffer.
      // (Toolbar covers canvas if canvasBottom > toolbarTop.)
      const canvasBottom = canvasBox.y + canvasBox.height;
      const toolbarTop = toolbarBox.y;
      expect(canvasBottom).toBeLessThanOrEqual(toolbarTop - 4);
    });
  }

  // ─── Plan 90-02 (Wave 2) — #203 left-click pan + D-06 fit-resets-pan ───

  // Helper: read panOffset via __uiStore test bridge.
  async function getPanOffset(page: import("@playwright/test").Page) {
    return await page.evaluate(
      () =>
        (window as unknown as {
          __uiStore?: { getState: () => { panOffset: { x: number; y: number } } };
        }).__uiStore?.getState().panOffset ?? null,
    );
  }

  async function getUserZoom(page: import("@playwright/test").Page) {
    return await page.evaluate(
      () =>
        (window as unknown as {
          __uiStore?: { getState: () => { userZoom: number } };
        }).__uiStore?.getState().userZoom ?? null,
    );
  }

  async function setActiveTool(
    page: import("@playwright/test").Page,
    tool: string,
  ) {
    await page.evaluate((t) => {
      (window as unknown as {
        __uiStore?: { getState: () => { setTool: (s: string) => void } };
      }).__uiStore?.getState().setTool(t);
    }, tool);
  }

  test("#203 — left-click drag on empty canvas pans the view (Select tool)", async ({
    page,
  }) => {
    await setupPage(page);
    await seedRoom(page);

    // Ensure Select tool is active.
    await setActiveTool(page, "select");

    // Record initial pan offset.
    const initial = await getPanOffset(page);
    expect(initial).not.toBeNull();
    if (!initial) return;

    // Find the canvas wrapper bounding box; pick a point well inside the
    // empty area (the seed room has one wall_1 from (2,2) to (18,2) — we
    // synthesize the mouse far from that line by clicking near the
    // center-bottom of the wrapper).
    const wrapper = page.locator("canvas").first();
    const box = await wrapper.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    // Click in the empty middle of the canvas. Use absolute viewport coords.
    const startX = Math.round(box.x + box.width / 2);
    const startY = Math.round(box.y + box.height * 0.75);
    const endX = startX + 100;
    const endY = startY + 50;

    await page.mouse.move(startX, startY);
    await page.mouse.down({ button: "left" });
    // Multi-step move to ensure mousemove handlers fire.
    await page.mouse.move(startX + 50, startY + 25, { steps: 4 });
    await page.mouse.move(endX, endY, { steps: 4 });

    // While the drag is live, the wrapper cursor should be 'grabbing'.
    const cursorDuring = await page.evaluate(() => {
      // Climb canvas → .canvas-container → wrapperRef div (the element
      // FabricCanvas + selectTool write cursor to).
      const c = document.querySelector("canvas");
      const w = c?.parentElement?.parentElement ?? c?.parentElement;
      return w?.style.cursor ?? "";
    });
    expect(cursorDuring).toBe("grabbing");

    await page.mouse.up({ button: "left" });

    // Poll: pan offset should have shifted by the cursor delta.
    await expect
      .poll(async () => await getPanOffset(page), {
        timeout: 1000,
        intervals: [16, 32, 50, 100],
      })
      .toEqual({ x: initial.x + 100, y: initial.y + 50 });

    // Cursor should no longer be 'grabbing' after mouseup.
    const cursorAfter = await page.evaluate(() => {
      const c = document.querySelector("canvas");
      const w = c?.parentElement?.parentElement ?? c?.parentElement;
      return w?.style.cursor ?? "";
    });
    expect(cursorAfter).not.toBe("grabbing");
  });

  test("#203 — left-click on a wall does NOT pan (hit-clash guard)", async ({
    page,
  }) => {
    await setupPage(page);
    await seedRoom(page);
    await setActiveTool(page, "select");

    const initial = await getPanOffset(page);
    expect(initial).not.toBeNull();
    if (!initial) return;

    // Compute viewport coordinates of wall_1 (start=(2,2), end=(18,2) in feet).
    // Read the fc transform from FabricCanvas wrapper bbox + room dims.
    const wallMid = await page.evaluate(() => {
      const canvasEl = document.querySelector("canvas") as HTMLCanvasElement | null;
      if (!canvasEl) return null;
      const rect = canvasEl.getBoundingClientRect();
      const cad = (window as unknown as {
        __cadStore?: {
          getState: () => {
            activeRoomId: string;
            rooms: Record<string, { room: { width: number; length: number } }>;
          };
        };
      }).__cadStore;
      if (!cad) return null;
      const st = cad.getState();
      const room = st.rooms[st.activeRoomId]?.room;
      if (!room) return null;
      // Mirrors FabricCanvas.getBaseFitScale: padding = 50 on each side
      // (so effective inset = 100 total).
      const pad = 50;
      const scale = Math.min(
        (rect.width - pad * 2) / room.width,
        (rect.height - pad * 2) / room.length,
      );
      const originX = (rect.width - room.width * scale) / 2;
      const originY = (rect.height - room.length * scale) / 2;
      // Wall midpoint in feet: ((2+18)/2, 2) = (10, 2).
      // Pan offset applies on top of base fit origin, so include it.
      const ui = (window as unknown as {
        __uiStore?: {
          getState: () => {
            panOffset: { x: number; y: number };
            userZoom: number;
          };
        };
      }).__uiStore?.getState();
      const userZoom = ui?.userZoom ?? 1;
      const panX = ui?.panOffset.x ?? 0;
      const panY = ui?.panOffset.y ?? 0;
      const effScale = scale * userZoom;
      const xPx = rect.left + originX + panX + 10 * effScale;
      const yPx = rect.top + originY + panY + 2 * effScale;
      return { x: xPx, y: yPx };
    });
    expect(wallMid).not.toBeNull();
    if (!wallMid) return;

    await page.mouse.move(wallMid.x, wallMid.y);
    await page.mouse.down({ button: "left" });
    await page.mouse.move(wallMid.x + 30, wallMid.y, { steps: 4 });
    await page.mouse.up({ button: "left" });

    // panOffset must NOT change — the click landed on the wall, so it's
    // a wall-drag, not a pan.
    const after = await getPanOffset(page);
    expect(after).toEqual(initial);
  });

  test("#203 / D-06 — Fit-to-screen resets pan to {0,0}", async ({ page }) => {
    await setupPage(page);
    await seedRoom(page);
    await setActiveTool(page, "select");

    // First, induce a non-zero pan by dragging on empty canvas (depends on
    // the #203 fix landing in the same plan).
    const wrapper = page.locator("canvas").first();
    const box = await wrapper.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    const startX = Math.round(box.x + box.width / 2);
    const startY = Math.round(box.y + box.height * 0.75);
    await page.mouse.move(startX, startY);
    await page.mouse.down({ button: "left" });
    await page.mouse.move(startX + 75, startY + 30, { steps: 4 });
    await page.mouse.up({ button: "left" });

    // Wait until pan has shifted off origin.
    await expect
      .poll(async () => {
        const p = await getPanOffset(page);
        return p ? p.x : 0;
      })
      .not.toBe(0);

    // Click Fit-to-screen.
    await page.locator('[data-testid="toolbar-fit"]').click();

    // panOffset should reset to {0,0} and userZoom to 1.
    await expect
      .poll(async () => await getPanOffset(page), {
        timeout: 1000,
        intervals: [16, 32, 100],
      })
      .toEqual({ x: 0, y: 0 });

    const zoom = await getUserZoom(page);
    expect(zoom).toBe(1);
  });
});
