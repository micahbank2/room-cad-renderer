export interface Point {
  x: number;
  y: number;
}

export type WallSide = "A" | "B";

export interface WainscotConfig {
  enabled: boolean;
  /** Reference to a WainscotStyleItem in the global library (Phase 16).
   *  If missing, renders using heightFt + color as legacy recessed-panel. */
  styleItemId?: string;
  heightFt: number; // default 3 (36") — legacy fallback
  color: string; // legacy fallback
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
  /** Phase 48 CAM-04 (D-03): bookmarked camera angle for double-click Focus.
   *  Optional — older snapshots load with undefined; falls through to default focus. */
  savedCameraPos?: [number, number, number];
  /** Phase 48 CAM-04 (D-03): bookmarked camera target. Pairs with savedCameraPos. */
  savedCameraTarget?: [number, number, number];
}

export interface Wallpaper {
  kind: "color" | "pattern" | "paint";
  color?: string; // when kind="color"
  paintId?: string; // when kind="paint" — FK into F&B catalog or custom paints
  limeWash?: boolean; // per-placement lime wash toggle
  imageUrl?: string; // when kind="pattern" (data URL) — legacy backward-compat
  /** Phase 34 (LIB-06/08): id of a UserTexture in the `room-cad-user-textures`
   *  IDB keyspace. When present, takes priority over `imageUrl` at render. */
  userTextureId?: string;
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
  /** Per-placement frame color hex override (POLISH-04). When set, overrides
   *  the library frameStyle's default color for this specific placement. */
  frameColorOverride?: string;
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
  /** D-01/D-02: per-axis width override. Set only by edge-handle drag.
   *  When present, resolver returns override (ignores sizeScale for width). */
  widthFtOverride?: number;
  /** D-01/D-02: per-axis depth override. Set only by edge-handle drag. */
  depthFtOverride?: number;
  /** Phase 48 CAM-04 (D-03). */
  savedCameraPos?: [number, number, number];
  /** Phase 48 CAM-04 (D-03). */
  savedCameraTarget?: [number, number, number];
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
  /** D-01/D-02: per-axis width override. */
  widthFtOverride?: number;
  /** D-01/D-02: per-axis depth override. */
  depthFtOverride?: number;
  /** D-13: per-placement display name override. Empty/undefined → render catalog name. Max 40 chars (client-enforced). */
  labelOverride?: string;
  /** Phase 48 CAM-04 (D-03). */
  savedCameraPos?: [number, number, number];
  /** Phase 48 CAM-04 (D-03). */
  savedCameraTarget?: [number, number, number];
}

export interface Ceiling {
  id: string;
  /** Polygon vertices in feet, CCW winding. */
  points: Point[];
  /** Height above floor in feet. Defaults to room.wallHeight. */
  height: number;
  /** Solid hex color (e.g. "#f5f5f5") or material preset id (e.g. "mat-plaster"). */
  material: string;
  /** Paint color FK into F&B catalog or custom paints (Phase 18). */
  paintId?: string;
  /** Lime wash toggle for ceiling paint (Phase 18). */
  limeWash?: boolean;
  /** Surface material preset FK into SURFACE_MATERIALS catalog (Phase 20). */
  surfaceMaterialId?: string;
  /** Phase 34 (LIB-06/08): id of a UserTexture in the `room-cad-user-textures`
   *  IDB keyspace. When present, takes priority over `surfaceMaterialId` at render. */
  userTextureId?: string;
  /** Phase 42 (BUG-01): per-ceiling tile-size override (in feet) for the
   *  user-uploaded texture. Written at apply-time when the user picks a
   *  `userTextureId`. Mirrors `Wallpaper.scaleFt` + `FloorMaterial.scaleFt`.
   *
   *  Resolver precedence in `CeilingMesh`: `ceiling.scaleFt ?? catalog.tileSizeFt ?? 2`.
   *
   *  Optional: existing snapshots that pre-date the BUG-01 fix have no value
   *  here and fall through to the catalog default — functionally equivalent
   *  to pre-fix behavior. Closes [GH #96](https://github.com/micahbank2/room-cad-renderer/issues/96). */
  scaleFt?: number;
  /** Phase 48 CAM-04 (D-03). */
  savedCameraPos?: [number, number, number];
  /** Phase 48 CAM-04 (D-03). */
  savedCameraTarget?: [number, number, number];
}

export interface FloorMaterial {
  kind: "preset" | "custom" | "user-texture";
  /** Present when kind === "preset". From FLOOR_PRESET_IDS. */
  presetId?: string;
  /** Present when kind === "custom". Data URL — legacy backward-compat. */
  imageUrl?: string;
  /** Phase 34 (LIB-06/08): present when kind === "user-texture". Id of a
   *  UserTexture in the `room-cad-user-textures` IDB keyspace. */
  userTextureId?: string;
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
  /** User-created custom paint colors — persisted in snapshot for undo safety (Phase 18). */
  customPaints?: import("./paint").PaintColor[];
  /** Last 8 applied paintId values — prepend on apply, max 8, no duplicates (Phase 18). */
  recentPaints?: string[];
}

/** Pre-v2 on-disk shape — used only by migrateSnapshot. */
export interface LegacySnapshotV1 {
  room: Room;
  walls: Record<string, WallSegment>;
  placedProducts: Record<string, PlacedProduct>;
}

export type ToolType = "select" | "wall" | "door" | "window" | "product" | "ceiling";
