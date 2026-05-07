// Phase 68 Plan 01 — Wave 0 RED tests for 2D Fabric material fill (paint colorHex + textured Pattern).
// renderFloor is NEW (Plan 05); renderWalls signature extends to accept materials[] — both RED.
import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import * as fabric from "fabric";
// @ts-expect-error — RED: renderFloor does not yet exist (Plan 05 will add it)
import { renderWalls, renderFloor } from "@/canvas/fabricSync";

describe("fabricSync — material fill", () => {
  it("wall with materialIdA → paint Material → polygon fill is colorHex", async () => {
    const fc = new fabric.StaticCanvas(null, { width: 800, height: 600 });
    const walls = [
      {
        id: "w1",
        a: { x: 0, y: 0 },
        b: { x: 10, y: 0 },
        thickness: 0.5,
        materialIdA: "mat_abc",
      },
    ];
    const materials = [
      {
        id: "mat_abc",
        name: "x",
        colorHex: "#abcdef",
        tileSizeFt: 1,
        createdAt: 0,
      },
    ];
    // @ts-expect-error — RED: renderWalls does not yet accept materials param (Plan 05)
    renderWalls(fc, walls as any, 50, { x: 400, y: 300 }, undefined, materials as any);
    const polys = fc.getObjects().filter((o) => (o as any).type === "polygon");
    expect(polys.some((p) => (p as any).fill === "#abcdef")).toBe(true);
  });

  it("renderFloor adds a fabric.Polygon for room.floorMaterialId", async () => {
    const fc = new fabric.StaticCanvas(null, { width: 800, height: 600 });
    const room = {
      walls: [
        { a: { x: 0, y: 0 }, b: { x: 10, y: 0 } },
        { a: { x: 10, y: 0 }, b: { x: 10, y: 10 } },
      ],
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
