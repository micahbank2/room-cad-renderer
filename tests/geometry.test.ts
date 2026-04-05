import { describe, it, expect } from "vitest";
import { snapTo, distance, wallLength, formatFeet, wallCorners, closestPointOnWall, resizeWall } from "@/lib/geometry";
import type { WallSegment } from "@/types/cad";

function mkWall(start: {x:number;y:number}, end: {x:number;y:number}): WallSegment {
  return { id: "w1", start, end, thickness: 0.5, height: 8, openings: [] };
}

describe("geometry helpers", () => {
  it("snapTo rounds to nearest increment", () => {
    expect(snapTo(3.2, 0.5)).toBe(3.0);
    expect(snapTo(3.3, 0.5)).toBe(3.5);
  });

  it("distance between two points", () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it("wallLength of a segment", () => {
    expect(wallLength(mkWall({ x: 0, y: 0 }, { x: 3, y: 4 }))).toBe(5);
  });

  it("formatFeet renders feet and inches", () => {
    expect(formatFeet(3)).toBe("3'");
    expect(formatFeet(3.5)).toBe("3'-6\"");
  });

  it("wallCorners returns 4 corners", () => {
    const c = wallCorners(mkWall({ x: 0, y: 0 }, { x: 10, y: 0 }));
    expect(c).toHaveLength(4);
  });

  it("closestPointOnWall returns t in [0,1]", () => {
    const w = mkWall({ x: 0, y: 0 }, { x: 10, y: 0 });
    const r = closestPointOnWall(w, { x: 5, y: 3 });
    expect(r.t).toBeGreaterThanOrEqual(0);
    expect(r.t).toBeLessThanOrEqual(1);
  });

  it("resize wall: keeps start fixed, moves end along unit vector", () => {
    const w = mkWall({ x: 0, y: 0 }, { x: 3, y: 4 });  // length 5, unit (0.6, 0.8)
    const newEnd = resizeWall(w, 10);
    expect(newEnd.x).toBeCloseTo(6);
    expect(newEnd.y).toBeCloseTo(8);
  });

  it("resize wall: invalid length returns start unchanged", () => {
    const w = mkWall({ x: 1, y: 2 }, { x: 5, y: 6 });
    expect(resizeWall(w, 0)).toEqual({ x: 1, y: 2 });
    expect(resizeWall(w, -5)).toEqual({ x: 1, y: 2 });
  });

  it("resize wall: zero-length wall returns start", () => {
    const w = mkWall({ x: 2, y: 2 }, { x: 2, y: 2 });
    expect(resizeWall(w, 10)).toEqual({ x: 2, y: 2 });
  });
});
