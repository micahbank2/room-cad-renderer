import * as fabric from "fabric";
import { useCADStore } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { wallLength, angle as wallAngle } from "@/lib/geometry";
import { pxToFeet, findClosestWall } from "./toolUtils";
import type { WallSegment } from "@/types/cad";

const WINDOW_WIDTH = 3;

export function activateWindowTool(
  fc: fabric.Canvas,
  scale: number,
  origin: { x: number; y: number },
): () => void {
  let previewPolygon: fabric.Polygon | null = null;

  const updatePreview = (
    hit: { wall: WallSegment; offset: number } | null,
  ) => {
    if (!hit) {
      if (previewPolygon) {
        fc.remove(previewPolygon);
        previewPolygon = null;
        fc.renderAll();
      }
      return;
    }
    const len = wallLength(hit.wall);
    const halfWin = WINDOW_WIDTH / 2;
    const clampedOffset = Math.max(halfWin, Math.min(len - halfWin, hit.offset));
    const startOffset = clampedOffset - halfWin;
    const endOffset = clampedOffset + halfWin;
    const tStart = startOffset / len;
    const tEnd = endOffset / len;
    const dx = hit.wall.end.x - hit.wall.start.x;
    const dy = hit.wall.end.y - hit.wall.start.y;
    const oStart = { x: hit.wall.start.x + dx * tStart, y: hit.wall.start.y + dy * tStart };
    const oEnd = { x: hit.wall.start.x + dx * tEnd, y: hit.wall.start.y + dy * tEnd };
    const a = wallAngle(hit.wall.start, hit.wall.end);
    const perpAngle = a + Math.PI / 2;
    const halfT = hit.wall.thickness / 2;
    const pdx = Math.cos(perpAngle) * halfT;
    const pdy = Math.sin(perpAngle) * halfT;

    const pts = [
      { x: origin.x + (oStart.x - pdx) * scale, y: origin.y + (oStart.y - pdy) * scale },
      { x: origin.x + (oStart.x + pdx) * scale, y: origin.y + (oStart.y + pdy) * scale },
      { x: origin.x + (oEnd.x + pdx) * scale, y: origin.y + (oEnd.y + pdy) * scale },
      { x: origin.x + (oEnd.x - pdx) * scale, y: origin.y + (oEnd.y - pdy) * scale },
    ];

    // Recreate the polygon each update — Fabric doesn't recompute polygon
    // bounds when .points is mutated.
    if (previewPolygon) {
      fc.remove(previewPolygon);
    }
    previewPolygon = new fabric.Polygon(pts, {
      fill: "rgba(124,91,240,0.25)",
      stroke: "#ccbeff",
      strokeWidth: 1,
      strokeDashArray: [4, 3],
      selectable: false,
      evented: false,
    });
    fc.add(previewPolygon);
    fc.renderAll();
  };

  const clearPreview = () => {
    if (previewPolygon) {
      fc.remove(previewPolygon);
      previewPolygon = null;
      fc.renderAll();
    }
  };

  const onMouseMove = (opt: fabric.TEvent) => {
    const pointer = fc.getViewportPoint(opt.e);
    const feet = pxToFeet(pointer, origin, scale);
    const hit = findClosestWall(feet, WINDOW_WIDTH);
    updatePreview(hit);
  };

  const onMouseDown = (opt: fabric.TEvent) => {
    const pointer = fc.getViewportPoint(opt.e);
    const feet = pxToFeet(pointer, origin, scale);
    const hit = findClosestWall(feet, WINDOW_WIDTH);

    if (hit) {
      const len = wallLength(hit.wall);
      const halfWin = WINDOW_WIDTH / 2;
      const clampedOffset = Math.max(halfWin, Math.min(len - halfWin, hit.offset));

      useCADStore.getState().addOpening(hit.wall.id, {
        type: "window",
        offset: clampedOffset - halfWin,
        width: WINDOW_WIDTH,
        height: 4, // 4' tall window
        sillHeight: 3, // 3' from floor
      });
      clearPreview();
      // Auto-revert to Select after placing (EDIT-11)
      useUIStore.getState().setTool("select");
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      clearPreview();
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
