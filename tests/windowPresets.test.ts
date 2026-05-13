/**
 * Phase 79 Wave 0 — RED unit tests for window-preset catalog + derivePreset.
 *
 * MUST fail on this commit — `@/lib/windowPresets` does not yet exist.
 * Wave 1 will create the module and turn these GREEN.
 *
 * Decisions covered (.planning/phases/79-window-presets-win-presets-01-v1-20-active/79-CONTEXT.md):
 *   - D-01: 5 named residential presets + Custom, exact dimensions per row
 *   - D-07: derivePreset(opening) returns canonical id or "custom" on read
 *   - D-09: derive on read, no stored field, no migration
 *
 * Total: 12 it() blocks (7 catalog + 5 derivePreset).
 */
import { describe, it, expect } from "vitest";
import { WINDOW_PRESETS, derivePreset, type WindowPresetId } from "@/lib/windowPresets";

describe("WINDOW_PRESETS catalog (D-01)", () => {
  it("has 5 entries in defined order", () => {
    expect(WINDOW_PRESETS.map((p) => p.id)).toEqual([
      "small",
      "standard",
      "wide",
      "picture",
      "bathroom",
    ]);
  });

  it("small = 2/3/3", () => {
    const p = WINDOW_PRESETS.find((x) => x.id === "small")!;
    expect(p.width).toBe(2);
    expect(p.height).toBe(3);
    expect(p.sillHeight).toBe(3);
  });

  it("standard = 3/4/3", () => {
    const p = WINDOW_PRESETS.find((x) => x.id === "standard")!;
    expect(p.width).toBe(3);
    expect(p.height).toBe(4);
    expect(p.sillHeight).toBe(3);
  });

  it("wide = 4/5/3", () => {
    const p = WINDOW_PRESETS.find((x) => x.id === "wide")!;
    expect(p.width).toBe(4);
    expect(p.height).toBe(5);
    expect(p.sillHeight).toBe(3);
  });

  it("picture = 6/4/1 (low sill for living-room views)", () => {
    const p = WINDOW_PRESETS.find((x) => x.id === "picture")!;
    expect(p.width).toBe(6);
    expect(p.height).toBe(4);
    expect(p.sillHeight).toBe(1);
  });

  it("bathroom = 2/4/4.5 (high sill for privacy)", () => {
    const p = WINDOW_PRESETS.find((x) => x.id === "bathroom")!;
    expect(p.width).toBe(2);
    expect(p.height).toBe(4);
    expect(p.sillHeight).toBe(4.5);
  });

  it("each entry has a non-empty human-readable label", () => {
    for (const p of WINDOW_PRESETS) {
      expect(typeof p.label).toBe("string");
      expect(p.label.length).toBeGreaterThan(0);
    }
  });
});

describe("derivePreset (D-07)", () => {
  it("returns 'standard' for exact 3/4/3", () => {
    expect(derivePreset({ width: 3, height: 4, sillHeight: 3 })).toBe("standard");
  });

  it("returns 'picture' for exact 6/4/1", () => {
    expect(derivePreset({ width: 6, height: 4, sillHeight: 1 })).toBe("picture");
  });

  it("returns 'bathroom' for exact 2/4/4.5", () => {
    expect(derivePreset({ width: 2, height: 4, sillHeight: 4.5 })).toBe("bathroom");
  });

  it("returns 'custom' for 5/5/2 (no catalog match)", () => {
    const result: WindowPresetId | "custom" = derivePreset({
      width: 5,
      height: 5,
      sillHeight: 2,
    });
    expect(result).toBe("custom");
  });

  it("tolerates float-format noise (4.5 + 1e-7 still resolves to bathroom)", () => {
    expect(
      derivePreset({ width: 2, height: 4, sillHeight: 4.5 + 1e-7 })
    ).toBe("bathroom");
  });
});
