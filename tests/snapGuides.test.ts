/**
 * Phase 30 Wave 0 — red stubs for the snap-guide Fabric renderer.
 *
 * Locks D-06 / D-06a / D-06b / D-06c / D-06d: accent purple #7c5bf0 @ 60%
 * opacity, 1px axis lines, midpoint dot at wall midpoint, objects tagged
 * `data: { type: "snap-guide" }` for idempotent cleanup (mirrors existing
 * `type: "dim"` / `type: "ceiling-edge-preview"` precedents).
 *
 * These tests fail on this commit with `Cannot find module '@/canvas/snapGuides'`
 * — Plan 02 creates the module and turns them green.
 */
import { describe, it, expect, beforeEach } from "vitest";
import * as fabric from "fabric";
import { renderSnapGuides, clearSnapGuides } from "@/canvas/snapGuides";
import type { SnapGuide } from "@/canvas/snapEngine";

const GUIDE_COLOR = "#7c5bf0";
const GUIDE_OPACITY = 0.6;

function makeCanvas(): fabric.Canvas {
  // StaticCanvas with a real DOM element. jsdom provides a canvas element;
  // the 2D context is stubbed via tests/setup.ts.
  const el = document.createElement("canvas");
  el.width = 800;
  el.height = 600;
  const c = new fabric.StaticCanvas(el, { width: 800, height: 600 });
  return c as unknown as fabric.Canvas;
}

function snapGuideObjects(c: fabric.Canvas): fabric.Object[] {
  return c
    .getObjects()
    .filter((o) => (o as unknown as { data?: { type?: string } }).data?.type === "snap-guide");
}

describe("renderSnapGuides", () => {
  let fc: fabric.Canvas;
  beforeEach(() => {
    fc = makeCanvas();
  });

  it("axis-x guide at value=5, scale=50, origin=(100,100) → vertical line at x=350", () => {
    const guides: SnapGuide[] = [{ kind: "axis", axis: "x", value: 5 }];
    renderSnapGuides(fc, guides, 50, { x: 100, y: 100 });
    const objs = snapGuideObjects(fc);
    expect(objs).toHaveLength(1);
    const line = objs[0] as fabric.Line;
    // Vertical line: x1 === x2 === 350, spans full canvas height.
    expect(line.get("x1")).toBeCloseTo(350, 1);
    expect(line.get("x2")).toBeCloseTo(350, 1);
    expect(line.get("y1")).toBeCloseTo(0, 1);
    expect(line.get("y2")).toBeCloseTo(600, 1);
  });

  it("axis-y guide at value=3 → horizontal line at y = origin.y + 3*scale", () => {
    const guides: SnapGuide[] = [{ kind: "axis", axis: "y", value: 3 }];
    renderSnapGuides(fc, guides, 50, { x: 100, y: 100 });
    const objs = snapGuideObjects(fc);
    expect(objs).toHaveLength(1);
    const line = objs[0] as fabric.Line;
    const expectedY = 100 + 3 * 50; // 250
    expect(line.get("y1")).toBeCloseTo(expectedY, 1);
    expect(line.get("y2")).toBeCloseTo(expectedY, 1);
    expect(line.get("x1")).toBeCloseTo(0, 1);
    expect(line.get("x2")).toBeCloseTo(800, 1);
  });

  it("axis guide uses accent color, 60% opacity, 1px stroke, non-interactive (D-06a)", () => {
    const guides: SnapGuide[] = [{ kind: "axis", axis: "x", value: 5 }];
    renderSnapGuides(fc, guides, 50, { x: 100, y: 100 });
    const line = snapGuideObjects(fc)[0] as fabric.Line;
    expect(line.get("stroke")).toBe(GUIDE_COLOR);
    expect(line.get("opacity")).toBeCloseTo(GUIDE_OPACITY, 5);
    expect(line.get("strokeWidth")).toBe(1);
    expect(line.get("selectable")).toBe(false);
    expect(line.get("evented")).toBe(false);
  });

  it("midpoint-dot guide at feet (5,5) → fabric.Circle radius 4 at px (origin+5*scale)", () => {
    const guides: SnapGuide[] = [{ kind: "midpoint-dot", at: { x: 5, y: 5 } }];
    renderSnapGuides(fc, guides, 50, { x: 100, y: 100 });
    const objs = snapGuideObjects(fc);
    expect(objs).toHaveLength(1);
    const dot = objs[0] as fabric.Circle;
    // It's a Circle — duck-typed via radius existence.
    expect(dot.get("radius")).toBe(4);
    expect(dot.get("fill")).toBe(GUIDE_COLOR);
    expect(dot.get("opacity")).toBeCloseTo(GUIDE_OPACITY, 5);
  });

  it("crosshair: X guide + Y guide → 2 objects (D-06c)", () => {
    const guides: SnapGuide[] = [
      { kind: "axis", axis: "x", value: 2 },
      { kind: "axis", axis: "y", value: 2 },
    ];
    renderSnapGuides(fc, guides, 50, { x: 100, y: 100 });
    expect(snapGuideObjects(fc)).toHaveLength(2);
  });

  it("empty guides[] → removes any prior snap-guide objects, adds none (idempotent)", () => {
    // Render once with guides.
    renderSnapGuides(fc, [{ kind: "axis", axis: "x", value: 5 }], 50, { x: 100, y: 100 });
    expect(snapGuideObjects(fc)).toHaveLength(1);
    // Render with empty — must clear prior.
    renderSnapGuides(fc, [], 50, { x: 100, y: 100 });
    expect(snapGuideObjects(fc)).toHaveLength(0);
  });

  it("called twice with different guides → previous guides removed (idempotent)", () => {
    renderSnapGuides(fc, [{ kind: "axis", axis: "x", value: 5 }], 50, { x: 100, y: 100 });
    renderSnapGuides(fc, [{ kind: "axis", axis: "y", value: 3 }], 50, { x: 100, y: 100 });
    const objs = snapGuideObjects(fc);
    expect(objs).toHaveLength(1);
    const line = objs[0] as fabric.Line;
    // The Y guide — horizontal line; y1 === y2.
    expect(line.get("y1")).toBeCloseTo(line.get("y2"), 5);
  });
});

describe("clearSnapGuides", () => {
  let fc: fabric.Canvas;
  beforeEach(() => {
    fc = makeCanvas();
  });

  it("removes all objects where data.type === 'snap-guide'", () => {
    renderSnapGuides(
      fc,
      [
        { kind: "axis", axis: "x", value: 5 },
        { kind: "axis", axis: "y", value: 3 },
        { kind: "midpoint-dot", at: { x: 5, y: 5 } },
      ],
      50,
      { x: 100, y: 100 },
    );
    expect(snapGuideObjects(fc).length).toBeGreaterThan(0);
    clearSnapGuides(fc);
    expect(snapGuideObjects(fc)).toHaveLength(0);
  });

  it("does NOT remove objects with other data.type values (e.g. type: 'dim')", () => {
    const dimRect = new fabric.Rect({ left: 10, top: 10, width: 5, height: 5 });
    (dimRect as unknown as { data: { type: string } }).data = { type: "dim" };
    fc.add(dimRect);
    renderSnapGuides(fc, [{ kind: "axis", axis: "x", value: 5 }], 50, { x: 100, y: 100 });
    expect(snapGuideObjects(fc)).toHaveLength(1);
    clearSnapGuides(fc);
    // The dim rect must remain.
    const remaining = fc.getObjects().filter(
      (o) => (o as unknown as { data?: { type?: string } }).data?.type === "dim",
    );
    expect(remaining).toHaveLength(1);
  });

  it("is safe on an empty canvas (no throw)", () => {
    expect(() => clearSnapGuides(fc)).not.toThrow();
    expect(snapGuideObjects(fc)).toHaveLength(0);
  });
});
