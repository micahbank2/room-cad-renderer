export interface Point {
  x: number;
  y: number;
}

export interface WallSegment {
  id: string;
  start: Point;
  end: Point;
  thickness: number; // feet, default 0.5
  height: number; // feet, default 8
  openings: Opening[];
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

export interface RoomDoc {
  id: string;
  name: string;
  room: Room;
  walls: Record<string, WallSegment>;
  placedProducts: Record<string, PlacedProduct>;
  /** Optional reference image (data URL) shown as background on the 2D canvas.
   *  Useful for tracing an existing floor plan (e.g., an architect's drawing). */
  floorPlanImage?: string;
}

export interface CADSnapshot {
  version: 2;
  rooms: Record<string, RoomDoc>;
  activeRoomId: string | null;
}

/** Pre-v2 on-disk shape — used only by migrateSnapshot. */
export interface LegacySnapshotV1 {
  room: Room;
  walls: Record<string, WallSegment>;
  placedProducts: Record<string, PlacedProduct>;
}

export type ToolType = "select" | "wall" | "door" | "window" | "product";
