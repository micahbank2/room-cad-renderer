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
  useActiveStairs,
  useActiveColumns,
  getActiveRoomDoc,
} from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { useTheme } from "@/hooks/useTheme";
import { getCanvasTheme } from "./canvasTheme";
import { drawGrid } from "./grid";
import { drawRoomDimensions } from "./dimensions";
import { renderWalls, renderProducts, renderCeilings, renderCustomElements, renderStairs, renderColumns, renderMeasureLines, renderAnnotations, renderRoomAreaOverlay, renderFloor, setLabelLookupCanvas, setFabricSyncTheme } from "./fabricSync";
import { useMaterials } from "@/hooks/useMaterials";
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
import { activateStairTool, setStairToolLibrary } from "./tools/stairTool";
// Phase 86 COL-01 (D-01): column placement tool.
import { activateColumnTool } from "./tools/columnTool";
// Phase 61 OPEN-01 (D-09): three new wall-cutout placement tools.
import { activateArchwayTool } from "./tools/archwayTool";
import { activatePassthroughTool } from "./tools/passthroughTool";
import { activateNicheTool } from "./tools/nicheTool";
// Phase 62 MEASURE-01 (D-05, D-07): measurement + annotation tools.
import { activateMeasureTool } from "./tools/measureTool";
import { activateLabelTool } from "./tools/labelTool";
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
  // Phase 62 MEASURE-01 — local draft for annotation overlay editor.
  const [pendingAnnotationText, setPendingAnnotationText] = useState<string>("");
  const annotationOriginalRef = useRef<string>("");
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
  const stairs = useActiveStairs();
  // Phase 86 COL-01: per-room columns subscription for redraw.
  const columns = useActiveColumns();
  // Phase 62 MEASURE-01 — subscribe to per-room measure/annotation maps so redraw fires.
  const measureLines = activeDoc?.measureLines ?? {};
  const annotations = activeDoc?.annotations ?? {};
  const hiddenIds = useUIStore((s) => s.hiddenIds);
  // Phase 81 Plan 02 (D-02): tree row hover → accent-purple outline in 2D.
  const hoveredEntityId = useUIStore((s) => s.hoveredEntityId);
  // Phase 68 Plan 05 — Material catalog feeds renderFloor + renderWalls
  // for D-03 surface-material resolution (paint colorHex / textured Pattern).
  const { materials } = useMaterials();
  const activeTool = useUIStore((s) => s.activeTool);
  const editingAnnotationId = useUIStore((s) => s.editingAnnotationId);
  const selectedIds = useUIStore((s) => s.selectedIds);
  const showGrid = useUIStore((s) => s.showGrid);
  const userZoom = useUIStore((s) => s.userZoom);
  const panOffset = useUIStore((s) => s.panOffset);
  // Phase 88 D-04: theme subscription. Flipping Settings → Light/Dark updates
  // resolved → adds it to redraw deps → forces a redraw with fresh CSS-token
  // values pulled via getCanvasTheme().
  const { resolved } = useTheme();

  // Phase 90 D-03 (#201): observe <html class="dark"> attribute mutations
  // directly. Each useTheme() call has its OWN useState — SettingsPopover's
  // useTheme drives the class write, but THIS component's `resolved` never
  // changes when the user toggles theme from elsewhere. MutationObserver on
  // <html>.class is the single source of truth.
  //
  // Inside the observer callback we rAF-defer the canvas write so we run AFTER
  // the class attribute has flushed and CSS-token resolution returns the new
  // theme's values. Direct fc.backgroundColor write (NOT a full redraw()) to
  // avoid interrupting selectTool drag transactions.
  //
  // Also seed the initial value on mount (in case the boot bridge wrote .dark
  // before React mounted but FabricCanvas's initial redraw raced ahead).
  useEffect(() => {
    let raf = 0;
    const applyThemeToCanvas = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const fc = fcRef.current;
        if (!fc) return;
        const theme = getCanvasTheme();
        setFabricSyncTheme(theme);
        fc.backgroundColor = theme.background;
        fc.renderAll();
      });
    };
    // Seed once on mount.
    applyThemeToCanvas();
    // Observe the <html> class attribute — that's where useTheme writes "dark".
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "attributes" && m.attributeName === "class") {
          applyThemeToCanvas();
          break;
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  // Keep select tool's product library reference up to date
  useEffect(() => {
    setSelectToolProductLibrary(productLibrary);
    // Phase 30 — product tool needs the library too to resolve the
    // pending product's bbox for smart-snap.
    setProductToolLibrary(productLibrary);
    // Phase 60 — stair tool consumes the same snap scene (research Q2);
    // buildSceneGeometry needs productLibrary to resolve product bboxes.
    setStairToolLibrary(productLibrary);
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
    // Phase 88 D-04: read CSS tokens fresh per redraw (no module cache —
    // CLAUDE.md StrictMode rule). Thread theme into fabricSync via a
    // per-frame setter so internal helpers don't need signature changes.
    const canvasTheme = getCanvasTheme();
    setFabricSyncTheme(canvasTheme);
    fc.backgroundColor = canvasTheme.background;

    // Phase 88 — test-mode driver for e2e canvas-bg probe.
    if (import.meta.env.MODE === "test") {
      (window as unknown as { __driveGetCanvasBg?: () => string }).__driveGetCanvasBg =
        () => fc.backgroundColor as string;
    }

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
    drawGrid(fc, room.width, room.length, scale, origin, showGrid, canvasTheme);

    // 2. Room dimension labels
    drawRoomDimensions(fc, room.width, room.length, scale, origin, canvasTheme);

    // 3a. Phase 68 Plan 05 — Floor surface (when room.floorMaterialId set).
    //     Rendered before walls so the wall polygons layer above.
    renderFloor(fc, activeDoc, scale, origin, materials);

    // 3. Walls — Phase 68 Plan 05 passes materials + pixelsPerFoot for D-03
    //    per-side Material resolution (paint colorHex / textured Pattern).
    //    Phase 81 Plan 02 (D-02): hoveredEntityId paints accent-purple outline.
    renderWalls(fc, walls, scale, origin, selectedIds, materials, scale, hoveredEntityId);

    // 4. Products — onAssetReady bumps the tick so this redraw re-runs once
    // an async asset (image cache OR Phase 57 GLTF silhouette compute)
    // populates its cache, rebuilding the product Group with the new child.
    // Functional setState avoids stale closures when multiple products
    // finish loading concurrently (D-03).
    // Phase 81 Plan 02 (D-02): hoveredEntityId paints accent-purple outline.
    renderProducts(
      fc,
      placedProducts,
      productLibrary,
      scale,
      origin,
      selectedIds,
      () => setProductImageTick((t) => t + 1),
      hoveredEntityId,
    );

    // 5. Ceilings (translucent overlays)
    renderCeilings(fc, ceilings, scale, origin, selectedIds, hoveredEntityId);

    // 6. Custom elements
    renderCustomElements(fc, placedCustoms, customCatalog, scale, origin, selectedIds, hoveredEntityId);

    // 7. Stairs (Phase 60 STAIRS-01) — render after products + customs so
    //    selection outlines layer above. Skips hidden via Phase 46 cascade.
    renderStairs(fc, stairs, scale, origin, selectedIds, hiddenIds, hoveredEntityId);

    // 7b. Columns (Phase 86 COL-01) — render alongside stairs. Note arg order
    //     matches renderColumns signature (hiddenIds, selectedIds, hoveredId).
    renderColumns(fc, columns, scale, origin, hiddenIds, selectedIds, hoveredEntityId);

    // 8. Phase 62 MEASURE-01 — measure lines + annotations + room-area overlay.
    //    Rendered last so they layer above all geometry.
    renderMeasureLines(fc, measureLines, scale, origin);
    renderAnnotations(fc, annotations, scale, origin, editingAnnotationId);
    renderRoomAreaOverlay(fc, walls, scale, origin);

    // Phase 31 — install __getCustomElementLabel test bridge (test mode only).
    setLabelLookupCanvas(fc);

    fc.renderAll();

    // Re-activate current tool with new scale/origin
    toolCleanupRef.current?.();
    toolCleanupRef.current = activateCurrentTool(fc, activeTool, scale, origin);
    // Hotfix #2 — record the tool we just activated so the next redraw can
    // tell whether activeTool changed (affects the drag short-circuit above).
    prevActiveToolRef.current = activeTool as ToolType;
  }, [room, walls, placedProducts, productLibrary, activeTool, selectedIds, showGrid, userZoom, panOffset, floorPlanImage, ceilings, placedCustoms, customCatalog, productImageTick, stairs, columns, hiddenIds, measureLines, annotations, editingAnnotationId, materials, activeDoc, hoveredEntityId, resolved]);

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
        // Phase 88 — clean up the canvas-bg probe driver. Identity check not
        // needed (single canvas instance per app lifetime).
        delete (window as unknown as { __driveGetCanvasBg?: () => string }).__driveGetCanvasBg;
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

  // Phase 62 MEASURE-01 — seed annotation editor draft on edit-mode entry.
  useEffect(() => {
    if (!editingAnnotationId) {
      setPendingAnnotationText("");
      annotationOriginalRef.current = "";
      return;
    }
    const doc = getActiveRoomDoc();
    const ann = doc?.annotations?.[editingAnnotationId];
    const initial = ann?.text ?? "";
    setPendingAnnotationText(initial);
    annotationOriginalRef.current = initial;
  }, [editingAnnotationId]);

  // Phase 62 MEASURE-01 — double-click on an annotation re-enters edit mode.
  useEffect(() => {
    const fc = fcRef.current;
    if (!fc) return;
    const onDblClick = (opt: { target?: fabric.FabricObject | null }) => {
      const target = opt.target;
      const data = (target as unknown as { data?: { type?: string; annotationId?: string } } | null)?.data;
      if (data?.type === "annotation" && data.annotationId) {
        useUIStore.getState().setEditingAnnotationId(data.annotationId);
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

      let hit: { kind: import("@/stores/uiStore").ContextMenuKind; nodeId: string; parentId?: string } | null = null;

      for (const obj of fc.getObjects()) {
        const d = (obj as unknown as { data?: Record<string, unknown> }).data;
        if (!d) continue;

        // Phase 62 MEASURE-01 (D-11): measure-line + annotation BEFORE wall —
        // they render on top of geometry and should win the hit-test.
        if (d.type === "measureLine" && d.measureLineId) {
          if ((obj as fabric.FabricObject).containsPoint(pointer)) {
            hit = { kind: "measureLine", nodeId: d.measureLineId as string };
            break;
          }
        } else if (d.type === "annotation" && d.annotationId) {
          if ((obj as fabric.FabricObject).containsPoint(pointer)) {
            hit = { kind: "annotation", nodeId: d.annotationId as string };
            break;
          }
        } else if (d.type === "opening" && d.openingId && d.wallId) {
          // Phase 61 OPEN-01 (D-11'): match openings BEFORE wall — opening
          // polygons render on top of walls and should win the hit-test.
          if ((obj as fabric.FabricObject).containsPoint(pointer)) {
            hit = { kind: "opening", nodeId: d.openingId as string, parentId: d.wallId as string };
            break;
          }
        } else if ((d.type === "wall" || d.type === "wall-side" || d.type === "wall-limewash") && d.wallId) {
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
        } else if (d.type === "stair" && d.stairId) {
          // Phase 60 STAIRS-01: right-click on a stair Group opens the
          // 6-action menu (Phase 53 D-11 + research Q5).
          if ((obj as fabric.FabricObject).containsPoint(pointer)) {
            hit = { kind: "stair", nodeId: d.stairId as string };
            break;
          }
        } else if (d.type === "column" && d.columnId) {
          // Phase 86 COL-01: right-click on a column Group opens the context menu.
          if ((obj as fabric.FabricObject).containsPoint(pointer)) {
            hit = { kind: "column", nodeId: d.columnId as string };
            break;
          }
        }
        // Skip: rotation-handle, resize-handle, grid, dimension labels,
        //       stair-preview (evented:false anyway).
        //       Phase 61 D-11': openings ARE now hit-tested (no longer in skip list).
      }

      if (hit) {
        useUIStore.getState().openContextMenu(hit.kind, hit.nodeId, {
          x: e.clientX,
          y: e.clientY,
        }, hit.parentId);
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
    activeTool === "stair" || activeTool === "column" ||
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

  // Phase 62 MEASURE-01 (D-07): annotation DOM overlay edit mode.
  // Mirror wall-dim editor pattern (FabricCanvas.tsx:574-650). Use a raw
  // <input> instead of InlineEditableText so we can implement empty-text
  // removal (D-07 + research pitfall 3) — the InlineEditableText primitive
  // hard-cancels on empty commit, which doesn't match our spec.
  let annotationOverlayStyle: React.CSSProperties | null = null;
  let editingAnnotation: import("@/types/cad").Annotation | null = null;
  if (editingAnnotationId) {
    const doc = getActiveRoomDoc();
    const ann = doc?.annotations?.[editingAnnotationId];
    const wrapper = wrapperRef.current;
    if (ann && wrapper) {
      const rect = wrapper.getBoundingClientRect();
      const { userZoom, panOffset } = useUIStore.getState();
      const { scale, origin } = getViewTransform(
        room.width, room.length, rect.width, rect.height, userZoom, panOffset
      );
      const screenX = origin.x + ann.position.x * scale;
      const screenY = origin.y + ann.position.y * scale;
      annotationOverlayStyle = {
        position: "absolute",
        left: screenX - 70,
        top: screenY - 12,
        width: 140,
        height: 24,
        zIndex: 30, // above wainscot popover (20) and dimension input (10)
      };
      editingAnnotation = ann;
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

  // Phase 62 MEASURE-01 (D-07 + research pitfall 3): commit/cancel for annotation.
  // - Empty commit removes the annotation (whether just-placed or pre-existing).
  // - Non-empty commit updates the text (single history entry via updateAnnotation).
  // - Escape reverts to original; if original was empty (just-placed), removes it.
  function commitAnnotation() {
    const id = useUIStore.getState().editingAnnotationId;
    const roomId = useCADStore.getState().activeRoomId;
    if (!id || !roomId) {
      useUIStore.getState().setEditingAnnotationId(null);
      return;
    }
    const trimmed = pendingAnnotationText.trim();
    if (trimmed === "") {
      // Empty commit → remove annotation (D-07).
      useCADStore.getState().removeAnnotation(roomId, id);
    } else {
      useCADStore.getState().updateAnnotation(roomId, id, { text: trimmed });
    }
    useUIStore.getState().setEditingAnnotationId(null);
  }

  function cancelAnnotation() {
    const id = useUIStore.getState().editingAnnotationId;
    const roomId = useCADStore.getState().activeRoomId;
    if (id && roomId && annotationOriginalRef.current === "") {
      // Just-placed annotation cancelled with empty original → remove it.
      useCADStore.getState().removeAnnotation(roomId, id);
    } else if (id && roomId) {
      // Existing annotation: revert live-preview to original text.
      useCADStore.getState().updateAnnotationNoHistory(roomId, id, {
        text: annotationOriginalRef.current,
      });
    }
    useUIStore.getState().setEditingAnnotationId(null);
  }

  return (
    // Phase 90 D-04 (#202): h-[calc(100%-13rem)] reserves 208px below the
    // canvas wrapper for the FloatingToolbar (fixed bottom-6 [24px] + ~180px
    // actual height after Phase 83 redesign banded the toolbar into labeled
    // groups + ~4px breathing). The Phase 90 research undercounted at ~80px;
    // measured live height at h=1600 viewport is ~178px.
    //
    // Why height shrink and not pb-* padding: Fabric reads
    // wrapper.getBoundingClientRect() inside redraw() — padding is INCLUDED in
    // the rect, so pb-* would NOT actually shrink the canvas surface.
    //
    // Bumping toolbar height in src/components/FloatingToolbar.tsx
    // (the <div data-testid="floating-toolbar"> at ~L161) requires re-tuning
    // this offset.
    <div ref={wrapperRef} className={`relative w-full h-[calc(100%-13rem)] overflow-hidden ${cursorClass}`}>
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
          className="font-mono text-[11px] bg-accent text-foreground border border-accent px-1 outline-none"
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
      {/* Phase 62 MEASURE-01 (D-07): annotation DOM overlay edit. */}
      {annotationOverlayStyle && editingAnnotation && (
        <input
          type="text"
          autoFocus
          maxLength={200}
          onFocus={(e) => e.currentTarget.select()}
          value={pendingAnnotationText}
          onChange={(e) => {
            const v = e.target.value;
            setPendingAnnotationText(v);
            const id = useUIStore.getState().editingAnnotationId;
            const roomId = useCADStore.getState().activeRoomId;
            if (id && roomId) {
              useCADStore.getState().updateAnnotationNoHistory(roomId, id, { text: v });
            }
          }}
          onBlur={commitAnnotation}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commitAnnotation(); }
            if (e.key === "Escape") { e.preventDefault(); cancelAnnotation(); }
          }}
          style={annotationOverlayStyle}
          className="font-mono text-[12px] bg-card text-foreground border border-accent px-1 outline-none rounded-sm"
          data-testid={`annotation-edit-${editingAnnotation.id}`}
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
    case "stair":       return activateStairTool(fc, scale, origin);
    // Phase 86 COL-01
    case "column":      return activateColumnTool(fc, scale, origin);
    // Phase 61 OPEN-01 (D-09)
    case "archway":     return activateArchwayTool(fc, scale, origin);
    case "passthrough": return activatePassthroughTool(fc, scale, origin);
    case "niche":       return activateNicheTool(fc, scale, origin);
    // Phase 62 MEASURE-01 (D-05, D-07)
    case "measure":     return activateMeasureTool(fc, scale, origin);
    case "label":       return activateLabelTool(fc, scale, origin);
    default:        return null;
  }
}
