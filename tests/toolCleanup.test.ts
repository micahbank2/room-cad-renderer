import { describe, test, expect } from "vitest";
import * as fabric from "fabric";

// Tool activators (imports resolve today; signatures change to `() => void` return in Wave 2)
import { activateDoorTool } from "@/canvas/tools/doorTool";
import { activateWindowTool } from "@/canvas/tools/windowTool";
import { activateProductTool } from "@/canvas/tools/productTool";
import { activateCeilingTool } from "@/canvas/tools/ceilingTool";
import { activateWallTool } from "@/canvas/tools/wallTool";
import { activateSelectTool } from "@/canvas/tools/selectTool";

type Activator = (
  fc: fabric.Canvas,
  scale: number,
  origin: { x: number; y: number },
) => (() => void) | void; // void today, () => void after Wave 2

function countListeners(fc: fabric.Canvas): number {
  const map =
    (fc as unknown as { __eventListeners?: Record<string, unknown[]> })
      .__eventListeners ?? {};
  return Object.values(map).reduce((n, arr) => n + (arr?.length ?? 0), 0);
}

function makeCanvas(): fabric.Canvas {
  const el = document.createElement("canvas");
  el.width = 800;
  el.height = 600;
  return new fabric.Canvas(el);
}

function expectLeakFree(activate: Activator, cycles = 10) {
  const fc = makeCanvas();
  const baseline = countListeners(fc);

  const cleanup = activate(fc, 10, { x: 0, y: 0 });
  if (typeof cleanup !== "function") {
    throw new Error(
      "activate did not return a cleanup fn — Wave 2 refactor incomplete",
    );
  }
  expect(countListeners(fc)).toBeGreaterThan(baseline);
  cleanup();
  expect(countListeners(fc)).toBe(baseline);

  // Stability over repeated activations
  for (let i = 0; i < cycles; i++) {
    const c = activate(fc, 10, { x: 0, y: 0 });
    if (typeof c !== "function")
      throw new Error("activate must return cleanup fn");
    c();
  }
  expect(countListeners(fc)).toBe(baseline);

  fc.dispose();
}

// Skipped in Wave 0 because tools don't yet return cleanup fn.
// Wave 2 flips `describe.skip` → `describe` once all 6 tools return `() => void`.
describe.skip("tool cleanup — no listener leaks (Wave 2 enables)", () => {
  test("doorTool activate/cleanup cycle stays leak-free", () => {
    expectLeakFree(activateDoorTool as Activator);
  });
  test("windowTool activate/cleanup cycle stays leak-free", () => {
    expectLeakFree(activateWindowTool as Activator);
  });
  test("productTool activate/cleanup cycle stays leak-free", () => {
    expectLeakFree(activateProductTool as Activator);
  });
  test("ceilingTool activate/cleanup cycle stays leak-free", () => {
    expectLeakFree(activateCeilingTool as Activator);
  });
  test("wallTool activate/cleanup cycle stays leak-free", () => {
    expectLeakFree(activateWallTool as Activator);
  });
  test("selectTool activate/cleanup cycle stays leak-free", () => {
    expectLeakFree(activateSelectTool as Activator);
  });
});
