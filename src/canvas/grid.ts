import * as fabric from "fabric";

const GRID_COLOR = "#1f1e2a";
const GRID_COLOR_MAJOR = "#292935";
const ROOM_OUTLINE = "#484554";

/**
 * Draw the grid and room outline on the dark canvas.
 */
export function drawGrid(
  fc: fabric.Canvas,
  roomW: number,
  roomH: number,
  scale: number,
  origin: { x: number; y: number },
  showGrid: boolean
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
            stroke: isMajor ? GRID_COLOR_MAJOR : GRID_COLOR,
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
            stroke: isMajor ? GRID_COLOR_MAJOR : GRID_COLOR,
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
      stroke: ROOM_OUTLINE,
      strokeWidth: 1.5,
      selectable: false,
      evented: false,
      data: { type: "room-outline" },
    })
  );
}
