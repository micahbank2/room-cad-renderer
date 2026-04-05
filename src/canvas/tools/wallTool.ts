import * as fabric from "fabric";
import { useCADStore } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { snapPoint, constrainOrthogonal } from "@/lib/geometry";
import type { Point } from "@/types/cad";

interface WallToolState {
  startPoint: Point | null;
  previewLine: fabric.Line | null;
  startMarker: fabric.Circle | null;
}

const state: WallToolState = {
  startPoint: null,
  previewLine: null,
  startMarker: null,
};

function pxToFeet(
  px: { x: number; y: number },
  origin: { x: number; y: number },
  scale: number
): Point {
  return {
    x: (px.x - origin.x) / scale,
    y: (px.y - origin.y) / scale,
  };
}

export function activateWallTool(
  fc: fabric.Canvas,
  scale: number,
  origin: { x: number; y: number }
) {
  cleanup(fc);

  const onMouseDown = (opt: fabric.TEvent) => {
    const pointer = fc.getViewportPoint(opt.e);
    const gridSnap = useUIStore.getState().gridSnap;
    const feet = pxToFeet(pointer, origin, scale);
    const snapped = gridSnap > 0 ? snapPoint(feet, gridSnap) : feet;

    if (!state.startPoint) {
      // First click: set start
      state.startPoint = snapped;

      // Visual marker at start
      state.startMarker = new fabric.Circle({
        left: origin.x + snapped.x * scale,
        top: origin.y + snapped.y * scale,
        radius: 4,
        fill: "#7c5bf0",
        originX: "center",
        originY: "center",
        selectable: false,
        evented: false,
      });
      fc.add(state.startMarker);
      fc.renderAll();
    } else {
      // Second click: complete wall
      let endPoint = snapped;

      // Orthogonal constraint if shift held
      if (opt.e instanceof MouseEvent && opt.e.shiftKey) {
        endPoint = constrainOrthogonal(state.startPoint, endPoint);
      }

      useCADStore.getState().addWall(state.startPoint, endPoint);
      cleanup(fc);
    }
  };

  const onMouseMove = (opt: fabric.TEvent) => {
    if (!state.startPoint) return;

    const pointer = fc.getViewportPoint(opt.e);
    const gridSnap = useUIStore.getState().gridSnap;
    const feet = pxToFeet(pointer, origin, scale);
    let snapped = gridSnap > 0 ? snapPoint(feet, gridSnap) : feet;

    if (opt.e instanceof MouseEvent && opt.e.shiftKey) {
      snapped = constrainOrthogonal(state.startPoint, snapped);
    }

    const sx = origin.x + state.startPoint.x * scale;
    const sy = origin.y + state.startPoint.y * scale;
    const ex = origin.x + snapped.x * scale;
    const ey = origin.y + snapped.y * scale;

    if (state.previewLine) {
      state.previewLine.set({ x1: sx, y1: sy, x2: ex, y2: ey });
    } else {
      state.previewLine = new fabric.Line([sx, sy, ex, ey], {
        stroke: "#7c5bf0",
        strokeWidth: 2,
        strokeDashArray: [6, 4],
        selectable: false,
        evented: false,
      });
      fc.add(state.previewLine);
    }
    fc.renderAll();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      cleanup(fc);
    }
  };

  fc.on("mouse:down", onMouseDown);
  fc.on("mouse:move", onMouseMove);
  document.addEventListener("keydown", onKeyDown);

  // Store cleanup refs
  (fc as any).__wallToolCleanup = () => {
    fc.off("mouse:down", onMouseDown);
    fc.off("mouse:move", onMouseMove);
    document.removeEventListener("keydown", onKeyDown);
    cleanup(fc);
  };
}

function cleanup(fc: fabric.Canvas) {
  if (state.previewLine) {
    fc.remove(state.previewLine);
    state.previewLine = null;
  }
  if (state.startMarker) {
    fc.remove(state.startMarker);
    state.startMarker = null;
  }
  state.startPoint = null;
  fc.renderAll();
}

export function deactivateWallTool(fc: fabric.Canvas) {
  const cleanupFn = (fc as any).__wallToolCleanup;
  if (cleanupFn) {
    cleanupFn();
    delete (fc as any).__wallToolCleanup;
  }
}
