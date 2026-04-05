/** Curated preset floor materials for Phase 12. Each preset is a solid color
 *  baseline — in a future phase we'll add procedural patterns + texture files. */

export type FloorPresetId =
  | "WOOD_OAK"
  | "WOOD_WALNUT"
  | "TILE_WHITE"
  | "TILE_BLACK"
  | "CONCRETE"
  | "CARPET"
  | "MARBLE"
  | "STONE";

export interface FloorPreset {
  id: FloorPresetId;
  label: string;
  color: string; // hex color
  roughness: number; // 0 = glossy, 1 = matte
  defaultScaleFt: number; // natural pattern repeat in feet (used if we later add textures)
}

export const FLOOR_PRESETS: Record<FloorPresetId, FloorPreset> = {
  WOOD_OAK: {
    id: "WOOD_OAK",
    label: "WOOD_OAK",
    color: "#b08158",
    roughness: 0.7,
    defaultScaleFt: 0.5,
  },
  WOOD_WALNUT: {
    id: "WOOD_WALNUT",
    label: "WOOD_WALNUT",
    color: "#5a3a28",
    roughness: 0.7,
    defaultScaleFt: 0.5,
  },
  TILE_WHITE: {
    id: "TILE_WHITE",
    label: "TILE_WHITE",
    color: "#efefef",
    roughness: 0.3,
    defaultScaleFt: 1,
  },
  TILE_BLACK: {
    id: "TILE_BLACK",
    label: "TILE_BLACK",
    color: "#1c1c1c",
    roughness: 0.3,
    defaultScaleFt: 1,
  },
  CONCRETE: {
    id: "CONCRETE",
    label: "CONCRETE",
    color: "#8a8a8a",
    roughness: 0.85,
    defaultScaleFt: 4,
  },
  CARPET: {
    id: "CARPET",
    label: "CARPET",
    color: "#c4b294",
    roughness: 0.95,
    defaultScaleFt: 1,
  },
  MARBLE: {
    id: "MARBLE",
    label: "MARBLE",
    color: "#ece5d6",
    roughness: 0.2,
    defaultScaleFt: 2,
  },
  STONE: {
    id: "STONE",
    label: "STONE",
    color: "#7a6f60",
    roughness: 0.8,
    defaultScaleFt: 1.5,
  },
};

export const FLOOR_PRESET_IDS: FloorPresetId[] = [
  "WOOD_OAK",
  "WOOD_WALNUT",
  "TILE_WHITE",
  "TILE_BLACK",
  "CONCRETE",
  "CARPET",
  "MARBLE",
  "STONE",
];
