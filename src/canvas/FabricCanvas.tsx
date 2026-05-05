import { useRef, useEffect, useCallback, useState } from "react";
import * as fabric from "fabric";
import {
  useCADStore,
  useActiveRoom,
  useActiveRoomDoc,
  useActiveWalls,
  useActivePlacedProducts,
  useActiveCeilings,
  useActivePlacedCustomElements,
  useCustomElements,
  getActiveRoomDoc,
} from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { drawGrid } from "./grid";
import { drawRoomDimensions } from "./dimensions";
import { renderWalls, renderProducts, renderCeilings, renderCustomElements, setLabelLookupCanvas } from "./fabricSync";
import { activateWallTool } from "./tools/wallTool";
import {
  activateSelectTool,
  setSelectToolProductLibrary,
  shouldSkipRedrawDuringDrag,
  markRedrawSkippedDueToDrag,
  setSelectToolRedrawCallback,
} from "./tools/selectTool";
import type { ToolType } from "@/types/cad";
import { activateProductTool, setProductToolLibrary } from "./tools/productTool";
import { activateDoorTool } from "./tools/doorTool";
import { activateWindowTool } from "./tools/windowTool";
import { activateCeilingTool } from "./tools/ceilingTool";
// Phase 61 OPEN-01 (D-09): three new wall-cutout placement tools.
import { activateArchwayTool } from "./tools/archwayTool";
import { activatePassthroughTool } from "./tools/passthroughTool";
import { activateNicheTool } from "./tools/nicheTool";
import { attachDragDropHandlers } from "./dragDrop";
import { computeLabelPx, hitTestDimLabel, validateInput } from "./dimensionEditor";
import { closestPointOnWall, distance, formatFeet } from "@/lib/geometry";
import { WainscotPopover } from "@/components/WainscotPopover";
import { FloatingSelectionToolbar } from "@/components/ui/FloatingSelectionToolbar";
import { GestureChip } from "@/components/ui/GestureChip";
import type { WallSide } from "@/types/cad";
import type { Product } from "@/types/product";

interface Props {
  productLibrary: Product[];
}

// Simple module-level cache for floor plan background images
const bgImageCache = new Map<string, HTMLImageElement>();

function getBaseFitScale(roomW: number, roomH: number, canvasW: number, canvasH: number) {
  const pad = 50;
  return Math.min((canvasW - pad * 2) / roomW, (canvasH - pad * 2) / roomH);
}

function getBaseFitOrigin(roomW: number, roomH: number, baseScale: number, canvasW: number, canvasH: number) {
  return {
    x: (canvasW - roomW * baseScale) / 2,
    y: (canvasH - roomH * baseScale) / 2,
  };
}

/** Returns the user-zoomed-and-panned scale + origin used for rendering and hit-testing. */
function getViewTransform(
  roomW: number,
  roomH: number,
  canvasW: number,
  canvasH: number,
  userZoom: number,
  panOffset: { x: number; y: number },
) {
  const baseScale = getBaseFitScale(roomW, roomH, canvasW, canvasH);
  const baseOrigin = getBaseFitOrigin(roomW, roomH, baseScale, canvasW, canvasH);
  return {
    scale: baseScale * userZoom,
    origin: { x: baseOrigin.x + panOffset.x, y: baseOrigin.y + panOffset.y },
    baseFit: { scale: baseScale, origin: baseOrigin },
  };
}

export default function FabricCanvas({ productLibrary }: Props) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fcRef = useRef<fabric.Canvas | null>(null);
  const toolCleanupRef = useRef<(() => void) | null>(null);
  // Hotfix #2 — track previous activeTool so redraw() can differentiate
  // activeTool-triggered redraws (must run cleanup → revert in-flight drag)
  // from selectedIds-triggered redraws (must short-circuit to keep drag alive).
  const prevActiveToolRef = useRef<ToolType | null>(null);
  const [editingWallId, setEditingWallId] = useState<string | null>(null);
  const [pendingValue, setPendingValue] = useState<string>("");
  const [wainscotEditWallId, setWainscotEditWallId] = useState<string | null>(null);
  const [wainscotEditSide, setWainscotEditSide] = useState<WallSide>("A");
  // FIX-01: bumping this tick forces redraw() to re-execute (and rebuild the
  // product Group) when an async product image finishes loading. Without this,
  // fc.renderAll() inside the image cache onReady only repaints the existing
  // (image-less) Group — the Group is never rebuilt with the FabricImage child.
  const [productImageTick, setProductImageTick] = useState(0);

  const room = useActiveRoom() ?? { width: 20, length: 16, wallHeight: 8 };
  const walls = useActiveWalls();
  const placedProducts = useActivePlacedProducts();
  const activeDoc = useActiveRoomDoc();
  const floorPlanImage = activeDoc?.floorPlanImage;
  const ceilings = useActiveCeilings();
  const placedCustoms = useActivePlacedCustomElements();
  const customCatalog = useCustomElements();
  const activeTool = useUIStore((s) => s.activeTool);
  const selectedIds = useUIStore((s) => s.selectedIds);
  const showGrid = useUIStore((s) => s.showGrid);
  const userZoom = useUIStore((s) => s.userZoom);
  const panOffset = useUIStore((s) => s.panOffset);

  // Keep select tool's product library reference up to date
  useEffect(() => {
    setSelectToolProductLibrary(productLibrary);
    // Phase 30 — product tool needs the library too to resolve the
    // pending product's bbox for smart-snap.
    setProductToolLibrary(productLibrary);
  }, [productLibrary]);

  /** Full redraw of the canvas from store state */
  const redraw = useCallback(() => {
    const fc = fcRef.current;
    const wrapper = wrapperRef.current;
    if (!fc || !wrapper) return;

    // HOTFIX #1 (Wave 2 drag regression): skip full redraws while selectTool is
    // mid-drag. Otherwise the select()/clearSelection() calls on mouse:down
    // would update `selectedIds`, re-run this redraw, fc.clear() the canvas,
    // and destroy the very Fabric object being dragged — mouse:move then
    // no-ops because its guard uses stale closure state from a new tool
    // activation. The drag-end path (mouse:up in selectTool) clears the
    // flag and either a store-triggered redraw or a flushed pending
    // redraw paints the final selection highlight.
    //
    // HOTFIX #2 (tool-switch revert restoration): the short-circuit above
    // was too coarse — it also fired when `activeTool` changed, blocking
    // cleanup() from running and breaking D-06 revert-on-tool-switch.
    // Differentiate: only short-circuit when the trigger was NOT a tool
    // change. On tool change, allow the redraw to proceed so
    // toolCleanupRef.current?.() runs and cleanup() reverts the in-flight
    // drag (fabric transform restored, no store commit).
    const activeToolChanged = prevActiveToolRef.current !== activeTool;
    if (shouldSkipRedrawDuringDrag({ activeToolChanged })) {
      markRedrawSkippedDueToDrag();
      return;
    }

    const rect = wrapper.getBoundingClientRect();
    const cW = rect.width;
    const cH = rect.height;
    if (cW === 0 || cH === 0) return;

    fc.setDimensions({ width: cW, height: cH });
    fc.clear();
    fc.backgroundColor = "#12121d";

    const userZoom = useUIStore.getState().userZoom;
    const panOffset = useUIStore.getState().panOffset;
    const { scale, origin } = getViewTransform(
      room.width, room.length, cW, cH, userZoom, panOffset
    );

    // 0. Floor plan background image (if any) — rendered to fit the room
    if (floorPlanImage) {
      const img = bgImageCache.get(floorPlanImage);
      if (img && img.complete) {
        const fImg = new fabric.FabricImage(img, {
          left: origin.x,
          top: origin.y,
          scaleX: (room.width * scale) / img.naturalWidth,
          scaleY: (room.length * scale) / img.naturalHeight,
          opacity: 0.45,
          selectable: false,
          evented: false,
        });
        fc.add(fImg);
      } else if (!img) {
        const el = new Image();
        el.onload = () => fc.renderAll();
        el.src = floorPlanImage;
        bgImageCache.set(floorPlanImage, el);
      }
    }

    // 1. Grid
    drawGrid(fc, room.width, room.length, scale, origin, showGrid);

    // 2. Room dimension labels
    drawRoomDimensions(fc, room.width, room.length, scale, origin);

    // 3. Walls
    renderWalls(fc, walls, scale, origin, selectedIds);

    // 4. Products — onAssetReady bumps the tick so this redraw re-runs once
    // an async asset (image cache OR Phase 57 GLTF silhouette compute)
    // populates its cache, rebuilding the product Group with the new child.
    // Functional setState avoids stale closures when multiple products
    // finish loading concurrently (D-03).
    renderProducts(
      fc,
      placedProducts,
      productLibrary,
      scale,
      origin,
      selectedIds,
      () => setProductImageTick((t) => t + 1),
    );

    // 5. Ceilings (translucent overlays)
    renderCeilings(fc, ceilings, scale, origin, selectedIds);

    // 6. Custom elements
    renderCustomElements(fc, placedCustoms, customCatalog, scale, origin, selectedIds);

    // Phase 31 — install __getCustomElementLabel test bridge (test mode only).
    setLabelLookupCanvas(fc);

    fc.renderAll();

    // Re-activate current tool with new scale/origin
    toolCleanupRef.current?.();
    toolCleanupRef.current = activateCurrentTool(fc, activeTool, scale, origin);
    // Hotfix #2 — record the tool we just activated so the next redraw can
    // tell whether activeTool changed (affects the drag short-circuit above).
    prevActiveToolRef.current = activeTool as ToolType;
  }, [room, walls, placedProducts, productLibrary, activeTool, selectedIds, showGrid, userZoom, panOffset, floorPlanImage, ceilings, placedCustoms, customCatalog, productImageTick]);

  // Init canvas
  useEffect(() => {
    if (!canvasElRef.current) return;

    const fc = new fabric.Canvas(canvasElRef.current, {
      selection: false,
      preserveObjectStacking: true,
      renderOnAddRemove: false, // Phase 25 D-02 — paints coalesce through explicit requestRenderAll/renderAll
    });
    fcRef.current = fc;

    // Phase 57: expose the canvas in test mode so __getProductRenderShape
    // (e2e driver) can walk fc.getObjects() to assert polygon vs rect.
    // Mirrors the Phase 31 __driveResize global-driver pattern.
    if (import.meta.env.MODE === "test") {
      (window as unknown as { __fabricCanvas?: fabric.Canvas }).__fabricCanvas = fc;
    }

    const detachDragDrop = attachDragDropHandlers(wrapperRef.current!, () => {
      const wrapper = wrapperRef.current!;
      const rect = wrapper.getBoundingClientRect();
      const r = getActiveRoomDoc()?.room ?? { width: 20, length: 16, wallHeight: 8 };
      const { userZoom, panOffset } = useUIStore.getState();
      const { scale, origin } = getViewTransform(
        r.width, r.length, rect.width, rect.height, userZoom, panOffset
      );
      return { scale, origin };
    });

    redraw();

    const onResize = () => redraw();
    window.addEventListener("resize", onResize);

    // ResizeObserver to handle split-pane layout changes
    const ro = new ResizeObserver(() => redraw());
    if (wrapperRef.current) ro.observe(wrapperRef.current);

    return () => {
      detachDragDrop();
      window.removeEventListener("resize", onResize);
      ro.disconnect();
      toolCleanupRef.current?.();
      toolCleanupRef.current = null;
      fc.dispose();
      fcRef.current = null;
      if (import.meta.env.MODE === "test") {
        delete (window as unknown as { __fabricCanvas?: fabric.Canvas }).__fabricCanvas;
      }
    };
  }, []);

  // Double-click on wall dim label to edit (EDIT-06)
  useEffect(() => {
    const fc = fcRef.current;
    const wrapper = wrapperRef.current;
    if (!fc || !wrapper) return;
    const onDblClick = (opt: { e: Event }) => {
      const pointer = fc.getViewportPoint(opt.e as any);
      const rect = wrapper.getBoundingClientRect();
      const r = getActiveRoomDoc()?.room ?? { width: 20, length: 16, wallHeight: 8 };
      const { userZoom, panOffset } = useUIStore.getState();
      const { scale, origin } = getViewTransform(
        r.width, r.length, rect.width, rect.height, userZoom, panOffset
      );
      const storeWalls = getActiveRoomDoc()?.walls ?? {};
      for (const wall of Object.values(storeWalls)) {
        if (hitTestDimLabel(pointer, wall, scale, origin)) {
          const currentLen = Math.sqrt(
            (wall.end.x - wall.start.x) ** 2 + (wall.end.y - wall.start.y) ** 2
          );
          setPendingValue(formatFeet(currentLen));
          setEditingWallId(wall.id);
          return;
        }
      }

      // Wainscot inline edit (POLISH-02)
      const feetX = (pointer.x - origin.x) / scale;
      const feetY = (pointer.y - origin.y) / scale;
      const feetPos = { x: feetX, y: feetY };
      for (const wall of Object.values(storeWalls)) {
        const { point: closest } = closestPointOnWall(wall, feetPos);
        const d = distance(closest, feetPos);
        if (d < 0.5 && wall.wainscoting) {
          const sideA = wall.wainscoting.A?.enabled;
          const sideB = wall.wainscoting.B?.enabled;
          if (sideA || sideB) {
            const side: WallSide = (sideA && sideB)
              ? useUIStore.getState().activeWallSide
              : sideA ? "A" : "B";
            setWainscotEditWallId(wall.id);
            setWainscotEditSide(side);
            return;
          }
        }
      }
    };
    fc.on("mouse:dblclick", onDblClick as any);
    return () => { fc.off("mouse:dblclick", onDblClick as any); };
  }, []);

  // Test-only driver: expose a hook for RTL to open the dimension edit overlay
  // for a given wall id, bypassing fabric's dblclick which is fragile in jsdom
  // (getBoundingClientRect → 0 in jsdom, so label hit-test never resolves).
  // Plan 01 explicitly sanctioned this driver; see tests/dimensionOverlay.test.tsx.
  useEffect(() => {
    (window as any).__openDimensionEditor = (wallId: string) => {
      const wall = getActiveRoomDoc()?.walls[wallId];
      if (!wall) return;
      const currentLen = Math.sqrt(
        (wall.end.x - wall.start.x) ** 2 + (wall.end.y - wall.start.y) ** 2
      );
      setPendingValue(formatFeet(currentLen));
      setEditingWallId(wallId);
    };
    return () => { delete (window as any).__openDimensionEditor; };
  }, []);

  // Redraw on state changes
  useEffect(() => {
    redraw();
  }, [redraw]);

  // Register the redraw fn with selectTool so it can flush a skipped
  // redraw on mouse:up (bare-click case — no store commit, no
  // subscription-driven redraw, but selection highlight still needs
  // to paint).
  useEffect(() => {
    setSelectToolRedrawCallback(() => redraw());
    return () => setSelectToolRedrawCallback(null);
  }, [redraw]);

  // Scroll-wheel zoom + middle-drag pan (Phase 6 — NAV-01/02)
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = wrapper.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const cursor = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const r = getActiveRoomDoc()?.room ?? { width: 20, length: 16, wallHeight: 8 };
      const baseScale = getBaseFitScale(r.width, r.length, rect.width, rect.height);
      const baseOrigin = getBaseFitOrigin(r.width, r.length, baseScale, rect.width, rect.height);
      // Smooth zoom factor: exponent based on deltaY. Ctrl/cmd+wheel = stronger.
      const factor = Math.exp(-e.deltaY * (e.ctrlKey || e.metaKey ? 0.005 : 0.0015));
      useUIStore.getState().zoomAt(cursor, factor, { scale: baseScale, origin: baseOrigin });
    };

    // Pan: middle-mouse drag OR space+left-drag
    let panState: { startX: number; startY: number; originX: number; originY: number } | null = null;
    let spaceDown = false;

    const onMouseDown = (e: MouseEvent) => {
      const isMiddle = e.button === 1;
      const isSpacePan = spaceDown && e.button === 0;
      if (!isMiddle && !isSpacePan) return;
      e.preventDefault();
      const { panOffset } = useUIStore.getState();
      panState = {
        startX: e.clientX,
        startY: e.clientY,
        originX: panOffset.x,
        originY: panOffset.y,
      };
      wrapper.style.cursor = "grabbing";
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!panState) return;
      const dx = e.clientX - panState.startX;
      const dy = e.clientY - panState.startY;
      useUIStore.getState().setPanOffset({
        x: panState.originX + dx,
        y: panState.originY + dy,
      });
    };

    const onMouseUp = () => {
      if (panState) {
        panState = null;
        wrapper.style.cursor = "";
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !spaceDown && !isInput(e.target)) {
        spaceDown = true;
        wrapper.style.cursor = "grab";
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceDown = false;
        if (!panState) wrapper.style.cursor = "";
      }
    };

    wrapper.addEventListener("wheel", onWheel, { passive: false });
    wrapper.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    // Block browser context menu on middle click
    const onAuxClick = (e: MouseEvent) => { if (e.button === 1) e.preventDefault(); };
    wrapper.addEventListener("auxclick", onAuxClick);

    return () => {
      wrapper.removeEventListener("wheel", onWheel);
      wrapper.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      wrapper.removeEventListener("auxclick", onAuxClick);
    };
  }, []);

  // Phase 53 CTXMENU-01: right-click context menu trigger (2D canvas).
  // Mirrors pan handler pattern. Uses fc.getObjects() + containsPoint() because
  // evented:false objects are skipped by fc.findTarget() (Research §Pitfall 1, Phase 25 PERF-01).
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const onRightClick = (e: MouseEvent) => {
      if (e.button !== 2) return;
      // D-07: skip when focused in a form field
      if (isInput(document.activeElement)) return;
      e.preventDefault();

      const fc = fcRef.current;
      if (!fc) return;

      // Convert to Fabric viewport coordinates for containsPoint()
      const pointer = fc.getViewportPoint(e);

      let hit: { kind: import("@/stores/uiStore").ContextMenuKind; nodeId: string } | null = null;

      for (const obj of fc.getObjects()) {
        const d = (obj as unknown as { data?: Record<string, unknown> }).data;
        if (!d) continue;

        if ((d.type === "wall" || d.type === "wall-side" || d.type === "wall-limewash") && d.wallId) {
          if ((obj as fabric.FabricObject).containsPoint(pointer)) {
            hit = { kind: "wall", nodeId: d.wallId as string };
            break;
          }
        } else if (d.type === "product" && d.placedProductId) {
          if ((obj as fabric.FabricObject).containsPoint(pointer)) {
            hit = { kind: "product", nodeId: d.placedProductId as string };
            break;
          }
        } else if ((d.type === "ceiling" || d.type === "ceiling-limewash") && d.ceilingId) {
          if ((obj as fabric.FabricObject).containsPoint(pointer)) {
            hit = { kind: "ceiling", nodeId: d.ceilingId as string };
            break;
          }
        } else if (d.type === "custom-element" && d.placedId) {
          if ((obj as fabric.FabricObject).containsPoint(pointer)) {
            hit = { kind: "custom", nodeId: d.placedId as string };
            break;
          }
        } else if (d.type === "custom-element-label" && d.pceId) {
          if ((obj as fabric.FabricObject).containsPoint(pointer)) {
            hit = { kind: "custom", nodeId: d.pceId as string };
            break;
          }
        }
        // Skip: rotation-handle, resize-handle, opening, grid, dimension labels
      }

      if (hit) {
        useUIStore.getState().openContextMenu(hit.kind, hit.nodeId, {
          x: e.clientX,
          y: e.clientY,
        });
      } else {
        // Empty canvas — preventDefault already called above
        useUIStore.getState().openContextMenu("empty", null, {
          x: e.clientX,
          y: e.clientY,
        });
      }
    };

    wrapper.addEventListener("mousedown", onRightClick);
    return () => wrapper.removeEventListener("mousedown", onRightClick);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Undo/redo keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          useCADStore.getState().redo();
        } else {
          useCADStore.getState().undo();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const cursorClass =
    activeTool === "wall" || activeTool === "product" ||
    activeTool === "door" || activeTool === "window" ||
    activeTool === "archway" || activeTool === "passthrough" || activeTool === "niche"
      ? "cursor-crosshair"
      : "";

  let overlayStyle: React.CSSProperties | null = null;
  if (editingWallId) {
    const wall = getActiveRoomDoc()?.walls[editingWallId];
    const wrapper = wrapperRef.current;
    if (wall && wrapper) {
      const rect = wrapper.getBoundingClientRect();
      const { userZoom, panOffset } = useUIStore.getState();
      const { scale, origin } = getViewTransform(
        room.width, room.length, rect.width, rect.height, userZoom, panOffset
      );
      const label = computeLabelPx(wall, scale, origin);
      overlayStyle = {
        position: "absolute",
        left: label.x - 48,
        top: label.y - 10,
        width: 96,
        height: 20,
        zIndex: 10,
      };
    }
  }

  let wainscotOverlayStyle: React.CSSProperties | null = null;
  if (wainscotEditWallId) {
    const wall = getActiveRoomDoc()?.walls[wainscotEditWallId];
    const wrapper = wrapperRef.current;
    if (wall && wrapper) {
      const rect = wrapper.getBoundingClientRect();
      const { userZoom, panOffset } = useUIStore.getState();
      const { scale, origin } = getViewTransform(
        room.width, room.length, rect.width, rect.height, userZoom, panOffset
      );
      const label = computeLabelPx(wall, scale, origin);
      wainscotOverlayStyle = {
        position: "absolute",
        left: label.x - 90,
        top: label.y + 16,
        zIndex: 20,
      };
    }
  }

  function commitEdit() {
    if (!editingWallId) return;
    const parsed = validateInput(pendingValue);
    if (parsed !== null) {
      useCADStore.getState().resizeWallByLabel(editingWallId, parsed);
    }
    setEditingWallId(null);
    setPendingValue("");
  }

  function cancelEdit() {
    setEditingWallId(null);
    setPendingValue("");
  }

  return (
    <div ref={wrapperRef} className={`relative w-full h-full overflow-hidden ${cursorClass}`}>
      <canvas ref={canvasElRef} />
      {overlayStyle && (
        <input
          type="text"
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          value={pendingValue}
          onChange={(e) => setPendingValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commitEdit(); }
            if (e.key === "Escape") { e.preventDefault(); cancelEdit(); }
          }}
          style={overlayStyle}
          className="font-mono text-[11px] bg-obsidian-high text-accent-light border border-accent px-1 outline-none"
          data-testid="dimension-edit-input"
        />
      )}
      {wainscotOverlayStyle && wainscotEditWallId && (
        <WainscotPopover
          wallId={wainscotEditWallId}
          side={wainscotEditSide}
          style={wainscotOverlayStyle}
          onClose={() => setWainscotEditWallId(null)}
        />
      )}
      {/* Phase 33 GH #85 — floating toolbar anchors to selection bbox (D-10/D-12). */}
      <FloatingSelectionToolbar fc={fcRef.current} wrapperRef={wrapperRef} />
      {/* Phase 33 GH #86 — persistent gesture hint chip (2D variant). */}
      <GestureChip mode="2d" />
    </div>
  );
}

function isInput(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

function activateCurrentTool(
  fc: fabric.Canvas,
  tool: string,
  scale: number,
  origin: { x: number; y: number }
): (() => void) | null {
  switch (tool) {
    case "select":  return activateSelectTool(fc, scale, origin);
    case "wall":    return activateWallTool(fc, scale, origin);
    case "product": return activateProductTool(fc, scale, origin);
    case "door":    return activateDoorTool(fc, scale, origin);
    case "window":  return activateWindowTool(fc, scale, origin);
    case "ceiling": return activateCeilingTool(fc, scale, origin);
    // Phase 61 OPEN-01 (D-09)
    case "archway":     return activateArchwayTool(fc, scale, origin);
    case "passthrough": return activatePassthroughTool(fc, scale, origin);
    case "niche":       return activateNicheTool(fc, scale, origin);
    default:        return null;
  }
}
