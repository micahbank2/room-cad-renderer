// src/lib/wallLabels.ts
import type { WallSegment } from "@/types/cad";

/**
 * Phase 46 D-04: cardinal direction wall label per UI-SPEC § Copywriting.
 * Returns mixed-case "North wall" / "East wall" / "South wall" / "West wall"
 * within ±22.5° of cardinal; "Wall {N}" (1-indexed) diagonal fallback.
 * Computed from wall midpoint relative to room center (invariant under
 * start/end swap — Pitfall 2). Y convention: smaller Y = North (above center).
 */
export function wallCardinalLabel(
  wall: WallSegment,
  roomCenter: { x: number; y: number },
  fallbackIndex: number,
): string {
  const mx = (wall.start.x + wall.end.x) / 2;
  const my = (wall.start.y + wall.end.y) / 2;
  const dx = mx - roomCenter.x;
  const dy = my - roomCenter.y;
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

  const normalize = (a: number) => ((a + 540) % 360) - 180;
  const within = (a: number, target: number) => Math.abs(normalize(a - target)) <= 22.5;

  if (within(angleDeg, -90)) return "North wall";
  if (within(angleDeg, 0)) return "East wall";
  if (within(angleDeg, 90)) return "South wall";
  if (within(angleDeg, 180) || within(angleDeg, -180)) return "West wall";
  return `Wall ${fallbackIndex + 1}`;
}
