// Phase 60 STAIRS-01 (D-15): unit tests U1-U4 for stair store actions +
// supporting v3 → v4 snapshot migration roundtrip.

import { describe, it, expect, beforeEach } from "vitest";
import { useCADStore, resetCADStoreForTests } from "@/stores/cadStore";
import { migrateSnapshot } from "@/lib/snapshotMigration";
import type { CADSnapshot, RoomDoc, Stair } from "@/types/cad";

function activeDoc(): RoomDoc {
  const s = useCADStore.getState();
  return s.rooms[s.activeRoomId!];
}

describe("Phase 60 STAIRS-01 — cadStore stair actions", () => {
  beforeEach(() => {
    resetCADStoreForTests();
  });

  it("U1: addStair writes a stair to RoomDoc.stairs with default values applied + history", () => {
    const before = useCADStore.getState().past.length;
    const roomId = useCADStore.getState().activeRoomId!;
    const id = useCADStore.getState().addStair(roomId, { position: { x: 1, y: 2 } });

    expect(id).toMatch(/^stair_/);
    const stair = activeDoc().stairs?.[id];
    expect(stair).toBeDefined();
    expect(stair!.id).toBe(id);
    expect(stair!.position).toEqual({ x: 1, y: 2 });
    expect(stair!.riseIn).toBe(7);
    expect(stair!.runIn).toBe(11);
    expect(stair!.stepCount).toBe(12);
    expect(stair!.rotation).toBe(0);
    expect(stair!.widthFtOverride).toBeUndefined();

    const after = useCADStore.getState().past.length;
    expect(after).toBe(before + 1);
  });

  it("U2: updateStair patches the stair and preserves other fields + history", () => {
    const roomId = useCADStore.getState().activeRoomId!;
    const id = useCADStore.getState().addStair(roomId, { position: { x: 1, y: 2 } });

    const before = useCADStore.getState().past.length;
    useCADStore.getState().updateStair(roomId, id, { riseIn: 8 });

    const stair = activeDoc().stairs?.[id]!;
    expect(stair.riseIn).toBe(8);
    // Other fields preserved.
    expect(stair.runIn).toBe(11);
    expect(stair.stepCount).toBe(12);
    expect(stair.rotation).toBe(0);
    expect(stair.position).toEqual({ x: 1, y: 2 });

    const after = useCADStore.getState().past.length;
    expect(after).toBe(before + 1);
  });

  it("U3: removeStair deletes the stair entry + history", () => {
    const roomId = useCADStore.getState().activeRoomId!;
    const id = useCADStore.getState().addStair(roomId, { position: { x: 1, y: 2 } });
    expect(activeDoc().stairs?.[id]).toBeDefined();

    const before = useCADStore.getState().past.length;
    useCADStore.getState().removeStair(roomId, id);

    expect(activeDoc().stairs?.[id]).toBeUndefined();
    expect(Object.keys(activeDoc().stairs ?? {}).length).toBe(0);

    const after = useCADStore.getState().past.length;
    expect(after).toBe(before + 1);
  });

  it("U4: *NoHistory variants do NOT push to undo stack; history variants DO", () => {
    const roomId = useCADStore.getState().activeRoomId!;
    // Seed via NoHistory write: should NOT increment past.
    // (We can't use addStair NoHistory — there isn't one — so test the three
    // existing NoHistory variants on an already-placed stair.)
    const id = useCADStore.getState().addStair(roomId, { position: { x: 0, y: 0 } });

    // updateStairNoHistory — past unchanged.
    let before = useCADStore.getState().past.length;
    useCADStore.getState().updateStairNoHistory(roomId, id, { riseIn: 9 });
    expect(useCADStore.getState().past.length).toBe(before);
    expect(activeDoc().stairs![id].riseIn).toBe(9);

    // resizeStairWidthNoHistory — past unchanged.
    before = useCADStore.getState().past.length;
    useCADStore.getState().resizeStairWidthNoHistory(roomId, id, 4);
    expect(useCADStore.getState().past.length).toBe(before);
    expect(activeDoc().stairs![id].widthFtOverride).toBeCloseTo(4);

    // removeStairNoHistory — past unchanged.
    before = useCADStore.getState().past.length;
    useCADStore.getState().removeStairNoHistory(roomId, id);
    expect(useCADStore.getState().past.length).toBe(before);
    expect(activeDoc().stairs?.[id]).toBeUndefined();

    // History-pushing variant — addStair already verified in U1; verify
    // updateStair / resizeStairWidth here for symmetry.
    const id2 = useCADStore.getState().addStair(roomId, { position: { x: 0, y: 0 } });
    before = useCADStore.getState().past.length;
    useCADStore.getState().updateStair(roomId, id2, { rotation: 90 });
    expect(useCADStore.getState().past.length).toBe(before + 1);

    before = useCADStore.getState().past.length;
    useCADStore.getState().resizeStairWidth(roomId, id2, 5);
    expect(useCADStore.getState().past.length).toBe(before + 1);
  });

  it("supporting: snapshot v3 → v4 migration roundtrip seeds stairs: {} on every RoomDoc", () => {
    // Construct a synthetic v3 snapshot (no `stairs` field on RoomDocs).
    const v3Snap = {
      version: 3,
      rooms: {
        room_main: {
          id: "room_main",
          name: "Main Room",
          room: { width: 20, length: 16, wallHeight: 8 },
          walls: {},
          placedProducts: {},
        } as RoomDoc,
      },
      activeRoomId: "room_main",
    };

    const migrated = migrateSnapshot(v3Snap as unknown);

    expect(migrated.version).toBe(4);
    expect(migrated.rooms.room_main.stairs).toEqual({});

    // Re-passing v4 returns the same reference (passthrough).
    const second = migrateSnapshot(migrated as unknown);
    expect(second).toBe(migrated);
    expect(second.version).toBe(4);
  });
});
