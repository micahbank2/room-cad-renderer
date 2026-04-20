/**
 * Phase 29 Wave 0 — EDIT-21 single-undo regression guard.
 *
 * Locks in that resizeWallByLabel pushes exactly one history entry. Should
 * PASS against current cadStore.ts (single pushHistory inside produce) — any
 * future edit that accidentally adds a second pushHistory call will fail here.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useCADStore, resetCADStoreForTests } from "@/stores/cadStore";
import { wallLength } from "@/lib/geometry";

const WALL_ID = "wall_undo_test";

describe("cadStore.resizeWallByLabel (EDIT-21 single-undo)", () => {
  let wallId: string;

  beforeEach(() => {
    resetCADStoreForTests();
    useCADStore.setState({
      rooms: {
        room_main: {
          id: "room_main",
          name: "Main Room",
          room: { width: 20, length: 16, wallHeight: 8 },
          walls: {
            [WALL_ID]: {
              id: WALL_ID,
              start: { x: 0, y: 0 },
              end: { x: 10, y: 0 },
              thickness: 0.5,
              height: 8,
              openings: [],
            },
          },
          placedProducts: {},
        },
      },
      activeRoomId: "room_main",
      past: [],
      future: [],
    });
    wallId = WALL_ID;
  });

  it("pushes exactly ONE past entry per call", () => {
    const priorPast = useCADStore.getState().past.length;
    useCADStore.getState().resizeWallByLabel(wallId, 15);
    const afterPast = useCADStore.getState().past.length;
    expect(afterPast - priorPast).toBe(1);
  });

  it("undo fully reverts the edit in one step", () => {
    const priorLen = wallLength(useCADStore.getState().rooms.room_main.walls[wallId]);
    useCADStore.getState().resizeWallByLabel(wallId, 15);
    expect(
      wallLength(useCADStore.getState().rooms.room_main.walls[wallId]),
    ).toBeCloseTo(15, 5);
    useCADStore.getState().undo();
    expect(
      wallLength(useCADStore.getState().rooms.room_main.walls[wallId]),
    ).toBeCloseTo(priorLen, 5);
  });

  it("silently ignores unknown wall id (no history entry)", () => {
    const priorPast = useCADStore.getState().past.length;
    useCADStore.getState().resizeWallByLabel("does_not_exist", 15);
    // Either no-op or early-return — MUST NOT push a history entry for a missing wall
    expect(useCADStore.getState().past.length).toBeLessThanOrEqual(priorPast);
  });
});
