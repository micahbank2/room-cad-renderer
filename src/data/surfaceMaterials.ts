/** Unified surface material catalog for Phase 20 (Advanced Materials).
 *  Contains floor presets (formerly in floorMaterials.ts) plus ceiling presets,
 *  with CONCRETE shared across both surfaces. */

export type SurfaceTarget = "floor" | "ceiling" | "both";

/** Physically-based rendering maps for a surface material. Phase 32.
 *  All three URLs are served from `public/` (absolute paths starting with `/`).
 *  `tile.wFt` and `tile.lFt` are the real-world repeat size in feet; identical
 *  repeat applies to all three maps (D-04). */
export interface PbrMaps {
  albedo: string;
  normal: string;
  roughness: string;
  tile: { wFt: number; lFt: number };
}

export interface SurfaceMaterial {
  id: string;
  label: string;
  color: string;
  roughness: number;
  /** Which surface(s) this material applies to. */
  surface: SurfaceTarget;
  defaultScaleFt: number;
  /** Optional PBR maps. Absence = flat-color render path (D-13). */
  pbr?: PbrMaps;
}

/** All 11 surface materials: 8 floor-only, 1 shared (CONCRETE), 3 ceiling-only. */
export const SURFACE_MATERIALS: Record<string, SurfaceMaterial> = {
  // ── Floor materials ──────────────────────────────────────────────────────
  WOOD_OAK: {
    id: "WOOD_OAK",
    label: "WOOD OAK",
    color: "#b08158",
    roughness: 0.7,
    surface: "floor",
    defaultScaleFt: 0.5,
  },
  WOOD_WALNUT: {
    id: "WOOD_WALNUT",
    label: "WOOD WALNUT",
    color: "#5a3a28",
    roughness: 0.7,
    surface: "floor",
    defaultScaleFt: 0.5,
  },
  TILE_WHITE: {
    id: "TILE_WHITE",
    label: "TILE WHITE",
    color: "#efefef",
    roughness: 0.3,
    surface: "floor",
    defaultScaleFt: 1,
  },
  TILE_BLACK: {
    id: "TILE_BLACK",
    label: "TILE BLACK",
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
    pbr: {
      albedo: "/textures/concrete/albedo.jpg",
      normal: "/textures/concrete/normal.jpg",
      roughness: "/textures/concrete/roughness.jpg",
      tile: { wFt: 4, lFt: 4 },
    },
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
    pbr: {
      albedo: "/textures/plaster/albedo.jpg",
      normal: "/textures/plaster/normal.jpg",
      roughness: "/textures/plaster/roughness.jpg",
      tile: { wFt: 6, lFt: 6 },
    },
  },
  WOOD_PLANK: {
    id: "WOOD_PLANK",
    label: "WOOD PLANK",
    color: "#a0794f",
    roughness: 0.75,
    surface: "ceiling",
    defaultScaleFt: 0.5,
    pbr: {
      albedo: "/textures/wood-plank/albedo.jpg",
      normal: "/textures/wood-plank/normal.jpg",
      roughness: "/textures/wood-plank/roughness.jpg",
      tile: { wFt: 0.5, lFt: 4 },
    },
  },
  PAINTED_DRYWALL: {
    id: "PAINTED_DRYWALL",
    label: "PAINTED DRYWALL",
    color: "#f5f5f5",
    roughness: 0.8,
    surface: "ceiling",
    defaultScaleFt: 4,
  },
};

/** Returns all preset materials applicable to the given surface target.
 *  Includes entries where surface === target or surface === "both".
 *
 *  TODO(v1.18): legacy preset catalog filter (Phase 20). Still used by
 *  SurfaceMaterialPicker. Once Phase 68's MaterialPicker fully replaces it,
 *  this function should be removed. The canonical Phase 68 entry point is
 *  `materialsForSurface(materials, surface)` overload below. */
export function legacyMaterialsForSurface(target: "floor" | "ceiling"): SurfaceMaterial[] {
  return Object.values(SURFACE_MATERIALS).filter(
    (m) => m.surface === target || m.surface === "both"
  );
}

// ── Phase 68 user-Material catalog filter ────────────────────────────────────
import type { Material } from "@/types/material";

/** Phase 68 D-03: discriminated kind for the four surface types Materials apply to. */
export type SurfaceKind =
  | "wallSide"
  | "floor"
  | "ceiling"
  | "customElementFace";

/**
 * Phase 68 D-03: surface-specific Material filter for user-defined Materials.
 *
 * Overloaded with the legacy preset signature so SurfaceMaterialPicker keeps
 * compiling. v1.18 cleanup will drop the legacy overload.
 *
 * For v1.17 the new signature returns ALL Materials (no filtering yet) — Material
 * has no category metadata, so any Material can apply to any surface. Future
 * (Phase 70+) will filter by Material.category once that field lands (e.g.
 * "flooring" Materials only on floors).
 */
export function materialsForSurface(target: "floor" | "ceiling"): SurfaceMaterial[];
export function materialsForSurface(
  materials: ReadonlyArray<Material>,
  surface: SurfaceKind,
): ReadonlyArray<Material>;
export function materialsForSurface(
  arg1: "floor" | "ceiling" | ReadonlyArray<Material>,
  arg2?: SurfaceKind,
): SurfaceMaterial[] | ReadonlyArray<Material> {
  // Legacy single-arg path: filter SURFACE_MATERIALS preset catalog.
  if (typeof arg1 === "string") {
    return legacyMaterialsForSurface(arg1);
  }
  // Phase 68 path: return passed-in user Materials, optionally filtered by surface.
  void arg2; // reserved for Phase 70 category filtering
  return arg1;
}
