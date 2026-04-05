import type { Point, WallSegment } from "@/types/cad";

/** Snap a value to the nearest increment */
export function snapTo(value: number, increment: number): number {
  return Math.round(value / increment) * increment;
}

/** Snap a point to the nearest grid increment */
export function snapPoint(p: Point, grid: number): Point {
  return { x: snapTo(p.x, grid), y: snapTo(p.y, grid) };
}

/** Distance between two points */
export function distance(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

/** Angle of line from a to b in radians */
export function angle(a: Point, b: Point): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

/** Wall length in feet */
export function wallLength(wall: WallSegment): number {
  return distance(wall.start, wall.end);
}

/**
 * Constrain endpoint to orthogonal (0/90/180/270) if close to an axis.
 * Used when Shift is held during wall drawing.
 */
export function constrainOrthogonal(start: Point, end: Point): Point {
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);
  if (dx > dy) {
    return { x: end.x, y: start.y };
  }
  return { x: start.x, y: end.y };
}

/**
 * Get the 4 corner points of a thick wall segment (rectangle).
 * Returns corners in order: start-left, start-right, end-right, end-left
 */
export function wallCorners(wall: WallSegment): [Point, Point, Point, Point] {
  const a = angle(wall.start, wall.end);
  const perpAngle = a + Math.PI / 2;
  const halfT = wall.thickness / 2;
  const dx = Math.cos(perpAngle) * halfT;
  const dy = Math.sin(perpAngle) * halfT;

  return [
    { x: wall.start.x - dx, y: wall.start.y - dy },
    { x: wall.start.x + dx, y: wall.start.y + dy },
    { x: wall.end.x + dx, y: wall.end.y + dy },
    { x: wall.end.x - dx, y: wall.end.y - dy },
  ];
}

/** Format feet as a display string, e.g. 3.5 -> "3'-6\"" */
export function formatFeet(feet: number): string {
  const wholeFeet = Math.floor(feet);
  const inches = Math.round((feet - wholeFeet) * 12);
  if (inches === 0) return `${wholeFeet}'`;
  if (inches === 12) return `${wholeFeet + 1}'`;
  return `${wholeFeet}'-${inches}"`;
}

/** Find the closest point on a wall segment to a given point */
export function closestPointOnWall(
  wall: WallSegment,
  p: Point
): { point: Point; t: number } {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { point: { ...wall.start }, t: 0 };

  let t = ((p.x - wall.start.x) * dx + (p.y - wall.start.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  return {
    point: { x: wall.start.x + t * dx, y: wall.start.y + t * dy },
    t,
  };
}

let _idCounter = 0;
export function uid(): string {
  return `${++_idCounter}_${Date.now().toString(36)}`;
}

/**
 * Resize a wall by moving its end point along the wall's current unit vector
 * so the new segment length equals newLengthFt. Start is kept fixed.
 * Returns the new end point. For zero-length or invalid inputs, returns start.
 */
export function resizeWall(wall: WallSegment, newLengthFt: number): Point {
  if (!(newLengthFt > 0)) return { ...wall.start };
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return { ...wall.start };
  const ux = dx / len;
  const uy = dy / len;
  return { x: wall.start.x + ux * newLengthFt, y: wall.start.y + uy * newLengthFt };
}
