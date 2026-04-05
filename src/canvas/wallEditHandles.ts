import type { Point, WallSegment } from "@/types/cad";

export const WALL_ENDPOINT_HIT_RADIUS_FT = 0.5;
export const WALL_THICKNESS_HIT_RADIUS_FT = 0.5;

/** Wall endpoint handle positions (at start + end). */
export function getWallEndpointHandles(wall: WallSegment): { start: Point; end: Point } {
  return { start: { ...wall.start }, end: { ...wall.end } };
}

export function hitTestWallEndpoint(
  feetPos: Point,
  wall: WallSegment,
): "start" | "end" | null {
  const dxs = feetPos.x - wall.start.x;
  const dys = feetPos.y - wall.start.y;
  if (Math.sqrt(dxs * dxs + dys * dys) <= WALL_ENDPOINT_HIT_RADIUS_FT) return "start";
  const dxe = feetPos.x - wall.end.x;
  const dye = feetPos.y - wall.end.y;
  if (Math.sqrt(dxe * dxe + dye * dye) <= WALL_ENDPOINT_HIT_RADIUS_FT) return "end";
  return null;
}

/** Thickness handle sits on the wall's right edge at midpoint. Dragging
 *  perpendicular to the wall adjusts thickness (drag further out = thicker). */
export function getWallThicknessHandle(wall: WallSegment): Point {
  const cx = (wall.start.x + wall.end.x) / 2;
  const cy = (wall.start.y + wall.end.y) / 2;
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return { x: cx, y: cy };
  // Right perpendicular (CW 90° from wall direction) offset by halfT
  const px = dy / len;
  const py = -dx / len;
  const halfT = wall.thickness / 2;
  return { x: cx + px * halfT, y: cy + py * halfT };
}

export function hitTestWallThickness(feetPos: Point, wall: WallSegment): boolean {
  const h = getWallThicknessHandle(wall);
  const dx = feetPos.x - h.x;
  const dy = feetPos.y - h.y;
  return Math.sqrt(dx * dx + dy * dy) <= WALL_THICKNESS_HIT_RADIUS_FT;
}

/** Project a feet point onto the wall's right-perpendicular axis from its
 *  midpoint. Returns the signed distance (positive = outside the right edge). */
export function projectThicknessDrag(feetPos: Point, wall: WallSegment): number {
  const cx = (wall.start.x + wall.end.x) / 2;
  const cy = (wall.start.y + wall.end.y) / 2;
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return 0;
  const px = dy / len;
  const py = -dx / len;
  // Signed distance from center along +perp
  return (feetPos.x - cx) * px + (feetPos.y - cy) * py;
}
