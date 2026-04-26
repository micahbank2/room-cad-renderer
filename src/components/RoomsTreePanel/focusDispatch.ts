// src/components/RoomsTreePanel/focusDispatch.ts
// Phase 46 D-07/D-08/D-09/D-10: click-to-focus camera dispatchers.
// Plan 04 wires ThreeViewport to CONSUME pendingCameraTarget.

import { useUIStore } from "@/stores/uiStore";
import { useCADStore } from "@/stores/cadStore";
import { resolveEffectiveDims } from "@/types/product";
import type { WallSegment, RoomDoc, Ceiling, PlacedProduct, PlacedCustomElement } from "@/types/cad";
import type { Product } from "@/types/product";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Request a camera move via uiStore.pendingCameraTarget (Plan 02 / 46-02 contract). */
function requestCameraTarget(
  position: [number, number, number],
  target: [number, number, number],
): void {
  const store = useUIStore as unknown as {
    getState: () => {
      requestCameraTarget?: (pos: [number, number, number], tgt: [number, number, number]) => void;
      pendingCameraTarget?: unknown;
    } & ReturnType<typeof useUIStore.getState>;
  };
  const state = store.getState() as ReturnType<typeof useUIStore.getState> & {
    requestCameraTarget?: (pos: [number, number, number], tgt: [number, number, number]) => void;
  };
  if (typeof state.requestCameraTarget === "function") {
    state.requestCameraTarget(position, target);
  }
}

// ---------------------------------------------------------------------------
// D-07: Wall focus — reuse MIC-35 wall-side framing
// ---------------------------------------------------------------------------

/**
 * Focus camera on a wall.
 * Calls focusWallSide(wall.id, "A") + select([wall.id]).
 */
export function focusOnWall(wall: WallSegment): void {
  const ui = useUIStore.getState();
  ui.focusWallSide(wall.id, "A");
  ui.select([wall.id]);
}

// ---------------------------------------------------------------------------
// D-10: Room focus — switchRoom + bbox-fit pose
// ---------------------------------------------------------------------------

/**
 * Focus camera on a room.
 * Switches active room AND requests a 3/4-view camera pose framing the room bbox.
 */
export function focusOnRoom(doc: RoomDoc): void {
  const { width, length, wallHeight } = doc.room;
  const cx = width / 2;
  const cy = wallHeight / 2;
  const cz = length / 2;

  const diag = Math.sqrt(width * width + length * length + wallHeight * wallHeight);
  const dist = diag * 1.2;

  const camPos: [number, number, number] = [
    width + dist * 0.4,
    wallHeight + dist * 0.6,
    length + dist * 0.4,
  ];
  const camTarget: [number, number, number] = [cx, cy, cz];

  requestCameraTarget(camPos, camTarget);
  useCADStore.getState().switchRoom(doc.id);
}

// ---------------------------------------------------------------------------
// D-08: Product focus — bbox-fit at 1.5× diagonal
// ---------------------------------------------------------------------------

/**
 * Focus camera on a placed product.
 * Computes bbox, derives pose at 1.5× diagonal, dispatches via pendingCameraTarget.
 */
export function focusOnPlacedProduct(pp: PlacedProduct, product: Product): void {
  const dims = resolveEffectiveDims(product, pp);
  const { width, depth, height } = dims;
  const cx = pp.position.x;
  const cy = height / 2;
  const cz = pp.position.y;

  const diag = Math.sqrt(width * width + depth * depth + height * height);
  const dist = diag * 1.5;
  const offset = dist / Math.sqrt(3);

  const camPos: [number, number, number] = [cx + offset, cy + offset, cz + offset];
  const camTarget: [number, number, number] = [cx, cy, cz];

  requestCameraTarget(camPos, camTarget);
  useUIStore.getState().select([pp.id]);
}

// ---------------------------------------------------------------------------
// D-09: Ceiling focus — tilt up to face ceiling
// ---------------------------------------------------------------------------

/**
 * Focus camera on a ceiling.
 * Camera moves to room-center floor level, looking straight up at ceiling height.
 */
export function focusOnCeiling(doc: RoomDoc, ceiling: Ceiling): void {
  const { width, length, wallHeight } = doc.room;
  const cx = width / 2;
  const cz = length / 2;
  const ceilingHeight = ceiling.height ?? wallHeight;

  const camPos: [number, number, number] = [cx, 0.5, cz];
  const camTarget: [number, number, number] = [cx, ceilingHeight, cz];

  requestCameraTarget(camPos, camTarget);
  useUIStore.getState().select([ceiling.id]);
}

// ---------------------------------------------------------------------------
// D-08 variant: Custom element focus — bbox-fit (Phase 31 overrides honored)
// ---------------------------------------------------------------------------

/**
 * Focus camera on a placed custom element.
 * Honors widthFtOverride / depthFtOverride from Phase 31 if set.
 * Falls back to catalog dims or 2ft if undefined.
 */
export function focusOnPlacedCustomElement(
  placed: PlacedCustomElement,
  catalog: { id?: string; name?: string; widthFt?: number; depthFt?: number; heightFt?: number } | undefined,
): void {
  const width = placed.widthFtOverride ?? catalog?.widthFt ?? 2;
  const depth = placed.depthFtOverride ?? catalog?.depthFt ?? 2;
  const height = catalog?.heightFt ?? 2;

  const cx = placed.position.x;
  const cy = height / 2;
  const cz = placed.position.y;

  const diag = Math.sqrt(width * width + depth * depth + height * height);
  const dist = diag * 1.5;
  const offset = dist / Math.sqrt(3);

  const camPos: [number, number, number] = [cx + offset, cy + offset, cz + offset];
  const camTarget: [number, number, number] = [cx, cy, cz];

  requestCameraTarget(camPos, camTarget);
  useUIStore.getState().select([placed.id]);
}
