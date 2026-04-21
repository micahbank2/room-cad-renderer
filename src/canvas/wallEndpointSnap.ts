/**
 * Phase 31 — Restricted snap-scene builder for wall-endpoint drags (EDIT-23 D-05).
 *
 * Closes the D-08b deferral from Phase 30. Builds a SceneGeometry containing
 * ONLY:
 *   - wallEdges: [] (D-05: no wall-face snapping for endpoint drag)
 *   - wallMidpoints: one per OTHER wall, with axis classification
 *   - objectBBoxes: two zero-size BBoxes per OTHER wall (one at each endpoint)
 *
 * Product / ceiling / custom-element bboxes MUST NOT appear (D-05 negative —
 * walls don't snap to furniture). The signature itself enforces this: the
 * function only accepts walls + draggedWallId.
 */
import type { SceneGeometry, BBox } from "@/canvas/snapEngine";
import type { WallSegment } from "@/types/cad";

/** Classify a wall's primary axis. Mirrors snapEngine.classifyAxis (private). */
function classifyAxis(w: WallSegment): "x" | "y" | "diag" {
  const dx = Math.abs(w.end.x - w.start.x);
  const dy = Math.abs(w.end.y - w.start.y);
  if (dx < 1e-6) return "y"; // vertical wall
  if (dy < 1e-6) return "x"; // horizontal wall
  return "diag";
}

/** D-05: build a snap scene for wall-endpoint drag. Excludes the dragged wall
 *  itself (its own endpoints/midpoint would create self-snap artifacts). */
export function buildWallEndpointSnapScene(
  walls: Record<string, WallSegment>,
  draggedWallId: string,
): SceneGeometry {
  const objectBBoxes: BBox[] = [];
  const wallMidpoints: SceneGeometry["wallMidpoints"] = [];

  for (const w of Object.values(walls)) {
    if (!w || w.id === draggedWallId) continue;
    // Zero-size BBox at each endpoint — computeSnap's objectBBoxes scan picks
    // these up as object-edge targets (priority 2) without engine changes.
    objectBBoxes.push({
      id: `${w.id}-start`,
      minX: w.start.x,
      maxX: w.start.x,
      minY: w.start.y,
      maxY: w.start.y,
    });
    objectBBoxes.push({
      id: `${w.id}-end`,
      minX: w.end.x,
      maxX: w.end.x,
      minY: w.end.y,
      maxY: w.end.y,
    });
    wallMidpoints.push({
      point: { x: (w.start.x + w.end.x) / 2, y: (w.start.y + w.end.y) / 2 },
      wallId: w.id,
      axis: classifyAxis(w),
    });
  }

  return { wallEdges: [], wallMidpoints, objectBBoxes };
}
