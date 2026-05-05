// src/canvas/tools/stairTool.ts
// Phase 60 STAIRS-01 (D-04, D-05): stair placement tool.
//
// Mirrors productTool.ts structure (closure-state, snap-cache, cleanup return).
//
// Critical D-04 origin asymmetry (research Pitfall 1):
//   Stair.position is BOTTOM-STEP CENTER (user-anchor convention).
//   computeSnap() and axisAlignedBBoxOfRotated() expect BBOX CENTER.
//   We translate cursor → bbox center BEFORE snap, then reverse on commit
//   to recover the bottom-step center we store.
//   E2 e2e verifies the bottom-step EDGE sits flush against the wall (NOT
//   the bbox center off by totalRunFt/2).
//
// Snap engine integration (research Q2 — consume-only):
//   We READ the snap scene (walls + product + custom-element bboxes) but do
//   NOT contribute stair geometry to the scene. Other primitives don't snap
//   to stairs in v1.15. snapEngine.ts and buildSceneGeometry are NOT modified.

import * as fabric from "fabric";
import { useCADStore } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { snapPoint } from "@/lib/geometry";
import { pxToFeet } from "./toolUtils";
import type { Point } from "@/types/cad";
import type { Product } from "@/types/product";
import {
  computeSnap,
  buildSceneGeometry,
  axisAlignedBBoxOfRotated,
  SNAP_TOLERANCE_PX,
  type SceneGeometry,
} from "@/canvas/snapEngine";
import { renderSnapGuides, clearSnapGuides } from "@/canvas/snapGuides";
import { buildStairSymbolShapes } from "@/canvas/stairSymbol";
import { DEFAULT_STAIR_WIDTH_FT } from "@/types/cad";

// Toolbar-set pending stair config. D-07 public-API exception (mirror
// productTool's setPendingProduct bridge).
interface PendingStairConfig {
  rotation: number;
  widthFt: number;
  stepCount: number;
  riseIn: number;
  runIn: number;
}

let pendingStairConfig: PendingStairConfig | null = null;

export function setPendingStair(cfg: PendingStairConfig | null): void {
  pendingStairConfig = cfg;
}

export function getPendingStair(): PendingStairConfig | null {
  return pendingStairConfig;
}

// Product library reference — needed by buildSceneGeometry. Mirrors
// productTool's _productLibrary bridge.
let _productLibrary: Product[] = [];
export function setStairToolLibrary(products: Product[]): void {
  _productLibrary = products;
}

/**
 * Rotate a 2D vector by `deg` degrees about the origin.
 * +deg = clockwise in canvas-feet space (matches Phase 31 rotation
 * convention applied to fabric Group.angle).
 */
function rotateVec(v: Point, deg: number): Point {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

/**
 * Compute UP axis unit vector in feet space for a given stair rotation.
 * At rotation=0, UP is -y (bbox center is at +y of bottom-step center
 * because canvas y grows DOWN; the stair extends in -y from its base).
 *
 * We need a consistent convention for translating bottom-step center ↔
 * bbox center. We define: bbox_center = bottom_center + UP * (totalRunFt / 2).
 * UP at rotation 0 = (0, -1). Rotating by `rotation` degrees gives the actual UP.
 */
function upAxisAt(rotationDeg: number): Point {
  return rotateVec({ x: 0, y: -1 }, rotationDeg);
}

export function activateStairTool(
  fc: fabric.Canvas,
  scale: number,
  origin: { x: number; y: number },
): () => void {
  // Lazy-cached SceneGeometry — built on first mousemove, invalidated after each
  // placement (mirror productTool D-09b).
  let cachedScene: SceneGeometry | null = null;
  const ensureScene = (): SceneGeometry => {
    if (!cachedScene) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customCatalog = (useCADStore.getState() as any).customElements ?? {};
      cachedScene = buildSceneGeometry(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useCADStore.getState() as any,
        "__pending__", // sentinel — no real object carries this id
        _productLibrary,
        customCatalog,
      );
    }
    return cachedScene;
  };

  let previewGroup: fabric.Group | null = null;

  const clearPreview = () => {
    if (previewGroup) {
      fc.remove(previewGroup);
      previewGroup = null;
    }
  };

  /**
   * Translate cursor (= bottom-step center candidate) → bbox center for snap,
   * then reverse on commit. Returns the snapped BOTTOM-STEP center.
   */
  const snapBottomCenter = (
    rawBottomCenter: Point,
    altHeld: boolean,
    gridSnap: number,
  ): { snappedBottomCenter: Point; renderedGuides: boolean } => {
    if (!pendingStairConfig) {
      return {
        snappedBottomCenter:
          gridSnap > 0 ? snapPoint(rawBottomCenter, gridSnap) : rawBottomCenter,
        renderedGuides: false,
      };
    }

    if (altHeld) {
      // Smart snap disabled — grid only, no guides.
      return {
        snappedBottomCenter:
          gridSnap > 0 ? snapPoint(rawBottomCenter, gridSnap) : rawBottomCenter,
        renderedGuides: false,
      };
    }

    const cfg = pendingStairConfig;
    const totalRunFt = (cfg.runIn / 12) * cfg.stepCount;
    const up = upAxisAt(cfg.rotation);
    const halfRun = totalRunFt / 2;

    // Forward translation: bottom center → bbox center along UP.
    const bboxCenter: Point = {
      x: rawBottomCenter.x + up.x * halfRun,
      y: rawBottomCenter.y + up.y * halfRun,
    };

    const bbox = axisAlignedBBoxOfRotated(
      bboxCenter,
      cfg.widthFt,
      totalRunFt,
      cfg.rotation,
      "__pending__",
    );

    const result = computeSnap({
      candidate: { pos: bboxCenter, bbox },
      scene: ensureScene(),
      tolerancePx: SNAP_TOLERANCE_PX,
      scale,
      gridSnap,
    });
    renderSnapGuides(fc, result.guides, scale, origin);

    // Reverse translation: snapped bbox center → snapped bottom center.
    const snappedBottomCenter: Point = {
      x: result.snapped.x - up.x * halfRun,
      y: result.snapped.y - up.y * halfRun,
    };
    return { snappedBottomCenter, renderedGuides: result.guides.length > 0 };
  };

  const drawPreview = (snappedBottomCenter: Point) => {
    clearPreview();
    if (!pendingStairConfig) return;
    const cfg = pendingStairConfig;
    const totalRunFt = (cfg.runIn / 12) * cfg.stepCount;
    const up = upAxisAt(cfg.rotation);
    const halfRun = totalRunFt / 2;
    const bboxCenterFt: Point = {
      x: snappedBottomCenter.x + up.x * halfRun,
      y: snappedBottomCenter.y + up.y * halfRun,
    };
    // Synthesize a Stair-shaped object for the symbol builder.
    const previewStair = {
      id: "__preview__",
      position: snappedBottomCenter,
      rotation: cfg.rotation,
      riseIn: cfg.riseIn,
      runIn: cfg.runIn,
      stepCount: cfg.stepCount,
      widthFtOverride: cfg.widthFt === DEFAULT_STAIR_WIDTH_FT ? undefined : cfg.widthFt,
    };
    const children = buildStairSymbolShapes(previewStair, scale, origin, false);
    const cx = origin.x + bboxCenterFt.x * scale;
    const cy = origin.y + bboxCenterFt.y * scale;
    previewGroup = new fabric.Group(children, {
      left: cx,
      top: cy,
      angle: cfg.rotation,
      originX: "center",
      originY: "center",
      selectable: false,
      evented: false,
      opacity: 0.6,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { type: "stair-preview" } as any,
    });
    fc.add(previewGroup);
    fc.requestRenderAll();
  };

  const onMouseMove = (opt: fabric.TEvent) => {
    if (!pendingStairConfig) return;
    const pointer = fc.getViewportPoint(opt.e);
    const feet = pxToFeet(pointer, origin, scale);

    let altHeld = false;
    let shiftHeld = false;
    if (opt.e instanceof MouseEvent) {
      altHeld = opt.e.altKey === true;
      shiftHeld = opt.e.shiftKey === true;
    }
    const gridSnap = useUIStore.getState().gridSnap;

    // D-02 Shift-snap rotation to 15° increments while previewing.
    if (shiftHeld) {
      pendingStairConfig.rotation =
        Math.round(pendingStairConfig.rotation / 15) * 15;
    }

    if (altHeld) {
      clearSnapGuides(fc);
    }

    const { snappedBottomCenter } = snapBottomCenter(feet, altHeld, gridSnap);
    drawPreview(snappedBottomCenter);
  };

  const onMouseDown = (opt: fabric.TEvent) => {
    if (!pendingStairConfig) return;

    const pointer = fc.getViewportPoint(opt.e);
    const feet = pxToFeet(pointer, origin, scale);
    const gridSnap = useUIStore.getState().gridSnap;
    let altHeld = false;
    if (opt.e instanceof MouseEvent) {
      altHeld = opt.e.altKey === true;
    }

    const { snappedBottomCenter } = snapBottomCenter(feet, altHeld, gridSnap);

    // Clear preview + guides immediately so the next hover repaints fresh.
    clearPreview();
    clearSnapGuides(fc);

    const cfg = pendingStairConfig;
    const cad = useCADStore.getState();
    const roomId = cad.activeRoomId;
    if (!roomId) return;

    const widthFtOverride =
      cfg.widthFt === DEFAULT_STAIR_WIDTH_FT ? undefined : cfg.widthFt;

    cad.addStair(roomId, {
      position: snappedBottomCenter,
      rotation: cfg.rotation,
      riseIn: cfg.riseIn,
      runIn: cfg.runIn,
      stepCount: cfg.stepCount,
      widthFtOverride,
    });

    // Invalidate snap-scene cache — the next placement should re-build (in
    // case future iterations decide to include stairs in the scene; for
    // v1.15 stairs are excluded but we keep the invalidation pattern for
    // consistency with productTool).
    cachedScene = null;
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      clearPreview();
      clearSnapGuides(fc);
      pendingStairConfig = null;
      useUIStore.getState().setTool("select");
    }
  };

  fc.on("mouse:move", onMouseMove);
  fc.on("mouse:down", onMouseDown);
  document.addEventListener("keydown", onKeyDown);

  return () => {
    fc.off("mouse:move", onMouseMove);
    fc.off("mouse:down", onMouseDown);
    document.removeEventListener("keydown", onKeyDown);
    clearPreview();
    clearSnapGuides(fc);
    cachedScene = null;
  };
}
