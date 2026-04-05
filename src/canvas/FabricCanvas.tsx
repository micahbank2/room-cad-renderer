import { useRef, useEffect, useCallback, useState } from "react";
import * as fabric from "fabric";
import { useCADStore } from "@/stores/cadStore";
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

function getScale(roomW: number, roomH: number, canvasW: number, canvasH: number) {
  const pad = 50;
  return Math.min((canvasW - pad * 2) / roomW, (canvasH - pad * 2) / roomH);
}

function getOrigin(roomW: number, roomH: number, scale: number, canvasW: number, canvasH: number) {
  return {
    x: (canvasW - roomW * scale) / 2,
    y: (canvasH - roomH * scale) / 2,
  };
}

export default function FabricCanvas({ productLibrary }: Props) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fcRef = useRef<fabric.Canvas | null>(null);
  const [editingWallId, setEditingWallId] = useState<string | null>(null);
  const [pendingValue, setPendingValue] = useState<string>("");

  const room = useCADStore((s) => s.room);
  const walls = useCADStore((s) => s.walls);
  const placedProducts = useCADStore((s) => s.placedProducts);
  const activeTool = useUIStore((s) => s.activeTool);
  const selectedIds = useUIStore((s) => s.selectedIds);
  const showGrid = useUIStore((s) => s.showGrid);

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

    const scale = getScale(room.width, room.length, cW, cH);
    const origin = getOrigin(room.width, room.length, scale, cW, cH);

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
  }, [room, walls, placedProducts, productLibrary, activeTool, selectedIds, showGrid]);

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
      const r = useCADStore.getState().room;
      const scale = getScale(r.width, r.length, rect.width, rect.height);
      const origin = getOrigin(r.width, r.length, scale, rect.width, rect.height);
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
      const r = useCADStore.getState().room;
      const scale = getScale(r.width, r.length, rect.width, rect.height);
      const origin = getOrigin(r.width, r.length, scale, rect.width, rect.height);
      const storeWalls = useCADStore.getState().walls;
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
    const wall = useCADStore.getState().walls[editingWallId];
    const wrapper = wrapperRef.current;
    if (wall && wrapper) {
      const rect = wrapper.getBoundingClientRect();
      const scale = getScale(room.width, room.length, rect.width, rect.height);
      const origin = getOrigin(room.width, room.length, scale, rect.width, rect.height);
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
