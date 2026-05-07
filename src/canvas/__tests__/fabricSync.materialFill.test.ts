// Phase 68 Plan 05 — GREEN tests for 2D Fabric material fill (paint colorHex + textured Pattern).
// renderFloor is NEW (Plan 05); renderWalls signature extends to accept materials[].
import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import * as fabric from "fabric";
import { renderWalls, renderFloor } from "@/canvas/fabricSync";

describe("fabricSync — material fill", () => {
  it("wall with materialIdA → paint Material → polygon fill is colorHex", async () => {
    const fc = new fabric.StaticCanvas(null, { width: 800, height: 600 });
    // WallSegment shape: id, start, end, thickness, openings.
    const walls = {
      w1: {
        id: "w1",
        start: { x: 0, y: 0 },
        end: { x: 10, y: 0 },
        thickness: 0.5,
        openings: [],
        materialIdA: "mat_abc",
      },
    };
    const materials = [
      {
        id: "mat_abc",
        name: "x",
        colorHex: "#abcdef",
        tileSizeFt: 1,
        createdAt: 0,
      },
    ];
    renderWalls(
      fc,
      walls as any,
      50,
      { x: 400, y: 300 },
      [],
      materials as any,
      50,
    );
    const polys = fc.getObjects().filter((o) => (o as any).type === "polygon");
    expect(polys.some((p) => (p as any).fill === "#abcdef")).toBe(true);
  });

  it("renderFloor adds a fabric.Polygon for room.floorMaterialId", async () => {
    const fc = new fabric.StaticCanvas(null, { width: 800, height: 600 });
    const room = {
      walls: {
        w1: { start: { x: 0, y: 0 }, end: { x: 10, y: 0 } },
        w2: { start: { x: 10, y: 0 }, end: { x: 10, y: 10 } },
        w3: { start: { x: 10, y: 10 }, end: { x: 0, y: 10 } },
      },
      floorMaterialId: "mat_floor",
    };
    const materials = [
      {
        id: "mat_floor",
        name: "x",
        colorHex: "#222",
        tileSizeFt: 1,
        createdAt: 0,
      },
    ];
    renderFloor(fc, room as any, 50, { x: 400, y: 300 }, materials as any);
    expect(fc.getObjects().length).toBeGreaterThan(0);
  });
});
