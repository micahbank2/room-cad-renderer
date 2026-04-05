import * as fabric from "fabric";
import { useCADStore, getActiveRoomDoc } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { closestPointOnWall, distance, wallLength } from "@/lib/geometry";
import type { Point, WallSegment } from "@/types/cad";

const SNAP_THRESHOLD = 1.0; // feet — how close click must be to a wall

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

export function activateDoorTool(
  fc: fabric.Canvas,
  scale: number,
  origin: { x: number; y: number }
) {
  deactivateDoorTool(fc);

  const onMouseDown = (opt: fabric.TEvent) => {
    const pointer = fc.getViewportPoint(opt.e);
    const feet = pxToFeet(pointer, origin, scale);
    const hit = findClosestWall(feet);

    if (hit) {
      const doorWidth = 3; // feet — standard door
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
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      useUIStore.getState().setTool("select");
    }
  };

  fc.on("mouse:down", onMouseDown);
  document.addEventListener("keydown", onKeyDown);

  (fc as any).__doorToolCleanup = () => {
    fc.off("mouse:down", onMouseDown);
    document.removeEventListener("keydown", onKeyDown);
  };
}

export function deactivateDoorTool(fc: fabric.Canvas) {
  const fn = (fc as any).__doorToolCleanup;
  if (fn) { fn(); delete (fc as any).__doorToolCleanup; }
}
