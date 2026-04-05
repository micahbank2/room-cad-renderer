import type { Point, WallSegment, Opening } from "@/types/cad";

export const OPENING_HANDLE_HIT_RADIUS_FT = 0.4;

/** Compute the world positions of the 2 side handles of an opening on its
 *  host wall. The side handles sit at the opening's left/right edges along
 *  the wall centerline (dragging them resizes the opening width). */
export function getOpeningHandles(
  wall: WallSegment,
  opening: Opening,
): { left: Point; right: Point; center: Point } {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) {
    return { left: { ...wall.start }, right: { ...wall.start }, center: { ...wall.start } };
  }
  const tStart = opening.offset / len;
  const tEnd = (opening.offset + opening.width) / len;
  const tCenter = (tStart + tEnd) / 2;
  return {
    left: {
      x: wall.start.x + dx * tStart,
      y: wall.start.y + dy * tStart,
    },
    right: {
      x: wall.start.x + dx * tEnd,
      y: wall.start.y + dy * tEnd,
    },
    center: {
      x: wall.start.x + dx * tCenter,
      y: wall.start.y + dy * tCenter,
    },
  };
}

export function hitTestOpeningHandle(
  feetPos: Point,
  wall: WallSegment,
  opening: Opening,
): "left" | "right" | "center" | null {
  const h = getOpeningHandles(wall, opening);
  const check = (p: Point) => {
    const dx = feetPos.x - p.x;
    const dy = feetPos.y - p.y;
    return Math.sqrt(dx * dx + dy * dy) <= OPENING_HANDLE_HIT_RADIUS_FT;
  };
  if (check(h.left)) return "left";
  if (check(h.right)) return "right";
  if (check(h.center)) return "center";
  return null;
}

/** Project a world point onto the wall's centerline and return its offset
 *  along the wall in feet (0 at start, wallLen at end). */
export function projectOntoWall(feetPos: Point, wall: WallSegment): number {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return 0;
  const t = ((feetPos.x - wall.start.x) * dx + (feetPos.y - wall.start.y) * dy) / lenSq;
  return t * Math.sqrt(lenSq);
}
