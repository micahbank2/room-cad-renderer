/**
 * Phase 91 Plan 91-02 — Unit tests for wouldCollide AABB intersection.
 *
 * Locks the COL-91-01 contract:
 *   - Interior overlap → collision.
 *   - Touching edges → NOT a collision (Jessica must be able to butt objects flush).
 *   - Containment → collision.
 *   - Self-id excluded (defensive — snap-engine scene build already excludes).
 *   - Any-hit semantics (returns true on first overlap; O(n) scan).
 *
 * See:
 *   - .planning/phases/91-alignment-collision/91-CONTEXT.md (D-03, D-07)
 *   - .planning/phases/91-alignment-collision/91-02-PLAN.md (Task 1)
 */
import { describe, it, expect } from "vitest";
import { wouldCollide } from "@/canvas/objectCollision";
import type { BBox } from "@/canvas/snapEngine";

function bbox(
  id: string,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): BBox {
  return { id, minX, minY, maxX, maxY };
}

describe("wouldCollide — AABB intersection (COL-91-01)", () => {
  it("Test 1: disjoint bboxes do not collide", () => {
    const a = bbox("a", 0, 0, 4, 2);
    const scene = [bbox("b", 10, 10, 14, 12)];
    expect(wouldCollide(a, scene)).toBe(false);
  });

  it("Test 2: overlapping bboxes collide", () => {
    const a = bbox("a", 0, 0, 4, 2);
    const scene = [bbox("b", 2, 1, 6, 3)];
    expect(wouldCollide(a, scene)).toBe(true);
  });

  it("Test 3: contained bbox collides", () => {
    const a = bbox("a", 1, 1, 3, 3);
    const scene = [bbox("b", 0, 0, 10, 10)];
    expect(wouldCollide(a, scene)).toBe(true);
  });

  it("Test 4: edge-touching (shared edge, zero interior overlap) does NOT collide", () => {
    // Right edge of A at x=2; left edge of B at x=2. They touch but no interior overlap.
    const a = bbox("a", 0, 0, 2, 2);
    const scene = [bbox("b", 2, 0, 4, 2)];
    expect(wouldCollide(a, scene)).toBe(false);
  });

  it("Test 4b: corner-touching also does NOT collide", () => {
    const a = bbox("a", 0, 0, 2, 2);
    const scene = [bbox("b", 2, 2, 4, 4)];
    expect(wouldCollide(a, scene)).toBe(false);
  });

  it("Test 5: scene entry with same id as dragged is excluded (defensive self-exclude)", () => {
    const a = bbox("p1", 0, 0, 4, 2);
    // Same id as dragged — should be ignored even though it would overlap.
    const scene = [bbox("p1", 1, 1, 3, 3)];
    expect(wouldCollide(a, scene)).toBe(false);
  });

  it("Test 6: any-hit semantics — returns true on first overlap in mixed scene", () => {
    const a = bbox("a", 0, 0, 4, 2);
    const scene = [
      bbox("disjoint1", 100, 100, 102, 102),
      bbox("overlap", 2, 1, 6, 3),
      bbox("disjoint2", -10, -10, -8, -8),
    ];
    expect(wouldCollide(a, scene)).toBe(true);
  });

  it("Test 7: empty scene never collides", () => {
    const a = bbox("a", 0, 0, 4, 2);
    expect(wouldCollide(a, [])).toBe(false);
  });
});
