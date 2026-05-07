import * as fabric from "fabric";
import { formatFeet, distance, polygonArea, polygonCentroid } from "@/lib/geometry";
import type { MeasureLine, Annotation, WallSegment, Point } from "@/types/cad";

/**
 * Phase 62 MEASURE-01 — pure 2D shape builders for measurement annotations.
 *
 * These builders are PURE: no cadStore reads, no fabric.Canvas references.
 * The caller (fabricSync.ts) adds the result via fc.add(...).
 *
 * Color tokens mirror Phase 33 design system (D-33/D-34): no new colors.
 * Typography mirrors src/canvas/dimensions.ts conventions.
 */

const TEXT_DIM = "#938ea0"; // text-muted-foreground/80
const TEXT_PRIMARY = "#e3e0f1"; // text-foreground
const PILL_BG_LIGHT = "#ffffff"; // white pill for measure-line label
const PILL_BG_DARK = "#1b1a26"; // bg-card for annotation
const FONT_MONO = "IBM Plex Mono, ui-monospace, monospace";

/**
 * D-06 dimension line visual: 1px stroke text-muted-foreground/80 line, 4px perpendicular
 * ticks at each endpoint, formatFeet text label centered on midpoint with
 * white-pill background. No arrows, no extension lines.
 *
 * Wrapped in fabric.Group with `data: { type: "measureLine", measureLineId }`
 * so the right-click hit-test (FabricCanvas.tsx) and selectTool can identify it.
 */
export function buildMeasureLineGroup(
  line: MeasureLine,
  scale: number,
  origin: Point,
): fabric.Group {
  const sx = origin.x + line.start.x * scale;
  const sy = origin.y + line.start.y * scale;
  const ex = origin.x + line.end.x * scale;
  const ey = origin.y + line.end.y * scale;

  // Main dimension line
  const main = new fabric.Line([sx, sy, ex, ey], {
    stroke: TEXT_DIM,
    strokeWidth: 1,
    selectable: false,
    evented: false,
  });

  // Perpendicular tick marks at each endpoint (4px length each side, 8px total)
  // Compute unit perpendicular: rotate (end-start) normalized by 90°.
  const dxPx = ex - sx;
  const dyPx = ey - sy;
  const lenPx = Math.sqrt(dxPx * dxPx + dyPx * dyPx) || 1;
  const ux = dxPx / lenPx;
  const uy = dyPx / lenPx;
  // Perpendicular: rotate (ux, uy) by 90° → (-uy, ux)
  const px = -uy;
  const py = ux;
  const TICK = 4;

  const tickStart = new fabric.Line(
    [sx - px * TICK, sy - py * TICK, sx + px * TICK, sy + py * TICK],
    { stroke: TEXT_DIM, strokeWidth: 1, selectable: false, evented: false },
  );
  const tickEnd = new fabric.Line(
    [ex - px * TICK, ey - py * TICK, ex + px * TICK, ey + py * TICK],
    { stroke: TEXT_DIM, strokeWidth: 1, selectable: false, evented: false },
  );

  // Midpoint label (formatFeet) on white pill — IBM Plex Mono 11px
  const midX = (sx + ex) / 2;
  const midY = (sy + ey) / 2;
  const labelText = formatFeet(distance(line.start, line.end));

  const text = new fabric.FabricText(labelText, {
    fontFamily: FONT_MONO,
    fontSize: 11,
    fill: TEXT_DIM,
    originX: "center",
    originY: "center",
  });
  // Width estimate: ~7px per char + 8px padding (mirrors dimensions.ts:107).
  const bg = new fabric.Rect({
    width: labelText.length * 7 + 8,
    height: 14,
    fill: PILL_BG_LIGHT,
    rx: 2,
    ry: 2,
    originX: "center",
    originY: "center",
  });
  const labelGroup = new fabric.Group([bg, text], {
    left: midX,
    top: midY,
    originX: "center",
    originY: "center",
    selectable: false,
    evented: false,
  });

  // Combine all parts into a single Group with data attribute for hit-testing.
  const group = new fabric.Group([main, tickStart, tickEnd, labelGroup], {
    selectable: true,
    evented: true,
    hasControls: false,
    hasBorders: false,
    lockMovementX: true,
    lockMovementY: true,
    data: { type: "measureLine", measureLineId: line.id },
  });
  return group;
}

/**
 * D-08 annotation visual: IBM Plex Mono 12px text-foreground on bg-card
 * rounded-sm pill. Auto-fit text width with 6px horizontal padding.
 *
 * Wrapped in fabric.Group with `data: { type: "annotation", annotationId }`.
 * Hidden during edit mode (caller skips when uiStore.editingAnnotationId === id).
 */
export function buildAnnotationGroup(
  anno: Annotation,
  scale: number,
  origin: Point,
): fabric.Group {
  const cx = origin.x + anno.position.x * scale;
  const cy = origin.y + anno.position.y * scale;

  // Empty text → render nothing visible (caller should skip during edit, but
  // be defensive: a zero-width pill just means nothing draws).
  const display = anno.text;
  const text = new fabric.FabricText(display, {
    fontFamily: FONT_MONO,
    fontSize: 12,
    fill: TEXT_PRIMARY,
    originX: "center",
    originY: "center",
  });
  // Width estimate: ~7.5px per char (12px mono) + 12px padding.
  const charWidth = 7.5;
  const horizPad = 12;
  const bgWidth = Math.max(display.length * charWidth + horizPad, 16);
  const bg = new fabric.Rect({
    width: bgWidth,
    height: 18,
    fill: PILL_BG_DARK,
    rx: 2,
    ry: 2,
    originX: "center",
    originY: "center",
  });

  const group = new fabric.Group([bg, text], {
    left: cx,
    top: cy,
    originX: "center",
    originY: "center",
    selectable: true,
    evented: true,
    hasControls: false,
    hasBorders: false,
    lockMovementX: true,
    lockMovementY: true,
    data: { type: "annotation", annotationId: anno.id },
  });
  return group;
}

/**
 * D-04 canvas overlay: subtle "{XX} SQ FT" label rendered at the polygon
 * centroid in IBM Plex Mono 11px text-muted-foreground/80. Decorative — not selectable,
 * not evented. Returns null if the wall loop is non-closed (polygonArea === 0).
 */
export function buildRoomAreaOverlay(
  walls: WallSegment[],
  scale: number,
  origin: Point,
): fabric.Object | null {
  if (walls.length < 3) return null;
  const area = polygonArea(walls);
  if (area === 0) return null;

  const c = polygonCentroid(walls);
  const cx = origin.x + c.x * scale;
  const cy = origin.y + c.y * scale;

  const label = `${Math.round(area)} SQ FT`;
  const text = new fabric.FabricText(label, {
    left: cx,
    top: cy,
    fontFamily: FONT_MONO,
    fontSize: 11,
    fill: TEXT_DIM,
    originX: "center",
    originY: "center",
    selectable: false,
    evented: false,
    data: { type: "room-area-overlay" },
  });
  return text;
}
