import { describe, it, expect } from "vitest";
import { ROOM_TEMPLATES } from "@/data/roomTemplates";

describe("roomTemplates", () => {
  it("LIVING_ROOM produces 4 perimeter walls at 16x20 ft", () => {
    const t = ROOM_TEMPLATES.LIVING_ROOM;
    expect(t.room).toEqual({ width: 16, length: 20, wallHeight: 9 });
    const walls = Object.values(t.makeWalls());
    expect(walls).toHaveLength(4);
    // First wall runs from (0,0) to (16,0)
    expect(walls[0].start).toEqual({ x: 0, y: 0 });
    expect(walls[0].end).toEqual({ x: 16, y: 0 });
  });

  it("BEDROOM produces 4 perimeter walls at 12x14 ft", () => {
    const t = ROOM_TEMPLATES.BEDROOM;
    expect(t.room).toEqual({ width: 12, length: 14, wallHeight: 8 });
    expect(Object.values(t.makeWalls())).toHaveLength(4);
  });

  it("KITCHEN produces 4 perimeter walls at 10x12 ft", () => {
    const t = ROOM_TEMPLATES.KITCHEN;
    expect(t.room).toEqual({ width: 10, length: 12, wallHeight: 8 });
    expect(Object.values(t.makeWalls())).toHaveLength(4);
  });

  it("BLANK produces zero walls with 16x20x8 room dims", () => {
    const t = ROOM_TEMPLATES.BLANK;
    expect(t.room).toEqual({ width: 16, length: 20, wallHeight: 8 });
    expect(Object.keys(t.makeWalls())).toHaveLength(0);
  });

  it("each template wall has thickness 0.5 and openings []", () => {
    for (const id of ["LIVING_ROOM", "BEDROOM", "KITCHEN"] as const) {
      const walls = Object.values(ROOM_TEMPLATES[id].makeWalls());
      for (const w of walls) {
        expect(w.thickness).toBe(0.5);
        expect(w.openings).toEqual([]);
        expect(w.id.startsWith("wall_")).toBe(true);
      }
    }
  });
});
