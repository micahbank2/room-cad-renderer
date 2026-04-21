/**
 * Phase 31 Wave 0 — Red stubs for the restricted wall-endpoint snap scene
 * builder. Closes the D-08b deferral from Phase 30.
 *
 * Locks the EDIT-23 D-05 contract:
 *   - Snap targets = OTHER wall endpoints + OTHER wall midpoints only
 *   - wallEdges intentionally empty (we're snapping endpoints, not faces)
 *   - Product / ceiling / custom-element bboxes EXCLUDED (D-05 negative)
 *
 * MUST fail on this commit — `src/canvas/wallEndpointSnap.ts` does not exist.
 * Plan 31-02 creates it; Plan 31-03 wires it into selectTool's wall-endpoint
 * branch and exposes `window.__driveWallEndpoint` (driver bridge advertised
 * for Plan 31-02 / Plan 31-03 consumption).
 */
import { describe, it, expect } from "vitest";
import { buildWallEndpointSnapScene } from "@/canvas/wallEndpointSnap";
import type { WallSegment } from "@/types/cad";

// --- Fixtures -------------------------------------------------------------

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

// --- buildWallEndpointSnapScene -------------------------------------------

describe("buildWallEndpointSnapScene (D-05 restricted scene)", () => {
  it("two walls, dragging w1: scene contains w2 endpoints + w2 midpoint, not w1", () => {
    const walls: Record<string, WallSegment> = {
      w1: wall("w1", 0, 0, 10, 0),
      w2: wall("w2", 5, 5, 5, 10),
    };
    const scene = buildWallEndpointSnapScene(walls, "w1");

    // Two zero-size bboxes for w2's start + end
    expect(scene.objectBBoxes.length).toBe(2);

    // w2 midpoint at (5, 7.5), classified as vertical (axis="y" since dx=0)
    expect(scene.wallMidpoints.length).toBe(1);
    expect(scene.wallMidpoints[0].point.x).toBeCloseTo(5);
    expect(scene.wallMidpoints[0].point.y).toBeCloseTo(7.5);
    expect(scene.wallMidpoints[0].wallId).toBe("w2");
    expect(scene.wallMidpoints[0].axis).toBe("y");

    // D-05: no wall-face snapping for endpoints
    expect(scene.wallEdges.length).toBe(0);
  });

  it("three walls, dragging w1: scene excludes w1's own endpoints + midpoint", () => {
    const walls: Record<string, WallSegment> = {
      w1: wall("w1", 0, 0, 10, 0),
      w2: wall("w2", 5, 5, 5, 10),
      w3: wall("w3", 0, 20, 10, 20),
    };
    const scene = buildWallEndpointSnapScene(walls, "w1");

    // Only w2 + w3 endpoints contribute (4 total)
    expect(scene.objectBBoxes.length).toBe(4);

    // No bbox should be at w1's endpoint positions
    const isW1Endpoint = (b: { minX: number; minY: number }) =>
      (b.minX === 0 && b.minY === 0) || (b.minX === 10 && b.minY === 0);
    expect(scene.objectBBoxes.some(isW1Endpoint)).toBe(false);

    // Two midpoints: w2 + w3
    expect(scene.wallMidpoints.length).toBe(2);
    expect(scene.wallMidpoints.every((m) => m.wallId !== "w1")).toBe(true);
  });

  it("diagonal wall: midpoint classified as 'diag'", () => {
    const walls: Record<string, WallSegment> = {
      w1: wall("w1", 0, 0, 10, 0),
      w2: wall("w2", 0, 5, 5, 10), // dx=5, dy=5 → diagonal
    };
    const scene = buildWallEndpointSnapScene(walls, "w1");
    const w2Mid = scene.wallMidpoints.find((m) => m.wallId === "w2")!;
    expect(w2Mid.axis).toBe("diag");
  });

  it("horizontal wall (dy=0): midpoint axis classified as 'x'", () => {
    const walls: Record<string, WallSegment> = {
      w1: wall("w1", 0, 0, 10, 0),
      w2: wall("w2", 0, 5, 8, 5), // horizontal
    };
    const scene = buildWallEndpointSnapScene(walls, "w1");
    const w2Mid = scene.wallMidpoints.find((m) => m.wallId === "w2")!;
    expect(w2Mid.axis).toBe("x");
  });

  it("vertical wall (dx=0): midpoint axis classified as 'y'", () => {
    const walls: Record<string, WallSegment> = {
      w1: wall("w1", 0, 0, 10, 0),
      w2: wall("w2", 5, 0, 5, 10), // vertical
    };
    const scene = buildWallEndpointSnapScene(walls, "w1");
    const w2Mid = scene.wallMidpoints.find((m) => m.wallId === "w2")!;
    expect(w2Mid.axis).toBe("y");
  });

  it("zero-size endpoint bboxes have minX===maxX and minY===maxY", () => {
    const walls: Record<string, WallSegment> = {
      w1: wall("w1", 0, 0, 10, 0),
      w2: wall("w2", 5, 5, 5, 10),
    };
    const scene = buildWallEndpointSnapScene(walls, "w1");
    for (const b of scene.objectBBoxes) {
      expect(b.minX).toBe(b.maxX);
      expect(b.minY).toBe(b.maxY);
    }
  });

  it("D-05 negative: function signature does not accept product bboxes — only walls", () => {
    // The signature is (walls, draggedWallId). No way to pass placedProducts.
    // This test asserts that signature: any product-derived bbox is impossible to inject.
    const walls: Record<string, WallSegment> = {
      w1: wall("w1", 0, 0, 10, 0),
      w2: wall("w2", 5, 5, 5, 10),
    };
    const scene = buildWallEndpointSnapScene(walls, "w1");

    // Every bbox in the scene must be derivable from a wall endpoint id
    const validIds = new Set(["w2-start", "w2-end"]);
    for (const b of scene.objectBBoxes) {
      expect(validIds.has(b.id)).toBe(true);
    }
  });
});
