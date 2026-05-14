/**
 * Phase 79 Wave 0 — RED E2E spec for window-preset switcher + PropertiesPanel row.
 *
 * MUST fail on this commit — the WindowPresetSwitcher component, its
 * data-testid hooks, the __driveWindowPreset driver, and the PropertiesPanel
 * preset row are not yet implemented. Wave 2 + Wave 3 turn these GREEN.
 *
 * Covers (WIN-01 + WIN-02):
 *   - Switcher visibility / 6 chips on Window tool activation (D-02 / D-03)
 *   - Chip selection drives placement dimensions (D-04, WIN-01)
 *   - Custom chip exposes W/H/Sill inputs (D-05)
 *   - PropertiesPanel surfaces derived preset label (D-07, WIN-02)
 *   - PropertiesPanel preset switch is single-undo (D-09, WIN-02)
 *   - Manual W edit re-derives label (D-08, WIN-02)
 *   - Switcher unmounts on tool change (D-02)
 *
 * Total: 7 test() blocks.
 *
 * Mirror: tests/e2e/specs/preset-toolbar-and-hotkeys.spec.ts (setup,
 * settle, driver-via-page.evaluate pattern).
 */
import { test, expect } from "@playwright/test";
import { settle } from "../playwright-helpers/settle";
import { setupPage } from "../playwright-helpers/setupPage";
import { seedRoom } from "../playwright-helpers/seedRoom";

const ALL_CHIP_IDS = [
  "small",
  "standard",
  "wide",
  "picture",
  "bathroom",
  "custom",
] as const;

async function activateWindowTool(page: import("@playwright/test").Page) {
  // The window tool button has data-testid="tool-window" per Toolbar
  // convention; fall back to hotkey "n" if the testid is unavailable.
  const btn = page.locator('[data-testid="tool-window"]');
  if (await btn.count()) {
    await btn.first().click();
  } else {
    await page.keyboard.press("n");
  }
  await settle(page);
}

async function waitForWindowPresetDriver(page: import("@playwright/test").Page) {
  await page.waitForFunction(
    () =>
      typeof (window as unknown as { __driveWindowPreset?: unknown })
        .__driveWindowPreset === "function",
    { timeout: 5_000 }
  );
}

test.describe("Phase 79 — Window Presets (WIN-PRESETS-01)", () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
    await seedRoom(page);
    await settle(page);
  });

  test("switcher appears with 6 chips on Window tool activation", async ({ page }) => {
    await activateWindowTool(page);
    const switcher = page.locator('[data-testid="window-preset-switcher"]');
    await expect(switcher).toBeVisible({ timeout: 5_000 });
    for (const id of ALL_CHIP_IDS) {
      const chip = page.locator(`[data-testid="window-preset-chip-${id}"]`);
      await expect(chip).toBeVisible();
    }
  });

  test("picking 'Wide' chip then clicking wall places a 4ft window", async ({ page }) => {
    await activateWindowTool(page);
    await waitForWindowPresetDriver(page);
    // Drive the chip selection via the test driver (DOM clicks on chips can
    // race with Fabric canvas mouse events; the driver is stable).
    await page.evaluate(() => {
      (window as unknown as {
        __driveWindowPreset: (id: string) => void;
      }).__driveWindowPreset("wide");
    });
    // Place by clicking the canvas — mid-wall hit (wall_1 runs x:2→18 at y=2).
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not visible");
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await settle(page);
    const op = await page.evaluate(() => {
      const s = (window as unknown as {
        __cadStore: { getState: () => any };
      }).__cadStore.getState();
      return s.rooms[s.activeRoomId].walls.wall_1.openings[0];
    });
    expect(op).toBeDefined();
    expect(op.type).toBe("window");
    expect(op.width).toBe(4);
    expect(op.height).toBe(5);
    expect(op.sillHeight).toBe(3);
  });

  test("clicking 'Custom' chip reveals W/H/Sill numeric inputs", async ({ page }) => {
    await activateWindowTool(page);
    const customChip = page.locator('[data-testid="window-preset-chip-custom"]');
    await customChip.click();
    await settle(page);
    await expect(
      page.locator('[data-testid="window-preset-custom-width"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="window-preset-custom-height"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="window-preset-custom-sill"]')
    ).toBeVisible();
  });

  test("after placing a Wide window, PropertiesPanel shows 'Preset: Wide'", async ({
    page,
  }) => {
    await activateWindowTool(page);
    await waitForWindowPresetDriver(page);
    await page.evaluate(() => {
      (window as unknown as {
        __driveWindowPreset: (id: string) => void;
      }).__driveWindowPreset("wide");
    });
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not visible");
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await settle(page);
    // Select the wall to surface OpeningsSection in the panel.
    await page.evaluate(() => {
      (window as unknown as {
        __uiStore: { setState: (s: unknown) => void };
      }).__uiStore.setState({
        activeTool: "select",
        selectedIds: ["wall_1"],
      });
    });
    await settle(page);
    // Expand the opening row, then assert label text.
    const openingId = await page.evaluate(() => {
      const s = (window as unknown as {
        __cadStore: { getState: () => any };
      }).__cadStore.getState();
      return s.rooms[s.activeRoomId].walls.wall_1.openings[0].id;
    });
    // Phase 82 Plan 82-03 nav: Wall tabs → Openings tab → opening row →
    // OpeningInspector Preset tab (default for window).
    await page.getByRole("tab", { name: "Openings" }).click();
    await page.locator(`[data-testid="opening-row-${openingId}"]`).click();
    await settle(page);
    await expect(page.getByText(/preset:\s*wide/i)).toBeVisible();
  });

  test("clicking 'Picture' preset chip in PropertiesPanel resizes opening to 6/4/1 in ONE undo entry", async ({
    page,
  }) => {
    await activateWindowTool(page);
    await waitForWindowPresetDriver(page);
    await page.evaluate(() => {
      (window as unknown as {
        __driveWindowPreset: (id: string) => void;
      }).__driveWindowPreset("standard");
    });
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not visible");
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await settle(page);
    await page.evaluate(() => {
      (window as unknown as {
        __uiStore: { setState: (s: unknown) => void };
      }).__uiStore.setState({
        activeTool: "select",
        selectedIds: ["wall_1"],
      });
    });
    await settle(page);
    const openingId = await page.evaluate(() => {
      const s = (window as unknown as {
        __cadStore: { getState: () => any };
      }).__cadStore.getState();
      return s.rooms[s.activeRoomId].walls.wall_1.openings[0].id;
    });
    // Phase 82 Plan 82-03 nav: Wall tabs → Openings tab → opening row.
    await page.getByRole("tab", { name: "Openings" }).click();
    await page.locator(`[data-testid="opening-row-${openingId}"]`).click();
    await settle(page);
    const beforePast = await page.evaluate(
      () =>
        (window as unknown as {
          __cadStore: { getState: () => { past: unknown[] } };
        }).__cadStore.getState().past.length
    );
    await page
      .locator(`[data-testid="opening-preset-chip-${openingId}-picture"]`)
      .click();
    await settle(page);
    const afterPast = await page.evaluate(
      () =>
        (window as unknown as {
          __cadStore: { getState: () => { past: unknown[] } };
        }).__cadStore.getState().past.length
    );
    const op = await page.evaluate(() => {
      const s = (window as unknown as {
        __cadStore: { getState: () => any };
      }).__cadStore.getState();
      return s.rooms[s.activeRoomId].walls.wall_1.openings[0];
    });
    expect(op.width).toBe(6);
    expect(op.height).toBe(4);
    expect(op.sillHeight).toBe(1);
    expect(afterPast - beforePast).toBe(1);
  });

  test("manually editing width 3 → 5 in PropertiesPanel re-derives label to 'Custom'", async ({
    page,
  }) => {
    // Seed a window directly via the store so we don't depend on placement flow.
    await page.evaluate(() => {
      (window as unknown as {
        __cadStore: {
          getState: () => {
            addOpening: (wallId: string, op: unknown) => void;
          };
        };
      }).__cadStore.getState().addOpening("wall_1", {
        type: "window",
        offset: 5,
        width: 3,
        height: 4,
        sillHeight: 3,
      });
      (window as unknown as {
        __uiStore: { setState: (s: unknown) => void };
      }).__uiStore.setState({
        activeTool: "select",
        selectedIds: ["wall_1"],
      });
    });
    await settle(page);
    const openingId = await page.evaluate(() => {
      const s = (window as unknown as {
        __cadStore: { getState: () => any };
      }).__cadStore.getState();
      return s.rooms[s.activeRoomId].walls.wall_1.openings[0].id;
    });
    // Phase 82 Plan 82-03 nav: Wall tabs → Openings tab → opening row.
    await page.getByRole("tab", { name: "Openings" }).click();
    await page.locator(`[data-testid="opening-row-${openingId}"]`).click();
    await settle(page);
    await expect(page.getByText(/preset:\s*standard/i)).toBeVisible();
    // Mutate via store (mirrors what NumericRow onCommit does — but bypasses
    // input focus juggling which is incidental to this test).
    await page.evaluate(
      ({ wallId, opId }) => {
        (window as unknown as {
          __cadStore: {
            getState: () => {
              updateOpening: (
                w: string,
                o: string,
                p: { width: number }
              ) => void;
            };
          };
        }).__cadStore.getState().updateOpening(wallId, opId, { width: 5 });
      },
      { wallId: "wall_1", opId: openingId }
    );
    await settle(page);
    await expect(page.getByText(/preset:\s*custom/i)).toBeVisible();
  });

  test("switcher disappears when user switches from Window tool to Select tool", async ({
    page,
  }) => {
    await activateWindowTool(page);
    const switcher = page.locator('[data-testid="window-preset-switcher"]');
    await expect(switcher).toBeVisible();
    // Switch to select tool.
    const selectBtn = page.locator('[data-testid="tool-select"]');
    if (await selectBtn.count()) {
      await selectBtn.first().click();
    } else {
      await page.keyboard.press("v");
    }
    await settle(page);
    await expect(switcher).toBeHidden();
  });
});
