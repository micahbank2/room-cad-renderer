import * as fabric from "fabric";
import { formatFeet, wallLength } from "@/lib/geometry";
import type { WallSegment } from "@/types/cad";

const DIM_COLOR = "#938ea0";
const DIM_FONT = "Inter, system-ui, sans-serif";

/** Draw room dimension labels (width along bottom, length along right) */
export function drawRoomDimensions(
  fc: fabric.Canvas,
  roomW: number,
  roomH: number,
  scale: number,
  origin: { x: number; y: number }
) {
  const rw = roomW * scale;
  const rh = roomH * scale;

  // Bottom: width label + line + ticks
  fc.add(
    new fabric.Line(
      [origin.x, origin.y + rh + 8, origin.x + rw, origin.y + rh + 8],
      { stroke: DIM_COLOR, strokeWidth: 0.5, selectable: false, evented: false, data: { type: "dim" } }
    )
  );
  for (const x of [origin.x, origin.x + rw]) {
    fc.add(
      new fabric.Line([x, origin.y + rh + 4, x, origin.y + rh + 12], {
        stroke: DIM_COLOR, strokeWidth: 1, selectable: false, evented: false, data: { type: "dim" },
      })
    );
  }
  fc.add(
    new fabric.FabricText(formatFeet(roomW), {
      left: origin.x + rw / 2,
      top: origin.y + rh + 14,
      fontSize: 12,
      fontFamily: DIM_FONT,
      fill: DIM_COLOR,
      originX: "center",
      selectable: false,
      evented: false,
      data: { type: "dim" },
    })
  );

  // Right: length label + line + ticks
  fc.add(
    new fabric.Line(
      [origin.x + rw + 8, origin.y, origin.x + rw + 8, origin.y + rh],
      { stroke: DIM_COLOR, strokeWidth: 0.5, selectable: false, evented: false, data: { type: "dim" } }
    )
  );
  for (const y of [origin.y, origin.y + rh]) {
    fc.add(
      new fabric.Line([origin.x + rw + 4, y, origin.x + rw + 12, y], {
        stroke: DIM_COLOR, strokeWidth: 1, selectable: false, evented: false, data: { type: "dim" },
      })
    );
  }
  fc.add(
    new fabric.FabricText(formatFeet(roomH), {
      left: origin.x + rw + 16,
      top: origin.y + rh / 2,
      fontSize: 12,
      fontFamily: DIM_FONT,
      fill: DIM_COLOR,
      originX: "center",
      angle: 90,
      selectable: false,
      evented: false,
      data: { type: "dim" },
    })
  );
}

/** Draw a dimension label along a wall segment */
export function drawWallDimension(
  fc: fabric.Canvas,
  wall: WallSegment,
  scale: number,
  origin: { x: number; y: number }
) {
  const len = wallLength(wall);
  if (len < 0.5) return;

  const midX = origin.x + ((wall.start.x + wall.end.x) / 2) * scale;
  const midY = origin.y + ((wall.start.y + wall.end.y) / 2) * scale;

  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

  // Offset label perpendicular to wall
  const perpAngle = (angleDeg + 90) * (Math.PI / 180);
  const offsetDist = 14;
  const labelX = midX + Math.cos(perpAngle) * offsetDist;
  const labelY = midY + Math.sin(perpAngle) * offsetDist;

  // Keep text readable (never upside down)
  if (angleDeg > 90) angleDeg -= 180;
  if (angleDeg < -90) angleDeg += 180;

  // Background rect for readability
  const text = formatFeet(len);
  const bg = new fabric.Rect({
    width: text.length * 7 + 8,
    height: 16,
    fill: "rgba(18,18,29,0.85)",
    rx: 3,
    ry: 3,
    originX: "center",
    originY: "center",
  });

  const label = new fabric.FabricText(text, {
    fontSize: 11,
    fontFamily: DIM_FONT,
    fill: "#ccbeff",
    fontWeight: "600",
    originX: "center",
    originY: "center",
  });

  const group = new fabric.Group([bg, label], {
    left: labelX,
    top: labelY,
    angle: angleDeg,
    originX: "center",
    originY: "center",
    selectable: false,
    evented: false,
    data: { type: "wall-dim", wallId: wall.id },
  });

  fc.add(group);
}
