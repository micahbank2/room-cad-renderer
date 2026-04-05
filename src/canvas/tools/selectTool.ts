import * as fabric from "fabric";
import { useCADStore } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { snapPoint, distance, closestPointOnWall } from "@/lib/geometry";
import type { Point, WallSegment, PlacedProduct } from "@/types/cad";
import type { Product } from "@/types/product";
import { effectiveDimensions } from "@/types/product";
import { hitTestHandle, snapAngle, angleFromCenterToPointer } from "../rotationHandle";

interface SelectState {
  dragging: boolean;
  dragId: string | null;
  dragType: "wall" | "product" | "rotate" | null;
  dragOffsetFeet: Point | null;
  rotateInitialAngle: number | null;
}

const state: SelectState = {
  dragging: false,
  dragId: null,
  dragType: null,
  dragOffsetFeet: null,
  rotateInitialAngle: null,
};

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

/**
 * Hit test against CAD store data using real-world coordinates.
 * This avoids Fabric.js containsPoint issues with evented:false objects.
 */
function hitTestStore(
  feetPos: Point,
  productLibrary: Product[]
): { id: string; type: "wall" | "product" } | null {
  const cadState = useCADStore.getState();

  // Check products first (they're on top) — orphan + null-dim use 2x2 AABB
  for (const pp of Object.values(cadState.placedProducts)) {
    const product = productLibrary.find((p) => p.id === pp.productId);
    const { width, depth } = effectiveDimensions(product);
    const halfW = width / 2;
    const halfD = depth / 2;
    // Simple AABB check (ignoring rotation for now)
    if (
      feetPos.x >= pp.position.x - halfW &&
      feetPos.x <= pp.position.x + halfW &&
      feetPos.y >= pp.position.y - halfD &&
      feetPos.y <= pp.position.y + halfD
    ) {
      return { id: pp.id, type: "product" };
    }
  }

  // Check walls — find closest wall within threshold
  const HIT_THRESHOLD = 0.5; // feet
  let closestWallId: string | null = null;
  let closestDist = Infinity;

  for (const wall of Object.values(cadState.walls)) {
    const { point } = closestPointOnWall(wall, feetPos);
    const d = distance(point, feetPos);
    if (d < HIT_THRESHOLD && d < closestDist) {
      closestDist = d;
      closestWallId = wall.id;
    }
  }

  if (closestWallId) {
    return { id: closestWallId, type: "wall" };
  }

  return null;
}

// Product library reference — set by the canvas component
let _productLibrary: Product[] = [];

export function setSelectToolProductLibrary(products: Product[]) {
  _productLibrary = products;
}

export function activateSelectTool(
  fc: fabric.Canvas,
  scale: number,
  origin: { x: number; y: number }
) {
  deactivateSelectTool(fc);

  const onMouseDown = (opt: fabric.TEvent) => {
    const pointer = fc.getViewportPoint(opt.e);
    const feet = pxToFeet(pointer, origin, scale);

    // Rotation handle hit-test takes priority (EDIT-08)
    const currentSelection = useUIStore.getState().selectedIds;
    if (currentSelection.length === 1) {
      const selId = currentSelection[0];
      const pp = useCADStore.getState().placedProducts[selId];
      if (pp) {
        const prod = _productLibrary.find((p) => p.id === pp.productId);
        if (prod && prod.depth != null && hitTestHandle(feet, pp, prod.depth)) {
          state.dragging = true;
          state.dragId = selId;
          state.dragType = "rotate";
          state.rotateInitialAngle = pp.rotation;
          // Push single history snapshot at drag start as undo boundary
          useCADStore.getState().rotateProduct(selId, pp.rotation);
          return;
        }
      }
    }

    const hit = hitTestStore(feet, _productLibrary);

    if (hit) {
      useUIStore.getState().select([hit.id]);
      state.dragging = true;
      state.dragId = hit.id;
      state.dragType = hit.type;

      if (hit.type === "product") {
        const pp = useCADStore.getState().placedProducts[hit.id];
        if (pp) {
          state.dragOffsetFeet = {
            x: feet.x - pp.position.x,
            y: feet.y - pp.position.y,
          };
        }
      } else if (hit.type === "wall") {
        const wall = useCADStore.getState().walls[hit.id];
        if (wall) {
          const cx = (wall.start.x + wall.end.x) / 2;
          const cy = (wall.start.y + wall.end.y) / 2;
          state.dragOffsetFeet = { x: feet.x - cx, y: feet.y - cy };
        }
      }
    } else {
      useUIStore.getState().clearSelection();
      state.dragging = false;
      state.dragId = null;
    }
  };

  const onMouseMove = (opt: fabric.TEvent) => {
    if (!state.dragging || !state.dragId) return;
    const pointer = fc.getViewportPoint(opt.e);
    const feet = pxToFeet(pointer, origin, scale);

    if (state.dragType === "rotate") {
      const pp = useCADStore.getState().placedProducts[state.dragId];
      if (!pp) return;
      const raw = angleFromCenterToPointer(pp.position, feet);
      const shiftHeld = (opt.e as MouseEvent).shiftKey === true;
      const next = snapAngle(raw, shiftHeld);
      useCADStore.getState().rotateProductNoHistory(state.dragId, next);
      return;
    }

    if (!state.dragOffsetFeet) return;
    const gridSnap = useUIStore.getState().gridSnap;
    const targetX = feet.x - state.dragOffsetFeet.x;
    const targetY = feet.y - state.dragOffsetFeet.y;
    const snapped =
      gridSnap > 0
        ? snapPoint({ x: targetX, y: targetY }, gridSnap)
        : { x: targetX, y: targetY };

    if (state.dragType === "product") {
      useCADStore.getState().moveProduct(state.dragId, snapped);
    } else if (state.dragType === "wall") {
      const wall = useCADStore.getState().walls[state.dragId];
      if (wall) {
        const cx = (wall.start.x + wall.end.x) / 2;
        const cy = (wall.start.y + wall.end.y) / 2;
        const dx = snapped.x - cx;
        const dy = snapped.y - cy;
        useCADStore.getState().updateWall(state.dragId, {
          start: { x: wall.start.x + dx, y: wall.start.y + dy },
          end: { x: wall.end.x + dx, y: wall.end.y + dy },
        });
      }
    }
  };

  const onMouseUp = () => {
    state.dragging = false;
    state.dragId = null;
    state.dragType = null;
    state.dragOffsetFeet = null;
    state.rotateInitialAngle = null;
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLSelectElement
    ) {
      return;
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      const selectedIds = useUIStore.getState().selectedIds;
      if (selectedIds.length > 0) {
        useCADStore.getState().removeSelected(selectedIds);
        useUIStore.getState().clearSelection();
      }
    }
  };

  fc.on("mouse:down", onMouseDown);
  fc.on("mouse:move", onMouseMove);
  fc.on("mouse:up", onMouseUp);
  document.addEventListener("keydown", onKeyDown);

  (fc as any).__selectToolCleanup = () => {
    fc.off("mouse:down", onMouseDown);
    fc.off("mouse:move", onMouseMove);
    fc.off("mouse:up", onMouseUp);
    document.removeEventListener("keydown", onKeyDown);
  };
}

export function deactivateSelectTool(fc: fabric.Canvas) {
  const cleanupFn = (fc as any).__selectToolCleanup;
  if (cleanupFn) {
    cleanupFn();
    delete (fc as any).__selectToolCleanup;
  }
}
