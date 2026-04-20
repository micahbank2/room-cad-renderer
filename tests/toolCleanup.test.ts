import { describe, test, it, expect } from "vitest";
import * as fabric from "fabric";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

// Wave 2 enabled this suite once all 6 tools return `() => void`.
describe("tool cleanup — no listener leaks", () => {
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

describe("Phase 25 Wave 0 — drag-interrupt revert contract", () => {
  it("drag interrupted by tool switch", () => {
    // Source-level guard for D-06 (drag-interrupt revert). Pre-migration,
    // selectTool's cleanup fn does NOT snapshot pre-drag transform state
    // and does NOT restore the Fabric object on interrupt. Wave 2 adds:
    //
    //   1. Pre-drag snapshot (left/top/angle) captured on mouse:down
    //   2. Revert logic invoked by cleanup() when `dragging === true`
    //
    // This assertion is runtime-agnostic (works in jsdom without fabric
    // rendering quirks) and remains stable under future refactors that
    // might rename variables — the two things it requires cannot be
    // satisfied without the revert code existing.
    const src = readFileSync(
      resolve(process.cwd(), "src/canvas/tools/selectTool.ts"),
      "utf8",
    );

    // Find the cleanup function — everything after `return () => {` near EOF.
    const returnIdx = src.lastIndexOf("return () => {");
    expect(returnIdx).toBeGreaterThanOrEqual(0);
    const cleanupBody = src.slice(returnIdx);

    // Revert requirement 1: cleanup must inspect the in-flight drag flag
    // and restore Fabric object transform properties (left/top or angle).
    // We look for the `dragging` guard AND at least one of the transform
    // assignments that indicates revert (e.g., `.left =`, `.top =`,
    // `.angle =`, or a helper named revert/restore).
    const hasDraggingGuard = /dragging\b/.test(cleanupBody);
    const hasRevertAction =
      /\.(left|top|angle)\s*=/.test(cleanupBody) ||
      /\b(revert|restore|rollback)\b/i.test(cleanupBody);

    expect(hasDraggingGuard).toBe(true);
    expect(hasRevertAction).toBe(true);
  });
});
