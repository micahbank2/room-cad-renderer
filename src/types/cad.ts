export interface Point {
  x: number;
  y: number;
}

export type WallSide = "A" | "B";

export interface WainscotConfig {
  enabled: boolean;
  heightFt: number; // default 3 (36")
  color: string; // hex
}

export interface CrownConfig {
  enabled: boolean;
  heightFt: number; // band height, default 0.33 (4")
  color: string;
}

export interface WallSegment {
  id: string;
  start: Point;
  end: Point;
  thickness: number; // feet, default 0.5
  height: number; // feet, default 8
  openings: Opening[];
  /** Wallpaper per side (Phase 17). */
  wallpaper?: { A?: Wallpaper; B?: Wallpaper };
  /** Wainscoting per side (Phase 17). */
  wainscoting?: { A?: WainscotConfig; B?: WainscotConfig };
  /** Crown molding per side (Phase 17). */
  crownMolding?: { A?: CrownConfig; B?: CrownConfig };
  /** Wall art items. Each item has a side (defaults to "A"). */
  wallArt?: WallArt[];
}

export interface Wallpaper {
  kind: "color" | "pattern";
  color?: string; // when kind="color"
  imageUrl?: string; // when kind="pattern" (data URL)
  scaleFt?: number; // pattern repeat distance, default 2
}

export interface WallArt {
  id: string;
  /** Position along the wall from start, in feet. */
  offset: number;
  /** Height above floor of the art's center, in feet. */
  centerY: number;
  /** Width in feet. */
  width: number;
  /** Height in feet. */
  height: number;
  /** Image data URL. */
  imageUrl: string;
  /** Frame style (Phase 15). Missing = no frame (flat plane, legacy). */
  frameStyle?: import("./framedArt").FrameStyle;
  /** Which face of the wall the art hangs on (Phase 17). Defaults to "A". */
  side?: WallSide;
}

export interface Opening {
  id: string;
  type: "door" | "window";
  offset: number; // distance along wall from start
  width: number; // feet
  height: number; // feet
  sillHeight: number; // feet from floor (0 for doors)
}

export interface PlacedProduct {
  id: string;
  productId: string;
  position: Point; // center, in feet
  rotation: number; // degrees
  /** Per-placement scale multiplier applied to the product's library dims.
   *  1.0 = library default. Stored as a single number so width+depth always
   *  scale together (aspect ratio preserved). */
  sizeScale?: number;
}

export interface Room {
  width: number;
  length: number;
  wallHeight: number;
}

export interface CustomElement {
  id: string;
  name: string;
  /** "box" = full 3D box. "plane" = flat 2D plane (e.g. a custom rug, wall decal). */
  shape: "box" | "plane";
  width: number; // feet
  depth: number; // feet
  height: number; // feet (ignored for plane — plane lies flat on floor)
  /** Hex color or material string. */
  color: string;
}

export interface PlacedCustomElement {
  id: string;
  customElementId: string;
  position: Point; // center in feet
  rotation: number; // degrees
  sizeScale?: number; // per-placement scale
}

export interface Ceiling {
  id: string;
  /** Polygon vertices in feet, CCW winding. */
  points: Point[];
  /** Height above floor in feet. Defaults to room.wallHeight. */
  height: number;
  /** Solid hex color (e.g. "#f5f5f5") or material preset id (e.g. "mat-plaster"). */
  material: string;
}

export interface FloorMaterial {
  kind: "preset" | "custom";
  /** Present when kind === "preset". From FLOOR_PRESET_IDS. */
  presetId?: string;
  /** Present when kind === "custom". Data URL. */
  imageUrl?: string;
  /** Texture tile repeat distance in feet (e.g. 2 = pattern repeats every 2ft). */
  scaleFt: number;
  /** Texture rotation in degrees. */
  rotationDeg: number;
}

export interface RoomDoc {
  id: string;
  name: string;
  room: Room;
  walls: Record<string, WallSegment>;
  placedProducts: Record<string, PlacedProduct>;
  /** Optional reference image (data URL) shown as background on the 2D canvas.
   *  Useful for tracing an existing floor plan (e.g., an architect's drawing). */
  floorPlanImage?: string;
  /** Ceilings drawn as independent polygon surfaces overhead. */
  ceilings?: Record<string, Ceiling>;
  /** Floor material (preset or custom upload). Per-room. */
  floorMaterial?: FloorMaterial;
  /** Placed custom elements (references customElements catalog on snapshot). */
  placedCustomElements?: Record<string, PlacedCustomElement>;
}

export interface CADSnapshot {
  version: 2;
  rooms: Record<string, RoomDoc>;
  activeRoomId: string | null;
  /** Per-project catalog of custom elements (reusable across rooms). */
  customElements?: Record<string, CustomElement>;
}

/** Pre-v2 on-disk shape — used only by migrateSnapshot. */
export interface LegacySnapshotV1 {
  room: Room;
  walls: Record<string, WallSegment>;
  placedProducts: Record<string, PlacedProduct>;
}

export type ToolType = "select" | "wall" | "door" | "window" | "product" | "ceiling";
