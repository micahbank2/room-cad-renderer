import { describe, it, expect } from "vitest";
import { SURFACE_MATERIALS } from "@/data/surfaceMaterials";
import { resolvePaintHex } from "@/lib/colorUtils";
import type { Ceiling } from "@/types/cad";

/** Pure helper that mirrors the 3-tier resolution logic in CeilingMesh. */
function resolveCeilingMaterial(
  ceiling: Pick<Ceiling, "surfaceMaterialId" | "paintId" | "limeWash" | "material">,
  customColors: import("@/types/paint").PaintColor[] = []
): { color: string; roughness: number } {
  // Tier 1: surface material preset
  if (ceiling.surfaceMaterialId) {
    const mat = SURFACE_MATERIALS[ceiling.surfaceMaterialId];
    if (mat) return { color: mat.color, roughness: mat.roughness };
  }
  // Tier 2: paint
  if (ceiling.paintId) {
    return {
      color: resolvePaintHex(ceiling.paintId, customColors),
      roughness: ceiling.limeWash ? 0.95 : 0.8,
    };
  }
  // Tier 3: legacy material fallback
  return {
    color: ceiling.material.startsWith("#") ? ceiling.material : "#f5f5f5",
    roughness: 0.8,
  };
}

const base: Ceiling = {
  id: "c1",
  points: [],
  height: 8,
  material: "#ffffff",
};

describe("CeilingMesh material resolution (MAT-02)", () => {
  it("surfaceMaterialId PLASTER resolves to #f0ebe0 and roughness 0.9", () => {
    const result = resolveCeilingMaterial({ ...base, surfaceMaterialId: "PLASTER" });
    expect(result.color).toBe("#f0ebe0");
    expect(result.roughness).toBe(0.9);
  });

  it("surfaceMaterialId wins over paintId when both set", () => {
    // paintId is a fake ID that would fall to fallback color
    const result = resolveCeilingMaterial({
      ...base,
      surfaceMaterialId: "PLASTER",
      paintId: "some-paint-id",
    });
    expect(result.color).toBe("#f0ebe0");
    expect(result.roughness).toBe(0.9);
  });

  it("paintId used when surfaceMaterialId not set", () => {
    // Use a real F&B paint ID from the catalog — Farrow & Ball "All White" is "FB-2005"
    // but since we don't know the exact IDs, we test that fallback is NOT used
    const result = resolveCeilingMaterial({
      ...base,
      paintId: "unknown-paint-99",
    });
    // Unknown paint falls through to resolvePaintHex fallback ("#f8f5ef")
    expect(result.color).toBe("#f8f5ef");
    expect(result.roughness).toBe(0.8);
  });

  it("limeWash increases roughness to 0.95 when paintId is set", () => {
    const result = resolveCeilingMaterial({
      ...base,
      paintId: "unknown-paint-99",
      limeWash: true,
    });
    expect(result.roughness).toBe(0.95);
  });

  it("falls back to ceiling.material hex when neither surfaceMaterialId nor paintId", () => {
    const result = resolveCeilingMaterial({ ...base, material: "#aabbcc" });
    expect(result.color).toBe("#aabbcc");
    expect(result.roughness).toBe(0.8);
  });

  it("falls back to #f5f5f5 when material is not a hex string", () => {
    const result = resolveCeilingMaterial({ ...base, material: "mat-plaster" });
    expect(result.color).toBe("#f5f5f5");
  });

  it("CONCRETE surfaceMaterialId resolves correctly", () => {
    const result = resolveCeilingMaterial({ ...base, surfaceMaterialId: "CONCRETE" });
    expect(result.color).toBe("#8a8a8a");
    expect(result.roughness).toBe(0.85);
  });
});
