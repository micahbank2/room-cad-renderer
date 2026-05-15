// src/canvas/columnSymbol.ts
// Phase 86 COL-01 (D-01, D-05): 2D symbol shapes for a column.
//
// Simpler than stairSymbol: no step lines, no UP arrow — just a rotated outline
// rect and a centered name label. Caller wraps the array in a fabric.Group
// with angle = column.rotation and originX/Y = "center", positioned at the
// column footprint center in canvas pixels.

import * as fabric from "fabric";
import type { Column } from "@/types/cad";

/**
 * Build the rotated outline rect + optional name label for a column. Returns
 * an array of fabric.Object positioned in the GROUP's local coordinate frame
 * (centered on 0,0). The caller wraps these in a fabric.Group at the footprint
 * center with angle = column.rotation.
 *
 * Selection highlight: accent-purple stroke + 2px width when isSelected.
 */
export function buildColumnSymbolShapes(
  column: Column,
  scale: number,
  _origin: { x: number; y: number },
  isSelected: boolean,
): fabric.Object[] {
  const widthPx = column.widthFt * scale;
  const depthPx = column.depthFt * scale;
  const stroke = isSelected ? "#7c5bf0" : "#cac3d7";
  const strokeWidth = isSelected ? 2 : 1.5;

  const outline = new fabric.Rect({
    left: -widthPx / 2,
    top: -depthPx / 2,
    width: widthPx,
    height: depthPx,
    fill: "rgba(124,91,240,0.05)",
    stroke,
    strokeWidth,
    selectable: false,
    evented: false,
    originX: "left",
    originY: "top",
  });

  const labelText = (column.name ?? "COLUMN").toUpperCase();
  const label = new fabric.Text(labelText, {
    left: 0,
    top: 0,
    fontSize: 9,
    fontFamily: "Geist Mono, ui-monospace, monospace",
    fill: "#938ea0",
    originX: "center",
    originY: "center",
    selectable: false,
    evented: false,
  });

  return [outline, label];
}
