/**
 * Phase 91 — Object-vs-object collision detection (COL-91-01).
 *
 * Pure axis-aligned bounding-box (AABB) intersection scan. Used by the
 * select-tool drag flow to refuse drops that would cause two objects to
 * overlap (D-03 silent refuse).
 *
 * Decisions (.planning/phases/91-alignment-collision/91-CONTEXT.md):
 *   - D-07 — Naive O(n) scan is fine under ~50 objects.
 *   - D-07 — Walls are NOT collision sources (line segments, not bboxes).
 *   - Touching edges (zero interior overlap) is NOT a collision —
 *     Jessica needs to be able to butt objects flush.
 *   - Exclude self by id (defensive — snap engine already excludes at
 *     scene build via Phase 91-01 buildSceneGeometry).
 */
import type { BBox } from "./snapEngine";

/**
 * Returns true if `dragged` overlaps with ANY bbox in `scene` (excluding by id).
 * Touching edges (interior overlap === 0) is NOT a collision.
 *
 * @param dragged - The post-snap bbox of the dragged entity.
 * @param scene - Bboxes of every other entity in the room (walls excluded).
 * @returns true if any AABB interior-overlap is found; false otherwise.
 */
export function wouldCollide(dragged: BBox, scene: BBox[]): boolean {
  for (const b of scene) {
    if (b.id === dragged.id) continue; // defensive exclude-self
    // Standard AABB intersection with strict-greater for the
    // "touching is OK" rule (D-03 + Plan 91-02 Task 1 Test 4).
    const xOverlap = dragged.minX < b.maxX && dragged.maxX > b.minX;
    const yOverlap = dragged.minY < b.maxY && dragged.maxY > b.minY;
    if (xOverlap && yOverlap) return true;
  }
  return false;
}
