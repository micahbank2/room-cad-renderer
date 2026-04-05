import * as fabric from "fabric";
import { useCADStore, getActiveRoomDoc } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { closestPointOnWall, distance, wallLength, angle as wallAngle } from "@/lib/geometry";
import type { Point, WallSegment } from "@/types/cad";

const SNAP_THRESHOLD = 0.5;
const WINDOW_WIDTH = 3;

let previewPolygon: fabric.Polygon | null = null;

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

function findClosestWall(
  feetPos: Point
): { wall: WallSegment; offset: number } | null {
  const walls = getActiveRoomDoc()?.walls ?? {};
  let best: { wall: WallSegment; offset: number; dist: number } | null = null;

  for (const wall of Object.values(walls)) {
    const len = wallLength(wall);
    // Skip walls too short to fit the window
    if (len < WINDOW_WIDTH) continue;
    const { point, t } = closestPointOnWall(wall, feetPos);
    const d = distance(point, feetPos);
    const offset = t * len;

    if (d < SNAP_THRESHOLD && (!best || d < best.dist)) {
      best = { wall, offset, dist: d };
    }
  }

  return best ? { wall: best.wall, offset: best.offset } : null;
}

function updatePreview(
  fc: fabric.Canvas,
  hit: { wall: WallSegment; offset: number } | null,
  scale: number,
  origin: { x: number; y: number }
) {
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
}

function clearPreview(fc: fabric.Canvas) {
  if (previewPolygon) {
    fc.remove(previewPolygon);
    previewPolygon = null;
    fc.renderAll();
  }
}

export function activateWindowTool(
  fc: fabric.Canvas,
  scale: number,
  origin: { x: number; y: number }
) {
  deactivateWindowTool(fc);

  const onMouseMove = (opt: fabric.TEvent) => {
    const pointer = fc.getViewportPoint(opt.e);
    const feet = pxToFeet(pointer, origin, scale);
    const hit = findClosestWall(feet);
    updatePreview(fc, hit, scale, origin);
  };

  const onMouseDown = (opt: fabric.TEvent) => {
    const pointer = fc.getViewportPoint(opt.e);
    const feet = pxToFeet(pointer, origin, scale);
    const hit = findClosestWall(feet);

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
      clearPreview(fc);
      // Auto-revert to Select after placing (EDIT-11)
      useUIStore.getState().setTool("select");
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      clearPreview(fc);
      useUIStore.getState().setTool("select");
    }
  };

  fc.on("mouse:move", onMouseMove);
  fc.on("mouse:down", onMouseDown);
  document.addEventListener("keydown", onKeyDown);

  (fc as any).__windowToolCleanup = () => {
    fc.off("mouse:move", onMouseMove);
    fc.off("mouse:down", onMouseDown);
    document.removeEventListener("keydown", onKeyDown);
    clearPreview(fc);
  };
}

export function deactivateWindowTool(fc: fabric.Canvas) {
  const fn = (fc as any).__windowToolCleanup;
  if (fn) { fn(); delete (fc as any).__windowToolCleanup; }
}
