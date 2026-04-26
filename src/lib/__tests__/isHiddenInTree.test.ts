import { describe, it, expect } from "vitest";
import { isHiddenInTree } from "@/lib/isHiddenInTree";

describe("isHiddenInTree", () => {
  it("returns false on empty hiddenIds", () => {
    expect(isHiddenInTree(["r1", "r1:walls", "w1"], new Set())).toBe(false);
  });
  it("returns true if any ancestor is hidden", () => {
    expect(isHiddenInTree(["r1", "r1:walls", "w1"], new Set(["r1:walls"]))).toBe(true);
  });
  it("returns true if leaf itself is hidden", () => {
    expect(isHiddenInTree(["r1", "r1:walls", "w1"], new Set(["w1"]))).toBe(true);
  });
});
