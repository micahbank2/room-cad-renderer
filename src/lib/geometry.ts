import type { Point, WallSegment, Ceiling } from "@/types/cad";

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

/**
 * Compute the 4 corners of a wall segment with mitred joins at any endpoint
 * that shares a position with another wall. Returns corners in the same order
 * as wallCorners(): [startLeft, startRight, endRight, endLeft].
 */
export function mitredWallCorners(
  wall: WallSegment,
  walls: WallSegment[]
): [Point, Point, Point, Point] {
  const defaults = wallCorners(wall);
  let [startLeft, startRight, endRight, endLeft] = defaults;

  const ptsEqual = (a: Point, b: Point) =>
    Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;

  // Start endpoint — find a sibling wall that shares this point
  const startNeighbor = walls.find(
    (w) =>
      w.id !== wall.id &&
      (ptsEqual(w.start, wall.start) || ptsEqual(w.end, wall.start)),
  );
  if (startNeighbor) {
    const mitred = computeMitreCorners(wall, startNeighbor, wall.start);
    if (mitred) {
      // wallCorners() uses (-perp) for "left" at start, but our mitre uses
      // (+perp) for its "left" — so assignments are swapped at start.
      startLeft = mitred.right;
      startRight = mitred.left;
    }
  }

  // End endpoint
  const endNeighbor = walls.find(
    (w) =>
      w.id !== wall.id &&
      (ptsEqual(w.start, wall.end) || ptsEqual(w.end, wall.end)),
  );
  if (endNeighbor) {
    const mitred = computeMitreCorners(wall, endNeighbor, wall.end);
    if (mitred) {
      // At end, dA points back toward start so our (+perp) flips to (-perp),
      // which matches wallCorners()' "left" at end. No swap needed.
      endLeft = mitred.left;
      endRight = mitred.right;
    }
  }

  return [startLeft, startRight, endRight, endLeft];
}

/**
 * Compute the mitred left/right corners for wallA at shared point C,
 * given its neighbor wallB. Returns null if walls are parallel.
 *
 * "left" and "right" are defined relative to wallA's direction pointing
 * AWAY from C (so left = +perp, right = -perp of that direction).
 */
function computeMitreCorners(
  wallA: WallSegment,
  wallB: WallSegment,
  C: Point,
): { left: Point; right: Point } | null {
  const ptsEqual = (a: Point, b: Point) =>
    Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;

  // Direction of A pointing AWAY from C
  const otherA = ptsEqual(wallA.start, C) ? wallA.end : wallA.start;
  const dAx = otherA.x - C.x;
  const dAy = otherA.y - C.y;
  const lenA = Math.sqrt(dAx * dAx + dAy * dAy);
  if (lenA < 1e-6) return null;
  const dA = { x: dAx / lenA, y: dAy / lenA };

  // Direction of B pointing AWAY from C
  const otherB = ptsEqual(wallB.start, C) ? wallB.end : wallB.start;
  const dBx = otherB.x - C.x;
  const dBy = otherB.y - C.y;
  const lenB = Math.sqrt(dBx * dBx + dBy * dBy);
  if (lenB < 1e-6) return null;
  const dB = { x: dBx / lenB, y: dBy / lenB };

  // Parallel / collinear walls — no mitre possible
  const cross = dA.x * dB.y - dA.y * dB.x;
  if (Math.abs(cross) < 1e-4) return null;

  // Perpendiculars (left-of-direction: rotate CCW 90°)
  const pA = { x: -dA.y, y: dA.x };
  const pB = { x: -dB.y, y: dB.x };

  const halfTA = wallA.thickness / 2;
  const halfTB = wallB.thickness / 2;

  // Edge anchor points at C
  const aLeftStart = { x: C.x + pA.x * halfTA, y: C.y + pA.y * halfTA };
  const aRightStart = { x: C.x - pA.x * halfTA, y: C.y - pA.y * halfTA };
  const bLeftStart = { x: C.x + pB.x * halfTB, y: C.y + pB.y * halfTB };
  const bRightStart = { x: C.x - pB.x * halfTB, y: C.y - pB.y * halfTB };

  // Line-line intersection: p1 + t*d1 = p2 + s*d2
  const intersect = (p1: Point, d1: Point, p2: Point, d2: Point): Point => {
    const denom = d1.x * d2.y - d1.y * d2.x;
    const t =
      ((p2.x - p1.x) * d2.y - (p2.y - p1.y) * d2.x) / denom;
    return { x: p1.x + t * d1.x, y: p1.y + t * d1.y };
  };

  // Pair edges by cross product sign:
  //   cross > 0: B is CCW from A → A_left pairs with B_right, A_right with B_left
  //   cross < 0: B is CW  from A → A_left pairs with B_left,  A_right with B_right
  let left: Point, right: Point;
  if (cross > 0) {
    left = intersect(aLeftStart, dA, bRightStart, dB);
    right = intersect(aRightStart, dA, bLeftStart, dB);
  } else {
    left = intersect(aLeftStart, dA, bLeftStart, dB);
    right = intersect(aRightStart, dA, bRightStart, dB);
  }

  // Guard against extreme mitres at sharp angles — cap distance from C
  const MAX_MITRE = Math.max(halfTA, halfTB) * 10;
  const capDist = (p: Point, fallback: Point) => {
    const d = Math.sqrt((p.x - C.x) ** 2 + (p.y - C.y) ** 2);
    return d > MAX_MITRE ? fallback : p;
  };
  left = capDist(left, aLeftStart);
  right = capDist(right, aRightStart);

  return { left, right };
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
 * Phase 62 MEASURE-01 (D-04): polygon area via the shoelace formula.
 *
 * Walks `walls[i].start` as ordered polygon vertices. Returns 0 when the
 * loop is non-closed (any consecutive `walls[i].end` ≠ `walls[i+1].start`
 * within 1e-3 ft tolerance — research pitfall 5) so we never display
 * garbage data for in-progress wall layouts. `Math.abs` makes the result
 * winding-agnostic so CCW and CW inputs return identical area.
 *
 * Returns 0 for fewer than 3 walls.
 */
export function polygonArea(walls: WallSegment[]): number {
  if (walls.length < 3) return 0;
  // Connectivity check (pitfall 5): every wall's end must match the next
  // wall's start to a 1e-3 ft tolerance, AND the last wall must close to
  // the first wall's start. Both conditions covered by the modular index.
  for (let i = 0; i < walls.length; i++) {
    const next = walls[(i + 1) % walls.length];
    if (distance(walls[i].end, next.start) > 1e-3) return 0;
  }
  const verts = walls.map((w) => w.start);
  let sum = 0;
  for (let i = 0; i < verts.length; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % verts.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

/**
 * Phase 62 MEASURE-01 (D-04): area-weighted polygon centroid.
 *
 * For severe U/C concave shapes the centroid may land outside the polygon —
 * acceptable v1.15 limitation per research Q4 (deferred to v1.16+). Falls
 * back to the vertex average for degenerate (zero-area) input so callers
 * always get a usable point.
 */
export function polygonCentroid(walls: WallSegment[]): Point {
  const verts = walls.map((w) => w.start);
  if (verts.length < 3) {
    return verts[0] ?? { x: 0, y: 0 };
  }
  let cx = 0;
  let cy = 0;
  let signedArea = 0;
  for (let i = 0; i < verts.length; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % verts.length];
    const cross = a.x * b.y - b.x * a.y;
    signedArea += cross;
    cx += (a.x + b.x) * cross;
    cy += (a.y + b.y) * cross;
  }
  if (Math.abs(signedArea) < 1e-9) {
    const avg = verts.reduce(
      (acc, v) => ({ x: acc.x + v.x, y: acc.y + v.y }),
      { x: 0, y: 0 },
    );
    return { x: avg.x / verts.length, y: avg.y / verts.length };
  }
  signedArea /= 2;
  return { x: cx / (6 * signedArea), y: cy / (6 * signedArea) };
}

/**
 * Phase 65 CEIL-02 — axis-aligned bounding box of a polygon in feet.
 *
 * Returns zeros for an empty point list (caller-safe). The resulting
 * `width` / `depth` are non-negative.
 */
export function polygonBbox(points: Point[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  depth: number;
} {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, depth: 0 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, depth: maxY - minY };
}

/**
 * Phase 65 CEIL-02 — resolve a Ceiling's polygon points after applying any
 * width/depth/anchor overrides written by the edge-handle resize tool.
 *
 * Fast path: when none of the 4 override fields is set, returns the original
 * `ceiling.points` array by referential identity (so memoizing consumers can
 * cheaply detect "no resize").
 *
 * Override formula:
 *   sx = widthFtOverride / origBboxWidth   (defaults to 1 if absent)
 *   sy = depthFtOverride / origBboxDepth   (defaults to 1 if absent)
 *   ax = anchorXFt ?? origBbox.minX
 *   ay = anchorYFt ?? origBbox.minY
 *   newP = (ax + (p.x - ax) * sx, ay + (p.y - ay) * sy)
 *
 * Anchor semantics:
 *   - East-edge drag: width grows; ax defaults to bbox.minX → west edge fixed.
 *   - West-edge drag: width grows; ax = bbox.maxX → east edge fixed.
 *   - South / north drags: same idea on the y axis.
 */
export function resolveCeilingPoints(ceiling: Ceiling): Point[] {
  const { widthFtOverride, depthFtOverride, anchorXFt, anchorYFt } = ceiling;
  if (
    widthFtOverride === undefined &&
    depthFtOverride === undefined &&
    anchorXFt === undefined &&
    anchorYFt === undefined
  ) {
    return ceiling.points;
  }
  const bbox = polygonBbox(ceiling.points);
  const sx =
    widthFtOverride !== undefined && bbox.width > 0
      ? widthFtOverride / bbox.width
      : 1;
  const sy =
    depthFtOverride !== undefined && bbox.depth > 0
      ? depthFtOverride / bbox.depth
      : 1;
  const ax = anchorXFt ?? bbox.minX;
  const ay = anchorYFt ?? bbox.minY;
  return ceiling.points.map((p) => ({
    x: ax + (p.x - ax) * sx,
    y: ay + (p.y - ay) * sy,
  }));
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
