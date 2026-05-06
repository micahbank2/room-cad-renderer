import { describe, it, expect } from "vitest";
import { polygonBbox, resolveCeilingPoints } from "@/lib/geometry";
import type { Ceiling, Point } from "@/types/cad";

const TOL = 1e-9;

function makeCeiling(points: Point[], extra: Partial<Ceiling> = {}): Ceiling {
  return {
    id: "c1",
    points,
    height: 8,
    material: "#f5f5f5",
    ...extra,
  };
}

describe("polygonBbox", () => {
  it("returns zeros for empty input", () => {
    expect(polygonBbox([])).toEqual({
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      width: 0,
      depth: 0,
    });
  });

  it("computes bbox of a rectangle", () => {
    const bb = polygonBbox([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 5 },
      { x: 0, y: 5 },
    ]);
    expect(bb).toEqual({
      minX: 0,
      minY: 0,
      maxX: 10,
      maxY: 5,
      width: 10,
      depth: 5,
    });
  });
});

describe("resolveCeilingPoints", () => {
  it("U1: returns referential-identity points when no overrides set", () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 5 },
      { x: 0, y: 5 },
    ];
    const c = makeCeiling(points);
    const out = resolveCeilingPoints(c);
    expect(out).toBe(points); // strict identity
  });

  it("U2: rectangular ceiling with widthFtOverride scales x from default bbox.minX", () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 5 },
      { x: 0, y: 5 },
    ];
    const c = makeCeiling(points, { widthFtOverride: 15 });
    const out = resolveCeilingPoints(c);
    // sx = 15 / 10 = 1.5; ax = bbox.minX = 0
    // (0,0) → (0,0), (10,0) → (15,0), (10,5) → (15,5), (0,5) → (0,5)
    expect(out[0].x).toBeCloseTo(0, 9);
    expect(out[0].y).toBeCloseTo(0, 9);
    expect(out[1].x).toBeCloseTo(15, 9);
    expect(out[1].y).toBeCloseTo(0, 9);
    expect(out[2].x).toBeCloseTo(15, 9);
    expect(out[2].y).toBeCloseTo(5, 9);
    expect(out[3].x).toBeCloseTo(0, 9);
    expect(out[3].y).toBeCloseTo(5, 9);
  });

  it("U3: L-shape ceiling with widthFtOverride + anchorXFt=bbox.maxX preserves rightmost x", () => {
    // L-shape, original bbox 0..5 x 0..10
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 5, y: 5 },
      { x: 2.5, y: 5 },
      { x: 2.5, y: 10 },
      { x: 0, y: 10 },
    ];
    const c = makeCeiling(points, {
      widthFtOverride: 10, // grow from 5 to 10
      anchorXFt: 5, // bbox.maxX (right edge stays put)
    });
    const out = resolveCeilingPoints(c);
    // sx = 10/5 = 2, ax = 5
    // (0,0): 5 + (0-5)*2 = -5
    // (5,0): 5 + (5-5)*2 = 5  (preserved)
    // (5,5): 5  (preserved)
    // (2.5,5): 5 + (2.5-5)*2 = 0
    // (2.5,10): 0
    // (0,10): -5
    expect(out[0]).toEqual({ x: -5, y: 0 });
    expect(out[1]).toEqual({ x: 5, y: 0 });
    expect(out[2]).toEqual({ x: 5, y: 5 });
    expect(out[3].x).toBeCloseTo(0, 9);
    expect(out[3].y).toBeCloseTo(5, 9);
    expect(out[4].x).toBeCloseTo(0, 9);
    expect(out[4].y).toBeCloseTo(10, 9);
    expect(out[5]).toEqual({ x: -5, y: 10 });

    // Verify silhouette preserved: rightmost x of input matches rightmost x of output.
    const inMaxX = Math.max(...points.map((p) => p.x));
    const outMaxX = Math.max(...out.map((p) => p.x));
    expect(outMaxX).toBeCloseTo(inMaxX, 9);
  });

  it("U4: hexagonal ceiling with both width + depth overrides scales independently from default bbox.min anchors", () => {
    // Regular-ish hexagon-like 6-vertex polygon, bbox 0..6 x 0..4
    const points: Point[] = [
      { x: 1, y: 0 },
      { x: 5, y: 0 },
      { x: 6, y: 2 },
      { x: 5, y: 4 },
      { x: 1, y: 4 },
      { x: 0, y: 2 },
    ];
    const c = makeCeiling(points, {
      widthFtOverride: 12, // 6 → 12, sx = 2
      depthFtOverride: 8, // 4 → 8,  sy = 2
    });
    const out = resolveCeilingPoints(c);
    // ax = 0, ay = 0; every vertex doubles in both axes.
    expect(out[0]).toEqual({ x: 2, y: 0 });
    expect(out[1]).toEqual({ x: 10, y: 0 });
    expect(out[2]).toEqual({ x: 12, y: 4 });
    expect(out[3]).toEqual({ x: 10, y: 8 });
    expect(out[4]).toEqual({ x: 2, y: 8 });
    expect(out[5]).toEqual({ x: 0, y: 4 });
    // Bbox of output should be 0..12 x 0..8.
    const bb = polygonBbox(out);
    expect(bb.width).toBeCloseTo(12, 9);
    expect(bb.depth).toBeCloseTo(8, 9);
    expect(bb.minX).toBeCloseTo(0, 9);
    expect(bb.minY).toBeCloseTo(0, 9);
  });

  it("regression: zero-width polygon does not blow up (sx defaults to 1)", () => {
    const points: Point[] = [
      { x: 5, y: 0 },
      { x: 5, y: 0 },
      { x: 5, y: 5 },
    ];
    const c = makeCeiling(points, { widthFtOverride: 10 });
    const out = resolveCeilingPoints(c);
    // bbox.width = 0 → sx defaults to 1, points unchanged on x.
    expect(out[0].x).toBeCloseTo(5, 9);
    expect(out[2].y).toBeCloseTo(5, 9);
    void TOL;
  });
});
