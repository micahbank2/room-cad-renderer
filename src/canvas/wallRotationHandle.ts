import type { Point, WallSegment } from "@/types/cad";

/** Offset of the rotation handle from the wall's midpoint, in feet.
 *  Positioned perpendicular to the wall (on the "left" side). */
export const WALL_HANDLE_OFFSET_FT = 1.2;
export const WALL_HANDLE_HIT_RADIUS_FT = 0.5;

/** Compute the world position of the rotation handle for a wall. */
export function getWallHandleWorldPos(wall: WallSegment): Point {
  const cx = (wall.start.x + wall.end.x) / 2;
  const cy = (wall.start.y + wall.end.y) / 2;
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return { x: cx, y: cy };
  // Perpendicular unit vector (CCW 90° from wall direction)
  const px = -dy / len;
  const py = dx / len;
  return {
    x: cx + px * WALL_HANDLE_OFFSET_FT,
    y: cy + py * WALL_HANDLE_OFFSET_FT,
  };
}

export function hitTestWallHandle(feetPos: Point, wall: WallSegment): boolean {
  const h = getWallHandleWorldPos(wall);
  const dx = feetPos.x - h.x;
  const dy = feetPos.y - h.y;
  return Math.sqrt(dx * dx + dy * dy) <= WALL_HANDLE_HIT_RADIUS_FT;
}

/** Returns the current wall angle in degrees (0 = east, 90 = south). */
export function wallAngleDeg(wall: WallSegment): number {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/** Angle from wall's midpoint to pointer, in degrees. */
export function angleFromMidpointToPointer(wall: WallSegment, pointer: Point): number {
  const cx = (wall.start.x + wall.end.x) / 2;
  const cy = (wall.start.y + wall.end.y) / 2;
  return (Math.atan2(pointer.y - cy, pointer.x - cx) * 180) / Math.PI;
}

export function snapWallAngle(rawDeg: number, shiftHeld: boolean): number {
  const SNAP = 15;
  return shiftHeld ? rawDeg : Math.round(rawDeg / SNAP) * SNAP;
}
