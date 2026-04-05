import { useRef, useEffect, useCallback, useState } from "react";
import * as fabric from "fabric";
import {
  useCADStore,
  useActiveRoom,
  useActiveRoomDoc,
  useActiveWalls,
  useActivePlacedProducts,
  getActiveRoomDoc,
} from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { drawGrid } from "./grid";
import { drawRoomDimensions } from "./dimensions";
import { renderWalls, renderProducts } from "./fabricSync";
import { activateWallTool, deactivateWallTool } from "./tools/wallTool";
import { activateSelectTool, deactivateSelectTool, setSelectToolProductLibrary } from "./tools/selectTool";
import { activateProductTool, deactivateProductTool } from "./tools/productTool";
import { activateDoorTool, deactivateDoorTool } from "./tools/doorTool";
import { activateWindowTool, deactivateWindowTool } from "./tools/windowTool";
import { attachDragDropHandlers } from "./dragDrop";
import { computeLabelPx, hitTestDimLabel, validateInput } from "./dimensionEditor";
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
  const [editingWallId, setEditingWallId] = useState<string | null>(null);
  const [pendingValue, setPendingValue] = useState<string>("");

  const room = useActiveRoom() ?? { width: 20, length: 16, wallHeight: 8 };
  const walls = useActiveWalls();
  const placedProducts = useActivePlacedProducts();
  const activeDoc = useActiveRoomDoc();
  const floorPlanImage = activeDoc?.floorPlanImage;
  const activeTool = useUIStore((s) => s.activeTool);
  const selectedIds = useUIStore((s) => s.selectedIds);
  const showGrid = useUIStore((s) => s.showGrid);
  const userZoom = useUIStore((s) => s.userZoom);
  const panOffset = useUIStore((s) => s.panOffset);

  // Keep select tool's product library reference up to date
  useEffect(() => {
    setSelectToolProductLibrary(productLibrary);
  }, [productLibrary]);

  /** Full redraw of the canvas from store state */
  const redraw = useCallback(() => {
    const fc = fcRef.current;
    const wrapper = wrapperRef.current;
    if (!fc || !wrapper) return;

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

    // 4. Products
    renderProducts(fc, placedProducts, productLibrary, scale, origin, selectedIds);

    fc.renderAll();

    // Re-activate current tool with new scale/origin
    deactivateAllTools(fc);
    activateCurrentTool(fc, activeTool, scale, origin);
  }, [room, walls, placedProducts, productLibrary, activeTool, selectedIds, showGrid, userZoom, panOffset, floorPlanImage]);

  // Init canvas
  useEffect(() => {
    if (!canvasElRef.current) return;

    const fc = new fabric.Canvas(canvasElRef.current, {
      selection: false,
      preserveObjectStacking: true,
    });
    fcRef.current = fc;

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
      deactivateAllTools(fc);
      fc.dispose();
      fcRef.current = null;
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
          setPendingValue(currentLen.toFixed(2));
          setEditingWallId(wall.id);
          return;
        }
      }
    };
    fc.on("mouse:dblclick", onDblClick as any);
    return () => { fc.off("mouse:dblclick", onDblClick as any); };
  }, []);

  // Redraw on state changes
  useEffect(() => {
    redraw();
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
    activeTool === "door" || activeTool === "window"
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
        left: label.x - 32,
        top: label.y - 10,
        width: 64,
        height: 20,
        zIndex: 10,
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

function deactivateAllTools(fc: fabric.Canvas) {
  deactivateSelectTool(fc);
  deactivateWallTool(fc);
  deactivateProductTool(fc);
  deactivateDoorTool(fc);
  deactivateWindowTool(fc);
}

function activateCurrentTool(
  fc: fabric.Canvas,
  tool: string,
  scale: number,
  origin: { x: number; y: number }
) {
  switch (tool) {
    case "select":
      activateSelectTool(fc, scale, origin);
      break;
    case "wall":
      activateWallTool(fc, scale, origin);
      break;
    case "product":
      activateProductTool(fc, scale, origin);
      break;
    case "door":
      activateDoorTool(fc, scale, origin);
      break;
    case "window":
      activateWindowTool(fc, scale, origin);
      break;
  }
}
