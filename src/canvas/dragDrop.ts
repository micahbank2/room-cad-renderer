import { useCADStore } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { snapPoint } from "@/lib/geometry";
import type { Point } from "@/types/cad";

export const DRAG_MIME = "application/x-room-cad-product";

export interface ScaleOrigin {
  scale: number;
  origin: { x: number; y: number };
}

/** Convert clientX/Y to canvas-local feet coordinates. */
export function clientToFeet(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number },
  scale: number,
  origin: { x: number; y: number }
): Point {
  const px = { x: clientX - rect.left, y: clientY - rect.top };
  return {
    x: (px.x - origin.x) / scale,
    y: (px.y - origin.y) / scale,
  };
}

/**
 * Attach dragover + drop listeners to the canvas wrapper element.
 * getScaleOrigin() must return the CURRENT scale/origin (recomputed per call)
 * because redraw() recomputes them on every resize.
 * Returns a cleanup function.
 */
export function attachDragDropHandlers(
  wrapper: HTMLElement,
  getScaleOrigin: () => ScaleOrigin
): () => void {
  const onDragOver = (e: DragEvent) => {
    if (!e.dataTransfer?.types.includes(DRAG_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    const productId = e.dataTransfer?.getData(DRAG_MIME);
    if (!productId) return;
    const rect = wrapper.getBoundingClientRect();
    const { scale, origin } = getScaleOrigin();
    const feet = clientToFeet(e.clientX, e.clientY, rect, scale, origin);
    const gridSnap = useUIStore.getState().gridSnap;
    const snapped = gridSnap > 0 ? snapPoint(feet, gridSnap) : feet;
    const newId = useCADStore.getState().placeProduct(productId, snapped);
    useUIStore.getState().select([newId]);
  };

  wrapper.addEventListener("dragover", onDragOver);
  wrapper.addEventListener("drop", onDrop);

  return () => {
    wrapper.removeEventListener("dragover", onDragOver);
    wrapper.removeEventListener("drop", onDrop);
  };
}
