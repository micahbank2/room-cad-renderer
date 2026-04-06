import * as fabric from "fabric";
import { useCADStore, getActiveRoomDoc } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { snapPoint, distance, closestPointOnWall, formatFeet } from "@/lib/geometry";
import type { Point, WallSegment, PlacedProduct, PlacedCustomElement, CustomElement } from "@/types/cad";
import type { Product } from "@/types/product";
import { effectiveDimensions } from "@/types/product";
import { hitTestHandle, snapAngle, angleFromCenterToPointer } from "../rotationHandle";
import {
  hitTestWallHandle,
  angleFromMidpointToPointer,
  wallAngleDeg,
  snapWallAngle,
} from "../wallRotationHandle";
import { hitTestResizeHandle } from "../resizeHandles";
import {
  hitTestWallEndpoint,
  hitTestWallThickness,
  projectThicknessDrag,
} from "../wallEditHandles";
import {
  hitTestOpeningHandle,
  projectOntoWall,
} from "../openingEditHandles";
import { wallLength } from "@/lib/geometry";

type DragType =
  | "wall"
  | "product"
  | "rotate"
  | "wall-rotate"
  | "product-resize"
  | "wall-endpoint"
  | "wall-thickness"
  | "opening-slide"
  | "opening-resize-left"
  | "opening-resize-right"
  | null;

interface SelectState {
  dragging: boolean;
  dragId: string | null;
  dragType: DragType;
  dragOffsetFeet: Point | null;
  rotateInitialAngle: number | null;
  wallRotateInitialAngleDeg: number | null;
  wallRotatePointerStartDeg: number | null;
  resizeInitialScale: number | null;
  resizeInitialDiagFt: number | null;
  wallEndpointWhich: "start" | "end" | null;
  openingWallId: string | null;
  openingId: string | null;
  openingInitialOffset: number | null;
  openingInitialWidth: number | null;
  openingInitialPointerOffset: number | null;
}

const state: SelectState = {
  dragging: false,
  dragId: null,
  dragType: null,
  dragOffsetFeet: null,
  rotateInitialAngle: null,
  wallRotateInitialAngleDeg: null,
  wallRotatePointerStartDeg: null,
  resizeInitialScale: null,
  resizeInitialDiagFt: null,
  wallEndpointWhich: null,
  openingWallId: null,
  openingId: null,
  openingInitialOffset: null,
  openingInitialWidth: null,
  openingInitialPointerOffset: null,
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
 * Ray-casting point-in-polygon test for ceiling selection.
 * Returns true if pt is inside the polygon defined by points.
 */
function pointInPolygon(pt: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect =
      yi > pt.y !== yj > pt.y &&
      pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Hit test against CAD store data using real-world coordinates.
 * This avoids Fabric.js containsPoint issues with evented:false objects.
 */
function hitTestStore(
  feetPos: Point,
  productLibrary: Product[]
): { id: string; type: "wall" | "product" | "ceiling" } | null {
  const doc = getActiveRoomDoc();
  if (!doc) return null;

  // Check products first (they're on top) — orphan + null-dim use 2x2 AABB
  for (const pp of Object.values(doc.placedProducts)) {
    const product = productLibrary.find((p) => p.id === pp.productId);
    const { width, depth } = effectiveDimensions(product, pp.sizeScale);
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

  // Check placed custom elements (POLISH-01) — same AABB as products
  const customElements = (doc as any).placedCustomElements ?? {};
  const catalog = (useCADStore.getState() as any).customElements ?? {};
  for (const pce of Object.values(customElements) as PlacedCustomElement[]) {
    const el = catalog[pce.customElementId] as CustomElement | undefined;
    if (!el) continue;
    const sc = pce.sizeScale ?? 1;
    const halfW = (el.width * sc) / 2;
    const halfD = (el.depth * sc) / 2;
    if (
      feetPos.x >= pce.position.x - halfW &&
      feetPos.x <= pce.position.x + halfW &&
      feetPos.y >= pce.position.y - halfD &&
      feetPos.y <= pce.position.y + halfD
    ) {
      return { id: pce.id, type: "product" as const };
    }
  }

  // Check ceilings — point-in-polygon for each ceiling (Phase 18)
  for (const c of Object.values(doc.ceilings ?? {})) {
    if (c.points && c.points.length >= 3 && pointInPolygon(feetPos, c.points)) {
      return { id: c.id, type: "ceiling" };
    }
  }

  // Check walls — find closest wall within threshold
  const HIT_THRESHOLD = 0.5; // feet
  let closestWallId: string | null = null;
  let closestDist = Infinity;

  for (const wall of Object.values(doc.walls)) {
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

// Live size-tag shown during product resize
let sizeTag: fabric.Group | null = null;

function updateSizeTag(
  fc: fabric.Canvas,
  pp: PlacedProduct,
  widthFt: number,
  depthFt: number,
  viewScale: number,
  viewOrigin: { x: number; y: number },
) {
  const label = `${formatFeet(widthFt)} × ${formatFeet(depthFt)}`;
  // Position the tag just below the product
  const hw = widthFt / 2;
  const hd = depthFt / 2;
  const rad = (pp.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  // Bottom-center of product in local coords → world
  const localBottom = { x: 0, y: hd + 0.5 };
  const worldX = pp.position.x + localBottom.x * cos - localBottom.y * sin;
  const worldY = pp.position.y + localBottom.x * sin + localBottom.y * cos;
  const px = viewOrigin.x + worldX * viewScale;
  const py = viewOrigin.y + worldY * viewScale;

  if (sizeTag) fc.remove(sizeTag);
  const bg = new fabric.Rect({
    width: 80,
    height: 20,
    fill: "#12121d",
    stroke: "#7c5bf0",
    strokeWidth: 1,
    rx: 2,
    ry: 2,
    originX: "center",
    originY: "center",
  });
  const text = new fabric.Text(label, {
    fontFamily: "IBM Plex Mono",
    fontSize: 10,
    fill: "#ccbeff",
    originX: "center",
    originY: "center",
  });
  sizeTag = new fabric.Group([bg, text], {
    left: px,
    top: py,
    originX: "center",
    originY: "center",
    selectable: false,
    evented: false,
  });
  fc.add(sizeTag);
  fc.renderAll();
  void hw;
}

function clearSizeTag(fc: fabric.Canvas) {
  if (sizeTag) {
    fc.remove(sizeTag);
    sizeTag = null;
    fc.renderAll();
  }
}

/** Generic text tag that follows a world-coords anchor point. Reuses the
 *  sizeTag group so only one floating tag is visible at a time. */
function updateTextTag(
  fc: fabric.Canvas,
  label: string,
  worldAnchor: Point,
  viewScale: number,
  viewOrigin: { x: number; y: number },
) {
  const px = viewOrigin.x + worldAnchor.x * viewScale;
  const py = viewOrigin.y + worldAnchor.y * viewScale;
  if (sizeTag) fc.remove(sizeTag);
  const bg = new fabric.Rect({
    width: 60,
    height: 18,
    fill: "#12121d",
    stroke: "#7c5bf0",
    strokeWidth: 1,
    rx: 2,
    ry: 2,
    originX: "center",
    originY: "center",
  });
  const text = new fabric.Text(label, {
    fontFamily: "IBM Plex Mono",
    fontSize: 10,
    fill: "#ccbeff",
    originX: "center",
    originY: "center",
  });
  sizeTag = new fabric.Group([bg, text], {
    left: px,
    top: py,
    originX: "center",
    originY: "center",
    selectable: false,
    evented: false,
  });
  fc.add(sizeTag);
  fc.renderAll();
}

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
    const isMetaClick = (opt.e as MouseEvent).metaKey || (opt.e as MouseEvent).ctrlKey;
    const currentSelection = useUIStore.getState().selectedIds;
    if (currentSelection.length === 1 && !isMetaClick) {
      const selId = currentSelection[0];
      const pp = (getActiveRoomDoc()?.placedProducts ?? {})[selId];
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
        // Resize handle hit-test (EDIT-14)
        const { width, depth } = effectiveDimensions(prod, pp.sizeScale);
        if (hitTestResizeHandle(feet, pp, width, depth)) {
          state.dragging = true;
          state.dragId = selId;
          state.dragType = "product-resize";
          state.resizeInitialScale = pp.sizeScale ?? 1;
          // Current diagonal distance from center to pointer
          const dx = feet.x - pp.position.x;
          const dy = feet.y - pp.position.y;
          state.resizeInitialDiagFt = Math.sqrt(dx * dx + dy * dy);
          // Push history snapshot at drag start
          useCADStore.getState().resizeProduct(selId, state.resizeInitialScale);
          return;
        }
      }
      // Custom element handles (POLISH-01) — mirror product handles
      const pce = (getActiveRoomDoc()?.placedCustomElements ?? {})[selId];
      if (pce) {
        const customCatalog = (useCADStore.getState() as any).customElements ?? {};
        const el = customCatalog[pce.customElementId] as CustomElement | undefined;
        if (el) {
          const sc = pce.sizeScale ?? 1;
          const w = el.width * sc;
          const d = el.depth * sc;
          // Rotation handle
          if (hitTestHandle(feet, pce as unknown as PlacedProduct, d)) {
            state.dragging = true;
            state.dragId = selId;
            state.dragType = "rotate";
            state.rotateInitialAngle = pce.rotation;
            useCADStore.getState().rotateCustomElement(selId, pce.rotation);
            return;
          }
          // Resize handles
          if (hitTestResizeHandle(feet, pce as unknown as PlacedProduct, w, d)) {
            state.dragging = true;
            state.dragId = selId;
            state.dragType = "product-resize";
            state.resizeInitialScale = pce.sizeScale ?? 1;
            const dx = feet.x - pce.position.x;
            const dy = feet.y - pce.position.y;
            state.resizeInitialDiagFt = Math.sqrt(dx * dx + dy * dy);
            useCADStore.getState().resizeCustomElement(selId, state.resizeInitialScale);
            return;
          }
        }
      }

      // Wall handles (EDIT-12 rotate + EDIT-15 endpoints + EDIT-16 thickness)
      const wall = (getActiveRoomDoc()?.walls ?? {})[selId];
      if (wall) {
        // Endpoint drag (EDIT-15)
        const whichEndpoint = hitTestWallEndpoint(feet, wall);
        if (whichEndpoint) {
          state.dragging = true;
          state.dragId = selId;
          state.dragType = "wall-endpoint";
          state.wallEndpointWhich = whichEndpoint;
          // Push history snapshot at drag start
          useCADStore.getState().updateWall(selId, {});
          return;
        }
        // Thickness drag (EDIT-16)
        if (hitTestWallThickness(feet, wall)) {
          state.dragging = true;
          state.dragId = selId;
          state.dragType = "wall-thickness";
          useCADStore.getState().updateWall(selId, {});
          return;
        }
        // Rotation (EDIT-12)
        if (hitTestWallHandle(feet, wall)) {
          state.dragging = true;
          state.dragId = selId;
          state.dragType = "wall-rotate";
          state.wallRotateInitialAngleDeg = wallAngleDeg(wall);
          state.wallRotatePointerStartDeg = angleFromMidpointToPointer(wall, feet);
          useCADStore.getState().rotateWall(selId, 0);
          return;
        }
        // Opening handles within this wall (EDIT-17/18)
        for (const op of wall.openings) {
          const hit = hitTestOpeningHandle(feet, wall, op);
          if (hit) {
            state.dragging = true;
            state.dragId = selId;
            state.openingWallId = selId;
            state.openingId = op.id;
            state.openingInitialOffset = op.offset;
            state.openingInitialWidth = op.width;
            state.openingInitialPointerOffset = projectOntoWall(feet, wall);
            if (hit === "center") state.dragType = "opening-slide";
            else if (hit === "left") state.dragType = "opening-resize-left";
            else state.dragType = "opening-resize-right";
            useCADStore.getState().updateOpening(selId, op.id, {});
            return;
          }
        }
      }
    }

    const hit = hitTestStore(feet, _productLibrary);

    if (hit) {
      if (isMetaClick) {
        // Multi-select: toggle the hit item in/out of selection (POLISH-05)
        const current = useUIStore.getState().selectedIds;
        if (current.includes(hit.id)) {
          // Deselect if already selected
          useUIStore.getState().select(current.filter((id) => id !== hit.id));
        } else {
          useUIStore.getState().addToSelection(hit.id);
        }
        // Do NOT start drag on meta-click — just adjust selection
        state.dragging = false;
        state.dragId = null;
        state.dragType = null;
        return;
      }

      useUIStore.getState().select([hit.id]);

      // Ceilings are not draggable — just select, no drag state
      if (hit.type === "ceiling") {
        state.dragging = false;
        state.dragId = null;
        state.dragType = null;
        return;
      }

      state.dragging = true;
      state.dragId = hit.id;
      state.dragType = hit.type as "wall" | "product";

      if (hit.type === "product") {
        const pp = (getActiveRoomDoc()?.placedProducts ?? {})[hit.id];
        const pce = (getActiveRoomDoc()?.placedCustomElements ?? {})[hit.id];
        const pos = pp?.position ?? pce?.position;
        if (pos) {
          state.dragOffsetFeet = {
            x: feet.x - pos.x,
            y: feet.y - pos.y,
          };
        }
      } else if (hit.type === "wall") {
        const wall = (getActiveRoomDoc()?.walls ?? {})[hit.id];
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
      const pp = (getActiveRoomDoc()?.placedProducts ?? {})[state.dragId];
      const pce = (getActiveRoomDoc()?.placedCustomElements ?? {})[state.dragId];
      const target = pp || pce;
      if (!target) return;
      const raw = angleFromCenterToPointer(target.position, feet);
      const shiftHeld = (opt.e as MouseEvent).shiftKey === true;
      const next = snapAngle(raw, shiftHeld);
      if (pp) {
        useCADStore.getState().rotateProductNoHistory(state.dragId, next);
      } else {
        useCADStore.getState().rotateCustomElementNoHistory(state.dragId, next);
      }
      return;
    }

    if (state.dragType === "product-resize") {
      const pp = (getActiveRoomDoc()?.placedProducts ?? {})[state.dragId];
      const pce2 = (getActiveRoomDoc()?.placedCustomElements ?? {})[state.dragId];
      const target2 = pp || pce2;
      if (!target2 || state.resizeInitialDiagFt == null || state.resizeInitialScale == null) return;
      const dx = feet.x - target2.position.x;
      const dy = feet.y - target2.position.y;
      const currentDiag = Math.sqrt(dx * dx + dy * dy);
      if (state.resizeInitialDiagFt < 1e-6) return;
      const ratio = currentDiag / state.resizeInitialDiagFt;
      const newScale = Math.max(0.1, Math.min(10, state.resizeInitialScale * ratio));
      if (pp) {
        useCADStore.getState().resizeProductNoHistory(state.dragId, newScale);
        // Update live size tag for products
        const prod = _productLibrary.find((p) => p.id === pp.productId);
        const dims = effectiveDimensions(prod, newScale);
        const updatedPp = (getActiveRoomDoc()?.placedProducts ?? {})[state.dragId];
        if (updatedPp) updateSizeTag(fc, updatedPp, dims.width, dims.depth, scale, origin);
      } else {
        useCADStore.getState().resizeCustomElementNoHistory(state.dragId, newScale);
        // Update live size tag for custom elements
        const customCatalog2 = (useCADStore.getState() as any).customElements ?? {};
        const el2 = customCatalog2[pce2.customElementId] as CustomElement | undefined;
        if (el2) {
          const updatedPce = (getActiveRoomDoc()?.placedCustomElements ?? {})[state.dragId];
          if (updatedPce) {
            const w2 = el2.width * newScale;
            const d2 = el2.depth * newScale;
            updateSizeTag(fc, updatedPce as unknown as PlacedProduct, w2, d2, scale, origin);
          }
        }
      }
      return;
    }

    if (state.dragType === "wall-endpoint") {
      const wall = (getActiveRoomDoc()?.walls ?? {})[state.dragId];
      if (!wall || !state.wallEndpointWhich) return;
      const gridSnap = useUIStore.getState().gridSnap;
      const snapped = gridSnap > 0 ? snapPoint(feet, gridSnap) : feet;
      const changes = state.wallEndpointWhich === "start"
        ? { start: snapped }
        : { end: snapped };
      useCADStore.getState().updateWallNoHistory(state.dragId, changes);
      // Live length tag
      const w2 = (getActiveRoomDoc()?.walls ?? {})[state.dragId];
      if (w2) {
        const lenFt = wallLength(w2);
        const mx = (w2.start.x + w2.end.x) / 2;
        const my = (w2.start.y + w2.end.y) / 2;
        updateTextTag(fc, `${formatFeet(lenFt)}`, { x: mx, y: my - 0.8 }, scale, origin);
      }
      return;
    }

    if (state.dragType === "wall-thickness") {
      const wall = (getActiveRoomDoc()?.walls ?? {})[state.dragId];
      if (!wall) return;
      const signedDist = projectThicknessDrag(feet, wall);
      // signed distance = new halfT, so newThickness = 2 * |signedDist|
      const newThickness = Math.max(0.1, Math.min(3, 2 * Math.abs(signedDist)));
      useCADStore.getState().updateWallNoHistory(state.dragId, { thickness: newThickness });
      // Live thickness tag
      const w2 = (getActiveRoomDoc()?.walls ?? {})[state.dragId];
      if (w2) {
        const mx = (w2.start.x + w2.end.x) / 2;
        const my = (w2.start.y + w2.end.y) / 2;
        updateTextTag(fc, formatFeet(w2.thickness), { x: mx, y: my }, scale, origin);
      }
      return;
    }

    if (
      state.dragType === "opening-slide" ||
      state.dragType === "opening-resize-left" ||
      state.dragType === "opening-resize-right"
    ) {
      if (!state.openingWallId || !state.openingId ||
          state.openingInitialOffset == null ||
          state.openingInitialWidth == null ||
          state.openingInitialPointerOffset == null) return;
      const wall = (getActiveRoomDoc()?.walls ?? {})[state.openingWallId];
      if (!wall) return;
      const wLen = wallLength(wall);
      const pointerOffset = projectOntoWall(feet, wall);
      const delta = pointerOffset - state.openingInitialPointerOffset;

      if (state.dragType === "opening-slide") {
        const maxOffset = wLen - state.openingInitialWidth;
        const newOffset = Math.max(0, Math.min(maxOffset, state.openingInitialOffset + delta));
        useCADStore.getState().updateOpeningNoHistory(state.openingWallId, state.openingId, { offset: newOffset });
      } else if (state.dragType === "opening-resize-right") {
        // Right edge moves; keep offset fixed, change width
        const newWidth = Math.max(0.5, Math.min(
          wLen - state.openingInitialOffset,
          state.openingInitialWidth + delta,
        ));
        useCADStore.getState().updateOpeningNoHistory(state.openingWallId, state.openingId, { width: newWidth });
      } else {
        // Left edge moves; offset and width both change (right edge stays fixed)
        const rightEdge = state.openingInitialOffset + state.openingInitialWidth;
        const newOffset = Math.max(0, Math.min(rightEdge - 0.5, state.openingInitialOffset + delta));
        const newWidth = rightEdge - newOffset;
        useCADStore.getState().updateOpeningNoHistory(state.openingWallId, state.openingId, {
          offset: newOffset,
          width: newWidth,
        });
      }
      // Live width tag
      const op = wall.openings.find((o) => o.id === state.openingId);
      if (op) {
        const cx = (wall.start.x + wall.end.x) / 2;
        const cy = (wall.start.y + wall.end.y) / 2;
        updateTextTag(fc, formatFeet(op.width), { x: cx, y: cy - 0.8 }, scale, origin);
      }
      return;
    }

    if (state.dragType === "wall-rotate") {
      const wall = (getActiveRoomDoc()?.walls ?? {})[state.dragId];
      if (!wall || state.wallRotatePointerStartDeg == null || state.wallRotateInitialAngleDeg == null) return;
      const currentPointerDeg = angleFromMidpointToPointer(wall, feet);
      const delta = currentPointerDeg - state.wallRotatePointerStartDeg;
      // Desired absolute wall angle = initial + delta. But rotateWall takes
      // an incremental delta each call, so we need to rotate by (desiredAngle
      // - currentWallAngle).
      const desired = state.wallRotateInitialAngleDeg + delta;
      const shiftHeld = (opt.e as MouseEvent).shiftKey === true;
      const snappedDesired = snapWallAngle(desired, shiftHeld);
      const currentWallAngle = wallAngleDeg(wall);
      const incremental = snappedDesired - currentWallAngle;
      if (Math.abs(incremental) > 1e-4) {
        useCADStore.getState().rotateWallNoHistory(state.dragId, incremental);
      }
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
      const pp3 = (getActiveRoomDoc()?.placedProducts ?? {})[state.dragId];
      if (pp3) {
        useCADStore.getState().moveProduct(state.dragId, snapped);
      } else {
        useCADStore.getState().moveCustomElement(state.dragId, snapped);
      }
    } else if (state.dragType === "wall") {
      const wall = (getActiveRoomDoc()?.walls ?? {})[state.dragId];
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
    if (
      state.dragType === "product-resize" ||
      state.dragType === "wall-endpoint" ||
      state.dragType === "wall-thickness" ||
      state.dragType === "opening-slide" ||
      state.dragType === "opening-resize-left" ||
      state.dragType === "opening-resize-right"
    ) {
      clearSizeTag(fc);
    }
    state.dragging = false;
    state.dragId = null;
    state.dragType = null;
    state.dragOffsetFeet = null;
    state.rotateInitialAngle = null;
    state.wallRotateInitialAngleDeg = null;
    state.wallRotatePointerStartDeg = null;
    state.resizeInitialScale = null;
    state.resizeInitialDiagFt = null;
    state.wallEndpointWhich = null;
    state.openingWallId = null;
    state.openingId = null;
    state.openingInitialOffset = null;
    state.openingInitialWidth = null;
    state.openingInitialPointerOffset = null;
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
    clearSizeTag(fc);
  };
}

export function deactivateSelectTool(fc: fabric.Canvas) {
  const cleanupFn = (fc as any).__selectToolCleanup;
  if (cleanupFn) {
    cleanupFn();
    delete (fc as any).__selectToolCleanup;
  }
}
