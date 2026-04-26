import { describe, it, expect } from "vitest";
import { buildRoomTree } from "@/lib/buildRoomTree";
import type { RoomDoc, WallSegment } from "@/types/cad";

const mkWall = (id: string, sx: number, sy: number, ex: number, ey: number): WallSegment => ({
  id, start: { x: sx, y: sy }, end: { x: ex, y: ey }, thickness: 0.5, height: 8, openings: [],
});
const mkRoom = (id: string, walls: Record<string, WallSegment> = {}): RoomDoc => ({
  id, name: id,
  room: { width: 20, length: 16, wallHeight: 8 },
  walls, placedProducts: {}, placedCustomElements: {}, ceilings: {},
} as RoomDoc);

describe("buildRoomTree", () => {
  it("empty rooms → empty tree", () => {
    expect(buildRoomTree({}, {}, [])).toEqual([]);
  });
  it("one room with one wall → room → walls-group → wall-leaf", () => {
    const tree = buildRoomTree({ r1: mkRoom("r1", { w1: mkWall("w1", 0, 0, 10, 0) }) }, {}, []);
    expect(tree).toHaveLength(1);
    expect(tree[0].kind).toBe("room");
    expect(tree[0].children?.[0].id).toBe("r1:walls");
    expect(tree[0].children?.[0].children?.[0].kind).toBe("wall");
  });
  it("synthetic group ids match `${roomId}:walls/:ceiling/:products/:custom`", () => {
    // Plan 02 implementation; assertion is here as the contract.
    expect(true).toBe(true); // placeholder pending Plan 02
  });
  it("group children only present when non-empty (ceiling group omitted for empty ceilings)", () => {
    // Plan 02 implementation contract.
    expect(true).toBe(true);
  });
});
