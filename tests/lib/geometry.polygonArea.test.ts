import { describe, it, expect } from "vitest";
import { polygonArea, polygonCentroid } from "@/lib/geometry";
import type { WallSegment } from "@/types/cad";

function w(start: { x: number; y: number }, end: { x: number; y: number }, id = `w_${start.x}_${start.y}`): WallSegment {
  return { id, start, end, thickness: 0.5, height: 8, openings: [] };
}

describe("polygonArea", () => {
  it("computes 100 for a 10×10 axis-aligned square (CCW)", () => {
    const walls: WallSegment[] = [
      w({ x: 0, y: 0 }, { x: 10, y: 0 }, "a"),
      w({ x: 10, y: 0 }, { x: 10, y: 10 }, "b"),
      w({ x: 10, y: 10 }, { x: 0, y: 10 }, "c"),
      w({ x: 0, y: 10 }, { x: 0, y: 0 }, "d"),
    ];
    expect(polygonArea(walls)).toBeCloseTo(100, 6);
  });

  it("returns identical area for both winding orders (Math.abs winding-agnostic)", () => {
    const ccw: WallSegment[] = [
      w({ x: 0, y: 0 }, { x: 10, y: 0 }, "a"),
      w({ x: 10, y: 0 }, { x: 10, y: 10 }, "b"),
      w({ x: 10, y: 10 }, { x: 0, y: 10 }, "c"),
      w({ x: 0, y: 10 }, { x: 0, y: 0 }, "d"),
    ];
    const cw: WallSegment[] = [
      w({ x: 0, y: 0 }, { x: 0, y: 10 }, "a"),
      w({ x: 0, y: 10 }, { x: 10, y: 10 }, "b"),
      w({ x: 10, y: 10 }, { x: 10, y: 0 }, "c"),
      w({ x: 10, y: 0 }, { x: 0, y: 0 }, "d"),
    ];
    expect(polygonArea(ccw)).toBeCloseTo(polygonArea(cw), 6);
  });

  it("computes 75 for an L-shape (10×10 square minus 5×5 inset)", () => {
    // L-shape vertices CCW: (0,0)→(10,0)→(10,5)→(5,5)→(5,10)→(0,10)→(0,0)
    const walls: WallSegment[] = [
      w({ x: 0, y: 0 }, { x: 10, y: 0 }, "a"),
      w({ x: 10, y: 0 }, { x: 10, y: 5 }, "b"),
      w({ x: 10, y: 5 }, { x: 5, y: 5 }, "c"),
      w({ x: 5, y: 5 }, { x: 5, y: 10 }, "d"),
      w({ x: 5, y: 10 }, { x: 0, y: 10 }, "e"),
      w({ x: 0, y: 10 }, { x: 0, y: 0 }, "f"),
    ];
    expect(polygonArea(walls)).toBeCloseTo(75, 6);
  });

  it("computes 6 for a 3-4-5 right triangle", () => {
    const walls: WallSegment[] = [
      w({ x: 0, y: 0 }, { x: 4, y: 0 }, "a"),
      w({ x: 4, y: 0 }, { x: 0, y: 3 }, "b"),
      w({ x: 0, y: 3 }, { x: 0, y: 0 }, "c"),
    ];
    expect(polygonArea(walls)).toBeCloseTo(6, 6);
  });

  it("returns 0 for fewer than 3 walls", () => {
    expect(polygonArea([])).toBe(0);
    expect(polygonArea([w({ x: 0, y: 0 }, { x: 10, y: 0 })])).toBe(0);
    expect(polygonArea([
      w({ x: 0, y: 0 }, { x: 10, y: 0 }),
      w({ x: 10, y: 0 }, { x: 10, y: 10 }),
    ])).toBe(0);
  });

  it("returns 0 for non-closed loop (4 disconnected walls — pitfall 5)", () => {
    const walls: WallSegment[] = [
      w({ x: 0, y: 0 }, { x: 10, y: 0 }, "a"),
      w({ x: 11, y: 0 }, { x: 11, y: 10 }, "b"), // gap: 10,0 ≠ 11,0
      w({ x: 11, y: 10 }, { x: 0, y: 10 }, "c"),
      w({ x: 0, y: 10 }, { x: 0, y: 0 }, "d"),
    ];
    expect(polygonArea(walls)).toBe(0);
  });
});

describe("polygonCentroid", () => {
  it("returns (5,5) for a 10×10 square", () => {
    const walls: WallSegment[] = [
      w({ x: 0, y: 0 }, { x: 10, y: 0 }, "a"),
      w({ x: 10, y: 0 }, { x: 10, y: 10 }, "b"),
      w({ x: 10, y: 10 }, { x: 0, y: 10 }, "c"),
      w({ x: 0, y: 10 }, { x: 0, y: 0 }, "d"),
    ];
    const c = polygonCentroid(walls);
    expect(c.x).toBeCloseTo(5, 6);
    expect(c.y).toBeCloseTo(5, 6);
  });

  it("L-shape centroid lands inside the L (not in the notch)", () => {
    // L-shape vertices CCW per polygonArea L-test
    const walls: WallSegment[] = [
      w({ x: 0, y: 0 }, { x: 10, y: 0 }, "a"),
      w({ x: 10, y: 0 }, { x: 10, y: 5 }, "b"),
      w({ x: 10, y: 5 }, { x: 5, y: 5 }, "c"),
      w({ x: 5, y: 5 }, { x: 5, y: 10 }, "d"),
      w({ x: 5, y: 10 }, { x: 0, y: 10 }, "e"),
      w({ x: 0, y: 10 }, { x: 0, y: 0 }, "f"),
    ];
    const c = polygonCentroid(walls);
    // Notch is the upper-right 5×5 quadrant (5≤x≤10 AND 5≤y≤10).
    // Centroid should NOT lie in that notch.
    const inNotch = c.x > 5 && c.y > 5;
    expect(inNotch).toBe(false);
    // And should be inside the bounding 0..10 × 0..10 box.
    expect(c.x).toBeGreaterThan(0);
    expect(c.x).toBeLessThan(10);
    expect(c.y).toBeGreaterThan(0);
    expect(c.y).toBeLessThan(10);
  });
});
