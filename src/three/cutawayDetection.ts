// Phase 59 CUTAWAY-01 — pure cutaway-detection helper.
//
// No React. No R3F. No store imports. Operates on raw WallSegment data + a
// THREE.Camera. Used by ThreeViewport's useFrame block (Task 3) to pick the
// wall closest to the camera in each room.
//
// Allocation discipline (RESEARCH Q2): module-level scratch Vector3
// instances are reused every call. ZERO allocations inside the hot loop
// or any function body. Audit:
//   grep -c "Vector3()" src/three/cutawayDetection.ts === 3 (module-level only)
//
// Sign convention (RESEARCH Q1): outward normal is the perpendicular to
// (end - start) whose direction points AWAY from the room bbox center.
// For convex (rectangular) rooms this is exactly correct. For concave
// (L-shaped) rooms the bbox center may sit just outside the polygon and
// the heuristic can misclassify one wall — acceptable risk for v1.15;
// v1.16 follow-up via ray-cast outside test (RESEARCH §Q1 risk note).
//
// Polar-angle threshold (RESEARCH Q5 + D-04): cutaway disables when camera
// elevation above horizon exceeds 70° (~1.222 rad). Computed via
// camera.getWorldDirection(); elevationRad = asin(-forward.y).

import * as THREE from "three";
import type { WallSegment } from "@/types/cad";

// ─────────────────────────────────────────────────────────────────
// Module-level scratch — reused every call. NEVER allocate inside loops.
// ─────────────────────────────────────────────────────────────────
const _cameraForward = new THREE.Vector3();
const _wallNormal = new THREE.Vector3();
const _wallCenter = new THREE.Vector3();

/** Phase 59 D-04: cutaway-disable threshold = 70° elevation above horizon (1.222 rad). */
const SEVENTY_DEG_RAD = (70 * Math.PI) / 180;

/**
 * Bbox center of all wall endpoints. Used as the reference point for
 * outward-normal sign convention. Returns {x:0,y:0} for empty walls.
 *
 * Note: `walls[i].start.y` and `.end.y` are 2D plan coordinates that map
 * to 3D z. The returned `.y` is therefore the "z-equivalent" — callers
 * (ThreeViewport useFrame) treat it as such.
 */
export function computeRoomBboxCenter(
  walls: WallSegment[],
): { x: number; y: number } {
  if (walls.length === 0) return { x: 0, y: 0 };
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const w of walls) {
    if (w.start.x < minX) minX = w.start.x;
    if (w.end.x < minX) minX = w.end.x;
    if (w.start.x > maxX) maxX = w.start.x;
    if (w.end.x > maxX) maxX = w.end.x;
    if (w.start.y < minY) minY = w.start.y;
    if (w.end.y < minY) minY = w.end.y;
    if (w.start.y > maxY) maxY = w.start.y;
    if (w.end.y > maxY) maxY = w.end.y;
  }
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
}

/**
 * Write the outward normal of `wall` into `out`. The normal points away from
 * `roomCenter` (in 2D x/y, mapped to 3D x/z with y=0).
 *
 * Mutates `out` ONLY. No allocations.
 */
export function computeOutwardNormalInto(
  wall: WallSegment,
  roomCenter: { x: number; y: number },
  out: THREE.Vector3,
): void {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1e-6) {
    out.set(0, 0, 1);
    return;
  }
  // Candidate normal: perpendicular to (end-start), normalized.
  // 2D y → 3D z. Normal lies in XZ plane (y component = 0).
  let nx = -dy / len;
  let nz = dx / len;

  // Wall midpoint in 2D → midpoint in XZ plane.
  const mx = (wall.start.x + wall.end.x) / 2;
  const mz = (wall.start.y + wall.end.y) / 2;

  // Vector from wall midpoint TOWARD room center.
  const toCenterX = roomCenter.x - mx;
  const toCenterZ = roomCenter.y - mz;

  // If candidate normal points toward center (positive dot), flip it.
  const dot = nx * toCenterX + nz * toCenterZ;
  if (dot > 0) {
    nx = -nx;
    nz = -nz;
  }
  out.set(nx, 0, nz);
}

/**
 * Phase 59 D-01 + D-04: pick the wall whose outward normal is most-opposed to
 * the camera forward direction (most-negative dot product). Returns null when:
 *
 *   - camera elevation above horizon exceeds 70° (top-down auto-disable, D-04)
 *   - walls array is empty
 *   - no wall has a negative dot (all walls behind/sideways from camera)
 *
 * `roomCenter` is in 2D plan coordinates (x, y). `roomOffsetX` is the EXPLODE
 * mode X-axis displacement applied to this room's group (Phase 47 D-03);
 * caller should pre-shift roomCenter.x by roomOffsetX before calling so that
 * outward-normal sign is computed in WORLD space.
 *
 * Returns elevationRad alongside wallId for caller diagnostics / driver readout.
 */
export function getCutawayWallId(
  walls: WallSegment[],
  camera: THREE.Camera,
  roomCenter: { x: number; y: number },
  roomOffsetX: number = 0,
): { wallId: string | null; elevationRad: number } {
  // Acknowledge the offsetX param even though the caller pre-shifts roomCenter.
  // We accept it so future refactors that move offset application here work.
  void roomOffsetX;

  // Camera forward — the direction the camera is LOOKING (negative z in cam space).
  camera.getWorldDirection(_cameraForward);

  // Elevation above horizon: forward.y = 0 → 0; forward.y = -1 → π/2 (looking down).
  const elevationRad = Math.asin(THREE.MathUtils.clamp(-_cameraForward.y, -1, 1));

  if (elevationRad > SEVENTY_DEG_RAD) {
    return { wallId: null, elevationRad };
  }

  if (walls.length === 0) {
    return { wallId: null, elevationRad };
  }

  let bestId: string | null = null;
  let bestDot = 0; // looking for most-negative

  for (const w of walls) {
    computeOutwardNormalInto(w, roomCenter, _wallNormal);
    const dot = _wallNormal.dot(_cameraForward);
    if (dot < bestDot) {
      bestDot = dot;
      bestId = w.id;
    }
  }

  // Touching _wallCenter keeps it module-resident even if a future code path
  // allocates a new scratch reference; harmless no-op here.
  void _wallCenter;

  return { wallId: bestId, elevationRad };
}
