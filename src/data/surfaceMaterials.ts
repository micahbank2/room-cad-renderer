/** Unified surface material catalog for Phase 20 (Advanced Materials).
 *  Contains floor presets (formerly in floorMaterials.ts) plus ceiling presets,
 *  with CONCRETE shared across both surfaces. */

export type SurfaceTarget = "floor" | "ceiling" | "both";

export interface SurfaceMaterial {
  id: string;
  label: string;
  color: string;
  roughness: number;
  /** Which surface(s) this material applies to. */
  surface: SurfaceTarget;
  defaultScaleFt: number;
}

/** All 11 surface materials: 8 floor-only, 1 shared (CONCRETE), 3 ceiling-only. */
export const SURFACE_MATERIALS: Record<string, SurfaceMaterial> = {
  // ── Floor materials ──────────────────────────────────────────────────────
  WOOD_OAK: {
    id: "WOOD_OAK",
    label: "WOOD_OAK",
    color: "#b08158",
    roughness: 0.7,
    surface: "floor",
    defaultScaleFt: 0.5,
  },
  WOOD_WALNUT: {
    id: "WOOD_WALNUT",
    label: "WOOD_WALNUT",
    color: "#5a3a28",
    roughness: 0.7,
    surface: "floor",
    defaultScaleFt: 0.5,
  },
  TILE_WHITE: {
    id: "TILE_WHITE",
    label: "TILE_WHITE",
    color: "#efefef",
    roughness: 0.3,
    surface: "floor",
    defaultScaleFt: 1,
  },
  TILE_BLACK: {
    id: "TILE_BLACK",
    label: "TILE_BLACK",
    color: "#1c1c1c",
    roughness: 0.3,
    surface: "floor",
    defaultScaleFt: 1,
  },
  // CONCRETE is shared — floor and ceiling
  CONCRETE: {
    id: "CONCRETE",
    label: "CONCRETE",
    color: "#8a8a8a",
    roughness: 0.85,
    surface: "both",
    defaultScaleFt: 4,
  },
  CARPET: {
    id: "CARPET",
    label: "CARPET",
    color: "#c4b294",
    roughness: 0.95,
    surface: "floor",
    defaultScaleFt: 1,
  },
  MARBLE: {
    id: "MARBLE",
    label: "MARBLE",
    color: "#ece5d6",
    roughness: 0.2,
    surface: "floor",
    defaultScaleFt: 2,
  },
  STONE: {
    id: "STONE",
    label: "STONE",
    color: "#7a6f60",
    roughness: 0.8,
    surface: "floor",
    defaultScaleFt: 1.5,
  },
  // ── Ceiling materials ─────────────────────────────────────────────────────
  PLASTER: {
    id: "PLASTER",
    label: "PLASTER",
    color: "#f0ebe0",
    roughness: 0.9,
    surface: "ceiling",
    defaultScaleFt: 4,
  },
  WOOD_PLANK: {
    id: "WOOD_PLANK",
    label: "WOOD_PLANK",
    color: "#a0794f",
    roughness: 0.75,
    surface: "ceiling",
    defaultScaleFt: 0.5,
  },
  PAINTED_DRYWALL: {
    id: "PAINTED_DRYWALL",
    label: "PAINTED_DRYWALL",
    color: "#f5f5f5",
    roughness: 0.8,
    surface: "ceiling",
    defaultScaleFt: 4,
  },
};

/** Returns all materials applicable to the given surface target.
 *  Includes entries where surface === target or surface === "both". */
export function materialsForSurface(target: "floor" | "ceiling"): SurfaceMaterial[] {
  return Object.values(SURFACE_MATERIALS).filter(
    (m) => m.surface === target || m.surface === "both"
  );
}
