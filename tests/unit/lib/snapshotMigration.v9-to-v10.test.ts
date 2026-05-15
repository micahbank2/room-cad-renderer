// Phase 86 COL-01 (D-04): unit tests for the v9 → v10 seed-empty migration.
// Mirrors the Phase 60 v3→v4 stair migration test contract (seed-empty,
// preserves existing data, idempotent, defaultSnapshot version assert).

import { describe, it, expect } from "vitest";
import {
  defaultSnapshot,
  migrateSnapshot,
  migrateV9ToV10,
} from "@/lib/snapshotMigration";
import type { CADSnapshot, RoomDoc, Column } from "@/types/cad";

describe("Phase 86 COL-01 — migrateV9ToV10", () => {
  it("seeds columns: {} on every RoomDoc when absent and bumps version to 10", () => {
    const v9: any = {
      version: 9,
      rooms: {
        room_main: {
          id: "room_main",
          name: "Main",
          room: { width: 10, length: 10, wallHeight: 8 },
          walls: {},
          placedProducts: {},
          stairs: {},
        } as RoomDoc,
        room_two: {
          id: "room_two",
          name: "Two",
          room: { width: 8, length: 8, wallHeight: 8 },
          walls: {},
          placedProducts: {},
          stairs: {},
        } as RoomDoc,
      },
      activeRoomId: "room_main",
    };

    const v10 = migrateV9ToV10(v9 as CADSnapshot);

    expect(v10.version).toBe(10);
    expect(v10.rooms.room_main.columns).toEqual({});
    expect(v10.rooms.room_two.columns).toEqual({});
    // Existing data preserved.
    expect(v10.rooms.room_main.stairs).toEqual({});
  });

  it("preserves existing columns entries when present", () => {
    const existing: Column = {
      id: "col_a",
      position: { x: 4, y: 4 },
      widthFt: 1.5,
      depthFt: 1.5,
      heightFt: 9,
      rotation: 45,
      shape: "box",
      name: "Pillar A",
    };
    const v9: any = {
      version: 9,
      rooms: {
        room_main: {
          id: "room_main",
          name: "Main",
          room: { width: 10, length: 10, wallHeight: 8 },
          walls: {},
          placedProducts: {},
          stairs: {},
          columns: { col_a: existing },
        } as RoomDoc,
      },
      activeRoomId: "room_main",
    };

    const v10 = migrateV9ToV10(v9 as CADSnapshot);

    expect(v10.version).toBe(10);
    expect(v10.rooms.room_main.columns).toEqual({ col_a: existing });
    expect(v10.rooms.room_main.columns!.col_a).toBe(existing);
  });

  it("is idempotent on v10 input (returns same reference)", () => {
    const v10: any = {
      version: 10,
      rooms: {
        room_main: {
          id: "room_main",
          name: "Main",
          room: { width: 10, length: 10, wallHeight: 8 },
          walls: {},
          placedProducts: {},
          stairs: {},
          columns: {},
        } as RoomDoc,
      },
      activeRoomId: "room_main",
    };

    const out = migrateV9ToV10(v10 as CADSnapshot);

    expect(out).toBe(v10);
    expect(out.version).toBe(10);
  });

  it("migrateSnapshot routes v9 through migrateV9ToV10", () => {
    const v9: any = {
      version: 9,
      rooms: {
        room_main: {
          id: "room_main",
          name: "Main",
          room: { width: 10, length: 10, wallHeight: 8 },
          walls: {},
          placedProducts: {},
          stairs: {},
        } as RoomDoc,
      },
      activeRoomId: "room_main",
    };

    const result = migrateSnapshot(v9);

    expect(result.version).toBe(10);
    expect(result.rooms.room_main.columns).toEqual({});
  });

  it("migrateSnapshot v10 passthrough returns identical reference", () => {
    const v10: any = {
      version: 10,
      rooms: {
        room_main: {
          id: "room_main",
          name: "Main",
          room: { width: 10, length: 10, wallHeight: 8 },
          walls: {},
          placedProducts: {},
          stairs: {},
          columns: {},
        } as RoomDoc,
      },
      activeRoomId: "room_main",
    };

    expect(migrateSnapshot(v10)).toBe(v10);
  });

  it("defaultSnapshot emits version 10 with columns: {} seeded on the main room", () => {
    const d = defaultSnapshot();
    expect(d.version).toBe(10);
    expect(d.rooms.room_main.columns).toEqual({});
  });
});
