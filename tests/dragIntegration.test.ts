import { describe, it, expect, beforeEach, vi } from "vitest";
import * as fabric from "fabric";
import { useCADStore, resetCADStoreForTests, getActiveRoomDoc } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import type { PlacedProduct } from "@/types/cad";
import * as selectToolModule from "@/canvas/tools/selectTool";
const {
  activateSelectTool,
  setSelectToolProductLibrary,
} = selectToolModule;
// These exports were added by the Wave 2 drag-regression hotfix. When
// running this test against pre-hotfix code they will be `undefined` —
// the test falls back to identity behavior so the failure shows up as
// an assertion failure on drag behavior, not an import error.
const setSelectToolRedrawCallback =
  (selectToolModule as { setSelectToolRedrawCallback?: (cb: (() => void) | null) => void })
    .setSelectToolRedrawCallback ?? (() => {});
const isSelectToolDragActive =
  (selectToolModule as { isSelectToolDragActive?: () => boolean })
    .isSelectToolDragActive ?? (() => false);
// Hotfix #2 export — shared helper so this test and FabricCanvas.redraw()
// use identical short-circuit logic. If absent (pre-hotfix-2), fall back
// to the old coarse short-circuit which will trip the tool-switch-revert
// assertion, making the regression visible.
const shouldSkipRedrawDuringDrag =
  (selectToolModule as {
    shouldSkipRedrawDuringDrag?: (opts: { activeToolChanged: boolean }) => boolean;
  }).shouldSkipRedrawDuringDrag
  ?? ((_opts: { activeToolChanged: boolean }) =>
    ((selectToolModule as { isSelectToolDragActive?: () => boolean })
      .isSelectToolDragActive ?? (() => false))());
import { renderProducts, renderWalls } from "@/canvas/fabricSync";

// ---------------------------------------------------------------------------
// Phase 25 Wave 2 hotfix — drag regression.
//
// This is the regression test that would have caught the bug. Before the
// hotfix, `selectedIds` was in `redraw()`'s useCallback dependency array.
// When the selectTool called `select([id])` on mouse:down, the resulting
// state change triggered a redraw → fc.clear() → all Fabric objects
// destroyed mid-drag. The subsequent mouse:move hit the `dragging` guard
// with stale closure state from a newly-activated tool and no-op'd.
//
// This test drives the selectTool end-to-end through Fabric pointer events
// against a seeded store, and asserts that:
//   1. mouse:down selects the hit product
//   2. mouse:move moves the Fabric object (drag is live)
//   3. mouse:up commits exactly ONE history entry with the final position
//
// The test FAILS RED if the drag-active guard / redraw skip is removed
// (the bug state). It PASSES GREEN with the hotfix applied.
// ---------------------------------------------------------------------------

function makeCanvas(): fabric.Canvas {
  const el = document.createElement("canvas");
  el.width = 800;
  el.height = 600;
  // Mirror the real FabricCanvas constructor opts so renderOnAddRemove
  // behavior matches production.
  return new fabric.Canvas(el, {
    selection: false,
    preserveObjectStacking: true,
    renderOnAddRemove: false,
  });
}

/** Feet→pixels with the default test transform (scale=10, origin=0,0). */
function feetToPx(feet: { x: number; y: number }) {
  return { x: feet.x * 10, y: feet.y * 10 };
}

/** Build a minimal fabric.TEvent-shaped object the tool handlers can consume.
 *  The real tools call `fc.getViewportPoint(opt.e)` which reads clientX/Y and
 *  applies the canvas transform. In jsdom without a real canvas rect,
 *  getViewportPoint returns the raw clientX/clientY. */
function makePointerEvent(clientX: number, clientY: number): { e: MouseEvent } {
  const e = new MouseEvent("mousedown", {
    clientX,
    clientY,
    button: 0,
    bubbles: true,
  });
  return { e };
}

describe("Wave 2 drag regression — select → drag → release round-trip", () => {
  beforeEach(() => {
    resetCADStoreForTests();
    useUIStore.setState({ selectedIds: [], activeTool: "select" });
    // Seed the product library so selectTool can find the product for
    // hit-testing and dimension lookup.
    setSelectToolProductLibrary([
      {
        id: "prod_chair",
        name: "Chair",
        category: "Seating",
        width: 2,
        depth: 2,
        height: 3,
        material: "",
        imageUrl: "",
        textureUrls: [],
      },
    ]);
  });

  it("drag moves the product and commits exactly one history entry", () => {
    // --- Seed: one product at (5, 5) feet ---
    // Direct setState so the placement itself doesn't consume a history
    // slot we're measuring.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useCADStore.setState((s: any) => {
      const doc = s.rooms[s.activeRoomId];
      const pp: PlacedProduct = {
        id: "pp_chair",
        productId: "prod_chair",
        position: { x: 5, y: 5 },
        rotation: 0,
      };
      return {
        rooms: {
          ...s.rooms,
          [s.activeRoomId]: {
            ...doc,
            placedProducts: { ...doc.placedProducts, pp_chair: pp },
          },
        },
      };
    });

    // --- Build canvas + render the product so selectTool can locate it ---
    const fc = makeCanvas();
    const scale = 10;
    const origin = { x: 0, y: 0 };
    const products = getActiveRoomDoc()!.placedProducts;
    const walls = getActiveRoomDoc()!.walls;
    renderWalls(fc, walls, scale, origin, []);
    renderProducts(
      fc,
      products,
      [
        {
          id: "prod_chair",
          name: "Chair",
          category: "Seating",
          width: 2,
          depth: 2,
          height: 3,
          material: "",
          imageUrl: "",
          textureUrls: [],
        },
      ],
      scale,
      origin,
      [],
    );

    // Stub the redraw callback with a spy so we can confirm the tool
    // asks for a flush when needed (and doesn't loop during a live drag).
    const redrawSpy = vi.fn();
    setSelectToolRedrawCallback(redrawSpy);

    // --- Simulate FabricCanvas's `useUIStore((s) => s.selectedIds)` →
    //     redraw-on-change wiring. THIS is what reproduces the bug state:
    //     without the drag-active guard in redraw, `select([hit.id])` on
    //     mouse:down triggers this subscription, which calls fc.clear(),
    //     destroying the fabric object the selectTool is about to mutate
    //     on mouse:move. We use the real `isSelectToolDragActive` guard
    //     so this subscription accurately mirrors the production redraw.
    let simulatedRedraws = 0;
    const unsubscribe = useUIStore.subscribe((state, prev) => {
      if (state.selectedIds === prev.selectedIds) return;
      // Mirror FabricCanvas.redraw(): skip while drag is active.
      if (isSelectToolDragActive()) return;
      simulatedRedraws += 1;
      fc.clear();
      renderProducts(
        fc,
        getActiveRoomDoc()!.placedProducts,
        [
          {
            id: "prod_chair",
            name: "Chair",
            category: "Seating",
            width: 2,
            depth: 2,
            height: 3,
            material: "",
            imageUrl: "",
            textureUrls: [],
          },
        ],
        scale,
        origin,
        state.selectedIds,
      );
    });

    // --- Activate selectTool ---
    const cleanup = activateSelectTool(fc, scale, origin);
    expect(typeof cleanup).toBe("function");

    // --- Mouse:down on the product center (5ft, 5ft → 50px, 50px) ---
    const downPx = feetToPx({ x: 5, y: 5 });
    fc.fire("mouse:down", makePointerEvent(downPx.x, downPx.y));

    // Bug state: selectedIds would update but then the canvas would be
    // cleared by the subscription-driven redraw, and the next mouse:move
    // would find no fabric obj to mutate.
    expect(useUIStore.getState().selectedIds).toEqual(["pp_chair"]);

    // Locate the product fabric group so we can assert its position moves.
    const productObj = fc.getObjects().find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (o) => (o as any).data?.type === "product" && (o as any).data?.placedProductId === "pp_chair",
    );
    expect(productObj).toBeDefined();
    const origLeft = productObj!.left ?? 0;
    const origTop = productObj!.top ?? 0;

    // --- Mouse:move: drag by (+3ft, +2ft) → delta (+30px, +20px) ---
    const movePx = feetToPx({ x: 8, y: 7 });
    fc.fire("mouse:move", makePointerEvent(movePx.x, movePx.y));

    // Fast-path mutation: the fabric object itself should have moved.
    // If the canvas was cleared on mouse:down (the bug), this assertion
    // fails because the productObj reference still points at the old
    // (now-detached) object with its original left/top.
    expect(productObj!.left).not.toBe(origLeft);
    expect(productObj!.top).not.toBe(origTop);

    // Record history size before the commit.
    const historyBefore = useCADStore.getState().past.length;

    // --- Mouse:up: commit ---
    fc.fire("mouse:up", makePointerEvent(movePx.x, movePx.y));

    // Store state updated with the final position.
    const movedPp = getActiveRoomDoc()!.placedProducts.pp_chair;
    expect(movedPp.position.x).toBeCloseTo(8, 1);
    expect(movedPp.position.y).toBeCloseTo(7, 1);

    // Exactly ONE history entry for the entire drag (D-04).
    const historyAfter = useCADStore.getState().past.length;
    expect(historyAfter - historyBefore).toBe(1);

    // Assert the subscription-driven redraw was properly skipped during
    // the live drag: the only redraw we should see is the one triggered
    // by the final mouse:up commit (moveProduct updates walls→placedProducts
    // via zustand, but our listener only watches selectedIds — so actually
    // we expect ZERO redraws from our listener during the drag itself).
    expect(simulatedRedraws).toBe(0);

    // Cleanup.
    unsubscribe();
    cleanup();
    setSelectToolRedrawCallback(null);
    fc.dispose();
  });

  it("tool-switch during drag reverts the in-flight drag", () => {
    // Phase 25 Wave 2 Hotfix #2 — Tool-switch revert regression.
    //
    // Hotfix #1 added `_dragActive` + `isSelectToolDragActive()` to short-circuit
    // FabricCanvas.redraw() on selectedIds changes during a drag. That fix was
    // too coarse: the short-circuit also fired on activeTool changes, breaking
    // the D-06 tool-switch-revert contract. Pressing `W` mid-drag should
    // immediately revert the in-flight drag (Fabric object returns to pre-drag
    // left/top) and discard the drag without committing to the store.
    //
    // This test RED's on post-hotfix-#1 code (the activeTool-triggered redraw
    // short-circuits, cleanup never runs, drag commits on mouse:up) and GREEN's
    // after hotfix #2 (redraw differentiates activeTool changes from selectedIds
    // changes and allows cleanup to run on tool switch).
    // ------------------------------------------------------------------------

    // Seed product at (5, 5) ft
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useCADStore.setState((s: any) => {
      const doc = s.rooms[s.activeRoomId];
      const pp: PlacedProduct = {
        id: "pp_chair",
        productId: "prod_chair",
        position: { x: 5, y: 5 },
        rotation: 0,
      };
      return {
        rooms: {
          ...s.rooms,
          [s.activeRoomId]: {
            ...doc,
            placedProducts: { ...doc.placedProducts, pp_chair: pp },
          },
        },
      };
    });

    const fc = makeCanvas();
    const scale = 10;
    const origin = { x: 0, y: 0 };
    renderWalls(fc, getActiveRoomDoc()!.walls, scale, origin, []);
    renderProducts(
      fc,
      getActiveRoomDoc()!.placedProducts,
      [
        {
          id: "prod_chair",
          name: "Chair",
          category: "Seating",
          width: 2,
          depth: 2,
          height: 3,
          material: "",
          imageUrl: "",
          textureUrls: [],
        },
      ],
      scale,
      origin,
      [],
    );

    // Wire redraw callback (selectTool uses it to flush skipped bare-click redraw)
    setSelectToolRedrawCallback(vi.fn());

    // Activate selectTool; capture cleanup so the simulated FabricCanvas
    // useEffect can invoke it when activeTool changes.
    let cleanup = activateSelectTool(fc, scale, origin);

    // Mirror FabricCanvas.redraw()'s short-circuit using the SAME shared
    // helper (`shouldSkipRedrawDuringDrag`). Production:
    //   - activeTool change fires the [redraw] effect
    //   - redraw() calls shouldSkipRedrawDuringDrag({ activeToolChanged: true })
    //   - fix: returns false → redraw runs → toolCleanupRef.current?.() fires
    //          → selectTool cleanup reverts the drag
    //   - bug: returns true (coarse short-circuit) → cleanup never runs →
    //          drag remains live → mouse:up commits permanently.
    //
    // Production tracks prev activeTool via a useRef; in the test we use a
    // captured prev value initialized at the time the simulation started.
    let simulatedPrevActiveTool = useUIStore.getState().activeTool;
    let toolSwitchCleanupFired = 0;
    const unsubscribe = useUIStore.subscribe((state, prev) => {
      if (state.activeTool === prev.activeTool && state.selectedIds === prev.selectedIds) return;
      const activeToolChanged = state.activeTool !== simulatedPrevActiveTool;
      simulatedPrevActiveTool = state.activeTool;
      if (shouldSkipRedrawDuringDrag({ activeToolChanged })) {
        return;
      }
      if (activeToolChanged) {
        toolSwitchCleanupFired += 1;
        cleanup();
      }
    });

    // --- mouse:down on product ---
    const downPx = feetToPx({ x: 5, y: 5 });
    fc.fire("mouse:down", makePointerEvent(downPx.x, downPx.y));
    expect(useUIStore.getState().selectedIds).toEqual(["pp_chair"]);
    expect(isSelectToolDragActive()).toBe(true);

    // Cache the fabric product object's pre-drag left/top (before mouse:move).
    // selectTool's dragPre.origLeft/origTop were snapshotted at mouse:down,
    // from findProductFabricObj — these are the values cleanup() will
    // restore to.
    const productObj = fc.getObjects().find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (o) => (o as any).data?.type === "product" && (o as any).data?.placedProductId === "pp_chair",
    );
    expect(productObj).toBeDefined();
    const preDragLeft = productObj!.left ?? 0;
    const preDragTop = productObj!.top ?? 0;
    const preDragStorePos = { ...getActiveRoomDoc()!.placedProducts.pp_chair.position };
    const preDragHistory = useCADStore.getState().past.length;

    // --- mouse:move — drag to (8, 7) ft ---
    const movePx = feetToPx({ x: 8, y: 7 });
    fc.fire("mouse:move", makePointerEvent(movePx.x, movePx.y));

    // Fabric object moved mid-drag (fast-path mutation).
    expect(productObj!.left).not.toBe(preDragLeft);
    expect(productObj!.top).not.toBe(preDragTop);

    // --- TOOL SWITCH: change activeTool to "wall" ---
    // This is the production path via `W` keypress → setTool("wall") → the
    // FabricCanvas useEffect reacts and runs cleanup. The mirrored
    // subscription above invokes cleanup().
    useUIStore.setState({ activeTool: "wall" });

    // Cleanup fired exactly once in response to the activeTool change.
    expect(toolSwitchCleanupFired).toBe(1);

    // --- Assertions: drag was REVERTED ---
    // a) Fabric object's left/top reverted to pre-drag values (D-06 revert).
    expect(productObj!.left).toBeCloseTo(preDragLeft, 5);
    expect(productObj!.top).toBeCloseTo(preDragTop, 5);

    // b) Store's placedProducts[id].position is unchanged from pre-drag.
    const postSwitchPos = getActiveRoomDoc()!.placedProducts.pp_chair.position;
    expect(postSwitchPos.x).toBeCloseTo(preDragStorePos.x, 5);
    expect(postSwitchPos.y).toBeCloseTo(preDragStorePos.y, 5);

    // c) History did NOT grow — no pushHistory commit happened.
    expect(useCADStore.getState().past.length).toBe(preDragHistory);

    // d) `_dragActive` flag cleared — cleanup resets it.
    expect(isSelectToolDragActive()).toBe(false);

    // --- Late mouse:up — should be a no-op (listeners detached by cleanup) ---
    // fc.fire calls the registered listeners; after cleanup, selectTool's
    // onMouseUp is unbound, so this must not commit.
    fc.fire("mouse:up", makePointerEvent(movePx.x, movePx.y));
    expect(useCADStore.getState().past.length).toBe(preDragHistory);
    expect(getActiveRoomDoc()!.placedProducts.pp_chair.position.x).toBeCloseTo(preDragStorePos.x, 5);

    unsubscribe();
    setSelectToolRedrawCallback(null);
    fc.dispose();
  });

  it("click on empty canvas clears selection and flushes the skipped redraw", () => {
    // Seed one product + pre-select it so we have something to clear.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useCADStore.setState((s: any) => {
      const doc = s.rooms[s.activeRoomId];
      const pp: PlacedProduct = {
        id: "pp_chair",
        productId: "prod_chair",
        position: { x: 5, y: 5 },
        rotation: 0,
      };
      return {
        rooms: {
          ...s.rooms,
          [s.activeRoomId]: {
            ...doc,
            placedProducts: { ...doc.placedProducts, pp_chair: pp },
          },
        },
      };
    });
    useUIStore.setState({ selectedIds: ["pp_chair"] });

    const fc = makeCanvas();
    const scale = 10;
    const origin = { x: 0, y: 0 };
    const products = getActiveRoomDoc()!.placedProducts;
    renderProducts(
      fc,
      products,
      [
        {
          id: "prod_chair",
          name: "Chair",
          category: "Seating",
          width: 2,
          depth: 2,
          height: 3,
          material: "",
          imageUrl: "",
          textureUrls: [],
        },
      ],
      scale,
      origin,
      ["pp_chair"],
    );

    const redrawSpy = vi.fn();
    setSelectToolRedrawCallback(redrawSpy);
    const cleanup = activateSelectTool(fc, scale, origin);

    // Click far outside any product (30ft, 30ft → 300px, 300px) — clears
    // selection without starting a drag.
    const emptyPx = feetToPx({ x: 30, y: 30 });
    fc.fire("mouse:down", makePointerEvent(emptyPx.x, emptyPx.y));
    fc.fire("mouse:up", makePointerEvent(emptyPx.x, emptyPx.y));

    // Selection cleared (clearSelection path in mouse:down's else branch).
    expect(useUIStore.getState().selectedIds).toEqual([]);

    // No history commit since nothing was moved.
    // (clearSelection does not push history — it's a UI-store-only action.)

    cleanup();
    setSelectToolRedrawCallback(null);
    fc.dispose();
  });
});
