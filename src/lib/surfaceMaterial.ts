/**
 * Phase 68 D-04 + D-08: Surface→Material resolver.
 *
 * Pure functions (no React, no THREE, no IDB). Used by:
 * - 3D mesh hooks in src/three/* (via useResolvedMaterial wrapper, Plan 04)
 * - 2D Fabric renderer in src/canvas/fabricSync.ts (Plan 05)
 * - Snapshot migration (Plan 03)
 *
 * Decisions:
 * - D-02: paint Material has colorHex (mutually exclusive with colorMapId at runtime).
 * - D-04: tile-size precedence — surface.scaleFt ?? material.tileSizeFt ?? 1.
 * - D-08: PBR fallbacks — roughness=0.8 when no roughnessMapId; metalness=0 when no
 *   reflectionMapId. When the maps EXIST the texture drives the value (we set the
 *   uniform to 1.0 so the map-modulated channel passes through unchanged).
 */
import type { Material, FaceDirection } from "@/types/material";

/** Discriminated union of every surface kind Phase 68 covers (D-03). */
export type SurfaceTarget =
  | { kind: "wallSide"; wallId: string; side: "A" | "B" }
  | { kind: "floor"; roomId?: string }
  | { kind: "ceiling"; ceilingId: string }
  | { kind: "customElementFace"; placedId: string; face: FaceDirection };

export interface ResolvedSurfaceMaterial {
  /** When set, render as flat color (paint Material per D-02). */
  colorHex?: string;
  /** UserTexture id for color map. Caller resolves via userTextureCache. */
  colorMapId?: string;
  /** UserTexture id for roughness map. */
  roughnessMapId?: string;
  /** UserTexture id for reflection map. */
  reflectionMapId?: string;
  /** UserTexture id for AO map. Phase 78 PBR-03. */
  aoMapId?: string;
  /** UserTexture id for displacement map. Phase 78 PBR-03. */
  displacementMapId?: string;
  /** Real-world tile size in feet (post D-04 resolution). */
  tileSizeFt: number;
  /** D-08 fallback: 0.8 when roughnessMapId absent, 1.0 when present. */
  roughness: number;
  /** D-08 fallback: 0 when reflectionMapId absent, 1.0 when present. */
  metalness: number;
  /** The original Material for callers that need brand/sku/etc. */
  material: Material;
}

/**
 * D-04 precedence: surface override beats material default beats 1ft.
 */
export function resolveSurfaceTileSize(
  surfaceScaleFt: number | undefined,
  material: Pick<Material, "tileSizeFt"> | undefined,
): number {
  return surfaceScaleFt ?? material?.tileSizeFt ?? 1;
}

/**
 * D-08 fallbacks: returns null when materialId unset or material missing (orphan).
 * Caller falls back to legacy priority chain.
 */
export function resolveSurfaceMaterial(
  materialId: string | undefined,
  surfaceScaleFt: number | undefined,
  materials: ReadonlyArray<Material>,
): ResolvedSurfaceMaterial | null {
  if (!materialId) return null;
  const m = materials.find((mat) => mat.id === materialId);
  if (!m) return null;

  // D-02 mutual-exclusion guard: prefer colorHex if both set, warn.
  if (m.colorHex && m.colorMapId) {
    // eslint-disable-next-line no-console
    console.warn(
      `[Phase68] Material ${m.id} has both colorHex and colorMapId; using colorHex.`,
    );
  }

  const tileSizeFt = resolveSurfaceTileSize(surfaceScaleFt, m);

  if (m.colorHex) {
    // Paint Material → flat color, no texture maps regardless of *MapId fields.
    return {
      colorHex: m.colorHex,
      tileSizeFt,
      roughness: 0.8,
      metalness: 0,
      material: m,
    };
  }

  const roughness = m.roughnessMapId ? 1.0 : 0.8; // D-08
  const metalness = m.reflectionMapId ? 1.0 : 0; // D-08

  return {
    colorMapId: m.colorMapId,
    roughnessMapId: m.roughnessMapId,
    reflectionMapId: m.reflectionMapId,
    aoMapId: m.aoMapId,
    displacementMapId: m.displacementMapId,
    tileSizeFt,
    roughness,
    metalness,
    material: m,
  };
}
