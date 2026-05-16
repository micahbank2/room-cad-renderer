/**
 * Phase 91 Plan 91-01 — Wave 0 RED tests for object-center snap targets,
 * column-as-target, stair-as-target, and 4-tier priority ladder (D-05).
 *
 * Locks the ALIGN-91-01..03 contract in executable form BEFORE Plan 91-01
 * Task 2 / Task 3 implementation. All tests MUST fail against current main
 * (no `objectCenters` on SceneGeometry; columns + stairs absent from scene).
 *
 * See:
 *   - .planning/phases/91-alignment-collision/91-CONTEXT.md (D-02, D-04, D-05)
 *   - .planning/phases/91-alignment-collision/91-01-PLAN.md (Task 1 behavior)
 *
 * Coordinates in feet. Scale=50 → tolFt = 8/50 = 0.16 ft.
 */
import { describe, it, expect } from "vitest";
import {
  computeSnap,
  buildSceneGeometry,
  SNAP_TOLERANCE_PX,
  type BBox,
  type SceneGeometry,
} from "@/canvas/snapEngine";
import {
  DEFAULT_STAIR_WIDTH_FT,
  type Stair,
  type Column,
} from "@/types/cad";

// --- Fixtures -------------------------------------------------------------

/**
 * Scene containing a single other-object bbox centered at (10, 5),
 * 4 ft wide × 2 ft deep — bbox X ∈ [8, 12], Y ∈ [4, 6]; center (10, 5).
 * After Plan 91-01 the engine MUST emit (10, 5) as an object-center target.
 */
function sceneOneObjectCenteredAt10x5(): SceneGeometry {
  return {
    wallEdges: [],
    wallMidpoints: [],
    objectBBoxes: [{ id: "p_target", minX: 8, maxX: 12, minY: 4, maxY: 6 }],
    // Phase 91 ADD — object-center targets. Must exist after Plan 91-01.
    objectCenters: [{ x: 10, y: 5 }],
  };
}

/** Dragged candidate bbox centered at (cx, cy), 4 ft × 2 ft. */
function draggedBBoxAt(cx: number, cy: number, w = 4, d = 2): BBox {
  return {
    id: "p_dragged",
    minX: cx - w / 2,
    maxX: cx + w / 2,
    minY: cy - d / 2,
    maxY: cy + d / 2,
  };
}

// --- Test 1: ALIGN-91-01 X-axis center-to-center -------------------------

describe("Phase 91 — object-center axis target (ALIGN-91-01)", () => {
  it("snaps center-X to another object's center-X when within tolerance", () => {
    const scene = sceneOneObjectCenteredAt10x5();
    // Dragged center-X at 10.05 — 0.05 ft from target center-X 10 (< tolFt 0.16).
    // Y-axis far enough (8 vs 5; |8-5|=3 >> tol) that no Y snap fires.
    const bbox = draggedBBoxAt(10.05, 8);
    const result = computeSnap({
      candidate: { pos: { x: 10.05, y: 8 }, bbox },
      scene,
      tolerancePx: SNAP_TOLERANCE_PX,
      scale: 50,
      gridSnap: 0,
    });
    // Center-X snap shifts pos.x by (10 - 10.05) = -0.05.
    expect(result.snapped.x).toBeCloseTo(10, 5);
    // Y axis untouched (no Y target in range).
    expect(result.snapped.y).toBeCloseTo(8, 5);
    // Guide emitted at value=10 on the x axis.
    const xGuides = result.guides.filter(
      (g) => g.kind === "axis" && g.axis === "x",
    );
    expect(xGuides).toHaveLength(1);
    expect(
      (xGuides[0] as { kind: "axis"; axis: "x"; value: number }).value,
    ).toBeCloseTo(10, 5);
  });

  // Test 2: ALIGN-91-01 Y-axis center-to-center
  it("snaps center-Y to another object's center-Y when within tolerance", () => {
    const scene = sceneOneObjectCenteredAt10x5();
    // X-axis far (50 vs 10), Y close (5.05 vs 5).
    const bbox = draggedBBoxAt(50, 5.05);
    const result = computeSnap({
      candidate: { pos: { x: 50, y: 5.05 }, bbox },
      scene,
      tolerancePx: SNAP_TOLERANCE_PX,
      scale: 50,
      gridSnap: 0,
    });
    expect(result.snapped.y).toBeCloseTo(5, 5);
    expect(result.snapped.x).toBeCloseTo(50, 5);
    const yGuides = result.guides.filter(
      (g) => g.kind === "axis" && g.axis === "y",
    );
    expect(yGuides).toHaveLength(1);
    expect(
      (yGuides[0] as { kind: "axis"; axis: "y"; value: number }).value,
    ).toBeCloseTo(5, 5);
  });
});

// --- Test 3: D-05 priority — center beats edge at equal distance --------

describe("Phase 91 — priority ladder D-05 (center beats edge)", () => {
  it("when object-center and object-edge are equidistant, object-center wins", () => {
    // Target object: bbox X ∈ [8, 10]; center-X = 9. The RIGHT edge is at 10.
    // Dragged center-X = 10.02 → distance to center 9 = 1.02, distance to edge 10 = 0.02.
    // Edge is much closer, so use a constructed equal-distance case instead:
    //
    // Target bbox X ∈ [9.5, 10.5] → center-X = 10, edges at 9.5 and 10.5.
    // Dragged candidate center-X = 10.02; bbox X-extent ±0.5 → edges at 9.52 and 10.52.
    // Distance from dragged center-X 10.02 to target center-X 10 = 0.02.
    // Distance from dragged left-edge 9.52 to target right-edge 9.5 = 0.02 (equal).
    // With D-05 priority ladder, object-center (priority 3) MUST win over
    // object-edge (priority 2) when distances are equal.
    const scene: SceneGeometry = {
      wallEdges: [],
      wallMidpoints: [],
      objectBBoxes: [
        { id: "p_target", minX: 9.5, maxX: 10.5, minY: 4, maxY: 6 },
      ],
      objectCenters: [{ x: 10, y: 5 }],
    };
    const bbox: BBox = {
      id: "p_dragged",
      minX: 9.52,
      maxX: 10.52,
      minY: 0,
      maxY: 2,
    };
    const result = computeSnap({
      candidate: { pos: { x: 10.02, y: 1 }, bbox },
      scene,
      tolerancePx: SNAP_TOLERANCE_PX,
      scale: 50, // tolFt = 0.16
      gridSnap: 0,
    });
    // Center wins → snapped.x = 10 (center alignment), NOT 9.98 (edge alignment).
    expect(result.snapped.x).toBeCloseTo(10, 5);
    // Guide value reflects center target.
    const xGuides = result.guides.filter(
      (g) => g.kind === "axis" && g.axis === "x",
    );
    expect(xGuides).toHaveLength(1);
    expect(
      (xGuides[0] as { kind: "axis"; axis: "x"; value: number }).value,
    ).toBeCloseTo(10, 5);
  });
});

// --- Test 4: ALIGN-91-03 column as snap target ---------------------------

describe("Phase 91 — column as snap target (ALIGN-91-03)", () => {
  it("buildSceneGeometry includes columns in objectBBoxes and objectCenters", () => {
    const column: Column = {
      id: "col_1",
      position: { x: 5, y: 5 },
      widthFt: 1,
      depthFt: 1,
      heightFt: 8,
      rotation: 0,
      shape: "box",
    };
    const state = {
      activeRoomId: "room_main",
      rooms: {
        room_main: {
          id: "room_main",
          name: "Main",
          room: { width: 20, length: 20, wallHeight: 8 },
          walls: {},
          placedProducts: {},
          placedCustomElements: {},
          ceilings: {},
          columns: { col_1: column },
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    const scene = buildSceneGeometry(state, "__none__", [] as any, {} as any);
    const colBBox = scene.objectBBoxes.find((b) => b.id === "col_1");
    expect(colBBox).toBeDefined();
    expect(colBBox!.minX).toBeCloseTo(4.5, 5);
    expect(colBBox!.maxX).toBeCloseTo(5.5, 5);
    // Column center participates as object-center target.
    const colCenter = scene.objectCenters.find(
      (c) => Math.abs(c.x - 5) < 1e-9 && Math.abs(c.y - 5) < 1e-9,
    );
    expect(colCenter).toBeDefined();
  });

  it("dragged product snaps center-X to a column's bbox center", () => {
    const column: Column = {
      id: "col_1",
      position: { x: 5, y: 5 },
      widthFt: 1,
      depthFt: 1,
      heightFt: 8,
      rotation: 0,
      shape: "box",
    };
    const state = {
      activeRoomId: "room_main",
      rooms: {
        room_main: {
          id: "room_main",
          name: "Main",
          room: { width: 20, length: 20, wallHeight: 8 },
          walls: {},
          placedProducts: {},
          placedCustomElements: {},
          ceilings: {},
          columns: { col_1: column },
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    const scene = buildSceneGeometry(state, "__none__", [] as any, {} as any);
    // Dragged candidate center-X 5.05 (close to column center 5).
    const bbox = draggedBBoxAt(5.05, 10);
    const result = computeSnap({
      candidate: { pos: { x: 5.05, y: 10 }, bbox },
      scene,
      tolerancePx: SNAP_TOLERANCE_PX,
      scale: 50,
      gridSnap: 0,
    });
    expect(result.snapped.x).toBeCloseTo(5, 5);
  });
});

// --- Test 5: D-04 stair as snap target with bbox-center offset ----------

describe("Phase 91 — stair as snap target with bbox-center offset (D-04)", () => {
  it("buildSceneGeometry computes stair bbox center from bottom-step center + depth/2", () => {
    // Stair: bottom-step center at (5, 5), 12 steps × 11" runIn → depth = 11ft.
    // Width = DEFAULT_STAIR_WIDTH_FT (3 ft). Rotation 0 → +Y up.
    // Expected bbox center: (5, 5 + 11/2) = (5, 10.5).
    const stair: Stair = {
      id: "stair_1",
      position: { x: 5, y: 5 },
      rotation: 0,
      riseIn: 7,
      runIn: 11,
      stepCount: 12,
    };
    const state = {
      activeRoomId: "room_main",
      rooms: {
        room_main: {
          id: "room_main",
          name: "Main",
          room: { width: 20, length: 30, wallHeight: 8 },
          walls: {},
          placedProducts: {},
          placedCustomElements: {},
          ceilings: {},
          stairs: { stair_1: stair },
          columns: {},
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    const scene = buildSceneGeometry(state, "__none__", [] as any, {} as any);
    const stairBBox = scene.objectBBoxes.find((b) => b.id === "stair_1");
    expect(stairBBox).toBeDefined();
    // bbox center along Y = 10.5; depth=11 → minY=5, maxY=16.
    expect(stairBBox!.minY).toBeCloseTo(5, 5);
    expect(stairBBox!.maxY).toBeCloseTo(16, 5);
    // Width = 3 ft → centered on X=5 → minX=3.5, maxX=6.5.
    expect(stairBBox!.minX).toBeCloseTo(5 - DEFAULT_STAIR_WIDTH_FT / 2, 5);
    expect(stairBBox!.maxX).toBeCloseTo(5 + DEFAULT_STAIR_WIDTH_FT / 2, 5);

    const stairCenter = scene.objectCenters.find(
      (c) => Math.abs(c.x - 5) < 1e-9 && Math.abs(c.y - 10.5) < 1e-9,
    );
    expect(stairCenter).toBeDefined();
  });

  it("dragged product snaps to stair center-X (X axis) at center (5, 10.5)", () => {
    const stair: Stair = {
      id: "stair_1",
      position: { x: 5, y: 5 },
      rotation: 0,
      riseIn: 7,
      runIn: 11,
      stepCount: 12,
    };
    const state = {
      activeRoomId: "room_main",
      rooms: {
        room_main: {
          id: "room_main",
          name: "Main",
          room: { width: 20, length: 30, wallHeight: 8 },
          walls: {},
          placedProducts: {},
          placedCustomElements: {},
          ceilings: {},
          stairs: { stair_1: stair },
          columns: {},
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    const scene = buildSceneGeometry(state, "__none__", [] as any, {} as any);
    const bbox = draggedBBoxAt(5.05, 13);
    const result = computeSnap({
      candidate: { pos: { x: 5.05, y: 13 }, bbox },
      scene,
      tolerancePx: SNAP_TOLERANCE_PX,
      scale: 50,
      gridSnap: 0,
    });
    expect(result.snapped.x).toBeCloseTo(5, 5);
  });

  it("dragged product snaps to stair center-Y at 10.5", () => {
    const stair: Stair = {
      id: "stair_1",
      position: { x: 5, y: 5 },
      rotation: 0,
      riseIn: 7,
      runIn: 11,
      stepCount: 12,
    };
    const state = {
      activeRoomId: "room_main",
      rooms: {
        room_main: {
          id: "room_main",
          name: "Main",
          room: { width: 20, length: 30, wallHeight: 8 },
          walls: {},
          placedProducts: {},
          placedCustomElements: {},
          ceilings: {},
          stairs: { stair_1: stair },
          columns: {},
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    const scene = buildSceneGeometry(state, "__none__", [] as any, {} as any);
    // Dragged candidate center-Y 10.55 (close to stair bbox center-Y 10.5).
    // X far enough away from any stair-edge / stair-center target to avoid X snap.
    const bbox = draggedBBoxAt(15, 10.55);
    const result = computeSnap({
      candidate: { pos: { x: 15, y: 10.55 }, bbox },
      scene,
      tolerancePx: SNAP_TOLERANCE_PX,
      scale: 50,
      gridSnap: 0,
    });
    expect(result.snapped.y).toBeCloseTo(10.5, 5);
  });
});
