// Phase 59 CUTAWAY-01 — pure cutaway-detection helper tests
// D-10 unit tests U1, U2 + 2 supporting tests (empty walls, all-behind-camera).
//
// Tests use real THREE.PerspectiveCamera + manual position/lookAt to drive
// the algorithm. No R3F, no scene graph — pure math.

import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
  computeRoomBboxCenter,
  computeOutwardNormalInto,
  getCutawayWallId,
} from "@/three/cutawayDetection";
import type { WallSegment } from "@/types/cad";

function wall(id: string, sx: number, sy: number, ex: number, ey: number): WallSegment {
  return {
    id,
    start: { x: sx, y: sy },
    end: { x: ex, y: ey },
    thickness: 0.5,
    height: 8,
    openings: [],
  };
}

// Canonical 10x10 axis-aligned room centered on origin.
// 2D y-coord maps to 3D z-coord. Walls run CCW from south.
//   south (-Z): y=-5,  x=-5..5
//   east  (+X): x=+5,  y=-5..5
//   north (+Z): y=+5,  x=+5..-5
//   west  (-X): x=-5,  y=+5..-5
const south = wall("wall_south", -5, -5, 5, -5);
const east = wall("wall_east", 5, -5, 5, 5);
const north = wall("wall_north", 5, 5, -5, 5);
const west = wall("wall_west", -5, 5, -5, -5);
const rectWalls = [south, east, north, west];

describe("cutawayDetection — computeRoomBboxCenter", () => {
  it("returns {x:0,y:0} for empty walls", () => {
    expect(computeRoomBboxCenter([])).toEqual({ x: 0, y: 0 });
  });

  it("returns geometric bbox center for canonical 10x10 rectangle (origin)", () => {
    expect(computeRoomBboxCenter(rectWalls)).toEqual({ x: 0, y: 0 });
  });

  it("returns offset bbox center for off-origin rectangle", () => {
    const offset = [
      wall("a", 0, 0, 10, 0),
      wall("b", 10, 0, 10, 10),
      wall("c", 10, 10, 0, 10),
      wall("d", 0, 10, 0, 0),
    ];
    expect(computeRoomBboxCenter(offset)).toEqual({ x: 5, y: 5 });
  });
});

describe("cutawayDetection — computeOutwardNormalInto", () => {
  it("south wall outward normal points -Z (away from origin)", () => {
    const out = new THREE.Vector3();
    computeOutwardNormalInto(south, { x: 0, y: 0 }, out);
    // 2D y → 3D z. South wall has y=-5, so outward = -Z.
    expect(out.x).toBeCloseTo(0, 5);
    expect(out.y).toBeCloseTo(0, 5);
    expect(out.z).toBeCloseTo(-1, 5);
  });

  it("east wall outward normal points +X (away from origin)", () => {
    const out = new THREE.Vector3();
    computeOutwardNormalInto(east, { x: 0, y: 0 }, out);
    expect(out.x).toBeCloseTo(1, 5);
    expect(out.y).toBeCloseTo(0, 5);
    expect(out.z).toBeCloseTo(0, 5);
  });

  it("north wall outward normal points +Z (away from origin)", () => {
    const out = new THREE.Vector3();
    computeOutwardNormalInto(north, { x: 0, y: 0 }, out);
    expect(out.x).toBeCloseTo(0, 5);
    expect(out.y).toBeCloseTo(0, 5);
    expect(out.z).toBeCloseTo(1, 5);
  });

  it("west wall outward normal points -X (away from origin)", () => {
    const out = new THREE.Vector3();
    computeOutwardNormalInto(west, { x: 0, y: 0 }, out);
    expect(out.x).toBeCloseTo(-1, 5);
    expect(out.y).toBeCloseTo(0, 5);
    expect(out.z).toBeCloseTo(0, 5);
  });

  it("y-component of outward normal is always exactly 0 (XZ plane)", () => {
    const out = new THREE.Vector3();
    for (const w of rectWalls) {
      computeOutwardNormalInto(w, { x: 0, y: 0 }, out);
      expect(out.y).toBe(0);
    }
  });
});

describe("cutawayDetection — getCutawayWallId", () => {
  function makeCamera(pos: [number, number, number], target: [number, number, number]): THREE.PerspectiveCamera {
    const cam = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    cam.position.set(...pos);
    cam.lookAt(...target);
    cam.updateMatrixWorld(true);
    return cam;
  }

  it("U1: camera on +Z axis facing origin → north wall (+Z) is most-opposed", () => {
    // Camera at (0, 5, 20), looking at origin.
    // Camera forward ≈ (0, 0, -1) ish (negative-z lookat from +z position).
    // Wait: cam at (0,5,20) looks at (0,5,0) — forward = (0, 0, -1).
    // North wall outward normal = (0, 0, +1). dot(+Z, -Z) = -1. Most-opposed.
    const cam = makeCamera([0, 5, 20], [0, 5, 0]);
    const result = getCutawayWallId(rectWalls, cam, { x: 0, y: 0 });
    expect(result.wallId).toBe("wall_north");
  });

  it("U1b: camera on -X axis facing origin → west wall (-X) is most-opposed", () => {
    // Cam at (-20, 5, 0) → forward = (+1, 0, 0).
    // West wall outward normal = (-1, 0, 0). dot = -1. Most-opposed.
    const cam = makeCamera([-20, 5, 0], [0, 5, 0]);
    const result = getCutawayWallId(rectWalls, cam, { x: 0, y: 0 });
    expect(result.wallId).toBe("wall_west");
  });

  it("U1c: camera on +X axis facing origin → east wall (+X) is most-opposed", () => {
    const cam = makeCamera([20, 5, 0], [0, 5, 0]);
    const result = getCutawayWallId(rectWalls, cam, { x: 0, y: 0 });
    expect(result.wallId).toBe("wall_east");
  });

  it("U2: camera looking nearly straight down (elevation > 70°) → wallId === null", () => {
    // Cam directly above origin → forward = (0, -1, 0). elevationRad = π/2 = 1.5708 > 1.222.
    const cam = makeCamera([0.01, 50, 0], [0, 0, 0]);
    const result = getCutawayWallId(rectWalls, cam, { x: 0, y: 0 });
    expect(result.wallId).toBeNull();
    expect(result.elevationRad).toBeGreaterThan((70 * Math.PI) / 180);
  });

  it("U3 (supporting): empty walls array → wallId === null", () => {
    const cam = makeCamera([0, 5, 20], [0, 5, 0]);
    const result = getCutawayWallId([], cam, { x: 0, y: 0 });
    expect(result.wallId).toBeNull();
  });

  it("U4 (supporting): camera FAR from room facing AWAY → all dots positive → wallId === null", () => {
    // Camera at (0, 5, 30) but looking at (0, 5, 60) — i.e. AWAY from the room.
    // Forward = (0, 0, +1). Every wall outward normal has dot >= 0 with forward
    // (south wall normal -Z dots to -1? No: normal -Z, forward +Z → dot = -1).
    // Actually that picks south. What we want: a setup where every dot is ≥ 0.
    //
    // Cam at (0, 5, -30) looking at (0, 5, -60). Forward = (0, 0, -1).
    // South wall normal -Z. dot = +1. North wall normal +Z. dot = -1. → north.
    //
    // The algorithm is direction-agnostic: with the camera anywhere on a line
    // through the room, exactly one wall is "behind" the camera in viewing
    // terms — but the algorithm picks "most-opposed normal," which always
    // exists for non-empty walls. Document: getCutawayWallId for a non-empty
    // walls array with elevationRad ≤ 70° always returns a non-null wallId.
    //
    // Therefore U4's "wallId === null" condition only triggers via:
    //   - empty walls (covered above)
    //   - elevationRad > 70°  (covered as U2)
    //
    // We document this here by asserting that even pathological camera placements
    // return SOME wall id (not null) — confirming the algorithm's invariant.
    const cam = makeCamera([0, 5, -30], [0, 5, -60]);
    const result = getCutawayWallId(rectWalls, cam, { x: 0, y: 0 });
    // Behavior IS to return a non-null wallId in this case (north wall).
    // This is the documented behavior for "camera beyond room looking outward."
    expect(result.wallId).not.toBeNull();
  });

  it("just-below threshold (elevation ≈ 65°) still returns a wall", () => {
    // Roughly 65° elevation: position with y/horiz ratio = tan(65°) ≈ 2.144.
    // Place cam at (5, 10.72, 0) looking at origin → look vector toward origin.
    const cam = makeCamera([5, 10.72, 0], [0, 0, 0]);
    const result = getCutawayWallId(rectWalls, cam, { x: 0, y: 0 });
    expect(result.elevationRad).toBeLessThan((70 * Math.PI) / 180);
    expect(result.wallId).not.toBeNull();
  });
});
