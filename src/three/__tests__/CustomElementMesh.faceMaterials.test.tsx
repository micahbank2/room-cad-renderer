/**
 * Phase 68 Plan 04 Task 3 — Per-face Material array on CustomElementMesh.
 *
 * RED test: this fails until CustomElementMesh exports the FACE_ORDER mapping
 * and renders 6 materials in BoxGeometry face-index order.
 */
import { describe, it, expect } from "vitest";
import type { FaceDirection } from "@/types/material";

describe("CustomElementMesh per-face material mapping", () => {
  it("exports FACE_ORDER as a 6-element array of FaceDirection in BoxGeometry index order", async () => {
    const mod = await import("../CustomElementMesh");
    const order = (mod as unknown as { FACE_ORDER?: ReadonlyArray<FaceDirection> }).FACE_ORDER;
    expect(order).toBeDefined();
    expect(order).toHaveLength(6);
    // BoxGeometry face order: [+X, -X, +Y, -Y, +Z, -Z]
    // Phase 68 D-07 convention: +X=east, -X=west, +Y=top, -Y=bottom, +Z=north, -Z=south
    expect(order).toEqual(["east", "west", "top", "bottom", "north", "south"]);
  });
});
