// src/canvas/openingSymbols.ts
// Phase 61 OPEN-01 (D-08): pure 2D shape builders for the 3 new opening kinds.
//
// Each builder takes a precomputed quad (the four pixel-space corners of the
// opening rectangle, ordered: lower-A, upper-A, upper-B, lower-B per the
// existing fabricSync wall-perp convention) and returns a fabric.Group with
// kind-specific decorations:
//   - archway     → solid rect + half-circle arc above the top edge
//   - passthrough → 3-side outline (no top frame line)
//   - niche       → solid rect + 4 diagonal hatch lines (recessed indicator)
//
// All groups carry the standard data payload {type:"opening", openingId,
// openingType, wallId} so Phase 53 right-click + Phase 54 click-to-select
// dispatch through unchanged code paths.
//
// Door / window symbols are NOT touched here — fabricSync.ts retains the
// existing rectangle polygon for those kinds (byte-identical pre-Phase 61).

import * as fabric from "fabric";
import type { Opening } from "@/types/cad";

type Quad = Array<{ x: number; y: number }>;

interface SymbolContext {
  openingId: string;
  wallId: string;
  openingType: Opening["type"];
}

const ARCHWAY_FILL = "rgba(124,91,240,0.15)";
const ARCHWAY_STROKE = "#484554";
const PASSTHROUGH_FILL = "rgba(124,91,240,0.10)";
const PASSTHROUGH_STROKE = "#484554";
const NICHE_FILL = "rgba(124,91,240,0.08)";
const NICHE_STROKE = "#484554";
const NICHE_HATCH = "rgba(147,142,160,0.3)"; // text-muted-foreground/80 @ 30%

/** Per-symbol shared options to attach the data payload + selection-eventing. */
function dataOpts(ctx: SymbolContext) {
  return {
    selectable: true,
    evented: true,
    data: {
      type: "opening" as const,
      openingId: ctx.openingId,
      wallId: ctx.wallId,
      openingType: ctx.openingType,
    },
  };
}

/**
 * Archway 2D symbol: rectangle + half-circle arc above the top edge.
 *
 * Quad ordering convention (matches fabricSync polygon):
 *   pts[0] = startSide-A (-perp at start)
 *   pts[1] = startSide-B (+perp at start)
 *   pts[2] = endSide-B   (+perp at end)
 *   pts[3] = endSide-A   (-perp at end)
 *
 * The arc spans from the midpoint of the start edge to the midpoint of the
 * end edge, bulging away from the rectangle on the +perp face. Sampled at
 * 16 points for smooth half-circle approximation.
 */
export function buildArchwaySymbol(quad: Quad, ctx: SymbolContext): fabric.Group {
  const [pA0, pB0, pB1, pA1] = quad;
  // Solid rectangle body
  const rect = new fabric.Polygon(quad, {
    fill: ARCHWAY_FILL,
    stroke: ARCHWAY_STROKE,
    strokeWidth: 0.5,
    selectable: false,
    evented: false,
  });
  // Top edge midpoints — the half-circle stretches from B0-end → B1-end.
  const m0 = { x: pB0.x, y: pB0.y };
  const m1 = { x: pB1.x, y: pB1.y };
  const cx = (m0.x + m1.x) / 2;
  const cy = (m0.y + m1.y) / 2;
  const dx = m1.x - m0.x;
  const dy = m1.y - m0.y;
  // Outward bulge direction: perpendicular to top edge, pointing away from
  // the rectangle body (toward +perp face). Use rect-center → top-midpoint
  // vector to disambiguate sign.
  const rectCx = (pA0.x + pA1.x + pB0.x + pB1.x) / 4;
  const rectCy = (pA0.y + pA1.y + pB0.y + pB1.y) / 4;
  let nx = -dy;
  let ny = dx;
  const nlen = Math.sqrt(nx * nx + ny * ny) || 1;
  nx /= nlen;
  ny /= nlen;
  // Flip if normal points back toward the rect center.
  if ((cx + nx - rectCx) * (cx - rectCx) + (cy + ny - rectCy) * (cy - rectCy) < 0) {
    nx = -nx;
    ny = -ny;
  }
  const radius = Math.sqrt(dx * dx + dy * dy) / 2;
  // Sample 16 points along the half-circle from m0 → m1.
  // Parametric form: P(t) = center + R*cos(θ)*tangent + R*sin(θ)*normal
  // where θ goes 0 → π and tangent runs from m1 → m0 (so cos(0)=1 starts at m1).
  const arcPoints: Array<{ x: number; y: number }> = [];
  const tangentX = (m0.x - m1.x) / (2 * radius);
  const tangentY = (m0.y - m1.y) / (2 * radius);
  const STEPS = 16;
  for (let i = 0; i <= STEPS; i++) {
    const theta = (i / STEPS) * Math.PI;
    const px = cx + radius * Math.cos(theta) * tangentX + radius * Math.sin(theta) * nx;
    const py = cy + radius * Math.cos(theta) * tangentY + radius * Math.sin(theta) * ny;
    arcPoints.push({ x: px, y: py });
  }
  const arc = new fabric.Polyline(arcPoints, {
    fill: "",
    stroke: ARCHWAY_STROKE,
    strokeWidth: 0.5,
    selectable: false,
    evented: false,
  });
  return new fabric.Group([rect, arc], dataOpts(ctx));
}

/**
 * Passthrough 2D symbol: open-top rectangle (3 sides outlined; top omitted).
 * Indicates "wall fully open at the top" — a doorless arch substitute or
 * full-height window-wall cutout.
 */
export function buildPassthroughSymbol(quad: Quad, ctx: SymbolContext): fabric.Group {
  const [pA0, pB0, pB1, pA1] = quad;
  // Light fill rectangle so the opening is visually distinct from solid wall.
  const fill = new fabric.Polygon(quad, {
    fill: PASSTHROUGH_FILL,
    stroke: undefined,
    strokeWidth: 0,
    selectable: false,
    evented: false,
  });
  // 3 outline lines: A-end-to-A-start, A-start-to-B-start, B-start-to-B-end.
  // (The B-end-to-A-end edge — the "top" — is intentionally omitted.)
  const sideA = new fabric.Line([pA0.x, pA0.y, pA1.x, pA1.y], {
    stroke: PASSTHROUGH_STROKE,
    strokeWidth: 0.5,
    selectable: false,
    evented: false,
  });
  const startCap = new fabric.Line([pA0.x, pA0.y, pB0.x, pB0.y], {
    stroke: PASSTHROUGH_STROKE,
    strokeWidth: 0.5,
    selectable: false,
    evented: false,
  });
  const sideB = new fabric.Line([pB0.x, pB0.y, pB1.x, pB1.y], {
    stroke: PASSTHROUGH_STROKE,
    strokeWidth: 0.5,
    selectable: false,
    evented: false,
  });
  const endCap = new fabric.Line([pA1.x, pA1.y, pB1.x, pB1.y], {
    stroke: PASSTHROUGH_STROKE,
    strokeWidth: 0.5,
    selectable: false,
    evented: false,
  });
  return new fabric.Group([fill, sideA, startCap, sideB, endCap], dataOpts(ctx));
}

/**
 * Niche 2D symbol: rectangle outline + 4 diagonal hatch lines (text-muted-foreground/80
 * at 30% opacity) signaling "recessed, not through".
 */
export function buildNicheSymbol(quad: Quad, ctx: SymbolContext): fabric.Group {
  const [pA0, pB0, pB1, pA1] = quad;
  const rect = new fabric.Polygon(quad, {
    fill: NICHE_FILL,
    stroke: NICHE_STROKE,
    strokeWidth: 0.5,
    selectable: false,
    evented: false,
  });
  // 4 diagonal hatch lines from A-side baseline to B-side baseline.
  // Subdivide along the long axis (A0→A1, B0→B1) at t = 0.2, 0.4, 0.6, 0.8.
  const lerp = (a: { x: number; y: number }, b: { x: number; y: number }, t: number) => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  });
  const hatches: fabric.Object[] = [];
  for (const t of [0.2, 0.4, 0.6, 0.8]) {
    const a = lerp(pA0, pA1, t);
    const b = lerp(pB0, pB1, t);
    hatches.push(
      new fabric.Line([a.x, a.y, b.x, b.y], {
        stroke: NICHE_HATCH,
        strokeWidth: 0.5,
        selectable: false,
        evented: false,
      }),
    );
  }
  return new fabric.Group([rect, ...hatches], dataOpts(ctx));
}
