import type { Room, WallSegment } from "@/types/cad";

export const WALL_PADDING = 1; // feet — D-07 clearance from walls

export interface Point2 {
  x: number;
  z: number;
}

/**
 * Compute wall's axis-aligned bounding box, inflated by padding + half-thickness.
 * NOTE: 2D canvas Point.y corresponds to Three.js z-axis in walk-collision domain.
 */
function wallAABB(wall: WallSegment, padding: number): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const inflate = padding + wall.thickness / 2;
  const minX = Math.min(wall.start.x, wall.end.x) - inflate;
  const maxX = Math.max(wall.start.x, wall.end.x) + inflate;
  const minZ = Math.min(wall.start.y, wall.end.y) - inflate;
  const maxZ = Math.max(wall.start.y, wall.end.y) + inflate;
  return { minX, maxX, minZ, maxZ };
}

function pointInAABB(p: Point2, box: { minX: number; maxX: number; minZ: number; maxZ: number }): boolean {
  return p.x >= box.minX && p.x <= box.maxX && p.z >= box.minZ && p.z <= box.maxZ;
}

function clampToRoom(p: Point2, room: Room): Point2 {
  return {
    x: Math.max(0, Math.min(room.width, p.x)),
    z: Math.max(0, Math.min(room.length, p.z)),
  };
}

/**
 * Walk-mode collision: from `from`, attempt to move to `to`.
 * Returns safe target point. Tries full movement, then x-only slide, then z-only slide,
 * then stays put. Final result is clamped to room bounds.
 *
 * Walls only (D-07): ignores products and openings.
 * Padding default 1 ft (D-07 + D-08 safety).
 */
export function canMoveTo(
  from: Point2,
  to: Point2,
  walls: WallSegment[],
  room: Room,
  padding: number = WALL_PADDING
): Point2 {
  const boxes = walls.map((w) => wallAABB(w, padding));

  const blocked = (p: Point2): boolean => {
    for (const box of boxes) {
      if (pointInAABB(p, box)) return true;
    }
    return false;
  };

  const clampedTo = clampToRoom(to, room);

  // 1. Try full movement
  if (!blocked(clampedTo)) return clampedTo;

  // 2. Slide along x only (keep z from `from`)
  const slideX = clampToRoom({ x: clampedTo.x, z: from.z }, room);
  if (!blocked(slideX)) return slideX;

  // 3. Slide along z only (keep x from `from`)
  const slideZ = clampToRoom({ x: from.x, z: clampedTo.z }, room);
  if (!blocked(slideZ)) return slideZ;

  // 4. Can't move — stay put (clamped to room)
  return clampToRoom(from, room);
}
