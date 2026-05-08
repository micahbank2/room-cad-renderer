import type { FaceDirection } from "./material";

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
  /** Phase 68 D-03: per-side Material reference. Wins over `wallpaper` at render
   *  time. Legacy `wallpaper` is kept readable through v1.17 as a safety net
   *  (D-01); removal scheduled for v1.18 cleanup. */
  materialIdA?: string;
  /** Phase 68 D-03: per-side Material reference for wall side B. */
  materialIdB?: string;
  /** Phase 68 D-04: per-side tile-size override (feet) for the resolved
   *  Material. Read precedence in `resolveSurfaceTileSize`:
   *  `scaleFtA ?? material.tileSizeFt ?? 1`. Mirrors `Wallpaper.scaleFt`. */
  scaleFtA?: number;
  /** Phase 68 D-04: per-side tile-size override for wall side B. */
  scaleFtB?: number;
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
  /** Phase 61 OPEN-01: extended union — adds archway / passthrough / niche.
   *  Existing snapshots with "door" | "window" remain valid (superset extension). */
  type: "door" | "window" | "archway" | "passthrough" | "niche";
  offset: number; // distance along wall from start
  width: number; // feet
  height: number; // feet
  sillHeight: number; // feet from floor (0 for doors / archways / passthroughs)
  /** Phase 61 OPEN-01: niche-only — depth of the recess into the wall body, in feet.
   *  Optional; ignored for through-hole kinds (door / window / archway / passthrough).
   *  Default 0.5 (6"). Clamped at placement + edit to wallThickness − 1″. */
  depthFt?: number;
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
  /** Phase 69 MAT-LINK-01: per-placement finish Material reference. When set,
   *  ProductBox renders the Material's colorHex/colorMapId + roughness instead
   *  of the product.imageUrl texture. Box-mode products only; GLTF products
   *  ignore this field (deferred — embedded PBR materials own their surfaces). */
  finishMaterialId?: string;
}

export interface Room {
  width: number;
  length: number;
  wallHeight: number;
}

/**
 * Phase 60 STAIRS-01 (D-01): straight-run stair primitive.
 *
 * Stored at the room level (`RoomDoc.stairs`). NOT a customElement kind because
 * stair-specific fields (rise, run, stepCount) don't fit the customElement
 * catalog/placement model.
 *
 * IMPORTANT (D-04): `position` is the BOTTOM-STEP CENTER, NOT the bbox center.
 * The stair extends AWAY from `position` along the UP direction defined by
 * `rotation` (0° = +Y in 2D feet). Tools and consumers must translate between
 * bottom-step center and bbox center where bbox-center is needed (e.g. snap).
 */
export interface Stair {
  /** Format: `stair_<uid>`. */
  id: string;
  /** Bottom-step center, in feet (D-04 — NOT bbox center). */
  position: Point;
  /** Continuous degrees (D-02). Shift-snap to 15° handled by the placement tool. */
  rotation: number;
  /** Per-step rise in inches (default 7). */
  riseIn: number;
  /** Per-step run in inches (default 11). */
  runIn: number;
  /** Phase 31 width drag override. When undefined → DEFAULT_STAIR_WIDTH_FT (3 ft / 36"). */
  widthFtOverride?: number;
  /** Number of steps (default 12). */
  stepCount: number;
  /** Per-placement label override (D-08). Empty/undefined renders default "STAIRS". Max 40 chars. */
  labelOverride?: string;
  /** Phase 48 CAM-04 mirror (D-14). */
  savedCameraPos?: [number, number, number];
  /** Phase 48 CAM-04 mirror (D-14). */
  savedCameraTarget?: [number, number, number];
}

/** Phase 60 (D-13): default per-stair width when widthFtOverride is undefined. */
export const DEFAULT_STAIR_WIDTH_FT = 3; // 36"

/** Phase 60 (D-13): non-id, non-position default config (residential IBC R311). */
export const DEFAULT_STAIR: Omit<Stair, "id" | "position"> = {
  rotation: 0,
  riseIn: 7,
  runIn: 11,
  stepCount: 12,
  widthFtOverride: undefined,
  labelOverride: undefined,
};

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
  /** Phase 68 D-07: per-face Material override. Each face independently resolves
   *  to a Material; missing faces fall back to the catalog `CustomElement.color`.
   *  Per-placement (NOT catalog) so two placements of the same custom element
   *  can carry different finishes. `Partial<Record<...>>` so missing faces are
   *  valid (no need to populate all six). */
  faceMaterials?: Partial<Record<FaceDirection, string>>;
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
  /** Phase 68 D-03: ceiling Material reference. Wins over all legacy fields
   *  (`material`, `paintId`, `surfaceMaterialId`, `userTextureId`) at render
   *  time. Legacy fields kept readable through v1.17 (D-01). */
  materialId?: string;
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
  /** Phase 65 CEIL-02 — target absolute bbox width in feet. When set,
   *  resolveCeilingPoints scales every vertex along x from anchorXFt
   *  (default bbox.minX of original points). */
  widthFtOverride?: number;
  /** Phase 65 CEIL-02 — target absolute bbox depth in feet. When set,
   *  resolveCeilingPoints scales every vertex along y from anchorYFt
   *  (default bbox.minY of original points). */
  depthFtOverride?: number;
  /** Phase 65 CEIL-02 — fixed bbox-X point during scaling. Defaults to
   *  original bbox.minX. Set to bbox.maxX explicitly when the user drags
   *  the WEST edge so the east edge stays put. */
  anchorXFt?: number;
  /** Phase 65 CEIL-02 — fixed bbox-Y point during scaling. Defaults to
   *  original bbox.minY. Set to bbox.maxY when the user drags the NORTH
   *  edge so the south edge stays put. */
  anchorYFt?: number;
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
  /** Phase 68 D-03: floor Material reference. Wins over `floorMaterial` at
   *  render time. Legacy `floorMaterial` kept readable through v1.17 (D-01).
   *  When the migration encounters a preset (e.g. `WOOD_OAK`), it stores the
   *  preset id directly here without generating a new Material entry. */
  floorMaterialId?: string;
  /** Phase 68 D-04: floor tile-size override (feet). Mirrors `FloorMaterial.scaleFt`.
   *  Read precedence: `floorScaleFt ?? material.tileSizeFt ?? 1`. */
  floorScaleFt?: number;
  /** Placed custom elements (references customElements catalog on snapshot). */
  placedCustomElements?: Record<string, PlacedCustomElement>;
  /** Phase 60 STAIRS-01 (D-01): per-room stairs. Optional — older snapshots
   *  load with empty `{}` via v3→v4 migration. Consumers MUST use `?? {}`
   *  defensive fallback (research Pitfall 2). */
  stairs?: Record<string, Stair>;
  /** Phase 62 MEASURE-01: per-room dimension lines (decorative annotations).
   *  Optional — older snapshots load with empty `{}` via v4→v5 migration. */
  measureLines?: Record<string, MeasureLine>;
  /** Phase 62 MEASURE-01: per-room free-form text annotations.
   *  Optional — older snapshots load with empty `{}` via v4→v5 migration. */
  annotations?: Record<string, Annotation>;
}

/**
 * Phase 62 MEASURE-01 (D-01): dimension line between two points in feet.
 * Decorative — does not contribute to snap geometry (D-09).
 */
export interface MeasureLine {
  /** Format: `meas_<uid>`. */
  id: string;
  start: Point;
  end: Point;
}

/**
 * Phase 62 MEASURE-01 (D-01): free-form text annotation placed at a point in feet.
 * Decorative — empty text means the annotation is mid-edit (DOM overlay shows instead).
 */
export interface Annotation {
  /** Format: `anno_<uid>`. */
  id: string;
  position: Point;
  text: string;
}

export interface CADSnapshot {
  /** Phase 68 MAT-APPLY-01 (D-03): bumped from 5 to 6 — new surface Material
   *  reference fields (Wall.materialIdA/B, RoomDoc.floorMaterialId,
   *  Ceiling.materialId, PlacedCustomElement.faceMaterials). v5 snapshots
   *  migrate via migrateV5ToV6 (Plan 03).
   *
   *  Phase 69 MAT-LINK-01: bumped from 6 to 7 — adds optional
   *  `PlacedProduct.finishMaterialId`. Migration is a trivial passthrough
   *  (the field is optional, so absence is the correct legacy behavior). */
  version: 7;
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

export type ToolType =
  | "select"
  | "wall"
  | "door"
  | "window"
  | "product"
  | "ceiling"
  // Phase 60 STAIRS-01: stair placement tool.
  | "stair"
  // Phase 61 OPEN-01: three new wall-cutout placement tools.
  | "archway"
  | "passthrough"
  | "niche"
  // Phase 62 MEASURE-01: dimension-line + text-label placement tools.
  | "measure"
  | "label";

/** Phase 61 OPEN-01: per-kind default dimensions for new openings.
 *  - door: 3ft × 6.67ft (6'-8" std), sill 0
 *  - window: 3ft × 4ft, sill 3ft
 *  - archway: 3ft × 7ft, sill 0 (full-height + arched top, no door)
 *  - passthrough: 5ft × wallHeight, sill 0 (full wall height; falls back to 8ft)
 *  - niche: 2ft × 3ft, sill 3ft, depth 0.5ft (typical shelf-height recess)
 */
export function getOpeningDefaults(
  type: Opening["type"],
  wallHeight?: number,
): { width: number; height: number; sillHeight: number; depthFt?: number } {
  switch (type) {
    case "door":
      return { width: 3, height: 6.67, sillHeight: 0 };
    case "window":
      return { width: 3, height: 4, sillHeight: 3 };
    case "archway":
      return { width: 3, height: 7, sillHeight: 0 };
    case "passthrough":
      return { width: 5, height: wallHeight ?? 8, sillHeight: 0 };
    case "niche":
      return { width: 2, height: 3, sillHeight: 3, depthFt: 0.5 };
  }
}

/** Phase 61 OPEN-01 (D-05 Pitfall 1): clamp niche depth so the recess
 *  never breaks through the wall back face. Min 1″ (recess is readable);
 *  max wallThickness − 1″ (preserve a 1″ wall back). All inputs in feet. */
export function clampNicheDepth(depthFt: number, wallThickness: number): number {
  const minFt = 1 / 12; // 1 inch
  const maxFt = Math.max(minFt, wallThickness - 1 / 12);
  return Math.min(Math.max(depthFt, minFt), maxFt);
}
