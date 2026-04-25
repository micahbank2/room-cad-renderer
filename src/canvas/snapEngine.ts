/**
 * Phase 30 — Smart-snap pure engine.
 *
 * Pure, unit-testable math for per-axis smart snapping (D-01). No Fabric, no
 * store, no DOM. Inputs / outputs in world feet; pixel tolerance is converted
 * to feet at call time via `tolerancePx / scale` (D-04).
 *
 * Decisions (see .planning/phases/30-smart-snapping/30-CONTEXT.md):
 *   - D-01: pure module, caller passes state in
 *   - D-02: snap targets = wall outer edges, wall midpoints, other object bbox edges
 *   - D-02b: dragged object excluded by id
 *   - D-03: source = dragged object's axis-aligned bbox edges + center
 *   - D-04: SNAP_TOLERANCE_PX = 8
 *   - D-05: per-axis independent
 *   - D-05a: midpoint > object-edge > wall-face tiebreak
 *   - D-05b: grid fallback per axis when no smart-snap winner
 *   - D-09: O(N) linear scan
 *
 * v1 limitation: diagonal walls contribute only their endpoint X/Y values as
 * snap targets (see Pattern 4 in 30-RESEARCH.md). A full perpendicular-
 * projection snap is deferred.
 */
import {
  mitredWallCorners,
  snapPoint,
} from "@/lib/geometry";
import type {
  Point,
  WallSegment,
  CustomElement,
} from "@/types/cad";
import type { Product } from "@/types/product";
import { resolveEffectiveDims, resolveEffectiveCustomDims } from "@/types/product";

// ---------------------------------------------------------------------------
// Public constants
// ---------------------------------------------------------------------------

/** D-04 — locked pixel tolerance. Feet tolerance = SNAP_TOLERANCE_PX / scale. */
export const SNAP_TOLERANCE_PX = 8;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Axis-aligned bounding box in feet. */
export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  /** Identity used for exclude-self and debug. */
  id: string;
}

/** Line segment in feet — wall outer-face representation. */
export interface Segment {
  a: Point;
  b: Point;
  /** Wall id for exclude-self hygiene. */
  wallId: string;
}

/** Fully materialized snap scene — built once per drag start. No live store refs. */
export interface SceneGeometry {
  /** Wall outer-edge segments (2 per wall — left + right outer faces). */
  wallEdges: Segment[];
  /**
   * Wall midpoints with axis classification.
   * - axis === "y": vertical wall (constant X) → midpoint contributes Y target when source is center
   *   (center.y snaps onto midpoint.y). Also contributes X target (midpoint.x) for center→midpoint alignment.
   * - axis === "x": horizontal wall (constant Y) → midpoint contributes X target and Y target similarly.
   * - axis === "diag": diagonal — both X and Y of midpoint act as potential center-alignment targets.
   */
  wallMidpoints: Array<{ point: Point; wallId: string; axis: "x" | "y" | "diag" }>;
  /** Bounding boxes of all OTHER placed products, custom elements, ceilings (exclude-self applied). */
  objectBBoxes: BBox[];
}

/** What the renderer needs to draw one guide. */
export type SnapGuide =
  | { kind: "axis"; axis: "x" | "y"; value: number }
  | { kind: "midpoint-dot"; at: Point };

export interface SnapInput {
  candidate: { pos: Point; bbox: BBox };
  scene: SceneGeometry;
  tolerancePx: number;
  scale: number;
  gridSnap: number;
}

export interface SnapResult {
  snapped: Point;
  guides: SnapGuide[];
}

// ---------------------------------------------------------------------------
// BBox helpers
// ---------------------------------------------------------------------------

/**
 * Axis-aligned bbox of a rotated footprint (Pattern 3). For v1 we use the
 * axis-aligned bbox of the rotated rectangle, not a true oriented bbox —
 * matches D-03 v1 simplification.
 */
export function axisAlignedBBoxOfRotated(
  center: Point,
  width: number,
  depth: number,
  rotationDeg: number,
  id: string,
): BBox {
  const theta = (rotationDeg * Math.PI) / 180;
  const c = Math.abs(Math.cos(theta));
  const s = Math.abs(Math.sin(theta));
  const halfW = (width * c + depth * s) / 2;
  const halfD = (width * s + depth * c) / 2;
  return {
    id,
    minX: center.x - halfW,
    maxX: center.x + halfW,
    minY: center.y - halfD,
    maxY: center.y + halfD,
  };
}

// ---------------------------------------------------------------------------
// buildSceneGeometry
// ---------------------------------------------------------------------------

/** Classify a wall's primary axis (D-09a). */
function classifyAxis(w: WallSegment): "x" | "y" | "diag" {
  const dx = Math.abs(w.end.x - w.start.x);
  const dy = Math.abs(w.end.y - w.start.y);
  if (dx < 1e-6) return "y"; // vertical wall — constant X, midpoint has a Y to align with
  if (dy < 1e-6) return "x"; // horizontal wall — constant Y, midpoint has an X to align with
  return "diag";
}

/**
 * Build a fully-materialized SceneGeometry from a cadStore state snapshot.
 * D-02b: exclude the dragged object by id. D-09b: fully materialize — no
 * live store refs in the returned structure.
 */
export function buildSceneGeometry(
  state: {
    activeRoomId: string | null;
    rooms: Record<string, {
      walls: Record<string, WallSegment>;
      placedProducts: Record<string, { id: string; productId: string; position: Point; rotation: number; sizeScale?: number }>;
      placedCustomElements?: Record<string, { id: string; customElementId: string; position: Point; rotation: number; sizeScale?: number }>;
      ceilings?: Record<string, { id: string; points: Point[] }>;
    }>;
  },
  excludeId: string,
  productLibrary: Product[],
  customCatalog: Record<string, CustomElement>,
): SceneGeometry {
  const doc = state.activeRoomId ? state.rooms[state.activeRoomId] : null;
  if (!doc) return { wallEdges: [], wallMidpoints: [], objectBBoxes: [] };

  const allWalls = Object.values(doc.walls);
  const wallEdges: Segment[] = [];
  const wallMidpoints: Array<{ point: Point; wallId: string; axis: "x" | "y" | "diag" }> = [];

  for (const w of allWalls) {
    // mitredWallCorners returns [startLeft, startRight, endRight, endLeft] —
    // pair (startLeft→endLeft) + (startRight→endRight) are the outer faces.
    const [sL, sR, eR, eL] = mitredWallCorners(w, allWalls);
    wallEdges.push({ a: sL, b: eL, wallId: w.id }); // left face
    wallEdges.push({ a: sR, b: eR, wallId: w.id }); // right face

    wallMidpoints.push({
      point: { x: (w.start.x + w.end.x) / 2, y: (w.start.y + w.end.y) / 2 },
      wallId: w.id,
      axis: classifyAxis(w),
    });
  }

  const objectBBoxes: BBox[] = [];

  for (const pp of Object.values(doc.placedProducts)) {
    if (pp.id === excludeId) continue; // D-02b
    const prod = productLibrary.find((p) => p.id === pp.productId);
    // Phase 31: use resolveEffectiveDims so per-axis overrides flow into snap scene.
    const dims = resolveEffectiveDims(prod, pp);
    objectBBoxes.push(
      axisAlignedBBoxOfRotated(pp.position, dims.width, dims.depth, pp.rotation, pp.id),
    );
  }

  for (const pce of Object.values(doc.placedCustomElements ?? {})) {
    if (pce.id === excludeId) continue; // D-02b
    const el = customCatalog[pce.customElementId];
    if (!el) continue;
    // Phase 31: use resolveEffectiveCustomDims so per-axis overrides flow into snap scene.
    const dims = resolveEffectiveCustomDims(el, pce);
    objectBBoxes.push(
      axisAlignedBBoxOfRotated(
        pce.position,
        dims.width,
        dims.depth,
        pce.rotation,
        pce.id,
      ),
    );
  }

  for (const c of Object.values(doc.ceilings ?? {})) {
    if (c.id === excludeId) continue; // D-02b
    if (!c.points || c.points.length === 0) continue;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of c.points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    objectBBoxes.push({ id: c.id, minX, maxX, minY, maxY });
  }

  return { wallEdges, wallMidpoints, objectBBoxes };
}

// ---------------------------------------------------------------------------
// computeSnap — per-axis scan
// ---------------------------------------------------------------------------

type SrcKind = "edge" | "center";
type TargetKind = "wall-face" | "object-edge" | "midpoint";

interface AxisTarget {
  value: number;
  kind: TargetKind;
  /** Only set when kind === "midpoint" — used to emit midpoint-dot guide. */
  midpointAt?: Point;
}

interface AxisSrc {
  value: number;
  kind: SrcKind;
}

interface AxisWinner {
  dxFt: number;
  priority: 1 | 2 | 3;
  targetValue: number;
  srcValue: number;
  isMidpoint: boolean;
  midpointAt?: Point;
}

/**
 * Per-axis scan with D-05a priority tiebreak.
 *   priority 3 = midpoint (only matches when source kind === "center")
 *   priority 2 = object-edge
 *   priority 1 = wall-face
 * Replace best if strictly closer OR equal-distance + higher priority.
 */
function scanAxis(
  srcs: AxisSrc[],
  targets: AxisTarget[],
  tolFt: number,
): AxisWinner | null {
  let best: AxisWinner | null = null;
  for (const s of srcs) {
    for (const t of targets) {
      // Midpoint targets only apply to center sources (D-03a).
      if (t.kind === "midpoint" && s.kind !== "center") continue;
      const dx = Math.abs(s.value - t.value);
      if (dx > tolFt) continue;

      const priority: 1 | 2 | 3 =
        t.kind === "midpoint" ? 3 : t.kind === "object-edge" ? 2 : 1;

      if (
        !best ||
        dx < best.dxFt - 1e-9 ||
        (Math.abs(dx - best.dxFt) < 1e-9 && priority > best.priority)
      ) {
        best = {
          dxFt: dx,
          priority,
          targetValue: t.value,
          srcValue: s.value,
          isMidpoint: t.kind === "midpoint",
          midpointAt: t.midpointAt,
        };
      }
    }
  }
  return best;
}

/**
 * Pure snap calculation (D-01). Given a candidate position + bbox and a
 * pre-built scene, returns the snapped position + guide descriptors.
 * Per-axis independent (D-05); grid fallback on axes without a winner (D-05b).
 */
export function computeSnap(input: SnapInput): SnapResult {
  const { candidate, scene, tolerancePx, scale, gridSnap } = input;
  const { pos, bbox } = candidate;

  // Defensive: non-positive scale has no sensible feet conversion.
  if (!(scale > 0)) {
    return { snapped: { ...pos }, guides: [] };
  }

  // Pitfall 7: cap tolFt at 2 feet so extreme zoom-out doesn't make snap engage everywhere.
  const tolFt = Math.min(tolerancePx / scale, 2);

  const cx = (bbox.minX + bbox.maxX) / 2;
  const cy = (bbox.minY + bbox.maxY) / 2;

  const srcXs: AxisSrc[] = [
    { value: bbox.minX, kind: "edge" },
    { value: bbox.maxX, kind: "edge" },
    { value: cx, kind: "center" },
  ];
  const srcYs: AxisSrc[] = [
    { value: bbox.minY, kind: "edge" },
    { value: bbox.maxY, kind: "edge" },
    { value: cy, kind: "center" },
  ];

  // --- Build target X list -----------------------------------------------
  const targetXs: AxisTarget[] = [];
  const targetYs: AxisTarget[] = [];

  for (const seg of scene.wallEdges) {
    const dx = Math.abs(seg.b.x - seg.a.x);
    const dy = Math.abs(seg.b.y - seg.a.y);
    if (dx < 1e-6) {
      // Near-vertical wall face → X target at seg.a.x.
      targetXs.push({ value: seg.a.x, kind: "wall-face" });
    } else if (dy < 1e-6) {
      // Near-horizontal wall face → Y target.
      targetYs.push({ value: seg.a.y, kind: "wall-face" });
    } else {
      // v1 simplification (RESEARCH Pattern 4): diagonal wall edges contribute
      // only their endpoints' X and Y values as snap targets. Full
      // perpendicular-projection snap is deferred.
      targetXs.push({ value: seg.a.x, kind: "wall-face" });
      targetXs.push({ value: seg.b.x, kind: "wall-face" });
      targetYs.push({ value: seg.a.y, kind: "wall-face" });
      targetYs.push({ value: seg.b.y, kind: "wall-face" });
    }
  }

  for (const mp of scene.wallMidpoints) {
    // A wall midpoint is a 2D spatial target per D-03a: "centering on the
    // wall midpoint" requires BOTH the dragged center.x AND center.y to be
    // within tolerance of the midpoint. If only one axis is close, treat the
    // alignment as ordinary edge/face snap — not a midpoint event. This keeps
    // the midpoint-dot guide (D-06d) semantically meaningful ("you are
    // centered on this wall"). Without this coupled check, a far-away drag
    // that happened to share a Y coordinate with a wall midpoint would flash
    // a misleading midpoint indicator.
    const dxToMid = Math.abs(cx - mp.point.x);
    const dyToMid = Math.abs(cy - mp.point.y);
    if (dxToMid <= tolFt && dyToMid <= tolFt) {
      // Both axes close enough for this to be a true center-on-midpoint snap.
      targetXs.push({ value: mp.point.x, kind: "midpoint", midpointAt: mp.point });
      targetYs.push({ value: mp.point.y, kind: "midpoint", midpointAt: mp.point });
    }
    // else: midpoint is too far in at least one axis — walls still contribute
    // their face segments as wall-face candidates above, so ordinary edge
    // alignment is still possible; just not labeled "midpoint".
  }

  for (const b of scene.objectBBoxes) {
    targetXs.push({ value: b.minX, kind: "object-edge" });
    targetXs.push({ value: b.maxX, kind: "object-edge" });
    targetYs.push({ value: b.minY, kind: "object-edge" });
    targetYs.push({ value: b.maxY, kind: "object-edge" });
  }

  const xWinner = scanAxis(srcXs, targetXs, tolFt);
  const yWinner = scanAxis(srcYs, targetYs, tolFt);

  // D-05b: per-axis grid fallback when no winner on that axis.
  let snappedX: number;
  let snappedY: number;

  if (xWinner) {
    // Shift the center by (target - src) so the src value lands on the target value.
    snappedX = pos.x + (xWinner.targetValue - xWinner.srcValue);
  } else if (gridSnap > 0) {
    snappedX = snapPoint(pos, gridSnap).x;
  } else {
    snappedX = pos.x;
  }

  if (yWinner) {
    snappedY = pos.y + (yWinner.targetValue - yWinner.srcValue);
  } else if (gridSnap > 0) {
    snappedY = snapPoint(pos, gridSnap).y;
  } else {
    snappedY = pos.y;
  }

  // Build guides — axis lines for each winning axis + midpoint dot if any.
  const guides: SnapGuide[] = [];
  if (xWinner) {
    guides.push({ kind: "axis", axis: "x", value: xWinner.targetValue });
  }
  if (yWinner) {
    guides.push({ kind: "axis", axis: "y", value: yWinner.targetValue });
  }

  // Midpoint dot(s): emit at most one dot per unique wall-midpoint point
  // (deduplicate when both X and Y winners are midpoints of the same wall).
  if (xWinner?.isMidpoint && xWinner.midpointAt) {
    guides.push({ kind: "midpoint-dot", at: xWinner.midpointAt });
  }
  if (yWinner?.isMidpoint && yWinner.midpointAt) {
    const same =
      xWinner?.isMidpoint &&
      xWinner.midpointAt &&
      Math.abs(xWinner.midpointAt.x - yWinner.midpointAt.x) < 1e-9 &&
      Math.abs(xWinner.midpointAt.y - yWinner.midpointAt.y) < 1e-9;
    if (!same) {
      guides.push({ kind: "midpoint-dot", at: yWinner.midpointAt });
    }
  }

  return { snapped: { x: snappedX, y: snappedY }, guides };
}
