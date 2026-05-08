import { describe, it, expect } from "vitest";
import { migrateSnapshot, defaultSnapshot, migrateV3ToV4, migrateV4ToV5 } from "@/lib/snapshotMigration";

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
    // Phase 62 MEASURE-01 (D-02): defaultSnapshot() returns version 5 (from Phase 60).
    // Phase 68 MAT-APPLY-01 bumped to version 6 (resolved Materials on surfaces).
    // Phase 69 MAT-LINK-01 bumped to version 7 (adds optional PlacedProduct.finishMaterialId).
    expect(d.version).toBe(7);
    expect(Object.keys(d.rooms)).toEqual(["room_main"]);
    expect(d.activeRoomId).toBe("room_main");
    expect(defaultSnapshot().rooms.room_main.room).toEqual({ width: 20, length: 16, wallHeight: 8 });
    // Phase 62 MEASURE-01 (D-02): default RoomDoc seeds gain empty measure/anno maps.
    expect(defaultSnapshot().rooms.room_main.measureLines).toEqual({});
    expect(defaultSnapshot().rooms.room_main.annotations).toEqual({});
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

describe("migrateV4ToV5 (Phase 62 MEASURE-01)", () => {
  it("seeds measureLines + annotations on each RoomDoc and bumps version to 5", () => {
    // v4 input: Phase 60-era snapshot with stairs but no measure/anno fields
    const v4: any = {
      version: 4,
      rooms: {
        room_main: {
          id: "room_main",
          name: "Main",
          room: { width: 10, length: 10, wallHeight: 8 },
          walls: { w1: { id: "w1", start:{x:0,y:0}, end:{x:10,y:0}, thickness:0.5, height:8, openings:[] } },
          placedProducts: {},
          stairs: { stair_a: { id: "stair_a", position: { x: 5, y: 5 }, rotation: 0, riseIn: 7, runIn: 11, stepCount: 12 } },
        },
      },
      activeRoomId: "room_main",
    };
    const v5 = migrateV4ToV5(v4);
    expect(v5.version).toBe(5);
    expect(v5.rooms.room_main.measureLines).toEqual({});
    expect(v5.rooms.room_main.annotations).toEqual({});
    // Existing data preserved
    expect(v5.rooms.room_main.walls.w1.id).toBe("w1");
    expect(v5.rooms.room_main.stairs!.stair_a.id).toBe("stair_a");
  });

  it("v5 passthrough is a no-op (idempotent)", () => {
    const v5: any = {
      version: 5,
      rooms: {
        room_main: {
          id: "room_main",
          name: "Main",
          room: { width: 10, length: 10, wallHeight: 8 },
          walls: {},
          placedProducts: {},
          stairs: {},
          measureLines: { meas_a: { id: "meas_a", start: { x: 0, y: 0 }, end: { x: 1, y: 0 } } },
          annotations: {},
        },
      },
      activeRoomId: "room_main",
    };
    const out = migrateV4ToV5(v5);
    expect(out.version).toBe(5);
    expect(out.rooms.room_main.measureLines).toEqual({
      meas_a: { id: "meas_a", start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
    });
  });

  it("chains v3 → v4 → v5 cleanly", () => {
    // v3 input: Phase 51-era snapshot with no stairs/measureLines/annotations
    const v3: any = {
      version: 3,
      rooms: {
        room_main: {
          id: "room_main",
          name: "Main",
          room: { width: 8, length: 8, wallHeight: 8 },
          walls: {},
          placedProducts: {},
        },
      },
      activeRoomId: "room_main",
    };
    const v4 = migrateV3ToV4(v3);
    expect(v4.version).toBe(4);
    expect(v4.rooms.room_main.stairs).toEqual({});
    const v5 = migrateV4ToV5(v4);
    expect(v5.version).toBe(5);
    expect(v5.rooms.room_main.measureLines).toEqual({});
    expect(v5.rooms.room_main.annotations).toEqual({});
    expect(v5.rooms.room_main.stairs).toEqual({});
  });
});
