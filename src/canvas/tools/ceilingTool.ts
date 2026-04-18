import * as fabric from "fabric";
import { useCADStore, getActiveRoomDoc } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { snapPoint } from "@/lib/geometry";
import { pxToFeet } from "./toolUtils";
import type { Point } from "@/types/cad";

interface CeilingToolState {
  points: Point[];
  previewLine: fabric.Line | null;
  vertexMarkers: fabric.Circle[];
  closingEdge: fabric.Line | null;
}

const state: CeilingToolState = {
  points: [],
  previewLine: null,
  vertexMarkers: [],
  closingEdge: null,
};

/** Hit-test if pointer is close to the first vertex — user is trying to close. */
function nearFirstVertex(feet: Point, first: Point, scale: number): boolean {
  const HIT_RADIUS_FT = 0.75;
  const dx = feet.x - first.x;
  const dy = feet.y - first.y;
  void scale;
  return Math.sqrt(dx * dx + dy * dy) <= HIT_RADIUS_FT;
}

export function activateCeilingTool(
  fc: fabric.Canvas,
  scale: number,
  origin: { x: number; y: number },
) {
  deactivateCeilingTool(fc);

  const onMouseDown = (opt: fabric.TEvent) => {
    const pointer = fc.getViewportPoint(opt.e);
    const gridSnap = useUIStore.getState().gridSnap;
    const feet = pxToFeet(pointer, origin, scale);
    const snapped = gridSnap > 0 ? snapPoint(feet, gridSnap) : feet;

    // If >= 3 points and user clicked near the first, close the polygon
    if (state.points.length >= 3 && nearFirstVertex(snapped, state.points[0], scale)) {
      commitCeiling(fc);
      return;
    }

    state.points.push(snapped);

    const vx = origin.x + snapped.x * scale;
    const vy = origin.y + snapped.y * scale;
    const marker = new fabric.Circle({
      left: vx,
      top: vy,
      radius: 5,
      fill: "#7c5bf0",
      originX: "center",
      originY: "center",
      selectable: false,
      evented: false,
    });
    state.vertexMarkers.push(marker);
    fc.add(marker);

    // Solidify edges between placed points
    if (state.points.length >= 2) {
      const prev = state.points[state.points.length - 2];
      const px = origin.x + prev.x * scale;
      const py = origin.y + prev.y * scale;
      fc.add(
        new fabric.Line([px, py, vx, vy], {
          stroke: "#7c5bf0",
          strokeWidth: 2,
          selectable: false,
          evented: false,
          data: { type: "ceiling-edge-preview" },
        }),
      );
    }
    fc.renderAll();
  };

  const onMouseMove = (opt: fabric.TEvent) => {
    if (state.points.length === 0) return;
    const pointer = fc.getViewportPoint(opt.e);
    const gridSnap = useUIStore.getState().gridSnap;
    const feet = pxToFeet(pointer, origin, scale);
    const snapped = gridSnap > 0 ? snapPoint(feet, gridSnap) : feet;

    const last = state.points[state.points.length - 1];
    const sx = origin.x + last.x * scale;
    const sy = origin.y + last.y * scale;
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

    // Show dashed closing edge back to first vertex when >= 2 points placed
    if (state.points.length >= 2) {
      const first = state.points[0];
      const fx = origin.x + first.x * scale;
      const fy = origin.y + first.y * scale;
      if (state.closingEdge) {
        state.closingEdge.set({ x1: ex, y1: ey, x2: fx, y2: fy });
      } else {
        state.closingEdge = new fabric.Line([ex, ey, fx, fy], {
          stroke: "#7c5bf0",
          strokeWidth: 1,
          strokeDashArray: [3, 3],
          opacity: 0.5,
          selectable: false,
          evented: false,
        });
        fc.add(state.closingEdge);
      }
    }

    fc.renderAll();
  };

  const onDblClick = () => {
    if (state.points.length >= 3) commitCeiling(fc);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && state.points.length >= 3) commitCeiling(fc);
    if (e.key === "Escape") {
      cleanup(fc);
      useUIStore.getState().setTool("select");
    }
  };

  fc.on("mouse:down", onMouseDown);
  fc.on("mouse:move", onMouseMove);
  fc.on("mouse:dblclick", onDblClick);
  document.addEventListener("keydown", onKeyDown);

  (fc as any).__ceilingToolCleanup = () => {
    fc.off("mouse:down", onMouseDown);
    fc.off("mouse:move", onMouseMove);
    fc.off("mouse:dblclick", onDblClick);
    document.removeEventListener("keydown", onKeyDown);
    cleanup(fc);
  };
}

function commitCeiling(fc: fabric.Canvas) {
  if (state.points.length < 3) return;
  const doc = getActiveRoomDoc();
  const height = doc?.room.wallHeight ?? 8;
  useCADStore.getState().addCeiling(state.points.slice(), height);
  cleanup(fc);
  // Auto-revert to Select after placing
  useUIStore.getState().setTool("select");
}

function cleanup(fc: fabric.Canvas) {
  if (state.previewLine) {
    fc.remove(state.previewLine);
    state.previewLine = null;
  }
  if (state.closingEdge) {
    fc.remove(state.closingEdge);
    state.closingEdge = null;
  }
  for (const m of state.vertexMarkers) fc.remove(m);
  state.vertexMarkers = [];
  // Remove edge previews tagged with data.type=ceiling-edge-preview
  const toRemove = fc.getObjects().filter(
    (o: any) => o.data?.type === "ceiling-edge-preview",
  );
  for (const o of toRemove) fc.remove(o);
  state.points = [];
  fc.renderAll();
}

export function deactivateCeilingTool(fc: fabric.Canvas) {
  const fn = (fc as any).__ceilingToolCleanup;
  if (fn) {
    fn();
    delete (fc as any).__ceilingToolCleanup;
  }
}
