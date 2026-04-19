import * as fabric from "fabric";
import { useCADStore } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { snapPoint } from "@/lib/geometry";
import { pxToFeet } from "./toolUtils";

/** Currently selected product ID from the library to place. Module-scoped
 *  per D-07 — this is the toolbar → tool bridge (public API), not
 *  per-activation state. */
let pendingProductId: string | null = null;

export function setPendingProduct(productId: string | null) {
  pendingProductId = productId;
}

export function activateProductTool(
  fc: fabric.Canvas,
  scale: number,
  origin: { x: number; y: number },
): () => void {
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

  return () => {
    fc.off("mouse:down", onMouseDown);
    document.removeEventListener("keydown", onKeyDown);
  };
}
