import { describe, test, expect } from "vitest";
import { isClick, CLICK_THRESHOLD_PX } from "../useClickDetect";

describe("isClick — 5px threshold", () => {
  test("CLICK_THRESHOLD_PX is 5", () => {
    expect(CLICK_THRESHOLD_PX).toBe(5);
  });

  test("distance < 5px returns true (click)", () => {
    // dx=4, dy=0 → distance=4 → true
    expect(isClick(0, 0, 4, 0)).toBe(true);
  });

  test("distance === 5px returns false (not a click — threshold is exclusive)", () => {
    // dx=5, dy=0 → distance=5 → NOT < 5 → false
    expect(isClick(0, 0, 5, 0)).toBe(false);
  });

  test("diagonal distance < 5px returns true", () => {
    // dx=3, dy=3 → distance≈4.24 → true
    expect(isClick(0, 0, 3, 3)).toBe(true);
  });

  test("large movement returns false (orbit drag)", () => {
    expect(isClick(0, 0, 100, 50)).toBe(false);
  });
});
