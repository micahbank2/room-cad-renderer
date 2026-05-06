// src/canvas/tools/passthroughTool.ts
// Phase 61 OPEN-01 (D-09): passthrough placement tool. Mirrors doorTool.ts.
// Click on a wall → place a 5ft × wall.height passthrough (full-height
// through-hole, no top frame in 2D).
import * as fabric from "fabric";
import { useCADStore } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { wallLength, angle as wallAngle } from "@/lib/geometry";
import { pxToFeet, findClosestWall } from "./toolUtils";
import { getOpeningDefaults } from "@/types/cad";
import type { WallSegment } from "@/types/cad";

const PASSTHROUGH_WIDTH = 5;

export function activatePassthroughTool(
  fc: fabric.Canvas,
  scale: number,
  origin: { x: number; y: number },
): () => void {
  let previewPolygon: fabric.Polygon | null = null;

  const updatePreview = (hit: { wall: WallSegment; offset: number } | null) => {
    if (!hit) {
      if (previewPolygon) {
        fc.remove(previewPolygon);
        previewPolygon = null;
        fc.renderAll();
      }
      return;
    }
    const len = wallLength(hit.wall);
    const half = PASSTHROUGH_WIDTH / 2;
    const clampedOffset = Math.max(half, Math.min(len - half, hit.offset));
    const startOffset = clampedOffset - half;
    const endOffset = clampedOffset + half;
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
    if (previewPolygon) fc.remove(previewPolygon);
    previewPolygon = new fabric.Polygon(pts, {
      fill: "rgba(124,91,240,0.12)",
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
    const hit = findClosestWall(feet, PASSTHROUGH_WIDTH);
    updatePreview(hit);
  };

  const onMouseDown = (opt: fabric.TEvent) => {
    const pointer = fc.getViewportPoint(opt.e);
    const feet = pxToFeet(pointer, origin, scale);
    const hit = findClosestWall(feet, PASSTHROUGH_WIDTH);
    if (hit) {
      // Read live wall.height so passthrough fills the full wall vertically.
      const defaults = getOpeningDefaults("passthrough", hit.wall.height);
      const len = wallLength(hit.wall);
      const half = defaults.width / 2;
      const clampedOffset = Math.max(half, Math.min(len - half, hit.offset));
      useCADStore.getState().addOpening(hit.wall.id, {
        type: "passthrough",
        offset: clampedOffset - half,
        width: defaults.width,
        height: defaults.height,
        sillHeight: defaults.sillHeight,
      });
      clearPreview();
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
