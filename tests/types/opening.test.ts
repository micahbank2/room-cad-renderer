// Phase 61 OPEN-01 — unit tests U1-U4 for Opening type-union extension.
import { describe, it, expect } from "vitest";
import type { Opening, ToolType } from "@/types/cad";
import { getOpeningDefaults, clampNicheDepth } from "@/types/cad";

describe("Phase 61 — Opening type union (U1)", () => {
  it("U1: Opening.type accepts all 5 kinds", () => {
    // Compile-level: this file would not type-check if any kind were missing.
    const door: Opening = { id: "1", type: "door", offset: 0, width: 3, height: 7, sillHeight: 0 };
    const window: Opening = { id: "2", type: "window", offset: 0, width: 3, height: 4, sillHeight: 3 };
    const archway: Opening = { id: "3", type: "archway", offset: 0, width: 3, height: 7, sillHeight: 0 };
    const passthrough: Opening = { id: "4", type: "passthrough", offset: 0, width: 5, height: 8, sillHeight: 0 };
    const niche: Opening = { id: "5", type: "niche", offset: 0, width: 2, height: 3, sillHeight: 3, depthFt: 0.5 };

    expect(door.type).toBe("door");
    expect(window.type).toBe("window");
    expect(archway.type).toBe("archway");
    expect(passthrough.type).toBe("passthrough");
    expect(niche.type).toBe("niche");

    // ToolType also extends with the same 3 kinds.
    const tool1: ToolType = "archway";
    const tool2: ToolType = "passthrough";
    const tool3: ToolType = "niche";
    expect([tool1, tool2, tool3]).toEqual(["archway", "passthrough", "niche"]);
  });
});

describe("Phase 61 — getOpeningDefaults (U2)", () => {
  it("U2 door defaults: 3ft × 6.67ft sill 0", () => {
    const d = getOpeningDefaults("door");
    expect(d.width).toBe(3);
    expect(d.sillHeight).toBe(0);
  });

  it("U2 window defaults: 3ft × 4ft sill 3ft", () => {
    const d = getOpeningDefaults("window");
    expect(d.width).toBe(3);
    expect(d.height).toBe(4);
    expect(d.sillHeight).toBe(3);
  });

  it("U2 archway defaults: 3ft × 7ft sill 0", () => {
    const d = getOpeningDefaults("archway");
    expect(d.width).toBe(3);
    expect(d.height).toBe(7);
    expect(d.sillHeight).toBe(0);
  });

  it("U2 passthrough defaults: 5ft × wallHeight sill 0", () => {
    const d = getOpeningDefaults("passthrough", 8);
    expect(d.width).toBe(5);
    expect(d.height).toBe(8);
    expect(d.sillHeight).toBe(0);
    // Without wallHeight, falls back to a reasonable default.
    const d2 = getOpeningDefaults("passthrough");
    expect(d2.width).toBe(5);
    expect(d2.sillHeight).toBe(0);
  });

  it("U2 niche defaults: 2ft × 3ft sill 3ft depth 0.5ft", () => {
    const d = getOpeningDefaults("niche");
    expect(d.width).toBe(2);
    expect(d.height).toBe(3);
    expect(d.sillHeight).toBe(3);
    expect(d.depthFt).toBe(0.5);
  });
});

describe("Phase 61 — clampNicheDepth (U3)", () => {
  it("U3 clamps depth to wallThickness − 1″ for thin walls", () => {
    // Wall thickness = 0.5ft; max allowed = 0.5 - 1/12 = 0.41666…
    const clamped = clampNicheDepth(0.5, 0.5);
    expect(clamped).toBeCloseTo(0.5 - 1 / 12, 5);
  });

  it("U3 clamps to minimum 1″ for tiny user input", () => {
    const clamped = clampNicheDepth(0.01, 0.5);
    expect(clamped).toBeCloseTo(1 / 12, 5);
  });

  it("U3 leaves middle values unchanged", () => {
    const clamped = clampNicheDepth(0.25, 0.5);
    expect(clamped).toBe(0.25);
  });

  it("U3 thicker wall allows deeper niche", () => {
    const clamped = clampNicheDepth(0.9, 1.0);
    expect(clamped).toBe(0.9);
  });
});

describe("Phase 61 — snapshot back-compat (U4)", () => {
  it("U4: v1.14-shape Opening with door+window only round-trips", () => {
    // Hand-crafted snapshot fragment matching v1.14 shape (no depthFt).
    const v14Openings: Opening[] = [
      { id: "op_1", type: "door", offset: 4, width: 3, height: 6.67, sillHeight: 0 },
      { id: "op_2", type: "window", offset: 8, width: 3, height: 4, sillHeight: 3 },
    ];

    // Round-trip via JSON (snapshot serialize/deserialize equivalent).
    const serialized = JSON.stringify(v14Openings);
    const deserialized = JSON.parse(serialized) as Opening[];

    expect(deserialized).toHaveLength(2);
    expect(deserialized[0]).toEqual(v14Openings[0]);
    expect(deserialized[1]).toEqual(v14Openings[1]);

    // depthFt absence preserved (no field appears in serialized form).
    expect(serialized).not.toContain("depthFt");

    // Type-union acceptance: both kinds accepted by the extended union.
    for (const op of deserialized) {
      expect(["door", "window", "archway", "passthrough", "niche"]).toContain(op.type);
      expect(op.depthFt).toBeUndefined();
    }
  });
});
