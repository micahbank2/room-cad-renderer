import * as fabric from "fabric";
import { useCADStore, getActiveRoomDoc } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { snapPoint } from "@/lib/geometry";
import { pxToFeet } from "./toolUtils";
import type { Point } from "@/types/cad";

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
): () => void {
  let points: Point[] = [];
  let previewLine: fabric.Line | null = null;
  let vertexMarkers: fabric.Circle[] = [];
  let closingEdge: fabric.Line | null = null;

  const cleanup = () => {
    if (previewLine) {
      fc.remove(previewLine);
      previewLine = null;
    }
    if (closingEdge) {
      fc.remove(closingEdge);
      closingEdge = null;
    }
    for (const m of vertexMarkers) fc.remove(m);
    vertexMarkers = [];
    // Remove edge previews tagged with data.type=ceiling-edge-preview
    const toRemove = fc.getObjects().filter(
      (o: any) => o.data?.type === "ceiling-edge-preview",
    );
    for (const o of toRemove) fc.remove(o);
    points = [];
    fc.renderAll();
  };

  const commitCeiling = () => {
    if (points.length < 3) return;
    const doc = getActiveRoomDoc();
    const height = doc?.room.wallHeight ?? 8;
    useCADStore.getState().addCeiling(points.slice(), height);
    cleanup();
    // Auto-revert to Select after placing
    useUIStore.getState().setTool("select");
  };

  const onMouseDown = (opt: fabric.TEvent) => {
    const pointer = fc.getViewportPoint(opt.e);
    const gridSnap = useUIStore.getState().gridSnap;
    const feet = pxToFeet(pointer, origin, scale);
    const snapped = gridSnap > 0 ? snapPoint(feet, gridSnap) : feet;

    // If >= 3 points and user clicked near the first, close the polygon
    if (points.length >= 3 && nearFirstVertex(snapped, points[0], scale)) {
      commitCeiling();
      return;
    }

    points.push(snapped);

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
    vertexMarkers.push(marker);
    fc.add(marker);

    // Solidify edges between placed points
    if (points.length >= 2) {
      const prev = points[points.length - 2];
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
    if (points.length === 0) return;
    const pointer = fc.getViewportPoint(opt.e);
    const gridSnap = useUIStore.getState().gridSnap;
    const feet = pxToFeet(pointer, origin, scale);
    const snapped = gridSnap > 0 ? snapPoint(feet, gridSnap) : feet;

    const last = points[points.length - 1];
    const sx = origin.x + last.x * scale;
    const sy = origin.y + last.y * scale;
    const ex = origin.x + snapped.x * scale;
    const ey = origin.y + snapped.y * scale;

    if (previewLine) {
      previewLine.set({ x1: sx, y1: sy, x2: ex, y2: ey });
    } else {
      previewLine = new fabric.Line([sx, sy, ex, ey], {
        stroke: "#7c5bf0",
        strokeWidth: 2,
        strokeDashArray: [6, 4],
        selectable: false,
        evented: false,
      });
      fc.add(previewLine);
    }

    // Show dashed closing edge back to first vertex when >= 2 points placed
    if (points.length >= 2) {
      const first = points[0];
      const fx = origin.x + first.x * scale;
      const fy = origin.y + first.y * scale;
      if (closingEdge) {
        closingEdge.set({ x1: ex, y1: ey, x2: fx, y2: fy });
      } else {
        closingEdge = new fabric.Line([ex, ey, fx, fy], {
          stroke: "#7c5bf0",
          strokeWidth: 1,
          strokeDashArray: [3, 3],
          opacity: 0.5,
          selectable: false,
          evented: false,
        });
        fc.add(closingEdge);
      }
    }

    fc.renderAll();
  };

  const onDblClick = () => {
    if (points.length >= 3) commitCeiling();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && points.length >= 3) commitCeiling();
    if (e.key === "Escape") {
      cleanup();
      useUIStore.getState().setTool("select");
    }
  };

  fc.on("mouse:down", onMouseDown);
  fc.on("mouse:move", onMouseMove);
  fc.on("mouse:dblclick", onDblClick);
  document.addEventListener("keydown", onKeyDown);

  return () => {
    fc.off("mouse:down", onMouseDown);
    fc.off("mouse:move", onMouseMove);
    fc.off("mouse:dblclick", onDblClick);
    document.removeEventListener("keydown", onKeyDown);
    cleanup();
  };
}
