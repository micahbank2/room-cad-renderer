import { describe, it, expect } from "vitest";
import { canMoveTo, WALL_PADDING } from "@/three/walkCollision";
import type { Room, WallSegment } from "@/types/cad";

const room: Room = { width: 10, length: 10, wallHeight: 8 };

function mkWall(start: { x: number; y: number }, end: { x: number; y: number }, thickness = 0.5): WallSegment {
  return { id: "w1", start, end, thickness, height: 8, openings: [] };
}

describe("walkCollision canMoveTo", () => {
  it("returns target point when no walls block the path", () => {
    const result = canMoveTo({ x: 5, z: 5 }, { x: 6, z: 5 }, [], room);
    expect(result).toEqual({ x: 6, z: 5 });
  });

  it("blocks movement when target crosses a wall segment AABB with default 1ft padding", () => {
    // Wall along z=5 from x=0 to x=10 (horizontal wall)
    const wall = mkWall({ x: 0, y: 5 }, { x: 10, y: 5 });
    // Attempt to walk from z=3 to z=5 — target is inside padded AABB (padding 1 + half-thickness 0.25)
    const result = canMoveTo({ x: 5, z: 3 }, { x: 5, z: 5 }, [wall], room);
    // Should not end up inside the wall's padded AABB
    expect(result.z).toBeLessThan(5 - 1); // stayed outside padding
  });

  it("slides along wall when approaching at an angle (returns partial movement)", () => {
    // Wall at z=8, horizontal
    const wall = mkWall({ x: 0, y: 8 }, { x: 10, y: 8 });
    // Try to move diagonally into the wall from (2, 5) to (4, 8)
    const result = canMoveTo({ x: 2, z: 5 }, { x: 4, z: 8 }, [wall], room);
    // x should have advanced (slide along wall), z should be blocked
    expect(result.x).toBe(4);
    expect(result.z).toBeLessThan(8 - 1);
  });

  it("clamps target x to [0, room.width]", () => {
    const result = canMoveTo({ x: 1, z: 5 }, { x: -2, z: 5 }, [], room);
    expect(result.x).toBe(0);
    expect(result.z).toBe(5);
  });

  it("clamps target z to [0, room.length]", () => {
    const result = canMoveTo({ x: 5, z: 9 }, { x: 5, z: 15 }, [], room);
    expect(result.z).toBe(10);
    expect(result.x).toBe(5);
  });

  it("leaves valid in-bounds points unchanged (no walls)", () => {
    const result = canMoveTo({ x: 5, z: 5 }, { x: 7, z: 3 }, [], room);
    expect(result).toEqual({ x: 7, z: 3 });
  });

  it("custom padding parameter overrides the 1ft default", () => {
    // Wall at z=5
    const wall = mkWall({ x: 0, y: 5 }, { x: 10, y: 5 });
    // With padding 0 (ignoring safety buffer), from z=3 to z=4 should be allowed
    const resultNoPadding = canMoveTo({ x: 5, z: 3 }, { x: 5, z: 4 }, [wall], room, 0);
    expect(resultNoPadding.z).toBe(4);
    // With padding 3, same move would be blocked (3 + 0.25 = 3.25 buffer from z=5, so z<=1.75)
    const resultLargePadding = canMoveTo({ x: 5, z: 1 }, { x: 5, z: 2 }, [wall], room, 3);
    expect(resultLargePadding.z).toBeLessThanOrEqual(1.75);
  });

  it("WALL_PADDING constant equals 1", () => {
    expect(WALL_PADDING).toBe(1);
  });

  it("ignores products and openings (walls-only signature)", () => {
    // canMoveTo signature doesn't take products/openings — this test documents intent
    const wall = mkWall({ x: 0, y: 5 }, { x: 10, y: 5 });
    wall.openings.push({ id: "op1", type: "door", offset: 5, width: 3, height: 7, sillHeight: 0 });
    // Door opening does NOT create a passable gap in v1 per D-07
    const result = canMoveTo({ x: 5, z: 3 }, { x: 5, z: 5 }, [wall], room);
    expect(result.z).toBeLessThan(5 - 1);
  });
});

describe("walkCollision room bounds clamp", () => {
  it("clamps x to [0, room.width]", () => {
    expect(canMoveTo({ x: 5, z: 5 }, { x: -3, z: 5 }, [], room).x).toBe(0);
    expect(canMoveTo({ x: 5, z: 5 }, { x: 99, z: 5 }, [], room).x).toBe(10);
  });

  it("clamps z to [0, room.length]", () => {
    expect(canMoveTo({ x: 5, z: 5 }, { x: 5, z: -3 }, [], room).z).toBe(0);
    expect(canMoveTo({ x: 5, z: 5 }, { x: 5, z: 99 }, [], room).z).toBe(10);
  });

  it("leaves valid in-bounds points unchanged", () => {
    const result = canMoveTo({ x: 3, z: 3 }, { x: 7, z: 7 }, [], room);
    expect(result).toEqual({ x: 7, z: 7 });
  });
});
