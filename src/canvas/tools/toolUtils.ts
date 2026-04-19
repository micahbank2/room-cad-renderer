import { getActiveRoomDoc } from "@/stores/cadStore";
import { closestPointOnWall, distance, wallLength } from "@/lib/geometry";
import type { Point, WallSegment } from "@/types/cad";

/** Default snap threshold (in feet) for wall hit-testing by door/window tools. */
export const WALL_SNAP_THRESHOLD_FT = 0.5;

/** Convert canvas-pixel coordinates to real-world feet. */
export function pxToFeet(
  px: { x: number; y: number },
  origin: { x: number; y: number },
  scale: number,
): Point {
  return {
    x: (px.x - origin.x) / scale,
    y: (px.y - origin.y) / scale,
  };
}

/**
 * Find the closest wall to a feet-space position within WALL_SNAP_THRESHOLD_FT.
 * Skips walls shorter than minWallLength so the caller's element (door/window)
 * can fit. Pass DOOR_WIDTH or WINDOW_WIDTH at the call site — required to
 * surface size-contract mismatches at compile time (Pitfall #6).
 */
export function findClosestWall(
  feetPos: Point,
  minWallLength: number,
): { wall: WallSegment; offset: number } | null {
  const walls = getActiveRoomDoc()?.walls ?? {};
  let best: { wall: WallSegment; offset: number; dist: number } | null = null;
  for (const wall of Object.values(walls)) {
    const len = wallLength(wall);
    if (len < minWallLength) continue;
    const { point, t } = closestPointOnWall(wall, feetPos);
    const d = distance(point, feetPos);
    const offset = t * len;
    if (d < WALL_SNAP_THRESHOLD_FT && (!best || d < best.dist)) {
      best = { wall, offset, dist: d };
    }
  }
  return best ? { wall: best.wall, offset: best.offset } : null;
}
