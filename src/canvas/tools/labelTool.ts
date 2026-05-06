// src/canvas/tools/labelTool.ts
// Phase 62 MEASURE-01 (D-07): single-click annotation placement tool.
//
// Flow:
//   1. User clicks Label tool → activeTool = "label"
//   2. User clicks canvas → addAnnotation(roomId, {position, text:""})
//   3. setEditingAnnotationId(id) opens DOM overlay edit mode (FabricCanvas.tsx)
//   4. setTool("select") auto-reverts so the next click selects normally
//
// No preview state. The DOM-overlay edit UI is owned by FabricCanvas.tsx,
// which subscribes to uiStore.editingAnnotationId.

import * as fabric from "fabric";
import { useCADStore } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { pxToFeet } from "./toolUtils";

export function activateLabelTool(
  fc: fabric.Canvas,
  scale: number,
  origin: { x: number; y: number },
): () => void {
  const onMouseDown = (opt: fabric.TEvent) => {
    const e = opt.e as MouseEvent;
    const pointer = fc.getViewportPoint(e);
    const position = pxToFeet(pointer, origin, scale);
    const roomId = useCADStore.getState().activeRoomId;
    if (!roomId) return;
    const id = useCADStore.getState().addAnnotation(roomId, {
      position,
      text: "",
    });
    useUIStore.getState().setEditingAnnotationId(id);
    // Auto-revert: D-07 spec — placement is single-click; the next click
    // (in select mode) selects/deselects the just-placed annotation.
    useUIStore.getState().setTool("select");
  };

  fc.on("mouse:down", onMouseDown);
  return () => {
    fc.off("mouse:down", onMouseDown);
  };
}
