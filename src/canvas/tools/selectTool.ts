import * as fabric from "fabric";
import { useCADStore, getActiveRoomDoc } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { snapPoint, distance, closestPointOnWall, formatFeet } from "@/lib/geometry";
import type { Point, PlacedProduct, PlacedCustomElement, CustomElement } from "@/types/cad";
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
import { pxToFeet } from "./toolUtils";

type DragType =
  | "wall"
  | "product"
  | "ceiling"
  | "rotate"
  | "wall-rotate"
  | "product-resize"
  | "wall-endpoint"
  | "wall-thickness"
  | "opening-slide"
  | "opening-resize-left"
  | "opening-resize-right"
  | null;

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

/** Product library reference — set by the canvas component. Module-scoped
 *  per D-07 — this is the component → tool bridge (public API), not
 *  per-activation state. */
let _productLibrary: Product[] = [];

export function setSelectToolProductLibrary(products: Product[]) {
  _productLibrary = products;
}

export function activateSelectTool(
  fc: fabric.Canvas,
  scale: number,
  origin: { x: number; y: number },
): () => void {
  // Per-activation drag/interaction state (dissolved from the old `SelectState`
  // wrapper interface per D-06).
  let dragging = false;
  let dragId: string | null = null;
  let dragType: DragType = null;
  let dragOffsetFeet: Point | null = null;
  let rotateInitialAngle: number | null = null;
  let wallRotateInitialAngleDeg: number | null = null;
  let wallRotatePointerStartDeg: number | null = null;
  let resizeInitialScale: number | null = null;
  let resizeInitialDiagFt: number | null = null;
  let wallEndpointWhich: "start" | "end" | null = null;
  let openingWallId: string | null = null;
  let openingId: string | null = null;
  let openingInitialOffset: number | null = null;
  let openingInitialWidth: number | null = null;
  let openingInitialPointerOffset: number | null = null;

  // Live size-tag shown during product resize — closure-scoped per D-06.
  let sizeTag: fabric.Group | null = null;

  const updateSizeTag = (
    pp: PlacedProduct,
    widthFt: number,
    depthFt: number,
  ) => {
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
    const px = origin.x + worldX * scale;
    const py = origin.y + worldY * scale;

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
  };

  const clearSizeTag = () => {
    if (sizeTag) {
      fc.remove(sizeTag);
      sizeTag = null;
      fc.renderAll();
    }
  };

  /** Generic text tag that follows a world-coords anchor point. Reuses the
   *  sizeTag group so only one floating tag is visible at a time. */
  const updateTextTag = (
    label: string,
    worldAnchor: Point,
  ) => {
    const px = origin.x + worldAnchor.x * scale;
    const py = origin.y + worldAnchor.y * scale;
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
  };

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
          dragging = true;
          dragId = selId;
          dragType = "rotate";
          rotateInitialAngle = pp.rotation;
          // Push single history snapshot at drag start as undo boundary
          useCADStore.getState().rotateProduct(selId, pp.rotation);
          return;
        }
        // Resize handle hit-test (EDIT-14)
        const { width, depth } = effectiveDimensions(prod, pp.sizeScale);
        if (hitTestResizeHandle(feet, pp, width, depth)) {
          dragging = true;
          dragId = selId;
          dragType = "product-resize";
          resizeInitialScale = pp.sizeScale ?? 1;
          // Current diagonal distance from center to pointer
          const dx = feet.x - pp.position.x;
          const dy = feet.y - pp.position.y;
          resizeInitialDiagFt = Math.sqrt(dx * dx + dy * dy);
          // Push history snapshot at drag start
          useCADStore.getState().resizeProduct(selId, resizeInitialScale);
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
            dragging = true;
            dragId = selId;
            dragType = "rotate";
            rotateInitialAngle = pce.rotation;
            useCADStore.getState().rotateCustomElement(selId, pce.rotation);
            return;
          }
          // Resize handles
          if (hitTestResizeHandle(feet, pce as unknown as PlacedProduct, w, d)) {
            dragging = true;
            dragId = selId;
            dragType = "product-resize";
            resizeInitialScale = pce.sizeScale ?? 1;
            const dx = feet.x - pce.position.x;
            const dy = feet.y - pce.position.y;
            resizeInitialDiagFt = Math.sqrt(dx * dx + dy * dy);
            useCADStore.getState().resizeCustomElement(selId, resizeInitialScale);
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
          dragging = true;
          dragId = selId;
          dragType = "wall-endpoint";
          wallEndpointWhich = whichEndpoint;
          // Push history snapshot at drag start
          useCADStore.getState().updateWall(selId, {});
          return;
        }
        // Thickness drag (EDIT-16)
        if (hitTestWallThickness(feet, wall)) {
          dragging = true;
          dragId = selId;
          dragType = "wall-thickness";
          useCADStore.getState().updateWall(selId, {});
          return;
        }
        // Rotation (EDIT-12)
        if (hitTestWallHandle(feet, wall)) {
          dragging = true;
          dragId = selId;
          dragType = "wall-rotate";
          wallRotateInitialAngleDeg = wallAngleDeg(wall);
          wallRotatePointerStartDeg = angleFromMidpointToPointer(wall, feet);
          useCADStore.getState().rotateWall(selId, 0);
          return;
        }
        // Opening handles within this wall (EDIT-17/18)
        for (const op of wall.openings) {
          const hit = hitTestOpeningHandle(feet, wall, op);
          if (hit) {
            dragging = true;
            dragId = selId;
            openingWallId = selId;
            openingId = op.id;
            openingInitialOffset = op.offset;
            openingInitialWidth = op.width;
            openingInitialPointerOffset = projectOntoWall(feet, wall);
            if (hit === "center") dragType = "opening-slide";
            else if (hit === "left") dragType = "opening-resize-left";
            else dragType = "opening-resize-right";
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
        dragging = false;
        dragId = null;
        dragType = null;
        return;
      }

      useUIStore.getState().select([hit.id]);

      dragging = true;
      dragId = hit.id;
      dragType = hit.type as "wall" | "product" | "ceiling";

      if (hit.type === "ceiling") {
        const ceiling = (getActiveRoomDoc()?.ceilings ?? {})[hit.id];
        if (ceiling && ceiling.points.length > 0) {
          // Compute centroid as drag anchor
          const cx = ceiling.points.reduce((s, p) => s + p.x, 0) / ceiling.points.length;
          const cy = ceiling.points.reduce((s, p) => s + p.y, 0) / ceiling.points.length;
          dragOffsetFeet = { x: feet.x - cx, y: feet.y - cy };
          // Push one history entry at drag start
          useCADStore.getState().updateCeiling(hit.id, {});
        }
      } else if (hit.type === "product") {
        const pp = (getActiveRoomDoc()?.placedProducts ?? {})[hit.id];
        const pce = (getActiveRoomDoc()?.placedCustomElements ?? {})[hit.id];
        const pos = pp?.position ?? pce?.position;
        if (pos) {
          dragOffsetFeet = {
            x: feet.x - pos.x,
            y: feet.y - pos.y,
          };
        }
      } else if (hit.type === "wall") {
        const wall = (getActiveRoomDoc()?.walls ?? {})[hit.id];
        if (wall) {
          const cx = (wall.start.x + wall.end.x) / 2;
          const cy = (wall.start.y + wall.end.y) / 2;
          dragOffsetFeet = { x: feet.x - cx, y: feet.y - cy };
        }
      }
    } else {
      useUIStore.getState().clearSelection();
      dragging = false;
      dragId = null;
    }
  };

  const onMouseMove = (opt: fabric.TEvent) => {
    if (!dragging || !dragId) return;
    const pointer = fc.getViewportPoint(opt.e);
    const feet = pxToFeet(pointer, origin, scale);

    if (dragType === "rotate") {
      const pp = (getActiveRoomDoc()?.placedProducts ?? {})[dragId];
      const pce = (getActiveRoomDoc()?.placedCustomElements ?? {})[dragId];
      const target = pp || pce;
      if (!target) return;
      const raw = angleFromCenterToPointer(target.position, feet);
      const shiftHeld = (opt.e as MouseEvent).shiftKey === true;
      const next = snapAngle(raw, shiftHeld);
      if (pp) {
        useCADStore.getState().rotateProductNoHistory(dragId, next);
      } else {
        useCADStore.getState().rotateCustomElementNoHistory(dragId, next);
      }
      return;
    }

    if (dragType === "product-resize") {
      const pp = (getActiveRoomDoc()?.placedProducts ?? {})[dragId];
      const pce2 = (getActiveRoomDoc()?.placedCustomElements ?? {})[dragId];
      const target2 = pp || pce2;
      if (!target2 || resizeInitialDiagFt == null || resizeInitialScale == null) return;
      const dx = feet.x - target2.position.x;
      const dy = feet.y - target2.position.y;
      const currentDiag = Math.sqrt(dx * dx + dy * dy);
      if (resizeInitialDiagFt < 1e-6) return;
      const ratio = currentDiag / resizeInitialDiagFt;
      const newScale = Math.max(0.1, Math.min(10, resizeInitialScale * ratio));
      if (pp) {
        useCADStore.getState().resizeProductNoHistory(dragId, newScale);
        // Update live size tag for products
        const prod = _productLibrary.find((p) => p.id === pp.productId);
        const dims = effectiveDimensions(prod, newScale);
        const updatedPp = (getActiveRoomDoc()?.placedProducts ?? {})[dragId];
        if (updatedPp) updateSizeTag(updatedPp, dims.width, dims.depth);
      } else {
        useCADStore.getState().resizeCustomElementNoHistory(dragId, newScale);
        // Update live size tag for custom elements
        const customCatalog2 = (useCADStore.getState() as any).customElements ?? {};
        const el2 = customCatalog2[pce2.customElementId] as CustomElement | undefined;
        if (el2) {
          const updatedPce = (getActiveRoomDoc()?.placedCustomElements ?? {})[dragId];
          if (updatedPce) {
            const w2 = el2.width * newScale;
            const d2 = el2.depth * newScale;
            updateSizeTag(updatedPce as unknown as PlacedProduct, w2, d2);
          }
        }
      }
      return;
    }

    if (dragType === "wall-endpoint") {
      const wall = (getActiveRoomDoc()?.walls ?? {})[dragId];
      if (!wall || !wallEndpointWhich) return;
      const gridSnap = useUIStore.getState().gridSnap;
      const snapped = gridSnap > 0 ? snapPoint(feet, gridSnap) : feet;
      const changes = wallEndpointWhich === "start"
        ? { start: snapped }
        : { end: snapped };
      useCADStore.getState().updateWallNoHistory(dragId, changes);
      // Live length tag
      const w2 = (getActiveRoomDoc()?.walls ?? {})[dragId];
      if (w2) {
        const lenFt = wallLength(w2);
        const mx = (w2.start.x + w2.end.x) / 2;
        const my = (w2.start.y + w2.end.y) / 2;
        updateTextTag(`${formatFeet(lenFt)}`, { x: mx, y: my - 0.8 });
      }
      return;
    }

    if (dragType === "wall-thickness") {
      const wall = (getActiveRoomDoc()?.walls ?? {})[dragId];
      if (!wall) return;
      const signedDist = projectThicknessDrag(feet, wall);
      // signed distance = new halfT, so newThickness = 2 * |signedDist|
      const newThickness = Math.max(0.1, Math.min(3, 2 * Math.abs(signedDist)));
      useCADStore.getState().updateWallNoHistory(dragId, { thickness: newThickness });
      // Live thickness tag
      const w2 = (getActiveRoomDoc()?.walls ?? {})[dragId];
      if (w2) {
        const mx = (w2.start.x + w2.end.x) / 2;
        const my = (w2.start.y + w2.end.y) / 2;
        updateTextTag(formatFeet(w2.thickness), { x: mx, y: my });
      }
      return;
    }

    if (
      dragType === "opening-slide" ||
      dragType === "opening-resize-left" ||
      dragType === "opening-resize-right"
    ) {
      if (!openingWallId || !openingId ||
          openingInitialOffset == null ||
          openingInitialWidth == null ||
          openingInitialPointerOffset == null) return;
      const wall = (getActiveRoomDoc()?.walls ?? {})[openingWallId];
      if (!wall) return;
      const wLen = wallLength(wall);
      const pointerOffset = projectOntoWall(feet, wall);
      const delta = pointerOffset - openingInitialPointerOffset;

      if (dragType === "opening-slide") {
        const maxOffset = wLen - openingInitialWidth;
        const newOffset = Math.max(0, Math.min(maxOffset, openingInitialOffset + delta));
        useCADStore.getState().updateOpeningNoHistory(openingWallId, openingId, { offset: newOffset });
      } else if (dragType === "opening-resize-right") {
        // Right edge moves; keep offset fixed, change width
        const newWidth = Math.max(0.5, Math.min(
          wLen - openingInitialOffset,
          openingInitialWidth + delta,
        ));
        useCADStore.getState().updateOpeningNoHistory(openingWallId, openingId, { width: newWidth });
      } else {
        // Left edge moves; offset and width both change (right edge stays fixed)
        const rightEdge = openingInitialOffset + openingInitialWidth;
        const newOffset = Math.max(0, Math.min(rightEdge - 0.5, openingInitialOffset + delta));
        const newWidth = rightEdge - newOffset;
        useCADStore.getState().updateOpeningNoHistory(openingWallId, openingId, {
          offset: newOffset,
          width: newWidth,
        });
      }
      // Live width tag
      const op = wall.openings.find((o) => o.id === openingId);
      if (op) {
        const cx = (wall.start.x + wall.end.x) / 2;
        const cy = (wall.start.y + wall.end.y) / 2;
        updateTextTag(formatFeet(op.width), { x: cx, y: cy - 0.8 });
      }
      return;
    }

    if (dragType === "wall-rotate") {
      const wall = (getActiveRoomDoc()?.walls ?? {})[dragId];
      if (!wall || wallRotatePointerStartDeg == null || wallRotateInitialAngleDeg == null) return;
      const currentPointerDeg = angleFromMidpointToPointer(wall, feet);
      const delta = currentPointerDeg - wallRotatePointerStartDeg;
      // Desired absolute wall angle = initial + delta. But rotateWall takes
      // an incremental delta each call, so we need to rotate by (desiredAngle
      // - currentWallAngle).
      const desired = wallRotateInitialAngleDeg + delta;
      const shiftHeld = (opt.e as MouseEvent).shiftKey === true;
      const snappedDesired = snapWallAngle(desired, shiftHeld);
      const currentWallAngle = wallAngleDeg(wall);
      const incremental = snappedDesired - currentWallAngle;
      if (Math.abs(incremental) > 1e-4) {
        useCADStore.getState().rotateWallNoHistory(dragId, incremental);
      }
      return;
    }

    if (!dragOffsetFeet) return;
    const gridSnap = useUIStore.getState().gridSnap;
    const targetX = feet.x - dragOffsetFeet.x;
    const targetY = feet.y - dragOffsetFeet.y;
    const snapped =
      gridSnap > 0
        ? snapPoint({ x: targetX, y: targetY }, gridSnap)
        : { x: targetX, y: targetY };

    if (dragType === "ceiling") {
      const ceiling = (getActiveRoomDoc()?.ceilings ?? {})[dragId];
      if (ceiling && ceiling.points.length > 0) {
        const cx = ceiling.points.reduce((s, p) => s + p.x, 0) / ceiling.points.length;
        const cy = ceiling.points.reduce((s, p) => s + p.y, 0) / ceiling.points.length;
        const dx = snapped.x - cx;
        const dy = snapped.y - cy;
        const newPoints = ceiling.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
        useCADStore.getState().updateCeilingNoHistory(dragId, { points: newPoints });
      }
    } else if (dragType === "product") {
      const pp3 = (getActiveRoomDoc()?.placedProducts ?? {})[dragId];
      if (pp3) {
        useCADStore.getState().moveProduct(dragId, snapped);
      } else {
        useCADStore.getState().moveCustomElement(dragId, snapped);
      }
    } else if (dragType === "wall") {
      const wall = (getActiveRoomDoc()?.walls ?? {})[dragId];
      if (wall) {
        const cx = (wall.start.x + wall.end.x) / 2;
        const cy = (wall.start.y + wall.end.y) / 2;
        const dx = snapped.x - cx;
        const dy = snapped.y - cy;
        useCADStore.getState().updateWall(dragId, {
          start: { x: wall.start.x + dx, y: wall.start.y + dy },
          end: { x: wall.end.x + dx, y: wall.end.y + dy },
        });
      }
    }
  };

  const onMouseUp = () => {
    if (
      dragType === "product-resize" ||
      dragType === "wall-endpoint" ||
      dragType === "wall-thickness" ||
      dragType === "opening-slide" ||
      dragType === "opening-resize-left" ||
      dragType === "opening-resize-right"
    ) {
      clearSizeTag();
    }
    dragging = false;
    dragId = null;
    dragType = null;
    dragOffsetFeet = null;
    rotateInitialAngle = null;
    wallRotateInitialAngleDeg = null;
    wallRotatePointerStartDeg = null;
    resizeInitialScale = null;
    resizeInitialDiagFt = null;
    wallEndpointWhich = null;
    openingWallId = null;
    openingId = null;
    openingInitialOffset = null;
    openingInitialWidth = null;
    openingInitialPointerOffset = null;
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

  return () => {
    fc.off("mouse:down", onMouseDown);
    fc.off("mouse:move", onMouseMove);
    fc.off("mouse:up", onMouseUp);
    document.removeEventListener("keydown", onKeyDown);
    clearSizeTag();
  };
}
