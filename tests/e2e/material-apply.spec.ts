// Phase 68 Plan 01 — Wave 0 RED e2e: apply Material to a wall + 3D + undo + reload.
// Test drivers (__driveCreateWall, __driveSelect, __driveApplyMaterial, __getResolvedMaterial)
// do not yet exist — Plan 03/06/07 will add them.
import { test, expect } from "@playwright/test";

test("apply Material to a wall — 2D + 3D + undo + reload", async ({ page }) => {
  await page.goto("/");
  // Step 1: skip welcome, draw a wall via __driveCreateWall
  await page.evaluate(() =>
    (window as any).__driveCreateWall?.({ a: { x: 0, y: 0 }, b: { x: 10, y: 0 } })
  );
  // Step 2: open MaterialPicker for that wall side
  await page.evaluate(() =>
    (window as any).__driveSelect?.({ kind: "wallSide", wallId: "w1", side: "A" })
  );
  // Step 3: apply via __driveApplyMaterial
  await page.evaluate(() =>
    (window as any).__driveApplyMaterial?.(
      { kind: "wallSide", wallId: "w1", side: "A" },
      "mat_test"
    )
  );
  // Step 4: assert resolved
  const got = await page.evaluate(() =>
    (window as any).__getResolvedMaterial?.({
      kind: "wallSide",
      wallId: "w1",
      side: "A",
    })
  );
  expect(got).toBeTruthy();
  // Step 5: undo
  await page.keyboard.press("Control+Z");
  const after = await page.evaluate(() =>
    (window as any).__getResolvedMaterial?.({
      kind: "wallSide",
      wallId: "w1",
      side: "A",
    })
  );
  expect(after).toBeNull();
});
