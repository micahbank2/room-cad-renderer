import * as fabric from "fabric";
import { useCADStore, getActiveRoomDoc } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { snapPoint, distance, closestPointOnWall, formatFeet, polygonBbox, resolveCeilingPoints } from "@/lib/geometry";
import type { Point, PlacedProduct, PlacedCustomElement, CustomElement } from "@/types/cad";
import type { Product } from "@/types/product";
import { resolveEffectiveDims, resolveEffectiveCustomDims } from "@/types/product";
import { hitTestHandle, snapAngle, angleFromCenterToPointer } from "../rotationHandle";
import {
  hitTestWallHandle,
  angleFromMidpointToPointer,
  wallAngleDeg,
  snapWallAngle,
} from "../wallRotationHandle";
import {
  hitTestResizeHandle,
  hitTestAnyResizeHandle,
  edgeDragToAxisValue,
  getEdgeHandles,
  getResizeHandles,
  type EdgeHandle,
} from "../resizeHandles";
import { buildWallEndpointSnapScene } from "@/canvas/wallEndpointSnap";
import {
  hitTestWallEndpoint,
  hitTestWallThickness,
  projectThicknessDrag,
} from "../wallEditHandles";
import {
  hitTestOpeningHandle,
  projectOntoWall,
} from "../openingEditHandles";
import { wallLength, wallCorners } from "@/lib/geometry";
import { pxToFeet } from "./toolUtils";
import {
  computeSnap,
  buildSceneGeometry,
  axisAlignedBBoxOfRotated,
  SNAP_TOLERANCE_PX,
  type SceneGeometry,
  type BBox,
} from "@/canvas/snapEngine";
import { renderSnapGuides, clearSnapGuides } from "@/canvas/snapGuides";

type DragType =
  | "wall"
  | "product"
  | "ceiling"
  | "rotate"
  | "wall-rotate"
  | "product-resize"
  | "product-resize-edge" // Phase 31 EDIT-22 — per-axis edge-handle drag
  | "ceiling-resize-edge" // Phase 65 CEIL-02 — per-axis ceiling polygon resize
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
): { id: string; type: "wall" | "product" | "ceiling" | "opening"; wallId?: string } | null {
  const doc = getActiveRoomDoc();
  if (!doc) return null;

  // Check products first (they're on top) — orphan + null-dim use 2x2 AABB
  for (const pp of Object.values(doc.placedProducts)) {
    const product = productLibrary.find((p) => p.id === pp.productId);
    // Phase 31: per-axis overrides flow through resolveEffectiveDims so hit-test matches render.
    const { width, depth } = resolveEffectiveDims(product, pp);
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
    // Phase 31: per-axis overrides flow through resolveEffectiveCustomDims.
    const ceDims = resolveEffectiveCustomDims(el, pce);
    const halfW = ceDims.width / 2;
    const halfD = ceDims.depth / 2;
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
    // Phase 61 OPEN-01 (D-11'): if the cursor is inside an opening's offset
    // range on this wall, the opening wins (it sits on top of the wall).
    const wall = doc.walls[closestWallId];
    if (wall && wall.openings && wall.openings.length > 0) {
      const len = Math.sqrt((wall.end.x - wall.start.x) ** 2 + (wall.end.y - wall.start.y) ** 2);
      if (len > 1e-6) {
        const { t } = closestPointOnWall(wall, feetPos);
        const offset = t * len;
        for (const op of wall.openings) {
          if (offset >= op.offset && offset <= op.offset + op.width) {
            return { id: op.id, type: "opening", wallId: wall.id };
          }
        }
      }
    }
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

/** Module-level drag-in-progress flag. Set by the active selectTool instance
 *  on mouse:down, cleared on mouse:up / cleanup. Read by FabricCanvas to
 *  skip selection-triggered full redraws while a drag is live — otherwise
 *  `select([hit.id])` on mouse:down would trigger redraw → fc.clear() →
 *  destroy the Fabric object being dragged mid-gesture. Per D-07 this is
 *  a public-API bridge (tool → component), not per-activation state. */
let _dragActive = false;
export function isSelectToolDragActive(): boolean {
  return _dragActive;
}

/** Hotfix #2 (tool-switch revert). FabricCanvas.redraw() short-circuits on
 *  selectedIds-triggered redraws while a drag is live — but must NOT
 *  short-circuit on activeTool-triggered redraws, because the activeTool
 *  change is the user signaling "abort this drag" and cleanup() must run
 *  to revert the in-flight fabric transform (D-06 contract).
 *
 *  Single source of truth shared by FabricCanvas and the regression test.
 *  Returns true iff the caller SHOULD skip the redraw (drag is live AND
 *  the trigger was a non-tool change like selectedIds). */
export function shouldSkipRedrawDuringDrag(
  opts: { activeToolChanged: boolean },
): boolean {
  return _dragActive && !opts.activeToolChanged;
}

/** Set to true when a redraw was skipped because `_dragActive` was true.
 *  On mouse:up / cleanup the tool will invoke the registered redraw
 *  callback to catch up on the skipped refresh (so selection highlight +
 *  handles appear after a click that starts and ends without movement). */
let _redrawPending = false;
export function markRedrawSkippedDueToDrag(): void {
  _redrawPending = true;
}
let _redrawCallback: (() => void) | null = null;
export function setSelectToolRedrawCallback(cb: (() => void) | null): void {
  _redrawCallback = cb;
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

  // Phase 31 EDIT-22 — edge-handle drag state.
  let edgeDragInfo:
    | {
        placedId: string;
        edge: EdgeHandle;
        isCustom: boolean;
        pp: PlacedProduct | PlacedCustomElement;
      }
    | null = null;

  // Phase 65 CEIL-02 — ceiling edge-handle drag state. Cached origBbox is
  // computed from ceiling.points at drag start so mid-drag scaling is always
  // computed against the ORIGINAL polygon (not the live-overridden one),
  // matching the Phase 31 product pp-snapshot pattern.
  let ceilingEdgeDragInfo:
    | {
        ceilingId: string;
        edge: "n" | "s" | "e" | "w";
        origBbox: { minX: number; minY: number; maxX: number; maxY: number; width: number; depth: number };
      }
    | null = null;

  // Phase 31 EDIT-23 — cached restricted snap scene for wall-endpoint drag (D-05).
  let cachedEndpointScene: SceneGeometry | null = null;

  // Phase 25 D-01/D-03/D-04/D-05/D-06 — Drag fast-path state.
  // Covers EXACTLY the 4 D-03 operations: product move (incl. custom element),
  // wall move, wall endpoint drag, product rotation. All other drag types
  // continue to use the pre-existing NoHistory per-move path.
  //
  // During an active fast-path drag: Fabric objects are mutated directly,
  // `fc.requestRenderAll()` is called, and ZERO store writes happen per move.
  // On mouse:up: a single committing store action runs (one history entry).
  // On cleanup (tool switch / unmount): revert fabric transform; no store write.
  type WallFabricCache = {
    fabricObj: fabric.Object;
    origLeft: number;
    origTop: number;
    type: string; // "wall" | "wall-side" | "wall-limewash" | "wall-limewash-b"
    side?: "A" | "B";
  };
  type DragPre =
    | {
        kind: "product";
        id: string;
        fabricObj: fabric.Object | null;
        origLeft: number;
        origTop: number;
        origAngle: number;
      }
    | {
        kind: "product-rotate";
        id: string;
        isCustom: boolean; // true = custom element (out of D-03 scope, uses old path)
        fabricObj: fabric.Object | null;
        origAngle: number;
      }
    | {
        kind: "wall-move";
        id: string;
        fabricObjs: WallFabricCache[];
        origWall: { start: Point; end: Point; thickness: number };
      }
    | {
        kind: "wall-endpoint";
        id: string;
        endpoint: "start" | "end";
        fabricObjs: WallFabricCache[];
        origWall: { start: Point; end: Point; thickness: number };
      };

  let dragPre: DragPre | null = null;
  // Mouse-move caches the latest drag result for the mouse:up commit.
  let lastDragFeetPos: Point | null = null;
  let lastDragRotation: number | null = null;
  let lastDragWallStart: Point | null = null;
  let lastDragWallEnd: Point | null = null;

  // Phase 30 — smart snap (D-08a) — scene cached at drag start (D-09b). Only
  // used by the generic-move branch below (products, custom elements,
  // ceilings). Wall-endpoint branch (L765-789) deliberately untouched per
  // D-08b (v1 scope).
  let cachedScene: SceneGeometry | null = null;

  /**
   * Compute the axis-aligned bbox of the currently dragged object centered at
   * `pos`. Used by the smart-snap code path so each mousemove evaluates the
   * current-frame bbox. Falls back to a degenerate point-bbox when lookup
   * fails (snap engine still works on center). D-03.
   */
  const computeDraggedBBox = (
    id: string,
    kind: "product" | "ceiling" | "custom-element",
    pos: Point,
  ): BBox => {
    const doc = getActiveRoomDoc();
    if (!doc) return { id, minX: pos.x, maxX: pos.x, minY: pos.y, maxY: pos.y };

    if (kind === "product") {
      const pp = doc.placedProducts?.[id];
      if (pp) {
        const prod = _productLibrary.find((p) => p.id === pp.productId);
        // Phase 31: per-axis overrides flow through resolveEffectiveDims.
        const { width, depth } = resolveEffectiveDims(prod, pp);
        return axisAlignedBBoxOfRotated(pos, width, depth, pp.rotation, id);
      }
      // Custom elements are hit-tested as "product" by hitTestStore.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pce = (doc as any).placedCustomElements?.[id];
      if (pce) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const catalog = (useCADStore.getState() as any).customElements ?? {};
        const el = catalog[pce.customElementId] as CustomElement | undefined;
        if (el) {
          // Phase 31: per-axis overrides flow through resolveEffectiveCustomDims.
          const ceDims = resolveEffectiveCustomDims(el, pce);
          return axisAlignedBBoxOfRotated(
            pos,
            ceDims.width,
            ceDims.depth,
            pce.rotation,
            id,
          );
        }
      }
    } else if (kind === "custom-element") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pce = (doc as any).placedCustomElements?.[id];
      if (pce) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const catalog = (useCADStore.getState() as any).customElements ?? {};
        const el = catalog[pce.customElementId] as CustomElement | undefined;
        if (el) {
          // Phase 31: per-axis overrides flow through resolveEffectiveCustomDims.
          const ceDims = resolveEffectiveCustomDims(el, pce);
          return axisAlignedBBoxOfRotated(
            pos,
            ceDims.width,
            ceDims.depth,
            pce.rotation,
            id,
          );
        }
      }
    } else if (kind === "ceiling") {
      const ceiling = doc.ceilings?.[id];
      if (ceiling && ceiling.points.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of ceiling.points) {
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
        }
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        // Translate bbox from current center to target pos.
        const halfW = (maxX - minX) / 2;
        const halfH = (maxY - minY) / 2;
        void cx; void cy;
        return { id, minX: pos.x - halfW, maxX: pos.x + halfW, minY: pos.y - halfH, maxY: pos.y + halfH };
      }
    }
    return { id, minX: pos.x, maxX: pos.x, minY: pos.y, maxY: pos.y };
  };

  /** Find all Fabric objects that render parts of a given wall. */
  const findWallFabricObjs = (wallId: string): WallFabricCache[] => {
    const out: WallFabricCache[] = [];
    for (const obj of fc.getObjects()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (obj as any).data;
      if (!data || data.wallId !== wallId) continue;
      if (
        data.type === "wall" ||
        data.type === "wall-side" ||
        data.type === "wall-limewash" ||
        data.type === "wall-limewash-b"
      ) {
        out.push({
          fabricObj: obj,
          origLeft: obj.left ?? 0,
          origTop: obj.top ?? 0,
          type: data.type,
          side: data.side,
        });
      }
    }
    return out;
  };

  /** Compute pixel corners for a wall (scale/origin closure-captured). */
  const wallPxCorners = (
    start: Point,
    end: Point,
    thickness: number,
  ): { sL: Point; sR: Point; eR: Point; eL: Point } => {
    const [cSL, cSR, cER, cEL] = wallCorners({
      start,
      end,
      thickness,
    } as Parameters<typeof wallCorners>[0]);
    const toPx = (p: Point): Point => ({
      x: origin.x + p.x * scale,
      y: origin.y + p.y * scale,
    });
    return { sL: toPx(cSL), sR: toPx(cSR), eR: toPx(cER), eL: toPx(cEL) };
  };

  /** Mutate the polygon points of each wall fabric obj to match the given endpoints. */
  const applyWallShapeToFabric = (
    objs: WallFabricCache[],
    start: Point,
    end: Point,
    thickness: number,
  ) => {
    const { sL, sR, eR, eL } = wallPxCorners(start, end, thickness);
    const midStart = { x: (sL.x + sR.x) / 2, y: (sL.y + sR.y) / 2 };
    const midEnd = { x: (eL.x + eR.x) / 2, y: (eL.y + eR.y) / 2 };
    for (const entry of objs) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const poly = entry.fabricObj as any;
      if (entry.type === "wall" || entry.type === "wall-limewash") {
        // Single solid outline / limewash overlay uses all 4 corners.
        // (For split-paint walls, "wall" is the outline; both shapes = full 4-corner polygon.)
        if (entry.type === "wall-limewash" && entry.side === "A") {
          poly.points = [sL, midStart, midEnd, eL];
        } else if (entry.type === "wall-limewash" && entry.side === "B") {
          poly.points = [midStart, sR, eR, midEnd];
        } else {
          poly.points = [sL, sR, eR, eL];
        }
      } else if (entry.type === "wall-side" && entry.side === "A") {
        poly.points = [sL, midStart, midEnd, eL];
      } else if (entry.type === "wall-side" && entry.side === "B") {
        poly.points = [midStart, sR, eR, midEnd];
      } else if (entry.type === "wall-limewash-b") {
        poly.points = [midStart, sR, eR, midEnd];
      }
      // Reset left/top to the translation origin of the new points.
      // Fabric recomputes pathOffset from set coords; a simple setCoords() is enough.
      if (typeof poly.setCoords === "function") poly.setCoords();
    }
  };

  /** Translate all wall fabric objs by a pixel delta (pure move, no shape change). */
  const translateWallFabric = (objs: WallFabricCache[], dxPx: number, dyPx: number) => {
    for (const entry of objs) {
      entry.fabricObj.set({
        left: entry.origLeft + dxPx,
        top: entry.origTop + dyPx,
      });
      if (typeof (entry.fabricObj as unknown as { setCoords?: () => void }).setCoords === "function") {
        (entry.fabricObj as unknown as { setCoords: () => void }).setCoords();
      }
    }
  };

  /** Find the fabric object for a placed product or custom element. */
  const findProductFabricObj = (id: string): fabric.Object | null => {
    for (const obj of fc.getObjects()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (obj as any).data;
      if (!data) continue;
      // Real products: data.placedProductId; custom elements: data.placedId
      if (data.type === "product" && data.placedProductId === id) return obj;
      if (data.type === "custom-element" && data.placedId === id) return obj;
    }
    return null;
  };

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
          // D-03 fast path: cache pre-drag fabric transform; NO store write here.
          const fobj = findProductFabricObj(selId);
          dragPre = {
            kind: "product-rotate",
            id: selId,
            isCustom: false,
            fabricObj: fobj,
            origAngle: fobj?.angle ?? pp.rotation,
          };
          lastDragRotation = pp.rotation;
          return;
        }
        // Resize handle hit-test (EDIT-14)
        // Phase 31: use resolveEffectiveDims so hit-test rectangle matches rendered size.
        const { width, depth } = resolveEffectiveDims(prod, pp);
        // Phase 31 EDIT-22: combined corner+edge hit-test (corners win ties).
        const handleHit = hitTestAnyResizeHandle(feet, pp, width, depth);
        if (handleHit?.kind === "corner") {
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
        if (handleHit?.kind === "edge") {
          // Phase 31 EDIT-22 — edge drag → per-axis override write.
          const initial = edgeDragToAxisValue(handleHit.which, feet, pp);
          dragging = true;
          dragId = selId;
          dragType = "product-resize-edge";
          edgeDragInfo = {
            placedId: selId,
            edge: handleHit.which,
            isCustom: false,
            pp: { ...pp },
          };
          // Push exactly one history entry at drag start (D-16).
          useCADStore
            .getState()
            .resizeProductAxis(selId, initial.axis, initial.valueFt);
          return;
        }
      }
      // Custom element handles (POLISH-01) — mirror product handles
      const pce = (getActiveRoomDoc()?.placedCustomElements ?? {})[selId];
      if (pce) {
        const customCatalog = (useCADStore.getState() as any).customElements ?? {};
        const el = customCatalog[pce.customElementId] as CustomElement | undefined;
        if (el) {
          // Phase 31: per-axis overrides honored via resolveEffectiveCustomDims.
          const ceDims = resolveEffectiveCustomDims(el, pce);
          const w = ceDims.width;
          const d = ceDims.depth;
          // Rotation handle
          if (hitTestHandle(feet, pce as unknown as PlacedProduct, d)) {
            dragging = true;
            dragId = selId;
            dragType = "rotate";
            rotateInitialAngle = pce.rotation;
            useCADStore.getState().rotateCustomElement(selId, pce.rotation);
            return;
          }
          // Phase 31 EDIT-22 — combined corner+edge hit-test (corners win).
          const ceHandleHit = hitTestAnyResizeHandle(
            feet,
            pce as unknown as PlacedProduct,
            w,
            d,
          );
          if (ceHandleHit?.kind === "corner") {
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
          if (ceHandleHit?.kind === "edge") {
            const initial = edgeDragToAxisValue(
              ceHandleHit.which,
              feet,
              pce as unknown as PlacedProduct,
            );
            dragging = true;
            dragId = selId;
            dragType = "product-resize-edge";
            edgeDragInfo = {
              placedId: selId,
              edge: ceHandleHit.which,
              isCustom: true,
              pp: { ...pce } as unknown as PlacedCustomElement,
            };
            useCADStore
              .getState()
              .resizeCustomElementAxis(selId, initial.axis, initial.valueFt);
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
          // D-03 fast path: cache pre-drag wall shape + fabric objs; NO store write here.
          dragPre = {
            kind: "wall-endpoint",
            id: selId,
            endpoint: whichEndpoint,
            fabricObjs: findWallFabricObjs(selId),
            origWall: {
              start: { ...wall.start },
              end: { ...wall.end },
              thickness: wall.thickness,
            },
          };
          lastDragWallStart = { ...wall.start };
          lastDragWallEnd = { ...wall.end };
          // Phase 31 EDIT-23 — build restricted snap scene once at drag start (D-05/D-09b).
          const wallsMap =
            (getActiveRoomDoc()?.walls ?? {}) as Record<string, import("@/types/cad").WallSegment>;
          cachedEndpointScene = buildWallEndpointSnapScene(wallsMap, selId);
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

      // Phase 65 CEIL-02 — ceiling edge-handle hit-test. Mirror Phase 31 product
      // edge-handle dispatch: compute world-feet handle positions from the
      // resolved-points bbox, accept any pointer within EDGE_HANDLE_HIT_RADIUS_FT
      // of one of the 4 midpoints. Push ONE history snapshot at drag start so
      // a single Ctrl+Z undoes the entire drag.
      const ceilingForHandle = (getActiveRoomDoc()?.ceilings ?? {})[selId];
      if (ceilingForHandle && ceilingForHandle.points.length >= 3) {
        const renderedPoints = resolveCeilingPoints(ceilingForHandle);
        const liveBbox = polygonBbox(renderedPoints);
        const midX = (liveBbox.minX + liveBbox.maxX) / 2;
        const midY = (liveBbox.minY + liveBbox.maxY) / 2;
        const ceilingHandles: Array<{ edge: "n" | "s" | "e" | "w"; pos: Point }> = [
          { edge: "n", pos: { x: midX, y: liveBbox.minY } },
          { edge: "s", pos: { x: midX, y: liveBbox.maxY } },
          { edge: "w", pos: { x: liveBbox.minX, y: midY } },
          { edge: "e", pos: { x: liveBbox.maxX, y: midY } },
        ];
        const HANDLE_RADIUS_FT = 0.5;
        for (const h of ceilingHandles) {
          const dx = feet.x - h.pos.x;
          const dy = feet.y - h.pos.y;
          if (Math.sqrt(dx * dx + dy * dy) <= HANDLE_RADIUS_FT) {
            // Cache origBbox computed from the ORIGINAL ceiling.points, NOT
            // from resolved points — anchor math relies on the pre-drag
            // unscaled polygon so mid-drag updates are stable.
            const origBbox = polygonBbox(ceilingForHandle.points);
            ceilingEdgeDragInfo = {
              ceilingId: selId,
              edge: h.edge,
              origBbox,
            };
            dragging = true;
            dragId = selId;
            dragType = "ceiling-resize-edge";
            // Push exactly one history snapshot at drag start (Phase 31 pattern).
            useCADStore.getState().updateCeiling(selId, {});
            // PERF-01 fast path: avoid renderOnAddRemove on each NoHistory write.
            _dragActive = true;
            try { useUIStore.getState().setDragging(true); } catch { /* non-fatal */ }
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

      // Set the drag-active flag BEFORE calling select() so the
      // subscription-driven redraw (zustand fires listeners synchronously
      // during the set() call) sees dragActive=true and skips clearing
      // the canvas mid-gesture.
      _dragActive = true;
      try { useUIStore.getState().setDragging(true); } catch { /* Phase 33 D-13 bridge; non-fatal */ }
      useUIStore.getState().select([hit.id]);

      // Phase 61 OPEN-01 (D-11'): opening click selects but does NOT start a
      // drag — opening drag is handled by the existing opening-handle path
      // above. This makes the 2D opening polygon a passive selection target.
      if (hit.type === "opening") {
        _dragActive = false;
        try { useUIStore.getState().setDragging(false); } catch { /* non-fatal */ }
        dragging = false;
        dragId = null;
        dragType = null;
        return;
      }

      dragging = true;
      dragId = hit.id;
      dragType = hit.type as "wall" | "product" | "ceiling";

      // Phase 30 — D-09b: cache SceneGeometry ONCE at drag start for
      // products + ceilings (generic-move smart-snap path). Walls use the
      // wall-move branch which is OUT of scope per D-08; wall-endpoint
      // path is untouched per D-08b.
      if (hit.type === "product" || hit.type === "ceiling") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const customCatalog = (useCADStore.getState() as any).customElements ?? {};
        cachedScene = buildSceneGeometry(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          useCADStore.getState() as any,
          hit.id,
          _productLibrary,
          customCatalog,
        );
      }

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
          // D-03 fast path: cache pre-drag fabric transform for product move.
          const fobj = findProductFabricObj(hit.id);
          dragPre = {
            kind: "product",
            id: hit.id,
            fabricObj: fobj,
            origLeft: fobj?.left ?? 0,
            origTop: fobj?.top ?? 0,
            origAngle: fobj?.angle ?? 0,
          };
          lastDragFeetPos = { ...pos };
        }
      } else if (hit.type === "wall") {
        const wall = (getActiveRoomDoc()?.walls ?? {})[hit.id];
        if (wall) {
          const cx = (wall.start.x + wall.end.x) / 2;
          const cy = (wall.start.y + wall.end.y) / 2;
          dragOffsetFeet = { x: feet.x - cx, y: feet.y - cy };
          // D-03 fast path: cache pre-drag wall fabric objs; NO store write here.
          dragPre = {
            kind: "wall-move",
            id: hit.id,
            fabricObjs: findWallFabricObjs(hit.id),
            origWall: {
              start: { ...wall.start },
              end: { ...wall.end },
              thickness: wall.thickness,
            },
          };
          lastDragWallStart = { ...wall.start };
          lastDragWallEnd = { ...wall.end };
        }
      }
    } else {
      useUIStore.getState().clearSelection();
      dragging = false;
      dragId = null;
    }
    // Sync module-level drag-active flag so FabricCanvas can skip full
    // redraws triggered by the select()/clearSelection() calls above while
    // the drag is live. Otherwise a redraw between mouse:down and mouse:up
    // would fc.clear() and destroy the Fabric object being dragged.
    _dragActive = dragging;
    try { useUIStore.getState().setDragging(dragging); } catch { /* Phase 33 D-13 bridge; non-fatal */ }
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
      // D-03 fast path for product rotation (custom elements stay on old path).
      if (pp && dragPre?.kind === "product-rotate" && dragPre.fabricObj) {
        dragPre.fabricObj.set({ angle: next });
        if (typeof (dragPre.fabricObj as unknown as { setCoords?: () => void }).setCoords === "function") {
          (dragPre.fabricObj as unknown as { setCoords: () => void }).setCoords();
        }
        fc.requestRenderAll();
        lastDragRotation = next;
        return;
      }
      if (pce) {
        useCADStore.getState().rotateCustomElementNoHistory(dragId, next);
      }
      return;
    }

    if (dragType === "ceiling-resize-edge") {
      if (!ceilingEdgeDragInfo) return;
      const { ceilingId, edge, origBbox } = ceilingEdgeDragInfo;
      const altHeld = (opt.e as MouseEvent)?.altKey === true;
      const gridSnap = useUIStore.getState().gridSnap;

      // Phase 30 smart-snap (consume-only). Build a restricted scene that
      // contains other-wall endpoints + midpoints (mirrors Phase 31 wall-
      // endpoint snap pattern at lines 1042-1074). Pass excludeId so the
      // ceiling does not snap to itself (no self-snap when bbox edges happen
      // to align with other ceilings — research Pitfall 1).
      const wallsMap = (getActiveRoomDoc()?.walls ?? {}) as Record<string, import("@/types/cad").WallSegment>;
      const restrictedScene = altHeld ? null : buildWallEndpointSnapScene(wallsMap, ceilingId);

      let snapped: Point = { x: feet.x, y: feet.y };
      let guides: ReturnType<typeof computeSnap>["guides"] = [];
      if (restrictedScene) {
        const degenerateBBox: BBox = {
          id: `ceiling-resize-${ceilingId}`,
          minX: feet.x,
          maxX: feet.x,
          minY: feet.y,
          maxY: feet.y,
        };
        const result = computeSnap({
          candidate: { pos: feet, bbox: degenerateBBox },
          scene: restrictedScene,
          tolerancePx: SNAP_TOLERANCE_PX,
          scale,
          gridSnap,
        });
        snapped = result.snapped;
        guides = result.guides;
      } else if (gridSnap > 0) {
        snapped = snapPoint(snapped, gridSnap);
      }
      renderSnapGuides(fc, guides, scale, origin);

      // Resolve dragged-edge dimension + optional anchor write per LOCKED
      // override-anchor model (see plan must-haves). For width drags the
      // axis-of-interest is X; for depth drags it's Y.
      let axis: "width" | "depth";
      let value: number;
      let anchor: number | undefined;
      if (edge === "e") {
        axis = "width";
        value = Math.max(0.1, snapped.x - origBbox.minX);
        anchor = undefined; // default: bbox.minX preserves west edge
      } else if (edge === "w") {
        axis = "width";
        value = Math.max(0.1, origBbox.maxX - snapped.x);
        anchor = origBbox.maxX; // east edge stays put
      } else if (edge === "s") {
        axis = "depth";
        value = Math.max(0.1, snapped.y - origBbox.minY);
        anchor = undefined; // default: bbox.minY preserves north edge
      } else {
        // n
        axis = "depth";
        value = Math.max(0.1, origBbox.maxY - snapped.y);
        anchor = origBbox.maxY; // south edge stays put
      }
      _dragActive = true;
      try { useUIStore.getState().setDragging(true); } catch { /* non-fatal */ }
      useCADStore
        .getState()
        .resizeCeilingAxisNoHistory(ceilingId, axis, value, anchor);
      fc.requestRenderAll();
      return;
    }

    if (dragType === "product-resize-edge") {
      if (!edgeDragInfo) return;
      // Recompute axis value from current pointer relative to original pp at drag start.
      const result = edgeDragToAxisValue(
        edgeDragInfo.edge,
        feet,
        edgeDragInfo.pp as PlacedProduct,
      );
      const gridSnap = useUIStore.getState().gridSnap;
      const snappedValue =
        gridSnap > 0
          ? Math.max(0.25, Math.round(result.valueFt / gridSnap) * gridSnap)
          : result.valueFt;
      _dragActive = true;
      try { useUIStore.getState().setDragging(true); } catch { /* Phase 33 D-13 bridge; non-fatal */ }
      if (edgeDragInfo.isCustom) {
        useCADStore
          .getState()
          .resizeCustomElementAxisNoHistory(
            edgeDragInfo.placedId,
            result.axis,
            snappedValue,
          );
      } else {
        useCADStore
          .getState()
          .resizeProductAxisNoHistory(
            edgeDragInfo.placedId,
            result.axis,
            snappedValue,
          );
      }
      fc.requestRenderAll();
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
        const updatedPp = (getActiveRoomDoc()?.placedProducts ?? {})[dragId];
        if (updatedPp) {
          // Phase 31: per-axis overrides honored via resolveEffectiveDims.
          const dims = resolveEffectiveDims(prod, updatedPp);
          updateSizeTag(updatedPp, dims.width, dims.depth);
        }
      } else {
        useCADStore.getState().resizeCustomElementNoHistory(dragId, newScale);
        // Update live size tag for custom elements
        const customCatalog2 = (useCADStore.getState() as any).customElements ?? {};
        const el2 = customCatalog2[pce2.customElementId] as CustomElement | undefined;
        if (el2) {
          const updatedPce = (getActiveRoomDoc()?.placedCustomElements ?? {})[dragId];
          if (updatedPce) {
            // Phase 31: per-axis overrides honored via resolveEffectiveCustomDims.
            const ceDims2 = resolveEffectiveCustomDims(el2, updatedPce);
            updateSizeTag(updatedPce as unknown as PlacedProduct, ceDims2.width, ceDims2.depth);
          }
        }
      }
      return;
    }

    if (dragType === "wall-endpoint") {
      if (!wallEndpointWhich || dragPre?.kind !== "wall-endpoint") return;
      const gridSnap = useUIStore.getState().gridSnap;
      // Phase 31 EDIT-23 — smart-snap (D-05) + Shift-ortho (D-06) + Alt-disable (D-07).
      const shiftHeld = (opt.e as MouseEvent)?.shiftKey === true;
      const altHeld = (opt.e as MouseEvent)?.altKey === true;
      const anchor =
        wallEndpointWhich === "start" ? dragPre.origWall.end : dragPre.origWall.start;

      // Step 1: raw candidate.
      let candidate: Point = { x: feet.x, y: feet.y };

      // Step 2: Shift-ortho lock (D-06) — happens before snap.
      if (shiftHeld) {
        const dx = Math.abs(feet.x - anchor.x);
        const dy = Math.abs(feet.y - anchor.y);
        if (dx > dy) candidate.y = anchor.y;
        else candidate.x = anchor.x;
      }

      // Step 3: smart-snap (unless Alt held) using cached restricted scene.
      let snapped: Point = candidate;
      let guides: ReturnType<typeof computeSnap>["guides"] = [];
      if (!altHeld && cachedEndpointScene) {
        const degenerateBBox: BBox = {
          id: "wall-endpoint-candidate",
          minX: candidate.x,
          maxX: candidate.x,
          minY: candidate.y,
          maxY: candidate.y,
        };
        const result = computeSnap({
          candidate: { pos: candidate, bbox: degenerateBBox },
          scene: cachedEndpointScene,
          tolerancePx: SNAP_TOLERANCE_PX,
          scale,
          gridSnap,
        });
        snapped = result.snapped;
        guides = result.guides;
        // Pitfall 3: re-apply Shift lock post-snap so ortho wins on locked axis.
        if (shiftHeld) {
          const dx = Math.abs(feet.x - anchor.x);
          const dy = Math.abs(feet.y - anchor.y);
          if (dx > dy) snapped.y = anchor.y;
          else snapped.x = anchor.x;
        }
      } else if (altHeld && gridSnap > 0) {
        snapped = snapPoint(candidate, gridSnap);
      }

      // Step 4: render guides (cleared automatically when guides=[] e.g. Alt held).
      renderSnapGuides(fc, guides, scale, origin);

      // D-03 fast path: compute new endpoints, rewrite polygon points in place.
      const newStart = wallEndpointWhich === "start" ? snapped : dragPre.origWall.start;
      const newEnd = wallEndpointWhich === "end" ? snapped : dragPre.origWall.end;
      applyWallShapeToFabric(
        dragPre.fabricObjs,
        newStart,
        newEnd,
        dragPre.origWall.thickness,
      );
      fc.requestRenderAll();
      lastDragWallStart = newStart;
      lastDragWallEnd = newEnd;
      // Live length tag (recomputed from cached endpoints)
      const lenFt = Math.sqrt(
        (newEnd.x - newStart.x) ** 2 + (newEnd.y - newStart.y) ** 2,
      );
      const mx = (newStart.x + newEnd.x) / 2;
      const my = (newStart.y + newEnd.y) / 2;
      updateTextTag(`${formatFeet(lenFt)}`, { x: mx, y: my - 0.8 });
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
    const altHeld = (opt.e as MouseEvent).altKey === true; // D-07 Alt disable
    const targetPos = {
      x: feet.x - dragOffsetFeet.x,
      y: feet.y - dragOffsetFeet.y,
    };

    // Phase 30 smart-snap integration (D-08a). Applies to products + custom
    // elements + ceilings (dragType === "product" | "ceiling"). Walls fall
    // through to the existing grid-only path per D-08.
    let snapped: Point;
    const isSmartSnapTarget =
      dragType === "product" || dragType === "ceiling";
    if (!isSmartSnapTarget || altHeld || !cachedScene) {
      // D-07 Alt disabled OR wall-move OR no cached scene → grid only.
      snapped = gridSnap > 0 ? snapPoint(targetPos, gridSnap) : targetPos;
      if (isSmartSnapTarget) clearSnapGuides(fc);
    } else {
      const bboxKind: "product" | "ceiling" | "custom-element" =
        dragType === "ceiling" ? "ceiling" : "product";
      const draggedBBox = computeDraggedBBox(dragId, bboxKind, targetPos);
      const result = computeSnap({
        candidate: { pos: targetPos, bbox: draggedBBox },
        scene: cachedScene, // D-09b cached scene
        tolerancePx: SNAP_TOLERANCE_PX,
        scale,
        gridSnap,
      });
      snapped = result.snapped;
      renderSnapGuides(fc, result.guides, scale, origin);
    }

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
      // D-03 fast path: mutate fabric group transform; NO store write per move.
      if (dragPre?.kind === "product" && dragPre.fabricObj) {
        const newLeft = origin.x + snapped.x * scale;
        const newTop = origin.y + snapped.y * scale;
        dragPre.fabricObj.set({ left: newLeft, top: newTop });
        if (typeof (dragPre.fabricObj as unknown as { setCoords?: () => void }).setCoords === "function") {
          (dragPre.fabricObj as unknown as { setCoords: () => void }).setCoords();
        }
        fc.requestRenderAll();
        lastDragFeetPos = snapped;
      }
    } else if (dragType === "wall") {
      // D-03 fast path: translate all wall fabric objs by pixel delta.
      if (dragPre?.kind === "wall-move") {
        const cx = (dragPre.origWall.start.x + dragPre.origWall.end.x) / 2;
        const cy = (dragPre.origWall.start.y + dragPre.origWall.end.y) / 2;
        const dxFt = snapped.x - cx;
        const dyFt = snapped.y - cy;
        const dxPx = dxFt * scale;
        const dyPx = dyFt * scale;
        translateWallFabric(dragPre.fabricObjs, dxPx, dyPx);
        fc.requestRenderAll();
        lastDragWallStart = {
          x: dragPre.origWall.start.x + dxFt,
          y: dragPre.origWall.start.y + dyFt,
        };
        lastDragWallEnd = {
          x: dragPre.origWall.end.x + dxFt,
          y: dragPre.origWall.end.y + dyFt,
        };
      }
    }
  };

  const onMouseUp = () => {
    // Clear the drag-active flag BEFORE committing to the store so the
    // redraw triggered by the commit runs normally and paints the final
    // selection highlight + handles. If we cleared it after the commit,
    // the subscription-triggered redraw would see _dragActive=true and
    // no-op, leaving stale selection visuals.
    _dragActive = false;
    try { useUIStore.getState().setDragging(false); } catch { /* Phase 33 D-13 bridge; non-fatal */ }
    // Determine whether the commit below will trigger a store change (and
    // therefore a subscription-driven redraw). For bare clicks (no drag
    // movement) no commit fires, so we need to explicitly flush the
    // redraw we skipped on mouse:down to repaint the selection highlight.
    const willCommit = Boolean(dragPre && dragging && (
      (dragPre.kind === "product" && lastDragFeetPos) ||
      (dragPre.kind === "wall-move" && lastDragWallStart && lastDragWallEnd) ||
      (dragPre.kind === "wall-endpoint" && lastDragWallStart && lastDragWallEnd) ||
      (dragPre.kind === "product-rotate" && lastDragRotation != null)
    ));
    const hadPendingRedraw = _redrawPending;
    _redrawPending = false;

    // D-04 fast-path commit: run exactly once per drag via the committing action.
    // This is the SINGLE history entry for the entire drag.
    if (dragPre && dragging) {
      const store = useCADStore.getState();
      if (dragPre.kind === "product" && lastDragFeetPos) {
        // Distinguish real product vs custom element by where the id lives.
        const doc = getActiveRoomDoc();
        if (doc?.placedProducts[dragPre.id]) {
          store.moveProduct(dragPre.id, lastDragFeetPos);
        } else {
          store.moveCustomElement(dragPre.id, lastDragFeetPos);
        }
      } else if (dragPre.kind === "wall-move" && lastDragWallStart && lastDragWallEnd) {
        store.updateWall(dragPre.id, {
          start: lastDragWallStart,
          end: lastDragWallEnd,
        });
      } else if (dragPre.kind === "wall-endpoint" && lastDragWallStart && lastDragWallEnd) {
        const changes =
          dragPre.endpoint === "start"
            ? { start: lastDragWallStart }
            : { end: lastDragWallEnd };
        store.updateWall(dragPre.id, changes);
      } else if (dragPre.kind === "product-rotate" && lastDragRotation != null) {
        store.rotateProduct(dragPre.id, lastDragRotation);
      }
    }

    if (
      dragType === "product-resize" ||
      dragType === "product-resize-edge" ||
      dragType === "ceiling-resize-edge" ||
      dragType === "wall-endpoint" ||
      dragType === "wall-thickness" ||
      dragType === "opening-slide" ||
      dragType === "opening-resize-left" ||
      dragType === "opening-resize-right"
    ) {
      clearSizeTag();
    }
    // Phase 30 — clear smart-snap guides on mouseup (D-06b / Pitfall 2).
    clearSnapGuides(fc);
    cachedScene = null;
    // Phase 31 EDIT-23 — clear cached endpoint snap scene + edge-drag state.
    cachedEndpointScene = null;
    edgeDragInfo = null;
    // Phase 65 CEIL-02 — clear ceiling edge-drag state. History snapshot was
    // pushed at mousedown so no commit needed here.
    ceilingEdgeDragInfo = null;
    dragging = false;
    _dragActive = false;
    try { useUIStore.getState().setDragging(false); } catch { /* Phase 33 D-13 bridge; non-fatal */ }
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
    dragPre = null;
    lastDragFeetPos = null;
    lastDragRotation = null;
    lastDragWallStart = null;
    lastDragWallEnd = null;

    // Flush a pending redraw for the bare-click case — when no commit
    // fires (no move happened) the subscription won't re-trigger redraw,
    // so we need to paint the selection highlight that we skipped on
    // mouse:down. For committing drags, the store change itself triggers
    // a redraw via the zustand subscription, so we only flush here when
    // no commit will happen.
    if (hadPendingRedraw && !willCommit && _redrawCallback) {
      _redrawCallback();
    }
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

  // Phase 30 — test-mode driver (D-07 contract from 30-01-SUMMARY.md).
  // Installed only under `import.meta.env.MODE === "test"`; removed in
  // cleanup(). RTL harness uses these hooks because happy-dom's fabric
  // pointer-event simulation is fragile; driver invokes the real drag
  // branches with a synthesized MouseEvent whose `altKey` reflects the
  // caller's intent (D-07).
  let driveSnapHook:
    | ((args: {
        tool: "select" | "product";
        pos: Point;
        dragId?: string;
        altKey?: boolean;
        phase: "move" | "up" | "down";
      }) => void)
    | undefined;
  let getSnapGuidesHook: (() => fabric.Object[]) | undefined;
  if (import.meta.env.MODE === "test") {
    const toPx = (p: Point): { x: number; y: number } => ({
      x: origin.x + p.x * scale,
      y: origin.y + p.y * scale,
    });
    const fakeEvt = (altKey: boolean): MouseEvent => {
      // Build the minimum shape onMouseMove / onMouseUp read off `opt.e`.
      return { altKey, metaKey: false, ctrlKey: false, shiftKey: false } as unknown as MouseEvent;
    };
    // Override getViewportPoint for the duration of each driven call so
    // the existing handler code sees the desired pixel pointer.
    const origGetViewportPoint = fc.getViewportPoint.bind(fc);
    const withDrivenPointer = <T,>(posFeet: Point, fn: () => T): T => {
      const px = toPx(posFeet);
      (fc as unknown as { getViewportPoint: (e: unknown) => { x: number; y: number } }).getViewportPoint =
        () => px;
      try {
        return fn();
      } finally {
        (fc as unknown as { getViewportPoint: typeof origGetViewportPoint }).getViewportPoint =
          origGetViewportPoint;
      }
    };

    driveSnapHook = (args) => {
      if (args.tool !== "select") return;
      const altKey = args.altKey === true;
      const opt = { e: fakeEvt(altKey) } as unknown as fabric.TEvent;
      // Ensure a drag is started for the referenced dragId before moving.
      if (args.phase === "move" || args.phase === "up") {
        if (!dragging && args.dragId) {
          // Synthesize a mousedown on the product position so the handler
          // finds the hit and sets dragType/dragPre/dragOffsetFeet/etc.
          const doc = getActiveRoomDoc();
          const pp = doc?.placedProducts?.[args.dragId];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pce = (doc as any)?.placedCustomElements?.[args.dragId];
          const ceiling = doc?.ceilings?.[args.dragId];
          const startPos: Point | null =
            pp?.position ?? pce?.position ?? (ceiling ? {
              x: ceiling.points.reduce((s: number, p: Point) => s + p.x, 0) / ceiling.points.length,
              y: ceiling.points.reduce((s: number, p: Point) => s + p.y, 0) / ceiling.points.length,
            } : null);
          if (startPos) {
            withDrivenPointer(startPos, () => onMouseDown(opt));
          }
        }
        if (args.phase === "move") {
          withDrivenPointer(args.pos, () => onMouseMove(opt));
        } else {
          // Move to final pos first so lastDragFeetPos gets set, then up.
          withDrivenPointer(args.pos, () => onMouseMove(opt));
          onMouseUp();
        }
      }
    };
    getSnapGuidesHook = () =>
      fc
        .getObjects()
        .filter(
          (o) =>
            (o as unknown as { data?: { type?: string } }).data?.type ===
            "snap-guide",
        );
    (window as unknown as {
      __driveSnap?: typeof driveSnapHook;
      __getSnapGuides?: typeof getSnapGuidesHook;
    }).__driveSnap = driveSnapHook;
    (window as unknown as {
      __driveSnap?: typeof driveSnapHook;
      __getSnapGuides?: typeof getSnapGuidesHook;
    }).__getSnapGuides = getSnapGuidesHook;

    // ---------------------------------------------------------------------
    // Phase 31 EDIT-22 / EDIT-23 / EDIT-24 — drive bridges for drag-resize +
    // wall-endpoint smart-snap. Mirrors the Phase 30 driveSnap pattern: the
    // bridge synthesizes a mousedown that walks the existing handler with a
    // pointer positioned at the requested handle, then routes subsequent
    // .to() / .end() through onMouseMove / onMouseUp via withDrivenPointer.
    // ---------------------------------------------------------------------
    type ResizeHandleId =
      | "corner-ne"
      | "corner-nw"
      | "corner-sw"
      | "corner-se"
      | "edge-n"
      | "edge-s"
      | "edge-e"
      | "edge-w";

    const driveResizeHook = {
      start: (placedId: string, handle: ResizeHandleId) => {
        // Compute the world-feet position of the requested handle so the
        // existing mousedown hit-tests will detect the corner/edge.
        const doc = getActiveRoomDoc();
        if (!doc) return;
        const pp = doc.placedProducts?.[placedId];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pce = (doc as any).placedCustomElements?.[placedId];
        const target = (pp ?? pce) as
          | PlacedProduct
          | PlacedCustomElement
          | undefined;
        if (!target) return;
        let widthFt: number;
        let depthFt: number;
        if (pp) {
          const prod = _productLibrary.find((p) => p.id === pp.productId);
          const dims = resolveEffectiveDims(prod, pp);
          widthFt = dims.width;
          depthFt = dims.depth;
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cat = (useCADStore.getState() as any).customElements ?? {};
          const el = cat[(pce as PlacedCustomElement).customElementId] as
            | CustomElement
            | undefined;
          const dims = resolveEffectiveCustomDims(el, pce as PlacedCustomElement);
          widthFt = dims.width;
          depthFt = dims.depth;
        }
        // Resolve the handle's world-feet point.
        let handlePos: Point;
        if (handle.startsWith("corner-")) {
          const which = handle.slice("corner-".length) as
            | "ne"
            | "nw"
            | "sw"
            | "se";
          const handles = getResizeHandles(target as PlacedProduct, widthFt, depthFt);
          handlePos = handles[which];
        } else {
          const which = handle.slice("edge-".length) as EdgeHandle;
          handlePos = getEdgeHandles(target, widthFt, depthFt)[which];
        }
        // Need the placed object to be the current selection, otherwise the
        // mousedown handle hit-test branch won't run.
        useUIStore.getState().select([placedId]);
        const opt = { e: fakeEvt(false) } as unknown as fabric.TEvent;
        withDrivenPointer(handlePos, () => onMouseDown(opt));
      },
      to: (
        feetX: number,
        feetY: number,
        opts: { shift?: boolean; alt?: boolean } = {},
      ) => {
        const evt = {
          altKey: opts.alt === true,
          shiftKey: opts.shift === true,
          metaKey: false,
          ctrlKey: false,
        } as unknown as MouseEvent;
        const opt = { e: evt } as unknown as fabric.TEvent;
        withDrivenPointer({ x: feetX, y: feetY }, () => onMouseMove(opt));
      },
      end: () => {
        onMouseUp();
      },
    };

    const driveWallEndpointHook = {
      start: (wallId: string, which: "start" | "end") => {
        const doc = getActiveRoomDoc();
        const wall = doc?.walls?.[wallId];
        if (!wall) return;
        useUIStore.getState().select([wallId]);
        const ep = which === "start" ? wall.start : wall.end;
        const opt = { e: fakeEvt(false) } as unknown as fabric.TEvent;
        withDrivenPointer(ep, () => onMouseDown(opt));
      },
      to: (
        feetX: number,
        feetY: number,
        opts: { shift?: boolean; alt?: boolean } = {},
      ) => {
        const evt = {
          altKey: opts.alt === true,
          shiftKey: opts.shift === true,
          metaKey: false,
          ctrlKey: false,
        } as unknown as MouseEvent;
        const opt = { e: evt } as unknown as fabric.TEvent;
        withDrivenPointer({ x: feetX, y: feetY }, () => onMouseMove(opt));
      },
      end: () => {
        onMouseUp();
      },
      getGuides: () =>
        fc
          .getObjects()
          .filter(
            (o) =>
              (o as unknown as { data?: { type?: string } }).data?.type ===
              "snap-guide",
          )
          .map(() => ({ type: "snap-guide" })),
    };

    (window as unknown as { __driveResize?: typeof driveResizeHook }).__driveResize =
      driveResizeHook;
    (window as unknown as {
      __driveWallEndpoint?: typeof driveWallEndpointHook;
    }).__driveWallEndpoint = driveWallEndpointHook;

    // Phase 65 CEIL-02 — drive bridge for ceiling edge-handle drag. Mirrors
    // driveResizeHook: start positions the synthesized pointer at the
    // requested edge midpoint, .to() routes mousemoves through the existing
    // handler with optional Shift/Alt, .end() runs mouseup.
    const driveCeilingResizeHook = {
      start: (ceilingId: string, edge: "n" | "s" | "e" | "w") => {
        const doc = getActiveRoomDoc();
        const ceiling = doc?.ceilings?.[ceilingId];
        if (!ceiling || ceiling.points.length < 3) return;
        useUIStore.getState().select([ceilingId]);
        const pts = resolveCeilingPoints(ceiling);
        const bb = polygonBbox(pts);
        const midX = (bb.minX + bb.maxX) / 2;
        const midY = (bb.minY + bb.maxY) / 2;
        const handlePos: Point =
          edge === "n"
            ? { x: midX, y: bb.minY }
            : edge === "s"
              ? { x: midX, y: bb.maxY }
              : edge === "w"
                ? { x: bb.minX, y: midY }
                : { x: bb.maxX, y: midY };
        const opt = { e: fakeEvt(false) } as unknown as fabric.TEvent;
        withDrivenPointer(handlePos, () => onMouseDown(opt));
      },
      to: (
        feetX: number,
        feetY: number,
        opts: { shift?: boolean; alt?: boolean } = {},
      ) => {
        const evt = {
          altKey: opts.alt === true,
          shiftKey: opts.shift === true,
          metaKey: false,
          ctrlKey: false,
        } as unknown as MouseEvent;
        const opt = { e: evt } as unknown as fabric.TEvent;
        withDrivenPointer({ x: feetX, y: feetY }, () => onMouseMove(opt));
      },
      end: () => {
        onMouseUp();
      },
    };

    (window as unknown as {
      __driveCeilingResize?: typeof driveCeilingResizeHook;
    }).__driveCeilingResize = driveCeilingResizeHook;
  }

  return () => {
    // D-06 — revert in-flight fast-path drag without committing to the store.
    if (dragging && dragPre) {
      if (dragPre.kind === "product" && dragPre.fabricObj) {
        dragPre.fabricObj.set({
          left: dragPre.origLeft,
          top: dragPre.origTop,
          angle: dragPre.origAngle,
        });
        if (typeof (dragPre.fabricObj as unknown as { setCoords?: () => void }).setCoords === "function") {
          (dragPre.fabricObj as unknown as { setCoords: () => void }).setCoords();
        }
        fc.requestRenderAll();
      } else if (dragPre.kind === "product-rotate" && dragPre.fabricObj) {
        dragPre.fabricObj.set({ angle: dragPre.origAngle });
        if (typeof (dragPre.fabricObj as unknown as { setCoords?: () => void }).setCoords === "function") {
          (dragPre.fabricObj as unknown as { setCoords: () => void }).setCoords();
        }
        fc.requestRenderAll();
      } else if (dragPre.kind === "wall-move") {
        // Restore each wall fabric obj to its pre-drag left/top.
        for (const entry of dragPre.fabricObjs) {
          entry.fabricObj.set({ left: entry.origLeft, top: entry.origTop });
          if (typeof (entry.fabricObj as unknown as { setCoords?: () => void }).setCoords === "function") {
            (entry.fabricObj as unknown as { setCoords: () => void }).setCoords();
          }
        }
        fc.requestRenderAll();
      } else if (dragPre.kind === "wall-endpoint") {
        // Restore polygon points from the cached original wall shape.
        applyWallShapeToFabric(
          dragPre.fabricObjs,
          dragPre.origWall.start,
          dragPre.origWall.end,
          dragPre.origWall.thickness,
        );
        fc.requestRenderAll();
      }
    }
    dragPre = null;
    lastDragFeetPos = null;
    lastDragRotation = null;
    lastDragWallStart = null;
    lastDragWallEnd = null;
    _dragActive = false;
    try { useUIStore.getState().setDragging(false); } catch { /* Phase 33 D-13 bridge; non-fatal */ }
    _redrawPending = false;
    fc.off("mouse:down", onMouseDown);
    fc.off("mouse:move", onMouseMove);
    fc.off("mouse:up", onMouseUp);
    document.removeEventListener("keydown", onKeyDown);
    clearSizeTag();
    // Phase 30 — clear smart-snap guides on tool-switch cleanup (Pitfall 3).
    clearSnapGuides(fc);
    cachedScene = null;
    // Phase 31 — clear cached endpoint snap scene + edge-drag info.
    cachedEndpointScene = null;
    edgeDragInfo = null;
    // Phase 65 CEIL-02 — clear ceiling edge-drag info on tool-switch cleanup.
    ceilingEdgeDragInfo = null;
    // Phase 30 — remove the test-mode driver hooks we installed.
    if (import.meta.env.MODE === "test") {
      const w = window as unknown as {
        __driveSnap?: unknown;
        __getSnapGuides?: unknown;
        __driveResize?: unknown;
        __driveWallEndpoint?: unknown;
        __driveCeilingResize?: unknown;
      };
      if (w.__driveSnap === driveSnapHook) delete w.__driveSnap;
      if (w.__getSnapGuides === getSnapGuidesHook) delete w.__getSnapGuides;
      delete w.__driveResize;
      delete w.__driveWallEndpoint;
      delete w.__driveCeilingResize;
    }
  };
}
