/**
 * Phase 34 Plan 00 — Task 3: countTextureRefs scan coverage.
 *
 * Verifies all scan sites from RESEARCH.md §G:
 *   - Wall wallpaper side A + side B (per-wall, per-side)
 *   - FloorMaterial with kind === "user-texture" and matching id
 *   - Ceiling.userTextureId
 * Across single-room and multi-room snapshots.
 */
import { describe, it, expect } from "vitest";
import { countTextureRefs } from "@/lib/countTextureRefs";
import type { CADSnapshot, RoomDoc } from "@/types/cad";

function makeRoom(overrides: Partial<RoomDoc> = {}): RoomDoc {
  return {
    id: overrides.id ?? "r1",
    name: overrides.name ?? "Room",
    room: { width: 10, length: 10, wallHeight: 8 },
    walls: {},
    placedProducts: {},
    ...overrides,
  };
}

function makeSnapshot(rooms: RoomDoc[]): CADSnapshot {
  const map: Record<string, RoomDoc> = {};
  for (const r of rooms) map[r.id] = r;
  return {
    version: 2,
    rooms: map,
    activeRoomId: rooms[0]?.id ?? null,
  };
}

const TEX = "utex_oak_v1";

describe("countTextureRefs — scan coverage (Phase 34 D-07, LIB-08)", () => {
  it("returns 0 for an empty snapshot (no rooms, no surfaces)", () => {
    const snap: CADSnapshot = { version: 2, rooms: {}, activeRoomId: null };
    expect(countTextureRefs(snap, TEX)).toBe(0);
  });

  it("returns 1 when a single wall side-A wallpaper references the id", () => {
    const room = makeRoom({
      walls: {
        w1: {
          id: "w1",
          start: { x: 0, y: 0 },
          end: { x: 10, y: 0 },
          thickness: 0.5,
          height: 8,
          openings: [],
          wallpaper: {
            A: { kind: "pattern", userTextureId: TEX, scaleFt: 2 },
          },
        },
      },
    });
    expect(countTextureRefs(makeSnapshot([room]), TEX)).toBe(1);
  });

  it("returns 2 when both wall sides A and B reference the same id (per-side counting)", () => {
    const room = makeRoom({
      walls: {
        w1: {
          id: "w1",
          start: { x: 0, y: 0 },
          end: { x: 10, y: 0 },
          thickness: 0.5,
          height: 8,
          openings: [],
          wallpaper: {
            A: { kind: "pattern", userTextureId: TEX, scaleFt: 2 },
            B: { kind: "pattern", userTextureId: TEX, scaleFt: 2 },
          },
        },
      },
    });
    expect(countTextureRefs(makeSnapshot([room]), TEX)).toBe(2);
  });

  it("returns 1 when FloorMaterial.kind='user-texture' matches the id", () => {
    const room = makeRoom({
      floorMaterial: {
        kind: "user-texture",
        userTextureId: TEX,
        scaleFt: 2,
        rotationDeg: 0,
      },
    });
    expect(countTextureRefs(makeSnapshot([room]), TEX)).toBe(1);
  });

  it("does NOT count a FloorMaterial with kind='custom' even if it carries userTextureId", () => {
    // Guard: the kind check is strict — a 'custom' floor (legacy) must not
    // double-count via a stray userTextureId field.
    const room = makeRoom({
      floorMaterial: {
        kind: "custom",
        imageUrl: "data:image/jpeg;base64,AAAA",
        userTextureId: TEX, // would be defensive leftover; must be ignored
        scaleFt: 2,
        rotationDeg: 0,
      },
    });
    expect(countTextureRefs(makeSnapshot([room]), TEX)).toBe(0);
  });

  it("returns 6 for multi-room snapshot with 2 walls(A only) + 1 floor + 3 ceilings all referencing id", () => {
    const roomA = makeRoom({
      id: "A",
      name: "Living",
      walls: {
        w1: {
          id: "w1",
          start: { x: 0, y: 0 },
          end: { x: 10, y: 0 },
          thickness: 0.5,
          height: 8,
          openings: [],
          wallpaper: { A: { kind: "pattern", userTextureId: TEX, scaleFt: 2 } },
        },
        w2: {
          id: "w2",
          start: { x: 10, y: 0 },
          end: { x: 10, y: 10 },
          thickness: 0.5,
          height: 8,
          openings: [],
          wallpaper: { A: { kind: "pattern", userTextureId: TEX, scaleFt: 2 } },
        },
      },
      floorMaterial: {
        kind: "user-texture",
        userTextureId: TEX,
        scaleFt: 2,
        rotationDeg: 0,
      },
      ceilings: {
        c1: { id: "c1", points: [{ x: 0, y: 0 }], height: 8, material: "#fff", userTextureId: TEX },
        c2: { id: "c2", points: [{ x: 0, y: 0 }], height: 8, material: "#fff", userTextureId: TEX },
      },
    });
    const roomB = makeRoom({
      id: "B",
      name: "Bedroom",
      ceilings: {
        c3: { id: "c3", points: [{ x: 0, y: 0 }], height: 8, material: "#fff", userTextureId: TEX },
      },
    });
    // 2 walls (A only) + 1 floor + 3 ceilings = 6
    expect(countTextureRefs(makeSnapshot([roomA, roomB]), TEX)).toBe(6);
  });

  it("returns 0 when snapshot references a different userTextureId", () => {
    const room = makeRoom({
      walls: {
        w1: {
          id: "w1",
          start: { x: 0, y: 0 },
          end: { x: 10, y: 0 },
          thickness: 0.5,
          height: 8,
          openings: [],
          wallpaper: {
            A: { kind: "pattern", userTextureId: "utex_something_else", scaleFt: 2 },
          },
        },
      },
      floorMaterial: {
        kind: "user-texture",
        userTextureId: "utex_other",
        scaleFt: 2,
        rotationDeg: 0,
      },
      ceilings: {
        c1: {
          id: "c1",
          points: [{ x: 0, y: 0 }],
          height: 8,
          material: "#fff",
          userTextureId: "utex_nope",
        },
      },
    });
    expect(countTextureRefs(makeSnapshot([room]), TEX)).toBe(0);
  });
});
