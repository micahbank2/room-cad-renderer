import { describe, it, expect } from "vitest";
import { computeLabelPx, hitTestDimLabel, validateInput } from "@/canvas/dimensionEditor";
import type { WallSegment } from "@/types/cad";

function mkWall(start: {x:number;y:number}, end: {x:number;y:number}): WallSegment {
  return { id: "w1", start, end, thickness: 0.5, height: 8, openings: [] };
}

describe("dimension editor overlay", () => {
  it("position: overlay x/y matches drawWallDimension perpendicular offset", () => {
    const wall = mkWall({ x: 0, y: 0 }, { x: 10, y: 0 });
    const label = computeLabelPx(wall, 10, { x: 0, y: 0 });
    // midX = 50, midY = 0. angleDeg = 0. perpAngle = 90° -> cos=0, sin=1. offset 14.
    expect(label.x).toBeCloseTo(50);
    expect(label.y).toBeCloseTo(14);
  });

  it("hitTestDimLabel: within 24px returns true", () => {
    const wall = mkWall({ x: 0, y: 0 }, { x: 10, y: 0 });
    const label = computeLabelPx(wall, 10, { x: 0, y: 0 });
    expect(hitTestDimLabel({ x: label.x + 5, y: label.y + 5 }, wall, 10, { x: 0, y: 0 })).toBe(true);
    expect(hitTestDimLabel({ x: label.x + 50, y: label.y + 50 }, wall, 10, { x: 0, y: 0 })).toBe(false);
  });

  it("invalid input: non-numeric or <=0 parseFloat results cancel silently", () => {
    expect(validateInput("abc")).toBeNull();
    expect(validateInput("0")).toBeNull();
    expect(validateInput("-5")).toBeNull();
    expect(validateInput("")).toBeNull();
    expect(validateInput("   ")).toBeNull();
    expect(validateInput("12")).toBe(12);
    expect(validateInput("3.5")).toBe(3.5);
    expect(validateInput("3.5ft")).toBe(3.5);
  });
});
