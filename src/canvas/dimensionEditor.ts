import type { WallSegment } from "@/types/cad";

export const DIM_LABEL_HIT_RADIUS_PX = 24;
const OFFSET_DIST_PX = 14;

export interface LabelPx { x: number; y: number; angleDeg: number; }

/** Compute the wall dimension label position in canvas pixels. Mirrors drawWallDimension. */
export function computeLabelPx(
  wall: WallSegment,
  scale: number,
  origin: { x: number; y: number }
): LabelPx {
  const midX = origin.x + ((wall.start.x + wall.end.x) / 2) * scale;
  const midY = origin.y + ((wall.start.y + wall.end.y) / 2) * scale;
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  const perpAngle = (angleDeg + 90) * (Math.PI / 180);
  if (angleDeg > 90) angleDeg -= 180;
  if (angleDeg < -90) angleDeg += 180;
  return {
    x: midX + Math.cos(perpAngle) * OFFSET_DIST_PX,
    y: midY + Math.sin(perpAngle) * OFFSET_DIST_PX,
    angleDeg,
  };
}

/** Hit-test: is the canvas-pixel point within DIM_LABEL_HIT_RADIUS_PX of the label center? */
export function hitTestDimLabel(
  pxPoint: { x: number; y: number },
  wall: WallSegment,
  scale: number,
  origin: { x: number; y: number }
): boolean {
  const label = computeLabelPx(wall, scale, origin);
  const dx = pxPoint.x - label.x;
  const dy = pxPoint.y - label.y;
  return Math.sqrt(dx * dx + dy * dy) <= DIM_LABEL_HIT_RADIUS_PX;
}

/** Parse input string as feet. Returns null if invalid (non-numeric or <=0). */
export function validateInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = parseFloat(trimmed);
  if (!isFinite(n) || n <= 0) return null;
  return n;
}
