// src/test-utils/dragDrivers.ts
// Phase 91 ALIGN-91-01 / ALIGN-91-03: drag test drivers for products + columns.
//
// These drivers simulate the smart-snap-enabled drag path in selectTool.ts:
//   1. Build SceneGeometry with the dragged id excluded (D-02b).
//   2. Compute the dragged BBox at the requested target position.
//   3. Run computeSnap to resolve the final snapped position.
//   4. Apply the snapped position via moveColumnNoHistory or update the
//      product position via updatePlacedProduct (then explicitly clear
//      history so the test matches the live drag-handler invariant: one
//      history entry per drag).
//
// Gated by `import.meta.env.MODE === "test"` (production tree-shakes).
// StrictMode-safe install/cleanup with identity-check (CLAUDE.md §7).

import { useCADStore } from "@/stores/cadStore";
import { useProductStore } from "@/stores/productStore";
import {
  buildSceneGeometry,
  computeSnap,
  axisAlignedBBoxOfRotated,
  SNAP_TOLERANCE_PX,
} from "@/canvas/snapEngine";
import { resolveEffectiveDims } from "@/types/product";

declare global {
  interface Window {
    /** Phase 91 ALIGN-91-01 — drag a placed product to `to` (feet), applying
     *  smart-snap. Writes the snapped position to the store via the same
     *  move-action path the live drag uses. */
    __driveDragProduct?: (
      productId: string,
      to: { x: number; y: number },
    ) => void;
    /** Phase 91 ALIGN-91-03 — drag a column to `to` (feet), applying
     *  smart-snap. */
    __driveDragColumn?: (
      columnId: string,
      to: { x: number; y: number },
    ) => void;
  }
}

/** Default e2e scale — matches the typical FabricCanvas mount: 50 px/ft. */
const DEFAULT_SCALE_PX_PER_FT = 50;

export function installDragDrivers(): () => void {
  if (import.meta.env.MODE !== "test") return () => {};

  const driveProduct = (
    productId: string,
    to: { x: number; y: number },
  ): void => {
    const cad = useCADStore.getState();
    const roomId = cad.activeRoomId;
    if (!roomId) throw new Error("installDragDrivers: no active room");
    const room = cad.rooms[roomId];
    if (!room) throw new Error("installDragDrivers: active room missing");
    const pp = room.placedProducts[productId];
    if (!pp) throw new Error(`installDragDrivers: product ${productId} missing`);

    const productLibrary = useProductStore.getState().products;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customCatalog = (cad as any).customElements ?? {};
    const scene = buildSceneGeometry(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cad as any,
      productId,
      productLibrary,
      customCatalog,
    );

    const prod = productLibrary.find((p) => p.id === pp.productId);
    const dims = resolveEffectiveDims(prod, pp);
    const bbox = axisAlignedBBoxOfRotated(
      to,
      dims.width,
      dims.depth,
      pp.rotation,
      productId,
    );
    const result = computeSnap({
      candidate: { pos: to, bbox },
      scene,
      tolerancePx: SNAP_TOLERANCE_PX,
      scale: DEFAULT_SCALE_PX_PER_FT,
      gridSnap: 0,
    });

    // moveProduct pushes a single history entry, mirroring the drag-handler's
    // single-undo invariant (one entry per drag, mid-stroke uses NoHistory in
    // the live handler — here we just want the final snapped position
    // committed in one history step).
    cad.moveProduct(productId, result.snapped);
  };

  const driveColumn = (
    columnId: string,
    to: { x: number; y: number },
  ): void => {
    const cad = useCADStore.getState();
    const roomId = cad.activeRoomId;
    if (!roomId) throw new Error("installDragDrivers: no active room");
    const room = cad.rooms[roomId];
    if (!room) throw new Error("installDragDrivers: active room missing");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const col = (room as any).columns?.[columnId];
    if (!col) throw new Error(`installDragDrivers: column ${columnId} missing`);

    const productLibrary = useProductStore.getState().products;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customCatalog = (cad as any).customElements ?? {};
    const scene = buildSceneGeometry(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cad as any,
      columnId,
      productLibrary,
      customCatalog,
    );

    const bbox = axisAlignedBBoxOfRotated(
      to,
      col.widthFt,
      col.depthFt,
      col.rotation,
      columnId,
    );
    const result = computeSnap({
      candidate: { pos: to, bbox },
      scene,
      tolerancePx: SNAP_TOLERANCE_PX,
      scale: DEFAULT_SCALE_PX_PER_FT,
      gridSnap: 0,
    });

    // Single-undo: push history once via empty updateColumn, then NoHistory move.
    cad.updateColumn(roomId, columnId, {});
    cad.moveColumnNoHistory(roomId, columnId, result.snapped);
  };

  window.__driveDragProduct = driveProduct;
  window.__driveDragColumn = driveColumn;

  return () => {
    // Identity check — StrictMode double-mount safe (CLAUDE.md §7).
    if (window.__driveDragProduct === driveProduct) {
      window.__driveDragProduct = undefined;
    }
    if (window.__driveDragColumn === driveColumn) {
      window.__driveDragColumn = undefined;
    }
  };
}
