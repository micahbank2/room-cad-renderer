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

// --- Feet+Inches parser (D-02) ------------------------------------------
// Three-branch ordered regex: first match wins. Rejects ambiguous forms
// (e.g. "12 6") and non-positive results (D-02b).
const INCHES_ONLY = /^(\d+(?:\.\d+)?)\s*(?:"|in|inches?)$/i;
const FEET_INCHES = /^(\d+(?:\.\d+)?)\s*(?:'|ft|feet)(?:\s*[-\s]?\s*(\d+(?:\.\d+)?)\s*(?:"|in|inches?)?)?$/i;
const DECIMAL_ONLY = /^(\d+(?:\.\d+)?)\s*(?:ft|feet)?$/i;

/** Parse input string as feet. Returns null if invalid or <= 0.
 *  Accepts: 12'6", 12' 6", 12'-6", 12', 6", 12ft 6in, 12.5, 12, 12.5ft
 *  Rejects: 12 6, abc, -5, 0, 0'0", empty, whitespace-only  */
export function validateInput(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;

  // Branch 1: inches-only — `6"`, `6in`, `6 inches`, `6.5"`
  let m = s.match(INCHES_ONLY);
  if (m) {
    const inches = parseFloat(m[1]);
    const feet = inches / 12;
    return isFinite(feet) && feet > 0 ? feet : null;
  }

  // Branch 2: feet with optional inches — `12'`, `12'6"`, `12' 6"`, `12'-6"`, `12ft 6in`
  m = s.match(FEET_INCHES);
  if (m) {
    const ft = parseFloat(m[1]);
    const inPart = m[2] ? parseFloat(m[2]) : 0;
    const total = ft + inPart / 12;
    return isFinite(total) && total > 0 ? total : null;
  }

  // Branch 3: bare decimal feet (back-compat) — `12`, `12.5`, `12.5ft`
  m = s.match(DECIMAL_ONLY);
  if (m) {
    const ft = parseFloat(m[1]);
    return isFinite(ft) && ft > 0 ? ft : null;
  }

  return null;
}
