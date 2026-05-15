import * as fabric from "fabric";
import type { CanvasTheme } from "./canvasTheme";

/**
 * Draw the grid and room outline. Colors come from the theme bridge so the
 * canvas repaints when the user flips Light/Dark in the Settings popover.
 * Phase 88 D-04: hardcoded GRID_COLOR/GRID_COLOR_MAJOR/ROOM_OUTLINE constants
 * removed in favor of theme.gridMinor/gridMajor/roomOutline.
 */
export function drawGrid(
  fc: fabric.Canvas,
  roomW: number,
  roomH: number,
  scale: number,
  origin: { x: number; y: number },
  showGrid: boolean,
  theme: CanvasTheme,
) {
  const rw = roomW * scale;
  const rh = roomH * scale;

  if (showGrid) {
    // Minor grid (0.5ft)
    for (let x = 0; x <= roomW; x += 0.5) {
      const isMajor = x % 1 === 0;
      fc.add(
        new fabric.Line(
          [origin.x + x * scale, origin.y, origin.x + x * scale, origin.y + rh],
          {
            stroke: isMajor ? theme.gridMajor : theme.gridMinor,
            strokeWidth: isMajor ? 0.5 : 0.25,
            selectable: false,
            evented: false,
            data: { type: "grid" },
          }
        )
      );
    }
    for (let y = 0; y <= roomH; y += 0.5) {
      const isMajor = y % 1 === 0;
      fc.add(
        new fabric.Line(
          [origin.x, origin.y + y * scale, origin.x + rw, origin.y + y * scale],
          {
            stroke: isMajor ? theme.gridMajor : theme.gridMinor,
            strokeWidth: isMajor ? 0.5 : 0.25,
            selectable: false,
            evented: false,
            data: { type: "grid" },
          }
        )
      );
    }
  }

  // Room outline
  fc.add(
    new fabric.Rect({
      left: origin.x,
      top: origin.y,
      width: rw,
      height: rh,
      fill: "transparent",
      stroke: theme.roomOutline,
      strokeWidth: 1.5,
      selectable: false,
      evented: false,
      data: { type: "room-outline" },
    })
  );
}
