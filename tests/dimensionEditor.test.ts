import { describe, it, expect } from "vitest";
import { computeLabelPx, hitTestDimLabel, validateInput } from "@/canvas/dimensionEditor";
import { formatFeet } from "@/lib/geometry";
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

describe("validateInput (D-02 feet+inches grammar)", () => {
  it.each([
    ["12'6\"",    12.5],
    ["12' 6\"",   12.5],
    ["12'-6\"",   12.5],
    ["12'",       12],
    ["6\"",       0.5],
    ["12ft 6in",  12.5],
    ["12 ft 6 in", 12.5],
    ["12.5",      12.5],
    ["12",        12],
    ["12.5ft",    12.5],
  ])("accepts %s -> %s ft", (input, expected) => {
    expect(validateInput(input)).toBeCloseTo(expected as number, 5);
  });

  it.each([
    "12 6",   // D-02a — two bare numbers no unit
    "-5",     // negative
    "0",      // zero (D-02b)
    "0'0\"",  // zero composite (D-02b)
    "abc",    // non-numeric
    "",       // empty
    "   ",    // whitespace only
  ])("rejects %s", (input) => {
    expect(validateInput(input)).toBeNull();
  });

  it.each([0.5, 1, 3.5, 10.25, 12.5])(
    "round-trips formatFeet(%s) back to a close value",
    (x) => {
      const parsed = validateInput(formatFeet(x));
      expect(parsed).not.toBeNull();
      // formatFeet rounds to whole inches; tolerate 1/24 ft drift
      expect(Math.abs((parsed as number) - x)).toBeLessThanOrEqual(1 / 24 + 1e-6);
    }
  );
});
