import { describe, it, expect } from "vitest";
import {
  SURFACE_MATERIALS,
  materialsForSurface,
  type SurfaceMaterial,
  type SurfaceTarget,
} from "@/data/surfaceMaterials";
import {
  FLOOR_PRESETS,
  FLOOR_PRESET_IDS,
  type FloorPresetId,
  type FloorPreset,
} from "@/data/floorMaterials";

describe("SURFACE_MATERIALS catalog (MAT-01)", () => {
  it("contains all 8 FloorPresetId keys", () => {
    const ids: FloorPresetId[] = [
      "WOOD_OAK", "WOOD_WALNUT", "TILE_WHITE", "TILE_BLACK",
      "CONCRETE", "CARPET", "MARBLE", "STONE",
    ];
    for (const id of ids) {
      expect(SURFACE_MATERIALS).toHaveProperty(id);
    }
  });

  it("WOOD_OAK has exact original color and roughness", () => {
    expect(SURFACE_MATERIALS.WOOD_OAK.color).toBe("#b08158");
    expect(SURFACE_MATERIALS.WOOD_OAK.roughness).toBe(0.7);
  });

  it("CONCRETE has surface === 'both'", () => {
    expect(SURFACE_MATERIALS.CONCRETE.surface).toBe("both");
  });

  it("contains ceiling presets: PLASTER, WOOD_PLANK, PAINTED_DRYWALL", () => {
    expect(SURFACE_MATERIALS).toHaveProperty("PLASTER");
    expect(SURFACE_MATERIALS).toHaveProperty("WOOD_PLANK");
    expect(SURFACE_MATERIALS).toHaveProperty("PAINTED_DRYWALL");
  });

  it("PLASTER has correct values", () => {
    expect(SURFACE_MATERIALS.PLASTER.color).toBe("#f0ebe0");
    expect(SURFACE_MATERIALS.PLASTER.roughness).toBe(0.9);
    expect(SURFACE_MATERIALS.PLASTER.surface).toBe("ceiling");
  });

  it("WOOD_PLANK has correct values", () => {
    expect(SURFACE_MATERIALS.WOOD_PLANK.color).toBe("#a0794f");
    expect(SURFACE_MATERIALS.WOOD_PLANK.roughness).toBe(0.75);
    expect(SURFACE_MATERIALS.WOOD_PLANK.surface).toBe("ceiling");
  });

  it("PAINTED_DRYWALL has correct values", () => {
    expect(SURFACE_MATERIALS.PAINTED_DRYWALL.color).toBe("#f5f5f5");
    expect(SURFACE_MATERIALS.PAINTED_DRYWALL.roughness).toBe(0.8);
    expect(SURFACE_MATERIALS.PAINTED_DRYWALL.surface).toBe("ceiling");
  });

  it("has exactly 11 entries total", () => {
    expect(Object.keys(SURFACE_MATERIALS).length).toBe(11);
  });
});

describe("materialsForSurface (MAT-01)", () => {
  it("floor returns 8 entries (7 floor-only + CONCRETE shared)", () => {
    const floor = materialsForSurface("floor");
    // 7 surface:"floor" + 1 surface:"both" (CONCRETE) = 8
    expect(floor.length).toBe(8);
    const ids = floor.map((m) => m.id);
    expect(ids).toContain("CONCRETE");
    expect(ids).toContain("WOOD_OAK");
  });

  it("ceiling returns 4 entries (PLASTER, WOOD_PLANK, PAINTED_DRYWALL, CONCRETE)", () => {
    const ceiling = materialsForSurface("ceiling");
    expect(ceiling.length).toBe(4);
    const ids = ceiling.map((m) => m.id);
    expect(ids).toContain("PLASTER");
    expect(ids).toContain("WOOD_PLANK");
    expect(ids).toContain("PAINTED_DRYWALL");
    expect(ids).toContain("CONCRETE");
  });
});

describe("floorMaterials backward compat (MAT-03)", () => {
  it("FLOOR_PRESETS has exactly 8 keys", () => {
    expect(Object.keys(FLOOR_PRESETS).length).toBe(8);
  });

  it("FLOOR_PRESET_IDS is array of length 8", () => {
    expect(FLOOR_PRESET_IDS.length).toBe(8);
  });

  it("FLOOR_PRESETS.WOOD_OAK.color === '#b08158'", () => {
    expect(FLOOR_PRESETS.WOOD_OAK.color).toBe("#b08158");
  });

  it("FLOOR_PRESETS includes all 8 original IDs", () => {
    const ids: FloorPresetId[] = [
      "WOOD_OAK", "WOOD_WALNUT", "TILE_WHITE", "TILE_BLACK",
      "CONCRETE", "CARPET", "MARBLE", "STONE",
    ];
    for (const id of ids) {
      expect(FLOOR_PRESETS).toHaveProperty(id);
    }
  });
});
