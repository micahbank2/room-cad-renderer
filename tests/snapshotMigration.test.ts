import { describe, it, expect } from "vitest";
import { migrateSnapshot, defaultSnapshot } from "@/lib/snapshotMigration";

describe("migrateSnapshot", () => {
  it("v1 to v2 wraps legacy snapshot into Main Room", () => {
    const v1 = {
      room: { width: 10, length: 12, wallHeight: 8 },
      walls: { wall_a: { id: "wall_a", start: {x:0,y:0}, end: {x:10,y:0}, thickness: 0.5, height: 8, openings: [] } },
      placedProducts: {},
    };
    const v2 = migrateSnapshot(v1);
    expect(v2.version).toBe(2);
    expect(v2.activeRoomId).toBe("room_main");
    expect(v2.rooms.room_main.name).toBe("Main Room");
    expect(v2.rooms.room_main.id).toBe("room_main");
    expect(v2.rooms.room_main.room.width).toBe(10);
  });

  it("v2 passthrough returns identical snapshot unchanged", () => {
    const v2: import("@/types/cad").CADSnapshot = {
      version: 2,
      rooms: { room_x: { id: "room_x", name: "X", room: {width:8,length:8,wallHeight:8}, walls: {}, placedProducts: {} } },
      activeRoomId: "room_x",
    };
    expect(migrateSnapshot(v2)).toBe(v2);
  });

  it("empty/unknown input returns default single-room snapshot", () => {
    const d = migrateSnapshot(null);
    expect(d.version).toBe(2);
    expect(Object.keys(d.rooms)).toEqual(["room_main"]);
    expect(d.activeRoomId).toBe("room_main");
    expect(defaultSnapshot().rooms.room_main.room).toEqual({ width: 20, length: 16, wallHeight: 8 });
  });

  it("legacy walls and placedProducts carry over into room_main", () => {
    const v1 = {
      room: { width: 5, length: 5, wallHeight: 8 },
      walls: { w1: { id: "w1", start:{x:0,y:0}, end:{x:5,y:0}, thickness:0.5, height:8, openings:[] } },
      placedProducts: { pp1: { id: "pp1", productId: "prod_x", position: {x:2,y:2}, rotation: 0 } },
    };
    const v2 = migrateSnapshot(v1);
    expect(v2.rooms.room_main.walls.w1.id).toBe("w1");
    expect(v2.rooms.room_main.placedProducts.pp1.productId).toBe("prod_x");
  });
});
