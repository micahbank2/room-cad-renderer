// src/canvas/tools/measureTool.ts
// Phase 62 MEASURE-01 (D-05, D-09): dimension-line placement tool.
//
// Mirrors wallTool.ts:34-232 closure-state pattern verbatim:
//   - First click locks startPoint and renders ghost preview line + label
//   - Second click commits via cadStore.addMeasureLine and auto-reverts to "select"
//   - Mouse-move updates preview line + length label following cursor
//   - Escape clears preview without committing
//   - cleanup return detaches all listeners and disposes preview objects
//
// Snap engine integration (D-09 — consume only):
//   We READ the snap scene (computeSnap output → snap.point) but do NOT modify
//   buildSceneGeometry or snapEngine.ts. Phase 30 files unchanged per D-09 + D-17.

import * as fabric from "fabric";
import { useCADStore } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import {
  computeSnap,
  buildSceneGeometry,
  axisAlignedBBoxOfRotated,
  SNAP_TOLERANCE_PX,
  type SceneGeometry,
} from "@/canvas/snapEngine";
import { renderSnapGuides, clearSnapGuides } from "@/canvas/snapGuides";
import { snapPoint, formatFeet, distance } from "@/lib/geometry";
import { pxToFeet } from "./toolUtils";
import type { Point } from "@/types/cad";

const TEXT_DIM = "#938ea0";
const PILL_BG_LIGHT = "#ffffff";
const FONT_MONO = "IBM Plex Mono, ui-monospace, monospace";

export function activateMeasureTool(
  fc: fabric.Canvas,
  scale: number,
  origin: { x: number; y: number },
): () => void {
  let startPoint: Point | null = null;
  let previewLine: fabric.Line | null = null;
  let previewLabel: fabric.Group | null = null;
  let startMarker: fabric.Circle | null = null;

  // Lazy-cached SceneGeometry — built on first mouse interaction. Invalidated
  // after each placement (D-09b mirror productTool/stairTool).
  let cachedScene: SceneGeometry | null = null;
  const ensureScene = (): SceneGeometry => {
    if (!cachedScene) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customCatalog = (useCADStore.getState() as any).customElements ?? {};
      cachedScene = buildSceneGeometry(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useCADStore.getState() as any,
        "__pending_measure__", // sentinel
        [], // measure tool doesn't need product bboxes for snap — but pass empty so signature matches
        customCatalog,
      );
    }
    return cachedScene;
  };

  const clearPreview = () => {
    if (previewLine) {
      fc.remove(previewLine);
      previewLine = null;
    }
    if (previewLabel) {
      fc.remove(previewLabel);
      previewLabel = null;
    }
    if (startMarker) {
      fc.remove(startMarker);
      startMarker = null;
    }
    clearSnapGuides(fc);
    fc.renderAll();
  };

  /** Snap a single point via Phase 30 computeSnap (zero-size bbox = point snap). */
  const snapCursor = (
    cursorFt: Point,
    altHeld: boolean,
    gridSnap: number,
  ): Point => {
    if (altHeld) {
      // Alt disables smart snap; grid still applies.
      return gridSnap > 0 ? snapPoint(cursorFt, gridSnap) : cursorFt;
    }
    // Zero-area bbox at cursor so computeSnap treats it as a point.
    const bbox = axisAlignedBBoxOfRotated(
      cursorFt,
      0.001,
      0.001,
      0,
      "__pending_measure__",
    );
    const result = computeSnap({
      candidate: { pos: cursorFt, bbox },
      scene: ensureScene(),
      tolerancePx: SNAP_TOLERANCE_PX,
      scale,
      gridSnap,
    });
    renderSnapGuides(fc, result.guides, scale, origin);
    return result.snapped;
  };

  const onMouseDown = (opt: fabric.TEvent) => {
    const e = opt.e as MouseEvent;
    const pointer = fc.getViewportPoint(e);
    const cursor = pxToFeet(pointer, origin, scale);
    const gridSnap = useUIStore.getState().gridSnap;
    const target = snapCursor(cursor, e.altKey, gridSnap);

    if (!startPoint) {
      // First click: lock start.
      startPoint = target;
      startMarker = new fabric.Circle({
        left: origin.x + target.x * scale,
        top: origin.y + target.y * scale,
        radius: 3,
        fill: TEXT_DIM,
        originX: "center",
        originY: "center",
        selectable: false,
        evented: false,
      });
      fc.add(startMarker);
      fc.renderAll();
      return;
    }

    // Second click: commit.
    const roomId = useCADStore.getState().activeRoomId;
    if (roomId) {
      useCADStore.getState().addMeasureLine(roomId, {
        start: startPoint,
        end: target,
      });
    }
    startPoint = null;
    cachedScene = null; // invalidate so next placement sees fresh scene
    clearPreview();
    useUIStore.getState().setTool("select");
  };

  const onMouseMove = (opt: fabric.TEvent) => {
    const e = opt.e as MouseEvent;
    const pointer = fc.getViewportPoint(e);
    const cursor = pxToFeet(pointer, origin, scale);
    const gridSnap = useUIStore.getState().gridSnap;
    const target = snapCursor(cursor, e.altKey, gridSnap);

    if (!startPoint) {
      fc.renderAll();
      return;
    }

    const sx = origin.x + startPoint.x * scale;
    const sy = origin.y + startPoint.y * scale;
    const ex = origin.x + target.x * scale;
    const ey = origin.y + target.y * scale;

    if (previewLine) {
      previewLine.set({ x1: sx, y1: sy, x2: ex, y2: ey });
    } else {
      previewLine = new fabric.Line([sx, sy, ex, ey], {
        stroke: TEXT_DIM,
        strokeWidth: 1,
        strokeDashArray: [4, 4],
        selectable: false,
        evented: false,
      });
      fc.add(previewLine);
    }

    // Live length label at midpoint
    const lenFt = distance(startPoint, target);
    const labelText = formatFeet(lenFt);
    const mx = (sx + ex) / 2;
    const my = (sy + ey) / 2;

    if (previewLabel) {
      // Update existing label position + text.
      previewLabel.set({ left: mx, top: my });
      const textObj = previewLabel.item(1) as fabric.FabricText;
      if (textObj) textObj.set({ text: labelText });
      const bgObj = previewLabel.item(0) as fabric.Rect;
      if (bgObj) bgObj.set({ width: labelText.length * 7 + 8 });
    } else {
      const bg = new fabric.Rect({
        width: labelText.length * 7 + 8,
        height: 14,
        fill: PILL_BG_LIGHT,
        rx: 2,
        ry: 2,
        originX: "center",
        originY: "center",
      });
      const text = new fabric.FabricText(labelText, {
        fontFamily: FONT_MONO,
        fontSize: 11,
        fill: TEXT_DIM,
        originX: "center",
        originY: "center",
      });
      previewLabel = new fabric.Group([bg, text], {
        left: mx,
        top: my,
        originX: "center",
        originY: "center",
        selectable: false,
        evented: false,
      });
      fc.add(previewLabel);
    }

    fc.renderAll();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      startPoint = null;
      clearPreview();
    }
  };

  fc.on("mouse:down", onMouseDown);
  fc.on("mouse:move", onMouseMove);
  document.addEventListener("keydown", onKeyDown);

  return () => {
    fc.off("mouse:down", onMouseDown);
    fc.off("mouse:move", onMouseMove);
    document.removeEventListener("keydown", onKeyDown);
    clearPreview();
  };
}
