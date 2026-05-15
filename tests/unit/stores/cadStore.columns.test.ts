// Phase 86 COL-01 (D-15): unit tests U1-U13 for column store actions.
// Mirrors the Phase 60 stair test structure. Pins single-undo invariants
// and the D-06 contract before tool/rendering/UI lands in 86-02/86-03.

import { describe, it, expect, beforeEach } from "vitest";
import { useCADStore, resetCADStoreForTests } from "@/stores/cadStore";
import {
  DEFAULT_COLUMN_WIDTH_FT,
  DEFAULT_COLUMN_DEPTH_FT,
} from "@/types/cad";
import type { RoomDoc } from "@/types/cad";

function activeDoc(): RoomDoc {
  const s = useCADStore.getState();
  return s.rooms[s.activeRoomId!];
}

describe("Phase 86 COL-01 — cadStore column actions", () => {
  beforeEach(() => {
    resetCADStoreForTests();
  });

  it("U1: addColumn writes a column with col_ prefix + defaults applied + one history push", () => {
    const before = useCADStore.getState().past.length;
    const roomId = useCADStore.getState().activeRoomId!;
    const id = useCADStore
      .getState()
      .addColumn(roomId, { position: { x: 5, y: 5 }, heightFt: 8 });

    expect(id).toMatch(/^col_/);
    const col = activeDoc().columns?.[id];
    expect(col).toBeDefined();
    expect(col!.id).toBe(id);
    expect(col!.position).toEqual({ x: 5, y: 5 });
    expect(col!.widthFt).toBe(DEFAULT_COLUMN_WIDTH_FT);
    expect(col!.depthFt).toBe(DEFAULT_COLUMN_DEPTH_FT);
    expect(col!.heightFt).toBe(8);
    expect(col!.rotation).toBe(0);
    expect(col!.shape).toBe("box");

    expect(useCADStore.getState().past.length).toBe(before + 1);
  });

  it("U2: addColumn applies partial overrides over DEFAULT_COLUMN", () => {
    const roomId = useCADStore.getState().activeRoomId!;
    const id = useCADStore.getState().addColumn(roomId, {
      position: { x: 1, y: 1 },
      heightFt: 10,
      widthFt: 2,
      depthFt: 1.5,
      rotation: 45,
      name: "Pillar A",
    });
    const col = activeDoc().columns![id];
    expect(col.heightFt).toBe(10);
    expect(col.widthFt).toBe(2);
    expect(col.depthFt).toBe(1.5);
    expect(col.rotation).toBe(45);
    expect(col.name).toBe("Pillar A");
  });

  it("U3: updateColumn patches fields and preserves untouched ones + history", () => {
    const roomId = useCADStore.getState().activeRoomId!;
    const id = useCADStore
      .getState()
      .addColumn(roomId, { position: { x: 1, y: 1 }, heightFt: 8 });

    const before = useCADStore.getState().past.length;
    useCADStore.getState().updateColumn(roomId, id, { materialId: "mat-x" });

    const col = activeDoc().columns![id];
    expect(col.materialId).toBe("mat-x");
    expect(col.heightFt).toBe(8);
    expect(col.widthFt).toBe(DEFAULT_COLUMN_WIDTH_FT);
    expect(useCADStore.getState().past.length).toBe(before + 1);
  });

  it("U4: removeColumn deletes the entry + history; subsequent updates are noops", () => {
    const roomId = useCADStore.getState().activeRoomId!;
    const id = useCADStore
      .getState()
      .addColumn(roomId, { position: { x: 1, y: 1 }, heightFt: 8 });
    expect(activeDoc().columns?.[id]).toBeDefined();

    const before = useCADStore.getState().past.length;
    useCADStore.getState().removeColumn(roomId, id);

    expect(activeDoc().columns?.[id]).toBeUndefined();
    expect(useCADStore.getState().past.length).toBe(before + 1);

    // Noop on missing column — must not throw, must not push history.
    const afterRm = useCADStore.getState().past.length;
    useCADStore.getState().updateColumn(roomId, id, { materialId: "mat-y" });
    expect(useCADStore.getState().past.length).toBe(afterRm);
  });

  it("U5: moveColumn writes position with one history push", () => {
    const roomId = useCADStore.getState().activeRoomId!;
    const id = useCADStore
      .getState()
      .addColumn(roomId, { position: { x: 0, y: 0 }, heightFt: 8 });

    const before = useCADStore.getState().past.length;
    useCADStore.getState().moveColumn(roomId, id, { x: 3, y: 4 });

    expect(activeDoc().columns![id].position).toEqual({ x: 3, y: 4 });
    expect(useCADStore.getState().past.length).toBe(before + 1);
  });

  it("U6: resizeColumnAxis('width', 5) writes widthFt with one history push", () => {
    const roomId = useCADStore.getState().activeRoomId!;
    const id = useCADStore
      .getState()
      .addColumn(roomId, { position: { x: 0, y: 0 }, heightFt: 8 });

    const before = useCADStore.getState().past.length;
    useCADStore.getState().resizeColumnAxis(roomId, id, "width", 5);

    expect(activeDoc().columns![id].widthFt).toBe(5);
    expect(useCADStore.getState().past.length).toBe(before + 1);

    // depth axis variant works too.
    useCADStore.getState().resizeColumnAxis(roomId, id, "depth", 3);
    expect(activeDoc().columns![id].depthFt).toBe(3);
  });

  it("U7: resizeColumnAxis clamps to [0.25, 50] silently", () => {
    const roomId = useCADStore.getState().activeRoomId!;
    const id = useCADStore
      .getState()
      .addColumn(roomId, { position: { x: 0, y: 0 }, heightFt: 8 });

    useCADStore.getState().resizeColumnAxis(roomId, id, "width", 0.1);
    expect(activeDoc().columns![id].widthFt).toBe(0.25);

    useCADStore.getState().resizeColumnAxis(roomId, id, "width", 100);
    expect(activeDoc().columns![id].widthFt).toBe(50);

    useCADStore.getState().resizeColumnAxis(roomId, id, "depth", -5);
    expect(activeDoc().columns![id].depthFt).toBe(0.25);
  });

  it("U8: resizeColumnHeight writes heightFt with one history push + clamps", () => {
    const roomId = useCADStore.getState().activeRoomId!;
    const id = useCADStore
      .getState()
      .addColumn(roomId, { position: { x: 0, y: 0 }, heightFt: 8 });

    const before = useCADStore.getState().past.length;
    useCADStore.getState().resizeColumnHeight(roomId, id, 12);
    expect(activeDoc().columns![id].heightFt).toBe(12);
    expect(useCADStore.getState().past.length).toBe(before + 1);

    // Clamp upper bound.
    useCADStore.getState().resizeColumnHeight(roomId, id, 1000);
    expect(activeDoc().columns![id].heightFt).toBe(50);

    // Clamp lower bound.
    useCADStore.getState().resizeColumnHeight(roomId, id, 0);
    expect(activeDoc().columns![id].heightFt).toBe(0.25);
  });

  it("U9: rotateColumn writes rotation with one history push (no normalization)", () => {
    const roomId = useCADStore.getState().activeRoomId!;
    const id = useCADStore
      .getState()
      .addColumn(roomId, { position: { x: 0, y: 0 }, heightFt: 8 });

    const before = useCADStore.getState().past.length;
    useCADStore.getState().rotateColumn(roomId, id, 270);
    expect(activeDoc().columns![id].rotation).toBe(270);
    expect(useCADStore.getState().past.length).toBe(before + 1);

    // No normalization (matches stair pattern).
    useCADStore.getState().rotateColumn(roomId, id, 720);
    expect(activeDoc().columns![id].rotation).toBe(720);

    useCADStore.getState().rotateColumn(roomId, id, -45);
    expect(activeDoc().columns![id].rotation).toBe(-45);
  });

  it("U10: clearColumnOverrides resets size+height to defaults / wallHeight in one history push", () => {
    const roomId = useCADStore.getState().activeRoomId!;
    const id = useCADStore.getState().addColumn(roomId, {
      position: { x: 0, y: 0 },
      heightFt: 12,
      widthFt: 3,
      depthFt: 2,
    });

    const wallHeight = activeDoc().room.wallHeight;
    const before = useCADStore.getState().past.length;
    useCADStore.getState().clearColumnOverrides(roomId, id);

    const col = activeDoc().columns![id];
    expect(col.widthFt).toBe(DEFAULT_COLUMN_WIDTH_FT);
    expect(col.depthFt).toBe(DEFAULT_COLUMN_DEPTH_FT);
    // D-03: reset-to-wall-height surface.
    expect(col.heightFt).toBe(wallHeight);
    expect(useCADStore.getState().past.length).toBe(before + 1);
  });

  it("U11: renameColumn writes name with one history push", () => {
    const roomId = useCADStore.getState().activeRoomId!;
    const id = useCADStore
      .getState()
      .addColumn(roomId, { position: { x: 0, y: 0 }, heightFt: 8 });

    const before = useCADStore.getState().past.length;
    useCADStore.getState().renameColumn(roomId, id, "Garage Pillar");
    expect(activeDoc().columns![id].name).toBe("Garage Pillar");
    expect(useCADStore.getState().past.length).toBe(before + 1);

    // Empty string also valid (caller decides clearing semantics).
    useCADStore.getState().renameColumn(roomId, id, "");
    expect(activeDoc().columns![id].name).toBe("");
  });

  it("U12: NoHistory siblings do NOT increment past.length", () => {
    const roomId = useCADStore.getState().activeRoomId!;
    const id = useCADStore
      .getState()
      .addColumn(roomId, { position: { x: 0, y: 0 }, heightFt: 8 });

    // updateColumnNoHistory
    let before = useCADStore.getState().past.length;
    useCADStore.getState().updateColumnNoHistory(roomId, id, { materialId: "mat-z" });
    expect(useCADStore.getState().past.length).toBe(before);
    expect(activeDoc().columns![id].materialId).toBe("mat-z");

    // moveColumnNoHistory
    before = useCADStore.getState().past.length;
    useCADStore.getState().moveColumnNoHistory(roomId, id, { x: 9, y: 9 });
    expect(useCADStore.getState().past.length).toBe(before);
    expect(activeDoc().columns![id].position).toEqual({ x: 9, y: 9 });

    // resizeColumnAxisNoHistory
    before = useCADStore.getState().past.length;
    useCADStore.getState().resizeColumnAxisNoHistory(roomId, id, "width", 4);
    expect(useCADStore.getState().past.length).toBe(before);
    expect(activeDoc().columns![id].widthFt).toBe(4);

    // resizeColumnHeightNoHistory
    before = useCADStore.getState().past.length;
    useCADStore.getState().resizeColumnHeightNoHistory(roomId, id, 15);
    expect(useCADStore.getState().past.length).toBe(before);
    expect(activeDoc().columns![id].heightFt).toBe(15);

    // rotateColumnNoHistory
    before = useCADStore.getState().past.length;
    useCADStore.getState().rotateColumnNoHistory(roomId, id, 90);
    expect(useCADStore.getState().past.length).toBe(before);
    expect(activeDoc().columns![id].rotation).toBe(90);

    // removeColumnNoHistory
    before = useCADStore.getState().past.length;
    useCADStore.getState().removeColumnNoHistory(roomId, id);
    expect(useCADStore.getState().past.length).toBe(before);
    expect(activeDoc().columns?.[id]).toBeUndefined();
  });

  it("U13: setSavedCameraOnColumnNoHistory + clearColumnSavedCameraNoHistory roundtrip without history", () => {
    const roomId = useCADStore.getState().activeRoomId!;
    const id = useCADStore
      .getState()
      .addColumn(roomId, { position: { x: 0, y: 0 }, heightFt: 8 });

    const before = useCADStore.getState().past.length;
    useCADStore
      .getState()
      .setSavedCameraOnColumnNoHistory(id, [1, 2, 3], [4, 5, 6]);

    let col = activeDoc().columns![id];
    expect(col.savedCameraPos).toEqual([1, 2, 3]);
    expect(col.savedCameraTarget).toEqual([4, 5, 6]);
    expect(useCADStore.getState().past.length).toBe(before);

    useCADStore.getState().clearColumnSavedCameraNoHistory(id);
    col = activeDoc().columns![id];
    expect(col.savedCameraPos).toBeUndefined();
    expect(col.savedCameraTarget).toBeUndefined();
    expect(useCADStore.getState().past.length).toBe(before);

    // clearSavedCameraNoHistory("column", id) also clears.
    useCADStore
      .getState()
      .setSavedCameraOnColumnNoHistory(id, [9, 9, 9], [0, 0, 0]);
    useCADStore.getState().clearSavedCameraNoHistory("column", id);
    col = activeDoc().columns![id];
    expect(col.savedCameraPos).toBeUndefined();
    expect(col.savedCameraTarget).toBeUndefined();
  });
});
