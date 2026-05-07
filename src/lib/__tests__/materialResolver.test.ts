// Phase 68 Plan 01 — Wave 0 RED tests for resolveSurfaceMaterial / resolveSurfaceTileSize.
// Module src/lib/surfaceMaterial.ts does not yet exist — Plan 04 will add it.
import { describe, it, expect } from "vitest";
// @ts-expect-error — RED: module does not yet exist (Plan 04 will add it)
import { resolveSurfaceMaterial, resolveSurfaceTileSize } from "@/lib/surfaceMaterial";

describe("resolveSurfaceTileSize — D-04 precedence", () => {
  it("defaults to 1 when both surface and material lack a value", () => {
    expect(resolveSurfaceTileSize(undefined, undefined)).toBe(1);
  });
  it("uses material.tileSizeFt when surface is unset", () => {
    expect(resolveSurfaceTileSize(undefined, { tileSizeFt: 2 } as any)).toBe(2);
  });
  it("surface.scaleFt overrides material.tileSizeFt (D-04)", () => {
    expect(resolveSurfaceTileSize(0.5, { tileSizeFt: 2 } as any)).toBe(0.5);
  });
});

describe("resolveSurfaceMaterial — D-08 fallbacks", () => {
  it("returns null when materialId undefined", () => {
    expect(resolveSurfaceMaterial(undefined, undefined, [])).toBeNull();
  });
  it("paint Material → colorHex set, roughness=0.8, metalness=0, no maps", () => {
    const m = {
      id: "m1",
      name: "x",
      colorHex: "#ff0000",
      tileSizeFt: 1,
      createdAt: 0,
    } as any;
    const out = resolveSurfaceMaterial("m1", undefined, [m]);
    expect(out?.colorHex).toBe("#ff0000");
    expect(out?.roughness).toBe(0.8);
    expect(out?.metalness).toBe(0);
    expect(out?.colorMap).toBeUndefined();
  });
  it("textured Material with no roughnessMap → roughness=0.8 (D-08)", () => {
    const m = {
      id: "m2",
      name: "x",
      colorMapId: "ut1",
      tileSizeFt: 1,
      createdAt: 0,
    } as any;
    const out = resolveSurfaceMaterial("m2", undefined, [m]);
    expect(out?.roughness).toBe(0.8);
    expect(out?.metalness).toBe(0);
  });
});
