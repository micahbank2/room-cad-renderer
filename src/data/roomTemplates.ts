import type { Room, WallSegment } from "@/types/cad";
import { uid } from "@/lib/geometry";

export type RoomTemplateId = "LIVING_ROOM" | "BEDROOM" | "KITCHEN" | "BLANK";

export interface RoomTemplate {
  id: RoomTemplateId;
  label: string;
  room: Room;
  makeWalls: () => Record<string, WallSegment>;
}

function perimeterWalls(w: number, l: number, h: number): Record<string, WallSegment> {
  const corners = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: l },
    { x: 0, y: l },
  ];
  const walls: Record<string, WallSegment> = {};
  for (let i = 0; i < 4; i++) {
    const id = `wall_${uid()}`;
    walls[id] = {
      id,
      start: corners[i],
      end: corners[(i + 1) % 4],
      thickness: 0.5,
      height: h,
      openings: [],
    };
  }
  return walls;
}

export const ROOM_TEMPLATES: Record<RoomTemplateId, RoomTemplate> = {
  LIVING_ROOM: {
    id: "LIVING_ROOM",
    label: "LIVING_ROOM · 16 × 20 ft",
    room: { width: 16, length: 20, wallHeight: 9 },
    makeWalls: () => perimeterWalls(16, 20, 9),
  },
  BEDROOM: {
    id: "BEDROOM",
    label: "BEDROOM · 12 × 14 ft",
    room: { width: 12, length: 14, wallHeight: 8 },
    makeWalls: () => perimeterWalls(12, 14, 8),
  },
  KITCHEN: {
    id: "KITCHEN",
    label: "KITCHEN · 10 × 12 ft",
    room: { width: 10, length: 12, wallHeight: 8 },
    makeWalls: () => perimeterWalls(10, 12, 8),
  },
  BLANK: {
    id: "BLANK",
    label: "BLANK · 16 × 20 ft",
    room: { width: 16, length: 20, wallHeight: 8 },
    makeWalls: () => ({}),
  },
};
