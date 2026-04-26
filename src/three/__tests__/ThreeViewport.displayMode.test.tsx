import { describe, it, expect } from "vitest";
import { computeRoomOffsets } from "@/three/RoomGroup";
import type { RoomDoc } from "@/types/cad";

const mkRoom = (id: string, w: number, l: number): RoomDoc => ({
  id,
  name: id,
  room: { width: w, length: l, wallHeight: 8 },
  walls: {},
  placedProducts: {},
  placedCustomElements: {},
  ceilings: {},
} as RoomDoc);

describe("computeRoomOffsets — Phase 47 D-03", () => {
  it("NORMAL: every room offsetX === 0", () => {
    const rooms = {
      r1: mkRoom("r1", 20, 16),
      r2: mkRoom("r2", 12, 10),
      r3: mkRoom("r3", 30, 25),
    };
    const offsets = computeRoomOffsets(rooms, "normal");
    expect(offsets).toEqual({ r1: 0, r2: 0, r3: 0 });
  });

  it("EXPLODE: cumulative sum of max(w,l) * 1.25 in Object.keys order (D-03 verbatim)", () => {
    const rooms = {
      r1: mkRoom("r1", 20, 16), // max=20 → contributes 25.0 to next
      r2: mkRoom("r2", 12, 10), // max=12 → contributes 15.0
      r3: mkRoom("r3", 30, 25),
    };
    const offsets = computeRoomOffsets(rooms, "explode");
    expect(offsets.r1).toBeCloseTo(0, 4);
    expect(offsets.r2).toBeCloseTo(25.0, 4);
    expect(offsets.r3).toBeCloseTo(40.0, 4);
  });

  it("EXPLODE: max(width, length) is the bbox dimension (length wins when length > width)", () => {
    const rooms = {
      a: mkRoom("a", 10, 30), // max = 30 → next offset = 37.5
      b: mkRoom("b", 5, 5),
    };
    const offsets = computeRoomOffsets(rooms, "explode");
    expect(offsets.a).toBeCloseTo(0, 4);
    expect(offsets.b).toBeCloseTo(37.5, 4);
  });

  it("SOLO: all offsets 0 (Plan 02 contract — SOLO renders only active room at origin)", () => {
    const rooms = { r1: mkRoom("r1", 20, 16), r2: mkRoom("r2", 12, 10) };
    const offsets = computeRoomOffsets(rooms, "solo");
    expect(offsets.r1).toBe(0);
    expect(offsets.r2).toBe(0);
  });

  it("empty rooms record returns empty offsets", () => {
    expect(computeRoomOffsets({}, "normal")).toEqual({});
    expect(computeRoomOffsets({}, "explode")).toEqual({});
    expect(computeRoomOffsets({}, "solo")).toEqual({});
  });

  it("Object.keys insertion order is the index source (deterministic across renders)", () => {
    const rooms = {
      first: mkRoom("first", 10, 10),
      second: mkRoom("second", 10, 10),
      third: mkRoom("third", 10, 10),
    };
    const offsets = computeRoomOffsets(rooms, "explode");
    // each contributes 12.5 (max=10 * 1.25)
    expect(offsets.first).toBeCloseTo(0, 4);
    expect(offsets.second).toBeCloseTo(12.5, 4);
    expect(offsets.third).toBeCloseTo(25.0, 4);
  });
});

describe("ThreeViewport displayMode integration (Plan 02 wires)", () => {
  it.todo("D-04: SOLO + hiddenIds compose — hidden wall stays hidden in active-room render");
  it.todo("D-06: SOLO + null activeRoomId → zero room groups rendered");
  it.todo("NORMAL: all rooms render at offsetX=0 — multi-room scene-graph confirmed");
  it.todo("EXPLODE: all rooms render at correct offsetX per computeRoomOffsets");
});
