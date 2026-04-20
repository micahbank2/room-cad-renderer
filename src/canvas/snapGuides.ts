/**
 * Phase 30 — Fabric-side snap-guide renderer.
 *
 * Adds/removes `data: { type: "snap-guide" }` Fabric objects. Mirrors the
 * existing tagged-ephemera cleanup pattern used by `type: "dim"` (see
 * src/canvas/dimensions.ts) and `type: "ceiling-edge-preview"` in ceilingTool.
 *
 * All guides use the accent purple token at 60% opacity per D-06a; no new
 * CSS tokens introduced. Objects are non-interactive (D-06) and cleaned up
 * idempotently on every call (D-06b).
 */
import * as fabric from "fabric";
import type { SnapGuide } from "@/canvas/snapEngine";

const GUIDE_COLOR = "#7c5bf0"; // --color-accent (no new tokens per D-06a)
const GUIDE_OPACITY = 0.6; // D-06a
const GUIDE_STROKE_WIDTH = 1; // D-06a
const MIDPOINT_DOT_RADIUS = 4; // D-06d

/**
 * Remove all Fabric objects tagged `data.type === "snap-guide"`. Safe on an
 * empty canvas. Preserves other tagged objects (e.g. `type: "dim"`).
 */
export function clearSnapGuides(fc: fabric.Canvas): void {
  const toRemove = fc
    .getObjects()
    .filter(
      (o) =>
        (o as unknown as { data?: { type?: string } }).data?.type ===
        "snap-guide",
    );
  for (const o of toRemove) fc.remove(o);
}

/**
 * Render snap guides on the canvas. Always clears prior guides first
 * (idempotent per D-06b), so callers may call this every mousemove.
 *
 * Coordinates: `guides` values are in world feet; `scale` converts feet→px
 * and `origin` is the canvas-pixel offset of the (0,0) feet point.
 */
export function renderSnapGuides(
  fc: fabric.Canvas,
  guides: SnapGuide[],
  scale: number,
  origin: { x: number; y: number },
): void {
  clearSnapGuides(fc); // idempotent per D-06b

  if (guides.length === 0) {
    fc.requestRenderAll();
    return;
  }

  const canvasW = fc.getWidth?.() ?? 0;
  const canvasH = fc.getHeight?.() ?? 0;

  for (const g of guides) {
    if (g.kind === "axis" && g.axis === "x") {
      // Vertical line at px X, spanning full canvas height (D-06).
      const px = origin.x + g.value * scale;
      const line = new fabric.Line([px, 0, px, canvasH], {
        stroke: GUIDE_COLOR,
        opacity: GUIDE_OPACITY,
        strokeWidth: GUIDE_STROKE_WIDTH,
        selectable: false,
        evented: false,
      });
      (line as unknown as { data: { type: string } }).data = {
        type: "snap-guide",
      };
      fc.add(line);
    } else if (g.kind === "axis" && g.axis === "y") {
      // Horizontal line at px Y, spanning full canvas width (D-06).
      const py = origin.y + g.value * scale;
      const line = new fabric.Line([0, py, canvasW, py], {
        stroke: GUIDE_COLOR,
        opacity: GUIDE_OPACITY,
        strokeWidth: GUIDE_STROKE_WIDTH,
        selectable: false,
        evented: false,
      });
      (line as unknown as { data: { type: string } }).data = {
        type: "snap-guide",
      };
      fc.add(line);
    } else if (g.kind === "midpoint-dot") {
      // Small filled circle at the wall's midpoint (D-06d).
      const px = origin.x + g.at.x * scale;
      const py = origin.y + g.at.y * scale;
      const dot = new fabric.Circle({
        left: px,
        top: py,
        radius: MIDPOINT_DOT_RADIUS,
        fill: GUIDE_COLOR,
        opacity: GUIDE_OPACITY,
        originX: "center",
        originY: "center",
        selectable: false,
        evented: false,
      });
      (dot as unknown as { data: { type: string } }).data = {
        type: "snap-guide",
      };
      fc.add(dot);
    }
  }

  fc.requestRenderAll();
}
