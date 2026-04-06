/** Floor material presets — backward-compatible re-export from unified catalog.
 *
 *  All 8 original FloorPresetId values are preserved with identical id/label/color/roughness.
 *  Existing imports of FloorPresetId, FloorPreset, FLOOR_PRESETS, FLOOR_PRESET_IDS continue
 *  to work unchanged.
 */

import { SURFACE_MATERIALS, type SurfaceMaterial } from "./surfaceMaterials";

export type FloorPresetId =
  | "WOOD_OAK"
  | "WOOD_WALNUT"
  | "TILE_WHITE"
  | "TILE_BLACK"
  | "CONCRETE"
  | "CARPET"
  | "MARBLE"
  | "STONE";

/** Alias for backward compatibility — SurfaceMaterial is a superset of the old FloorPreset shape. */
export type FloorPreset = SurfaceMaterial;

const FLOOR_IDS: FloorPresetId[] = [
  "WOOD_OAK",
  "WOOD_WALNUT",
  "TILE_WHITE",
  "TILE_BLACK",
  "CONCRETE",
  "CARPET",
  "MARBLE",
  "STONE",
];

export const FLOOR_PRESETS: Record<FloorPresetId, FloorPreset> = Object.fromEntries(
  FLOOR_IDS.map((id) => [id, SURFACE_MATERIALS[id]])
) as Record<FloorPresetId, FloorPreset>;

export const FLOOR_PRESET_IDS: FloorPresetId[] = FLOOR_IDS;
