import type { Point, PlacedProduct } from "@/types/cad";

export const HANDLE_OFFSET_FT = 0.8;
export const HANDLE_HIT_RADIUS_FT = 0.5;
const SNAP_DEG = 15;

export function getHandleWorldPos(pp: PlacedProduct, productDepthFt: number): Point {
  const localY = -(productDepthFt / 2 + HANDLE_OFFSET_FT);
  const rad = (pp.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: pp.position.x + 0 * cos - localY * sin,
    y: pp.position.y + 0 * sin + localY * cos,
  };
}

export function hitTestHandle(feetPos: Point, pp: PlacedProduct, productDepthFt: number): boolean {
  const h = getHandleWorldPos(pp, productDepthFt);
  const dx = feetPos.x - h.x;
  const dy = feetPos.y - h.y;
  return Math.sqrt(dx * dx + dy * dy) <= HANDLE_HIT_RADIUS_FT;
}

export function snapAngle(rawDeg: number, shiftHeld: boolean): number {
  const snapped = shiftHeld ? rawDeg : Math.round(rawDeg / SNAP_DEG) * SNAP_DEG;
  return ((snapped % 360) + 360) % 360;
}

export function angleFromCenterToPointer(center: Point, pointer: Point): number {
  const dx = pointer.x - center.x;
  const dy = pointer.y - center.y;
  return (Math.atan2(dy, dx) * 180) / Math.PI + 90;
}
