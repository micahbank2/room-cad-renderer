/**
 * Phase 30 Wave 0 — red stubs for the smart-snap pure engine.
 *
 * These tests lock the SNAP-01/02/03 contract in executable form BEFORE any
 * implementation exists under `src/canvas/snapEngine.ts`. They MUST all fail
 * on this commit — module-resolution error is the expected red state, and
 * Plan 02 (`src/canvas/snapEngine.ts` creation) turns them green.
 *
 * See:
 *   - .planning/phases/30-smart-snapping/30-CONTEXT.md (decisions D-01..D-09c)
 *   - .planning/phases/30-smart-snapping/30-RESEARCH.md §Per-axis algorithm,
 *     §Phase Requirements → Test Map
 *   - src/lib/geometry.ts (snapPoint / closestPointOnWall — building blocks)
 *
 * All coordinates in feet unless suffixed `_px`.
 */
import { describe, it, expect } from "vitest";
import {
  computeSnap,
  buildSceneGeometry,
  SNAP_TOLERANCE_PX,
  type BBox,
  type SceneGeometry,
} from "@/canvas/snapEngine";

// --- Fixtures -------------------------------------------------------------

function emptyScene(): SceneGeometry {
  return { wallEdges: [], wallMidpoints: [], objectBBoxes: [] };
}

/** One vertical wall along x=0 from y=0..10 with a right face at x=0.25
 *  (0.5 thickness / 2 = 0.25) — used for edge snap tests. */
function sceneOneVerticalWall(): SceneGeometry {
  return {
    wallEdges: [
      // left face x = -0.25
      { a: { x: -0.25, y: 0 }, b: { x: -0.25, y: 10 }, wallId: "w1" },
      // right face x = 0.25
      { a: { x: 0.25, y: 0 }, b: { x: 0.25, y: 10 }, wallId: "w1" },
    ],
    wallMidpoints: [
      { point: { x: 0, y: 5 }, wallId: "w1", axis: "y" },
    ],
    objectBBoxes: [],
  };
}

/** A target object bbox centered at (5,5) with 1ft extents in both axes. */
function sceneOneObject(): SceneGeometry {
  return {
    wallEdges: [],
    wallMidpoints: [],
    objectBBoxes: [
      { id: "p_target", minX: 4.5, maxX: 5.5, minY: 4.5, maxY: 5.5 },
    ],
  };
}

/** Dragged-object bbox whose LEFT edge sits at x=0.3 — 0.05ft from wall right
 *  face at x=0.25. Width 2, depth 2, centered at (1.3, 5). */
function draggedBBoxNearWallRight(): BBox {
  return { id: "p_dragged", minX: 0.3, maxX: 2.3, minY: 4, maxY: 6 };
}

// --- SNAP_TOLERANCE_PX ----------------------------------------------------

describe("SNAP_TOLERANCE_PX", () => {
  it("exports the locked pixel tolerance (D-04)", () => {
    expect(SNAP_TOLERANCE_PX).toBe(8);
  });
});

// --- buildSceneGeometry ---------------------------------------------------

describe("buildSceneGeometry", () => {
  it("excludes the dragged object by id (D-02b)", () => {
    // Construct a minimal state shape matching cadStore.getState().
    // We use `as any` because test only exercises the filter + shape
    // contract — not the full store type surface.
    const state = {
      activeRoomId: "room_main",
      rooms: {
        room_main: {
          id: "room_main",
          name: "Main",
          room: { width: 20, length: 20, wallHeight: 8 },
          walls: {},
          placedProducts: {
            p1: { id: "p1", productId: "prod_a", position: { x: 2, y: 2 }, rotation: 0 },
            p2: { id: "p2", productId: "prod_a", position: { x: 4, y: 4 }, rotation: 0 },
            p3: { id: "p3", productId: "prod_a", position: { x: 6, y: 6 }, rotation: 0 },
          },
          placedCustomElements: {},
          ceilings: {},
        },
      },
    } as any;
    const productLibrary = [
      { id: "prod_a", name: "Sofa", category: "seating", width: 2, depth: 2, height: 2, material: "wood" } as any,
    ];
    const scene = buildSceneGeometry(state, "p2", productLibrary as any, {} as any);
    // Dragged id p2 must not appear.
    expect(scene.objectBBoxes.find((b) => b.id === "p2")).toBeUndefined();
    expect(scene.objectBBoxes).toHaveLength(2);
  });

  it("returns wallEdges with 2 segments per wall (left + right outer faces)", () => {
    const state = {
      activeRoomId: "room_main",
      rooms: {
        room_main: {
          id: "room_main",
          name: "Main",
          room: { width: 20, length: 20, wallHeight: 8 },
          walls: {
            w1: { id: "w1", start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, thickness: 0.5, height: 8, openings: [] },
          },
          placedProducts: {},
          placedCustomElements: {},
          ceilings: {},
        },
      },
    } as any;
    const scene = buildSceneGeometry(state, "__none__", [] as any, {} as any);
    expect(scene.wallEdges).toHaveLength(2);
    // Each segment tagged by wallId for exclude-self hygiene.
    for (const e of scene.wallEdges) expect(e.wallId).toBe("w1");
  });

  it("returns wallMidpoints with point = (start+end)/2 and wallId set", () => {
    const state = {
      activeRoomId: "room_main",
      rooms: {
        room_main: {
          id: "room_main",
          name: "Main",
          room: { width: 20, length: 20, wallHeight: 8 },
          walls: {
            w1: { id: "w1", start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, thickness: 0.5, height: 8, openings: [] },
          },
          placedProducts: {},
          placedCustomElements: {},
          ceilings: {},
        },
      },
    } as any;
    const scene = buildSceneGeometry(state, "__none__", [] as any, {} as any);
    expect(scene.wallMidpoints).toHaveLength(1);
    const mp = scene.wallMidpoints[0];
    expect(mp.point.x).toBe(5);
    expect(mp.point.y).toBe(0);
    expect(mp.wallId).toBe("w1");
  });
});

// --- computeSnap — SNAP-01 edge snap -------------------------------------

describe("computeSnap — SNAP-01 edges", () => {
  it("edge-to-wall-face X snap: dragged left edge at 0.3 snaps to wall right face at 0.25", () => {
    // scale=50 → tolFt = 8/50 = 0.16ft. |0.3 - 0.25| = 0.05 < 0.16 → snap.
    const scene = sceneOneVerticalWall();
    const bbox = draggedBBoxNearWallRight();
    const result = computeSnap({
      candidate: { pos: { x: 1.3, y: 5 }, bbox },
      scene,
      tolerancePx: SNAP_TOLERANCE_PX,
      scale: 50,
      gridSnap: 0,
    });
    // bbox.minX should now be 0.25 → center shifts by (0.25 - 0.3) = -0.05
    expect(result.snapped.x).toBeCloseTo(1.3 - 0.05, 5);
    // Emits exactly 1 x-axis guide at wall right face.
    const xGuides = result.guides.filter(
      (g) => g.kind === "axis" && g.axis === "x",
    );
    expect(xGuides).toHaveLength(1);
    expect((xGuides[0] as { kind: "axis"; axis: "x"; value: number }).value).toBeCloseTo(0.25, 5);
  });

  it("edge-to-object-edge Y snap: dragged bottom snaps to another object's top edge", () => {
    // Object spans y ∈ [4.5, 5.5]. Dragged bbox top = 4.48 → |4.48 - 4.5| = 0.02 < tolFt(0.16).
    const scene = sceneOneObject();
    const bbox: BBox = { id: "p_dragged", minX: 3, maxX: 5, minY: 4.48, maxY: 6.48 };
    const result = computeSnap({
      candidate: { pos: { x: 4, y: 5.48 }, bbox },
      scene,
      tolerancePx: SNAP_TOLERANCE_PX,
      scale: 50,
      gridSnap: 0,
    });
    // bbox.minY should become 4.5 → center y shifts by 0.02
    expect(result.snapped.y).toBeCloseTo(5.48 + 0.02, 5);
    const yGuides = result.guides.filter(
      (g) => g.kind === "axis" && g.axis === "y",
    );
    expect(yGuides).toHaveLength(1);
  });

  it("out-of-tolerance on both axes AND gridSnap=0.5 → returns snapPoint-rounded values; guides = [] (D-05b)", () => {
    const scene = sceneOneVerticalWall();
    // Far away from the wall; gridSnap fallback applies per axis.
    const bbox: BBox = { id: "p_dragged", minX: 7.2, maxX: 9.2, minY: 3.3, maxY: 5.3 };
    const result = computeSnap({
      candidate: { pos: { x: 8.2, y: 4.3 }, bbox },
      scene,
      tolerancePx: SNAP_TOLERANCE_PX,
      scale: 50,
      gridSnap: 0.5,
    });
    // 8.2 rounds to 8.0 at 0.5 grid; 4.3 rounds to 4.5.
    expect(result.snapped.x).toBeCloseTo(8.0, 5);
    expect(result.snapped.y).toBeCloseTo(4.5, 5);
    expect(result.guides).toEqual([]);
  });

  it("out-of-tolerance AND gridSnap=0 → returns candidate.pos unchanged; guides = []", () => {
    const scene = sceneOneVerticalWall();
    const bbox: BBox = { id: "p_dragged", minX: 7.2, maxX: 9.2, minY: 3.3, maxY: 5.3 };
    const pos = { x: 8.2, y: 4.3 };
    const result = computeSnap({
      candidate: { pos, bbox },
      scene,
      tolerancePx: SNAP_TOLERANCE_PX,
      scale: 50,
      gridSnap: 0,
    });
    expect(result.snapped.x).toBe(pos.x);
    expect(result.snapped.y).toBe(pos.y);
    expect(result.guides).toEqual([]);
  });

  it("per-axis independent (D-05): X within tolerance of wall, Y out of tolerance → X snaps, Y uses grid", () => {
    const scene = sceneOneVerticalWall();
    // X: minX 0.3 close to wall face 0.25. Y: far from wall midpoint (5) and outside tolerance.
    const bbox: BBox = { id: "p_dragged", minX: 0.3, maxX: 2.3, minY: 7.2, maxY: 9.2 };
    const result = computeSnap({
      candidate: { pos: { x: 1.3, y: 8.2 }, bbox },
      scene,
      tolerancePx: SNAP_TOLERANCE_PX,
      scale: 50,
      gridSnap: 0.5,
    });
    // X snapped to wall.
    expect(result.snapped.x).toBeCloseTo(1.3 - 0.05, 5);
    // Y fell back to grid rounding 8.2 → 8.0.
    expect(result.snapped.y).toBeCloseTo(8.0, 5);
    // Exactly 1 x-axis guide.
    const xGuides = result.guides.filter((g) => g.kind === "axis" && g.axis === "x");
    const yGuides = result.guides.filter((g) => g.kind === "axis" && g.axis === "y");
    expect(xGuides).toHaveLength(1);
    expect(yGuides).toHaveLength(0);
  });

  it("tolerance scales with zoom: same geometry snaps at scale=50 but NOT at scale=100", () => {
    const scene = sceneOneVerticalWall();
    // Dragged left edge at x=0.4 (distance 0.15 from wall face 0.25).
    // scale=50 → tolFt 0.16 → 0.15 <= 0.16 → snaps.
    // scale=100 → tolFt 0.08 → 0.15 > 0.08 → does NOT snap.
    const bbox: BBox = { id: "p_dragged", minX: 0.4, maxX: 2.4, minY: 4, maxY: 6 };
    const pos = { x: 1.4, y: 5 };
    const loose = computeSnap({
      candidate: { pos, bbox },
      scene,
      tolerancePx: SNAP_TOLERANCE_PX,
      scale: 50,
      gridSnap: 0,
    });
    expect(loose.guides.some((g) => g.kind === "axis" && g.axis === "x")).toBe(true);

    const tight = computeSnap({
      candidate: { pos, bbox },
      scene,
      tolerancePx: SNAP_TOLERANCE_PX,
      scale: 100,
      gridSnap: 0,
    });
    expect(tight.guides.some((g) => g.kind === "axis" && g.axis === "x")).toBe(false);
    // And pos is unchanged since gridSnap=0.
    expect(tight.snapped.x).toBe(pos.x);
  });

  it("alt-disable integration contract (D-07): when caller short-circuits, no guides emitted (documented expectation)", () => {
    // The pure engine does NOT know about altKey. The integration layer
    // (productTool / selectTool) bypasses computeSnap when altKey is held
    // and calls snapPoint() directly. This test documents the contract:
    // passing an empty scene + gridSnap > 0 simulates the alt-held path
    // and asserts no smart-snap guides appear.
    const result = computeSnap({
      candidate: {
        pos: { x: 3.3, y: 3.3 },
        bbox: { id: "p_dragged", minX: 2.3, maxX: 4.3, minY: 2.3, maxY: 4.3 },
      },
      scene: emptyScene(),
      tolerancePx: SNAP_TOLERANCE_PX,
      scale: 50,
      gridSnap: 0.5,
    });
    // No candidates anywhere → pure grid fallback, zero guides.
    expect(result.guides).toEqual([]);
    expect(result.snapped.x).toBeCloseTo(3.5, 5);
    expect(result.snapped.y).toBeCloseTo(3.5, 5);
  });
});

// --- computeSnap — SNAP-02 midpoints --------------------------------------

describe("computeSnap — SNAP-02 midpoints", () => {
  it("dragged center within tolerance of wall midpoint → snaps center onto midpoint (D-03a)", () => {
    // Wall midpoint at (0, 5). Center of dragged bbox at (0.05, 5.03) — both
    // axes within 0.16 tolerance.
    const scene = sceneOneVerticalWall();
    const bbox: BBox = { id: "p_dragged", minX: -0.95, maxX: 1.05, minY: 4.03, maxY: 6.03 };
    const result = computeSnap({
      candidate: { pos: { x: 0.05, y: 5.03 }, bbox },
      scene,
      tolerancePx: SNAP_TOLERANCE_PX,
      scale: 50,
      gridSnap: 0,
    });
    // New center should be at the midpoint.
    expect(result.snapped.x).toBeCloseTo(0, 5);
    expect(result.snapped.y).toBeCloseTo(5, 5);
    // And a midpoint-dot guide is emitted at the midpoint.
    const dots = result.guides.filter((g) => g.kind === "midpoint-dot");
    expect(dots.length).toBeGreaterThanOrEqual(1);
    const dot = dots[0] as { kind: "midpoint-dot"; at: { x: number; y: number } };
    expect(dot.at.x).toBeCloseTo(0, 5);
    expect(dot.at.y).toBeCloseTo(5, 5);
  });

  it("midpoint wins tiebreak over edge-edge at equal dx (D-05a priority 3 > 2 > 1)", () => {
    // Construct a scene where BOTH an object-edge AND a wall midpoint sit at
    // the same X-distance from the dragged center. Midpoint must win.
    //
    // Wall midpoint x = 0, value along X axis (axis "y" wall vertical).
    // Object edge at x = 0 (minX) placed so the dragged center's distance to it
    // equals the distance to the midpoint.
    const scene: SceneGeometry = {
      wallEdges: [
        { a: { x: -0.25, y: 0 }, b: { x: -0.25, y: 10 }, wallId: "w1" },
        { a: { x: 0.25, y: 0 }, b: { x: 0.25, y: 10 }, wallId: "w1" },
      ],
      wallMidpoints: [{ point: { x: 0, y: 5 }, wallId: "w1", axis: "y" }],
      objectBBoxes: [{ id: "p_other", minX: 0, maxX: 0.5, minY: 0, maxY: 1 }],
    };
    // Dragged center at x=0.05, bbox minX = -0.95, maxX = 1.05 (width 2).
    // Center→midpoint dx = 0.05. minX→object minX dx = 0.95 (not equal).
    // Instead construct such that edge-to-edge and center-to-midpoint both tie.
    // Use center at x = 0.05, bbox (−0.95..1.05). |center - midpoint_x| = 0.05.
    // For edge-to-edge to tie: dragged.minX = -0.95 → target object edge at -0.90
    // → dx 0.05. Adjust object bbox accordingly.
    const tied: SceneGeometry = {
      ...scene,
      objectBBoxes: [{ id: "p_other", minX: -0.9, maxX: -0.4, minY: 0, maxY: 1 }],
    };
    const bbox: BBox = { id: "p_dragged", minX: -0.95, maxX: 1.05, minY: 4, maxY: 6 };
    const result = computeSnap({
      candidate: { pos: { x: 0.05, y: 5.01 }, bbox },
      scene: tied,
      tolerancePx: SNAP_TOLERANCE_PX,
      scale: 50,
      gridSnap: 0,
    });
    // Winner must be midpoint → snapped.x = 0 (center-aligned), NOT -0.9 + 0.95 shift.
    expect(result.snapped.x).toBeCloseTo(0, 5);
    // And a midpoint-dot guide is present.
    expect(result.guides.some((g) => g.kind === "midpoint-dot")).toBe(true);
  });

  it("midpoint snap ONLY applies when source is center — edge-to-midpoint pairs are skipped", () => {
    // Wall midpoint at x=0. Only candidate that could match is the DRAGGED CENTER.
    // If we put the dragged center FAR away but a dragged EDGE near x=0, the
    // engine must NOT treat that as a midpoint snap.
    const scene = sceneOneVerticalWall();
    // Dragged bbox (minX=-0.05, maxX=1.95) → minX is 0.05 from midpoint X=0.
    // Center is at 0.95 (outside tolerance 0.16).
    const bbox: BBox = { id: "p_dragged", minX: -0.05, maxX: 1.95, minY: 4, maxY: 6 };
    const result = computeSnap({
      candidate: { pos: { x: 0.95, y: 5 }, bbox },
      scene,
      tolerancePx: SNAP_TOLERANCE_PX,
      scale: 50,
      gridSnap: 0,
    });
    // If there's any snap, it must be to the wall FACE (x=-0.25 or 0.25), NOT
    // a midpoint dot.
    const dots = result.guides.filter((g) => g.kind === "midpoint-dot");
    expect(dots).toHaveLength(0);
  });
});

// --- computeSnap — SNAP-03 guides -----------------------------------------

describe("computeSnap — SNAP-03 guides", () => {
  it("X-snap emits { kind:'axis', axis:'x', value } with world-feet value", () => {
    const scene = sceneOneVerticalWall();
    const bbox = draggedBBoxNearWallRight();
    const result = computeSnap({
      candidate: { pos: { x: 1.3, y: 5 }, bbox },
      scene,
      tolerancePx: SNAP_TOLERANCE_PX,
      scale: 50,
      gridSnap: 0,
    });
    const g = result.guides.find((x) => x.kind === "axis" && x.axis === "x") as
      | { kind: "axis"; axis: "x"; value: number }
      | undefined;
    expect(g).toBeDefined();
    expect(g!.value).toBeCloseTo(0.25, 5);
  });

  it("crosshair case: both axes snap → 2 axis guides", () => {
    // Scene has both an X target AND a Y target.
    const scene: SceneGeometry = {
      wallEdges: [
        // vertical wall face at x=0.25 → X snap target.
        { a: { x: 0.25, y: 0 }, b: { x: 0.25, y: 10 }, wallId: "w1" },
        // horizontal wall face at y=0.25 → Y snap target.
        { a: { x: 0, y: 0.25 }, b: { x: 10, y: 0.25 }, wallId: "w2" },
      ],
      wallMidpoints: [],
      objectBBoxes: [],
    };
    const bbox: BBox = { id: "p_dragged", minX: 0.3, maxX: 2.3, minY: 0.3, maxY: 2.3 };
    const result = computeSnap({
      candidate: { pos: { x: 1.3, y: 1.3 }, bbox },
      scene,
      tolerancePx: SNAP_TOLERANCE_PX,
      scale: 50,
      gridSnap: 0,
    });
    const axisGuides = result.guides.filter((g) => g.kind === "axis");
    expect(axisGuides).toHaveLength(2);
    const axes = new Set(axisGuides.map((g) => (g as { axis: "x" | "y" }).axis));
    expect(axes.has("x")).toBe(true);
    expect(axes.has("y")).toBe(true);
  });

  it("no snap, no grid → guides = []", () => {
    const scene = emptyScene();
    const bbox: BBox = { id: "p_dragged", minX: 5, maxX: 7, minY: 5, maxY: 7 };
    const result = computeSnap({
      candidate: { pos: { x: 6, y: 6 }, bbox },
      scene,
      tolerancePx: SNAP_TOLERANCE_PX,
      scale: 50,
      gridSnap: 0,
    });
    expect(result.guides).toEqual([]);
  });
});
