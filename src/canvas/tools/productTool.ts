import * as fabric from "fabric";
import { useCADStore } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { snapPoint } from "@/lib/geometry";
import type { Point } from "@/types/cad";

/** Currently selected product ID from the library to place */
let pendingProductId: string | null = null;

export function setPendingProduct(productId: string | null) {
  pendingProductId = productId;
}

export function getPendingProduct(): string | null {
  return pendingProductId;
}

function pxToFeet(
  px: { x: number; y: number },
  origin: { x: number; y: number },
  scale: number
): Point {
  return {
    x: (px.x - origin.x) / scale,
    y: (px.y - origin.y) / scale,
  };
}

export function activateProductTool(
  fc: fabric.Canvas,
  scale: number,
  origin: { x: number; y: number }
) {
  deactivateProductTool(fc);

  const onMouseDown = (opt: fabric.TEvent) => {
    if (!pendingProductId) return;

    const pointer = fc.getViewportPoint(opt.e);
    const gridSnap = useUIStore.getState().gridSnap;
    const feet = pxToFeet(pointer, origin, scale);
    const snapped = gridSnap > 0 ? snapPoint(feet, gridSnap) : feet;

    useCADStore.getState().placeProduct(pendingProductId, snapped);

    // Stay in product tool for multiple placements
    // User can switch tools via toolbar or press Escape
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      pendingProductId = null;
      useUIStore.getState().setTool("select");
    }
  };

  fc.on("mouse:down", onMouseDown);
  document.addEventListener("keydown", onKeyDown);

  (fc as any).__productToolCleanup = () => {
    fc.off("mouse:down", onMouseDown);
    document.removeEventListener("keydown", onKeyDown);
  };
}

export function deactivateProductTool(fc: fabric.Canvas) {
  const cleanupFn = (fc as any).__productToolCleanup;
  if (cleanupFn) {
    cleanupFn();
    delete (fc as any).__productToolCleanup;
  }
}
