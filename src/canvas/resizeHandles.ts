import type { Point, PlacedProduct } from "@/types/cad";

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
