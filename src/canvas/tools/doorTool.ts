import * as fabric from "fabric";
import { useCADStore, getActiveRoomDoc } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { closestPointOnWall, distance, wallLength, angle as wallAngle } from "@/lib/geometry";
import type { Point, WallSegment } from "@/types/cad";

const SNAP_THRESHOLD = 1.0; // feet — how close click must be to a wall
const DOOR_WIDTH = 3; // feet

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
    const { point, t } = closestPointOnWall(wall, feetPos);
    const d = distance(point, feetPos);
    const len = wallLength(wall);
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
  origin: { x: number; y: number },
  fillColor: string
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
  const halfDoor = DOOR_WIDTH / 2;
  const clampedOffset = Math.max(halfDoor, Math.min(len - halfDoor, hit.offset));
  const startOffset = clampedOffset - halfDoor;
  const endOffset = clampedOffset + halfDoor;
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

  if (previewPolygon) {
    previewPolygon.set({ points: pts });
    (previewPolygon as any).setCoords?.();
  } else {
    previewPolygon = new fabric.Polygon(pts, {
      fill: fillColor,
      stroke: "#ccbeff",
      strokeWidth: 1,
      strokeDashArray: [4, 3],
      selectable: false,
      evented: false,
    });
    fc.add(previewPolygon);
  }
  fc.renderAll();
}

function clearPreview(fc: fabric.Canvas) {
  if (previewPolygon) {
    fc.remove(previewPolygon);
    previewPolygon = null;
    fc.renderAll();
  }
}

export function activateDoorTool(
  fc: fabric.Canvas,
  scale: number,
  origin: { x: number; y: number }
) {
  deactivateDoorTool(fc);

  const onMouseMove = (opt: fabric.TEvent) => {
    const pointer = fc.getViewportPoint(opt.e);
    const feet = pxToFeet(pointer, origin, scale);
    const hit = findClosestWall(feet);
    updatePreview(fc, hit, scale, origin, "rgba(255,184,117,0.25)");
  };

  const onMouseDown = (opt: fabric.TEvent) => {
    const pointer = fc.getViewportPoint(opt.e);
    const feet = pxToFeet(pointer, origin, scale);
    const hit = findClosestWall(feet);

    if (hit) {
      const doorWidth = DOOR_WIDTH;
      const len = wallLength(hit.wall);
      // Center the door at the click offset, clamped to wall bounds
      const halfDoor = doorWidth / 2;
      const clampedOffset = Math.max(halfDoor, Math.min(len - halfDoor, hit.offset));

      useCADStore.getState().addOpening(hit.wall.id, {
        type: "door",
        offset: clampedOffset - halfDoor,
        width: doorWidth,
        height: 6.67, // 6'-8" standard door height
        sillHeight: 0,
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

  (fc as any).__doorToolCleanup = () => {
    fc.off("mouse:move", onMouseMove);
    fc.off("mouse:down", onMouseDown);
    document.removeEventListener("keydown", onKeyDown);
    clearPreview(fc);
  };
}

export function deactivateDoorTool(fc: fabric.Canvas) {
  const fn = (fc as any).__doorToolCleanup;
  if (fn) { fn(); delete (fc as any).__doorToolCleanup; }
}
