import { describe, it, expect } from "vitest";
import { FB_COLORS, HUE_FAMILIES } from "@/data/farrowAndBall";

describe("farrowAndBall catalog", () => {
  it("has exactly 132 entries", () => {
    expect(FB_COLORS.length).toBe(132);
  });

  it("every entry has id, name, hex (starts with #, 7 chars), source === 'farrow-ball', hueFamily", () => {
    for (const c of FB_COLORS) {
      expect(typeof c.id).toBe("string");
      expect(c.id.length).toBeGreaterThan(0);
      expect(typeof c.name).toBe("string");
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.hex).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(c.source).toBe("farrow-ball");
      expect(typeof c.hueFamily).toBe("string");
      expect(c.hueFamily!.length).toBeGreaterThan(0);
    }
  });

  it("HUE_FAMILIES has exactly 7 entries: WHITES, NEUTRALS, BLUES, GREENS, PINKS, YELLOWS, BLACKS", () => {
    expect(HUE_FAMILIES).toHaveLength(7);
    expect(HUE_FAMILIES).toContain("WHITES");
    expect(HUE_FAMILIES).toContain("NEUTRALS");
    expect(HUE_FAMILIES).toContain("BLUES");
    expect(HUE_FAMILIES).toContain("GREENS");
    expect(HUE_FAMILIES).toContain("PINKS");
    expect(HUE_FAMILIES).toContain("YELLOWS");
    expect(HUE_FAMILIES).toContain("BLACKS");
  });

  it("has no duplicate ids", () => {
    const ids = FB_COLORS.map((c) => c.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("filtering by each hueFamily returns > 0 results", () => {
    for (const family of HUE_FAMILIES) {
      const matches = FB_COLORS.filter((c) => c.hueFamily === family);
      expect(matches.length).toBeGreaterThan(0);
    }
  });
});
