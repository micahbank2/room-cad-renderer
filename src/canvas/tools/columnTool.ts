// src/canvas/tools/columnTool.ts
// Phase 86 COL-01 (D-01, D-03, D-05): column placement tool.
//
// Mirrors stairTool.ts but stripped of the bottom-step-center asymmetry:
// Column.position IS the footprint center (= bbox center) so no UP-axis
// translation is needed. We click-to-place at the snapped cursor position
// with the toolbar-set widthFt/depthFt/heightFt/rotation.
//
// D-07 public-API exception: module-level pendingColumnConfig with
// setPendingColumn/getPendingColumn bridge (mirror productTool +
// stairTool pendingX pattern).
//
// After placement: per Phase 60 precedent, auto-switch back to "select".

import * as fabric from "fabric";
import { useCADStore } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { snapPoint } from "@/lib/geometry";
import { pxToFeet } from "./toolUtils";
import type { Point } from "@/types/cad";
import { buildColumnSymbolShapes } from "@/canvas/columnSymbol";

/** Toolbar-set pending column config. D-07 public-API exception. */
export interface PendingColumnConfig {
  widthFt: number;
  depthFt: number;
  heightFt: number;
  rotation: number;
  shape: "box";
}

let pendingColumnConfig: PendingColumnConfig | null = null;

export function setPendingColumn(cfg: PendingColumnConfig | null): void {
  pendingColumnConfig = cfg;
}

export function getPendingColumn(): PendingColumnConfig | null {
  return pendingColumnConfig;
}

export function activateColumnTool(
  fc: fabric.Canvas,
  scale: number,
  origin: { x: number; y: number },
): () => void {
  let previewGroup: fabric.Group | null = null;

  const clearPreview = () => {
    if (previewGroup) {
      fc.remove(previewGroup);
      previewGroup = null;
    }
  };

  const drawPreview = (positionFt: Point) => {
    clearPreview();
    if (!pendingColumnConfig) return;
    const cfg = pendingColumnConfig;
    // Synthesize a Column-shaped object for the symbol builder.
    const previewColumn = {
      id: "__preview__",
      position: positionFt,
      widthFt: cfg.widthFt,
      depthFt: cfg.depthFt,
      heightFt: cfg.heightFt,
      rotation: cfg.rotation,
      shape: cfg.shape,
    } as Parameters<typeof buildColumnSymbolShapes>[0];
    const children = buildColumnSymbolShapes(previewColumn, scale, origin, false);
    const cx = origin.x + positionFt.x * scale;
    const cy = origin.y + positionFt.y * scale;
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
      data: { type: "column-preview" } as any,
    });
    fc.add(previewGroup);
    fc.requestRenderAll();
  };

  const onMouseMove = (opt: fabric.TEvent) => {
    if (!pendingColumnConfig) return;
    const pointer = fc.getViewportPoint(opt.e);
    const feet = pxToFeet(pointer, origin, scale);

    let shiftHeld = false;
    if (opt.e instanceof MouseEvent) {
      shiftHeld = opt.e.shiftKey === true;
    }

    // D-02 Shift-snap rotation to 15° increments while previewing (mirror Stair).
    if (shiftHeld) {
      pendingColumnConfig.rotation =
        Math.round(pendingColumnConfig.rotation / 15) * 15;
    }

    const gridSnap = useUIStore.getState().gridSnap;
    const snapped = gridSnap > 0 ? snapPoint(feet, gridSnap) : feet;
    drawPreview(snapped);
  };

  const onMouseDown = (opt: fabric.TEvent) => {
    if (!pendingColumnConfig) return;
    const pointer = fc.getViewportPoint(opt.e);
    const feet = pxToFeet(pointer, origin, scale);
    const gridSnap = useUIStore.getState().gridSnap;
    const snapped = gridSnap > 0 ? snapPoint(feet, gridSnap) : feet;

    clearPreview();

    const cad = useCADStore.getState();
    const roomId = cad.activeRoomId;
    if (!roomId) return;

    const cfg = pendingColumnConfig;
    cad.addColumn(roomId, {
      position: snapped,
      widthFt: cfg.widthFt,
      depthFt: cfg.depthFt,
      heightFt: cfg.heightFt,
      rotation: cfg.rotation,
      shape: cfg.shape,
    });

    // Phase 60 precedent: after placement, switch back to select tool.
    useUIStore.getState().setTool("select");
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      clearPreview();
      pendingColumnConfig = null;
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
  };
}
