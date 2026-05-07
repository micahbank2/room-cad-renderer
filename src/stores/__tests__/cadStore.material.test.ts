// Phase 68 Plan 01 — Wave 0 RED tests for applySurfaceMaterial single-undo contract.
// Action does not yet exist on cadStore — Plan 03 will add it.
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { useCADStore } from "@/stores/cadStore";

describe("applySurfaceMaterial — single-undo contract", () => {
  beforeEach(() => {
    useCADStore.setState({ past: [], future: [] } as any);
  });

  it("history variant increments past.length by exactly 1", () => {
    const before = useCADStore.getState().past.length;
    // @ts-expect-error — RED: action does not yet exist (Plan 03 will add it)
    useCADStore.getState().applySurfaceMaterial(
      { kind: "wallSide", wallId: "w1", side: "A" },
      "mat_123"
    );
    expect(useCADStore.getState().past.length).toBe(before + 1);
  });

  it("NoHistory variant does NOT increment past.length", () => {
    const before = useCADStore.getState().past.length;
    // @ts-expect-error — RED: action does not yet exist (Plan 03 will add it)
    useCADStore.getState().applySurfaceMaterialNoHistory(
      { kind: "wallSide", wallId: "w1", side: "A" },
      "mat_123"
    );
    expect(useCADStore.getState().past.length).toBe(before);
  });

  it.todo("apply to floor writes room.floorMaterialId");
  it.todo("apply to ceiling writes ceiling.materialId");
  it.todo("apply to customElementFace writes placed.faceMaterials[face]");
  it.todo("passing undefined clears the materialId field");
});
