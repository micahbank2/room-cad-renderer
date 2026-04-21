import type { Point, PlacedProduct, PlacedCustomElement } from "@/types/cad";

export const RESIZE_HANDLE_HIT_RADIUS_FT = 0.5;

/** Return the 4 corner handle positions in world feet, accounting for the
 *  product's rotation (so handles rotate with the product). */
export function getResizeHandles(
  pp: PlacedProduct,
  widthFt: number,
  depthFt: number,
): { ne: Point; nw: Point; se: Point; sw: Point } {
  const hw = widthFt / 2;
  const hd = depthFt / 2;
  // Local corners (before rotation), counterclockwise from NE
  const local = {
    ne: { x: hw, y: -hd },
    nw: { x: -hw, y: -hd },
    sw: { x: -hw, y: hd },
    se: { x: hw, y: hd },
  };
  const rad = (pp.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const toWorld = (p: Point): Point => ({
    x: pp.position.x + p.x * cos - p.y * sin,
    y: pp.position.y + p.x * sin + p.y * cos,
  });
  return {
    ne: toWorld(local.ne),
    nw: toWorld(local.nw),
    sw: toWorld(local.sw),
    se: toWorld(local.se),
  };
}

/** Test whether pointerFt hits any corner handle. Returns the corner id or null. */
export function hitTestResizeHandle(
  pointerFt: Point,
  pp: PlacedProduct,
  widthFt: number,
  depthFt: number,
): "ne" | "nw" | "sw" | "se" | null {
  const handles = getResizeHandles(pp, widthFt, depthFt);
  for (const key of ["ne", "nw", "sw", "se"] as const) {
    const h = handles[key];
    const dx = pointerFt.x - h.x;
    const dy = pointerFt.y - h.y;
    if (Math.sqrt(dx * dx + dy * dy) <= RESIZE_HANDLE_HIT_RADIUS_FT) {
      return key;
    }
  }
  return null;
}

/** Diagonal distance from product center to a corner (in local coords),
 *  in feet. Used to compute scale factor from pointer distance. */
export function cornerDiagonalFt(widthFt: number, depthFt: number): number {
  return Math.sqrt((widthFt / 2) ** 2 + (depthFt / 2) ** 2);
}

// ---------------------------------------------------------------------------
// Phase 31 — Edge-midpoint handles (D-01, D-03)
// ---------------------------------------------------------------------------

/** Edge-handle hit radius (matches corner radius for visual parity). */
export const EDGE_HANDLE_HIT_RADIUS_FT = 0.5;

export type CornerHandle = "ne" | "nw" | "sw" | "se";
export type EdgeHandle = "n" | "s" | "e" | "w";

/** Return the 4 edge midpoint handle positions in world feet, rotation-aware.
 *  Local (pre-rotation) edge coords: n=(0,-hd), s=(0,+hd), e=(+hw,0), w=(-hw,0).
 *  Canvas convention: +y is south. */
export function getEdgeHandles(
  pp: PlacedProduct | PlacedCustomElement,
  widthFt: number,
  depthFt: number,
): { n: Point; s: Point; e: Point; w: Point } {
  const hw = widthFt / 2;
  const hd = depthFt / 2;
  const local = {
    n: { x: 0, y: -hd },
    s: { x: 0, y: hd },
    e: { x: hw, y: 0 },
    w: { x: -hw, y: 0 },
  };
  const rad = (pp.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const toWorld = (p: Point): Point => ({
    x: pp.position.x + p.x * cos - p.y * sin,
    y: pp.position.y + p.x * sin + p.y * cos,
  });
  return {
    n: toWorld(local.n),
    s: toWorld(local.s),
    e: toWorld(local.e),
    w: toWorld(local.w),
  };
}

/** Test whether pointerFt hits any edge midpoint handle. */
export function hitTestEdgeHandle(
  pointerFt: Point,
  pp: PlacedProduct | PlacedCustomElement,
  widthFt: number,
  depthFt: number,
): EdgeHandle | null {
  const handles = getEdgeHandles(pp, widthFt, depthFt);
  for (const key of ["n", "s", "e", "w"] as const) {
    const h = handles[key];
    const dx = pointerFt.x - h.x;
    const dy = pointerFt.y - h.y;
    if (Math.sqrt(dx * dx + dy * dy) <= EDGE_HANDLE_HIT_RADIUS_FT) return key;
  }
  return null;
}

/** Combined hit-test with corner priority (Pitfall 1: corners win ties).
 *  Used by selectTool to dispatch corner→sizeScale vs edge→override. */
export function hitTestAnyResizeHandle(
  pointerFt: Point,
  pp: PlacedProduct | PlacedCustomElement,
  widthFt: number,
  depthFt: number,
):
  | { kind: "corner"; which: CornerHandle }
  | { kind: "edge"; which: EdgeHandle }
  | null {
  const corner = hitTestResizeHandle(pointerFt, pp as PlacedProduct, widthFt, depthFt);
  if (corner) return { kind: "corner", which: corner };
  const edge = hitTestEdgeHandle(pointerFt, pp, widthFt, depthFt);
  if (edge) return { kind: "edge", which: edge };
  return null;
}

/** Convert pointer world coords to an axis-value for edge-handle drag.
 *  Inverts the object's rotation to compute object-local coords (Pitfall 2:
 *  rotation-invariant intent). valueFt = 2 × |local coord|, clamped [0.25, 50]. */
export function edgeDragToAxisValue(
  edge: EdgeHandle,
  pointerFt: Point,
  pp: PlacedProduct | PlacedCustomElement,
): { axis: "width" | "depth"; valueFt: number } {
  // Inverse rotation: rotate pointer-relative-to-center by -rotation.
  const rad = (-pp.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = pointerFt.x - pp.position.x;
  const dy = pointerFt.y - pp.position.y;
  const lx = dx * cos - dy * sin;
  const ly = dx * sin + dy * cos;
  if (edge === "e" || edge === "w") {
    return { axis: "width", valueFt: Math.max(0.25, Math.min(50, 2 * Math.abs(lx))) };
  }
  return { axis: "depth", valueFt: Math.max(0.25, Math.min(50, 2 * Math.abs(ly))) };
}
