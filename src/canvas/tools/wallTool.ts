import * as fabric from "fabric";
import { useCADStore, getActiveRoomDoc } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { snapPoint, constrainOrthogonal, distance, formatFeet } from "@/lib/geometry";
import { pxToFeet } from "./toolUtils";
import type { Point } from "@/types/cad";

/** Snap threshold in feet — if cursor is within this distance of an existing
 *  wall endpoint, snap to that endpoint instead of to the grid. */
const ENDPOINT_SNAP_THRESHOLD_FT = 0.75;

/** Find the nearest wall endpoint within threshold, or null.
 *  Pure helper — no closure state access — stays at module scope per D-08. */
function findNearestEndpoint(cursor: Point, excludeStart: Point | null): Point | null {
  const walls = getActiveRoomDoc()?.walls ?? {};
  let best: { point: Point; dist: number } | null = null;
  for (const wall of Object.values(walls)) {
    for (const endpoint of [wall.start, wall.end]) {
      // Skip the in-progress start point itself (can't terminate a wall on its own start)
      if (
        excludeStart &&
        endpoint.x === excludeStart.x &&
        endpoint.y === excludeStart.y
      ) continue;
      const d = distance(cursor, endpoint);
      if (d <= ENDPOINT_SNAP_THRESHOLD_FT && (!best || d < best.dist)) {
        best = { point: endpoint, dist: d };
      }
    }
  }
  return best ? best.point : null;
}

export function activateWallTool(
  fc: fabric.Canvas,
  scale: number,
  origin: { x: number; y: number },
): () => void {
  let startPoint: Point | null = null;
  let previewLine: fabric.Line | null = null;
  let startMarker: fabric.Circle | null = null;
  let endpointHighlight: fabric.Circle | null = null;
  let lengthLabel: fabric.Group | null = null;

  const clearPreview = () => {
    if (previewLine) {
      fc.remove(previewLine);
      previewLine = null;
    }
    if (startMarker) {
      fc.remove(startMarker);
      startMarker = null;
    }
    if (endpointHighlight) {
      fc.remove(endpointHighlight);
      endpointHighlight = null;
    }
    if (lengthLabel) {
      fc.remove(lengthLabel);
      lengthLabel = null;
    }
    startPoint = null;
    fc.renderAll();
  };

  const onMouseDown = (opt: fabric.TEvent) => {
    const pointer = fc.getViewportPoint(opt.e);
    const gridSnap = useUIStore.getState().gridSnap;
    const feet = pxToFeet(pointer, origin, scale);
    // Endpoint snap beats grid snap
    const endpoint = findNearestEndpoint(feet, startPoint);
    const snapped = endpoint
      ? endpoint
      : gridSnap > 0 ? snapPoint(feet, gridSnap) : feet;

    if (!startPoint) {
      // First click: set start
      startPoint = snapped;

      // Visual marker at start
      startMarker = new fabric.Circle({
        left: origin.x + snapped.x * scale,
        top: origin.y + snapped.y * scale,
        radius: 4,
        fill: "#7c5bf0",
        originX: "center",
        originY: "center",
        selectable: false,
        evented: false,
      });
      fc.add(startMarker);
      fc.renderAll();
    } else {
      // Second click: complete wall
      let endPoint = snapped;

      // Orthogonal constraint if shift held
      if (opt.e instanceof MouseEvent && opt.e.shiftKey) {
        endPoint = constrainOrthogonal(startPoint, endPoint);
      }

      useCADStore.getState().addWall(startPoint, endPoint);
      clearPreview();
      // Auto-revert to Select after placing (EDIT-11)
      useUIStore.getState().setTool("select");
    }
  };

  const onMouseMove = (opt: fabric.TEvent) => {
    const pointer = fc.getViewportPoint(opt.e);
    const gridSnap = useUIStore.getState().gridSnap;
    const feet = pxToFeet(pointer, origin, scale);

    // Check if cursor is near an existing endpoint — show highlight
    // (works even before the first click, to help users start walls at existing endpoints)
    const endpoint = findNearestEndpoint(feet, startPoint);
    if (endpoint) {
      const hx = origin.x + endpoint.x * scale;
      const hy = origin.y + endpoint.y * scale;
      if (endpointHighlight) {
        endpointHighlight.set({ left: hx, top: hy });
      } else {
        endpointHighlight = new fabric.Circle({
          left: hx,
          top: hy,
          radius: 7,
          fill: "transparent",
          stroke: "#ccbeff",
          strokeWidth: 2,
          originX: "center",
          originY: "center",
          selectable: false,
          evented: false,
        });
        fc.add(endpointHighlight);
      }
    } else if (endpointHighlight) {
      fc.remove(endpointHighlight);
      endpointHighlight = null;
    }

    if (!startPoint) {
      fc.renderAll();
      return;
    }

    // Endpoint snap beats grid snap
    let snapped = endpoint
      ? endpoint
      : gridSnap > 0 ? snapPoint(feet, gridSnap) : feet;

    if (opt.e instanceof MouseEvent && opt.e.shiftKey) {
      snapped = constrainOrthogonal(startPoint, snapped);
    }

    const sx = origin.x + startPoint.x * scale;
    const sy = origin.y + startPoint.y * scale;
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

    // Live length label at the midpoint of the preview line (EDIT-13)
    const lenFt = distance(startPoint, snapped);
    const labelText = formatFeet(lenFt);
    const mx = (sx + ex) / 2;
    const my = (sy + ey) / 2;
    if (lengthLabel) {
      lengthLabel.set({ left: mx, top: my });
      const textObj = lengthLabel.item(1) as fabric.Text;
      if (textObj) textObj.set({ text: labelText });
    } else {
      const bg = new fabric.Rect({
        width: 52,
        height: 18,
        fill: "#12121d",
        stroke: "#7c5bf0",
        strokeWidth: 1,
        rx: 2,
        ry: 2,
        originX: "center",
        originY: "center",
      });
      const text = new fabric.Text(labelText, {
        fontFamily: "IBM Plex Mono",
        fontSize: 10,
        fill: "#ccbeff",
        originX: "center",
        originY: "center",
      });
      lengthLabel = new fabric.Group([bg, text], {
        left: mx,
        top: my,
        originX: "center",
        originY: "center",
        selectable: false,
        evented: false,
      });
      fc.add(lengthLabel);
    }

    fc.renderAll();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
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
