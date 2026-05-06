// src/canvas/stairSymbol.ts
// Phase 60 STAIRS-01 (D-03): pure 2D stair-symbol shape builder.
//
// Builds the children of the fabric.Group that represents a stair in the
// 2D plan view: outline rectangle, parallel step lines, UP-arrow triangle,
// and an optional label below the bottom edge.
//
// PURE helper — no fabric.Canvas mutation, no store reads. Caller wraps the
// returned array in a fabric.Group with `data: { type: "stair", stairId }`
// (Phase 53/54 dispatch keys on data.type of the parent Group).
//
// Children carry `selectable: false, evented: false, originX/Y: "center"`
// so the wrapping Group owns selection + hit-test.

import * as fabric from "fabric";
import type { Stair } from "@/types/cad";
import { DEFAULT_STAIR_WIDTH_FT } from "@/types/cad";

const STROKE_DEFAULT = "#938ea0";   // outline-variant
const STROKE_SELECTED = "#7c5bf0";  // accent
const STEP_LINE_COLOR = "#cac3d7";  // text-muted
const ARROW_FILL = "#7c5bf0";       // accent
const LABEL_COLOR = "#cac3d7";

/**
 * Build the 2D stair-symbol children. Returns the array of fabric.Object
 * children intended to be wrapped in a fabric.Group by the caller.
 *
 * Coordinate convention:
 * - All output coordinates are in the parent Group's LOCAL space (centered
 *   on the bbox center). Caller positions the Group at the stair's bbox-center
 *   pixel (NOT bottom-step center) and applies `angle: stair.rotation`.
 * - The bbox-center pixel = origin + (bottomCenter + rotateVec({0, totalRunFt/2}, rot)) * scale
 * - Local x: -widthPx/2 .. +widthPx/2  (left-right of stair)
 * - Local y: -lengthPx/2 .. +lengthPx/2 (down = bottom step at +y, top step at -y)
 *
 * Why center the Group on bbox-center: matches Phase 31 product-Group
 * convention (left/top = bbox center, originX/Y "center"), keeps Group
 * rotation about its visual center, lets selection / right-click hit-tests
 * use Group.containsPoint() without offset math.
 *
 * @param stair  - the stair model
 * @param scale  - feet → pixels
 * @param _origin - canvas origin; unused here (group placement handled by caller)
 * @param isSelected - tints outline accent when true
 */
export function buildStairSymbolShapes(
  stair: Stair,
  scale: number,
  _origin: { x: number; y: number },
  isSelected: boolean = false,
): fabric.FabricObject[] {
  const widthFt = stair.widthFtOverride ?? DEFAULT_STAIR_WIDTH_FT;
  const totalRunFt = (stair.runIn / 12) * stair.stepCount;
  const widthPx = widthFt * scale;
  const lengthPx = totalRunFt * scale;

  const children: fabric.FabricObject[] = [];

  // 1. Outline rectangle of the stair footprint (width × totalRunFt).
  const outline = new fabric.Rect({
    width: widthPx,
    height: lengthPx,
    fill: "rgba(124,91,240,0.04)",
    stroke: isSelected ? STROKE_SELECTED : STROKE_DEFAULT,
    strokeWidth: isSelected ? 2 : 1,
    originX: "center",
    originY: "center",
    selectable: false,
    evented: false,
  });
  children.push(outline);

  // 2. Parallel step lines — one per step, perpendicular to UP axis.
  // In local space (rotation=0, UP = -y in 2D feet, since canvas y grows
  // DOWN but fabricSync stores stair.position.y in feet where +y means
  // farther from the screen origin), we draw `stepCount - 1` interior
  // lines between the steps. The bottom edge and top edge are part of the
  // outline rectangle, so we don't redraw them.
  //
  // We emit `stepCount` lines by including the bottom edge of EACH step
  // (the lower edge of step i, i=0..stepCount-1). Step 0's lower edge
  // coincides with the outline bottom — we still emit it for visual clarity
  // matching D-03 ("parallel lines perpendicular to UP, one per step").
  const stepRunPx = lengthPx / stair.stepCount;
  for (let i = 0; i < stair.stepCount; i++) {
    // i=0 is the BOTTOM step. Lower edge of step i is at local y = +lengthPx/2 - i*stepRunPx
    const y = lengthPx / 2 - i * stepRunPx;
    const line = new fabric.Line([-widthPx / 2, y, widthPx / 2, y], {
      stroke: STEP_LINE_COLOR,
      strokeWidth: 1,
      originX: "center",
      originY: "center",
      selectable: false,
      evented: false,
    });
    children.push(line);
  }

  // 3. UP arrow — small filled triangle near the top of the stair, pointing
  //    in the UP direction (toward the top step). In local space, UP is -y.
  //    Place arrow tip slightly inside the top step, base at the step below.
  const arrowSize = Math.max(8, Math.min(stepRunPx * 0.6, widthPx * 0.25));
  const arrowTipY = -lengthPx / 2 + arrowSize * 0.3;
  const arrowBaseY = arrowTipY + arrowSize;
  const arrow = new fabric.Polygon(
    [
      { x: 0, y: arrowTipY },                  // tip pointing up
      { x: -arrowSize * 0.5, y: arrowBaseY },  // base-left
      { x: arrowSize * 0.5, y: arrowBaseY },   // base-right
    ],
    {
      fill: ARROW_FILL,
      stroke: ARROW_FILL,
      strokeWidth: 1,
      originX: "center",
      originY: "center",
      selectable: false,
      evented: false,
    },
  );
  children.push(arrow);

  // 4. Optional label below the bottom edge (centered).
  const labelText = (stair.labelOverride ?? "STAIRS").toUpperCase();
  if (labelText.length > 0) {
    const label = new fabric.FabricText(labelText, {
      fontSize: 11,
      fontFamily: "IBM Plex Mono, monospace",
      fontWeight: "500",
      fill: LABEL_COLOR,
      originX: "center",
      originY: "top",
      top: lengthPx / 2 + 4,
      selectable: false,
      evented: false,
    });
    children.push(label);
  }

  return children;
}
