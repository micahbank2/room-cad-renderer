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

/** Currently selected product ID from the library to place. Module-scoped
 *  per D-07 — this is the toolbar → tool bridge (public API), not
 *  per-activation state. */
let pendingProductId: string | null = null;

export function setPendingProduct(productId: string | null) {
  pendingProductId = productId;
}

/** Product library reference — set by FabricCanvas. Module-scoped per D-07 —
 *  parallel to selectTool's `setSelectToolProductLibrary`. Needed so the
 *  smart-snap path can resolve the pending product's dimensions for bbox
 *  computation. */
let _productLibrary: Product[] = [];

export function setProductToolLibrary(products: Product[]): void {
  _productLibrary = products;
}

export function activateProductTool(
  fc: fabric.Canvas,
  scale: number,
  origin: { x: number; y: number },
): () => void {
  // Phase 30 — lazy-cached SceneGeometry for smart-snap (D-09b). Built on
  // first mousemove while a productId is pending; reset after each
  // placement so the next placement sees the newly-committed object.
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

  /**
   * Compute the snapped feet position for a pointer. Shared by the hover
   * preview and the placement commit. Applies D-07 Alt disable and falls
   * through to grid snap per D-05b when smart snap finds nothing.
   */
  const snapFor = (
    feet: Point,
    altHeld: boolean,
    gridSnap: number,
  ): { snapped: Point; renderedGuides: boolean } => {
    if (altHeld) {
      // D-07: smart snap disabled → grid only, no guides.
      return {
        snapped: gridSnap > 0 ? snapPoint(feet, gridSnap) : feet,
        renderedGuides: false,
      };
    }
    if (!pendingProductId) {
      return {
        snapped: gridSnap > 0 ? snapPoint(feet, gridSnap) : feet,
        renderedGuides: false,
      };
    }
    const product = _productLibrary.find((p) => p.id === pendingProductId);
    if (!product) {
      return {
        snapped: gridSnap > 0 ? snapPoint(feet, gridSnap) : feet,
        renderedGuides: false,
      };
    }
    // Product dimensions default to 2×2 when unset (mirrors effectiveDimensions
    // fallback without pulling it in — avoids importing sizeScale semantics
    // that don't apply to placement).
    const width = product.width ?? 2;
    const depth = product.depth ?? 2;
    const bbox = axisAlignedBBoxOfRotated(feet, width, depth, 0, "__pending__");
    const result = computeSnap({
      candidate: { pos: feet, bbox },
      scene: ensureScene(),
      tolerancePx: SNAP_TOLERANCE_PX,
      scale,
      gridSnap,
    });
    renderSnapGuides(fc, result.guides, scale, origin);
    return { snapped: result.snapped, renderedGuides: result.guides.length > 0 };
  };

  const onMouseMove = (opt: fabric.TEvent) => {
    if (!pendingProductId) return;
    const pointer = fc.getViewportPoint(opt.e);
    const feet = pxToFeet(pointer, origin, scale);
    const altHeld = (opt.e as MouseEvent).altKey === true; // D-07
    const gridSnap = useUIStore.getState().gridSnap;

    if (altHeld) {
      clearSnapGuides(fc);
      return;
    }
    // snapFor renders guides as a side effect.
    snapFor(feet, false, gridSnap);
  };

  const onMouseDown = (opt: fabric.TEvent) => {
    if (!pendingProductId) return;

    const pointer = fc.getViewportPoint(opt.e);
    const feet = pxToFeet(pointer, origin, scale);
    const gridSnap = useUIStore.getState().gridSnap;
    const altHeld = (opt.e as MouseEvent).altKey === true; // D-07 Alt disable

    const { snapped } = snapFor(feet, altHeld, gridSnap);
    // Always clear guides immediately after placement; the next hover will
    // re-render (Pitfall 2).
    clearSnapGuides(fc);
    useCADStore.getState().placeProduct(pendingProductId, snapped);
    // Invalidate the cached scene — a new object now exists that the next
    // placement's snap scan must include (or at least, must not assume the
    // prior scene is current).
    cachedScene = null;

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
  fc.on("mouse:move", onMouseMove);
  document.addEventListener("keydown", onKeyDown);

  // Phase 30 — test-mode driver (D-07 contract from 30-01-SUMMARY.md). Only
  // installs the hook(s) if not already provided by another tool (selectTool
  // also installs them when active; whichever tool is currently active wins).
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
    const fakeEvt = (altKey: boolean): MouseEvent =>
      ({ altKey, metaKey: false, ctrlKey: false, shiftKey: false } as unknown as MouseEvent);
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
      if (args.tool !== "product") return;
      const altKey = args.altKey === true;
      const opt = { e: fakeEvt(altKey) } as unknown as fabric.TEvent;
      // Driver contract: the integration test doesn't go through
      // `setPendingProduct` (no ProductLibrary sidebar interaction in the
      // test harness) — ensure a non-null pending id + a library entry with
      // sane default dims so the smart-snap bbox path engages end-to-end.
      if (!pendingProductId) pendingProductId = "__test_product__";
      if (!_productLibrary.find((p) => p.id === pendingProductId)) {
        _productLibrary = [
          ..._productLibrary,
          {
            id: pendingProductId,
            name: "Test",
            category: "Other",
            width: 2,
            depth: 2,
            height: 2,
            material: "",
            imageUrl: "",
            textureUrls: [],
          } as Product,
        ];
      }
      if (args.phase === "move") {
        withDrivenPointer(args.pos, () => onMouseMove(opt));
      } else {
        // Both "up" and "down" semantics map to placement.
        withDrivenPointer(args.pos, () => onMouseDown(opt));
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
  }

  return () => {
    fc.off("mouse:down", onMouseDown);
    fc.off("mouse:move", onMouseMove);
    document.removeEventListener("keydown", onKeyDown);
    // Phase 30 — clear smart-snap guides on tool-switch cleanup (Pitfall 3).
    clearSnapGuides(fc);
    cachedScene = null;
    if (import.meta.env.MODE === "test") {
      const w = window as unknown as {
        __driveSnap?: unknown;
        __getSnapGuides?: unknown;
      };
      if (w.__driveSnap === driveSnapHook) delete w.__driveSnap;
      if (w.__getSnapGuides === getSnapGuidesHook) delete w.__getSnapGuides;
    }
  };
}
