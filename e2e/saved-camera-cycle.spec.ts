import { test, expect } from "@playwright/test";

const SAVED_POS: [number, number, number] = [10, 6, 12];
const SAVED_TARGET: [number, number, number] = [5, 3, 5];
const OTHER_POS: [number, number, number] = [-5, 4, -8];
const OTHER_TARGET: [number, number, number] = [0, 1, 0];

test.describe("Phase 48 — saved-camera Save → Focus → reload cycle (CAM-04)", () => {
  test.beforeEach(async ({ page }) => {
    // D-08: reduced-motion uses Phase 46's snap path → camera move is instant.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
  });

  test("save → focus round-trip via window drivers", async ({ page }) => {
    // BLOCKER-2 fix: use __getActiveProductIds rather than reading store shape directly.
    const productId = await page.evaluate(() => {
      return (window as unknown as { __getActiveProductIds?: () => string[] }).__getActiveProductIds?.()[0] ?? null;
    });
    expect(productId).not.toBeNull();

    // Switch to 3D so OrbitControls + camera ref are mounted.
    await page.getByRole("button", { name: /3d/i }).first().click({ trial: false }).catch(() => { /* tolerate alternate selectors */ });

    // Set a known camera pose.
    await page.evaluate(([pos, target]) => {
      (window as unknown as { __setTestCamera?: (p: { position: [number,number,number]; target: [number,number,number] }) => void }).__setTestCamera?.({ position: pos, target });
    }, [SAVED_POS, SAVED_TARGET] as const);

    // Save the bookmark via driver.
    await page.evaluate(([id, pos, target]) => {
      (window as unknown as { __driveSaveCamera?: (kind: string, id: string, pos: [number,number,number], target: [number,number,number]) => void }).__driveSaveCamera?.("product", id, pos, target);
    }, [productId!, SAVED_POS, SAVED_TARGET] as const);

    // Read back via driver.
    const stored = await page.evaluate((id) => {
      return (window as unknown as { __getSavedCamera?: (kind: string, id: string) => { pos: [number,number,number]; target: [number,number,number] } | null }).__getSavedCamera?.("product", id) ?? null;
    }, productId!);
    expect(stored).not.toBeNull();
    expect(stored!.pos[0]).toBeCloseTo(SAVED_POS[0], 4);
    expect(stored!.target[2]).toBeCloseTo(SAVED_TARGET[2], 4);

    // Move camera elsewhere.
    await page.evaluate(([pos, target]) => {
      (window as unknown as { __setTestCamera?: (p: { position: [number,number,number]; target: [number,number,number] }) => void }).__setTestCamera?.({ position: pos, target });
    }, [OTHER_POS, OTHER_TARGET] as const);

    // Trigger Focus via double-click driver.
    await page.evaluate((id) => {
      (window as unknown as { __driveFocusNode?: (id: string) => void }).__driveFocusNode?.(id);
    }, productId!);

    // BLOCKER-2 fix: __getCameraPose installed by ThreeViewport (Plan 02 Task 3).
    // Under reduced-motion, the camera snaps. Assert pose matches saved tuple.
    const post = await page.evaluate(() => {
      return (window as unknown as { __getCameraPose?: () => { position: [number,number,number]; target: [number,number,number] } | null }).__getCameraPose?.() ?? null;
    });
    expect(post).not.toBeNull();
    expect(post!.position[0]).toBeCloseTo(SAVED_POS[0], 1);
    expect(post!.position[1]).toBeCloseTo(SAVED_POS[1], 1);
    expect(post!.position[2]).toBeCloseTo(SAVED_POS[2], 1);
    expect(post!.target[0]).toBeCloseTo(SAVED_TARGET[0], 1);
  });

  test("save persists across reload (Phase 28 autosave + snapshot serialization)", async ({ page }) => {
    const productId = await page.evaluate(() => {
      return (window as unknown as { __getActiveProductIds?: () => string[] }).__getActiveProductIds?.()[0] ?? null;
    });
    expect(productId).not.toBeNull();

    // Save bookmark.
    await page.evaluate(([id, pos, target]) => {
      (window as unknown as { __driveSaveCamera?: (kind: string, id: string, pos: [number,number,number], target: [number,number,number]) => void }).__driveSaveCamera?.("product", id, pos, target);
    }, [productId!, SAVED_POS, SAVED_TARGET] as const);

    // Wait out the Phase 28 autosave 2000ms debounce.
    await page.waitForTimeout(2100);

    // Reload.
    await page.reload();
    await page.emulateMedia({ reducedMotion: "reduce" });

    // After reload, the snapshot should retain the bookmark.
    const restored = await page.evaluate((id) => {
      return (window as unknown as { __getSavedCamera?: (kind: string, id: string) => { pos: [number,number,number]; target: [number,number,number] } | null }).__getSavedCamera?.("product", id) ?? null;
    }, productId!);
    expect(restored).not.toBeNull();
    expect(restored!.pos[0]).toBeCloseTo(SAVED_POS[0], 4);
  });
});
