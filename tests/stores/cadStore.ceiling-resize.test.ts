// Phase 65 CEIL-02: unit tests U5-U6 for ceiling-resize cadStore actions.

import { describe, it, expect, beforeEach } from "vitest";
import { useCADStore, resetCADStoreForTests } from "@/stores/cadStore";
import { resolveCeilingPoints } from "@/lib/geometry";
import type { Point, RoomDoc } from "@/types/cad";

function activeDoc(): RoomDoc {
  const s = useCADStore.getState();
  return s.rooms[s.activeRoomId!];
}

function seedRectCeiling(): string {
  const points: Point[] = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 5 },
    { x: 0, y: 5 },
  ];
  return useCADStore.getState().addCeiling(points, 8);
}

describe("Phase 65 CEIL-02 — cadStore ceiling-resize actions", () => {
  beforeEach(() => {
    resetCADStoreForTests();
  });

  it("U5: resizeCeilingAxis pushes exactly one history entry; NoHistory pushes zero", () => {
    const id = seedRectCeiling();
    const before = useCADStore.getState().past.length;

    useCADStore.getState().resizeCeilingAxis(id, "width", 12);
    const afterWith = useCADStore.getState().past.length;
    expect(afterWith).toBe(before + 1);
    expect(activeDoc().ceilings?.[id]?.widthFtOverride).toBe(12);

    useCADStore.getState().resizeCeilingAxisNoHistory(id, "width", 14);
    const afterNoHistory = useCADStore.getState().past.length;
    expect(afterNoHistory).toBe(afterWith); // unchanged
    expect(activeDoc().ceilings?.[id]?.widthFtOverride).toBe(14);
  });

  it("U5b: anchor argument is written atomically with the override value", () => {
    const id = seedRectCeiling();
    useCADStore.getState().resizeCeilingAxis(id, "width", 12, 10);
    const c = activeDoc().ceilings?.[id]!;
    expect(c.widthFtOverride).toBe(12);
    expect(c.anchorXFt).toBe(10);
    expect(c.anchorYFt).toBeUndefined();

    useCADStore.getState().resizeCeilingAxis(id, "depth", 7, 5);
    const c2 = activeDoc().ceilings?.[id]!;
    expect(c2.depthFtOverride).toBe(7);
    expect(c2.anchorYFt).toBe(5);
  });

  it("U6: clearCeilingOverrides clears all 4 fields + pushes one history entry; resolved points return to original", () => {
    const id = seedRectCeiling();
    useCADStore.getState().resizeCeilingAxis(id, "width", 20, 10);
    useCADStore.getState().resizeCeilingAxis(id, "depth", 10, 5);
    const c = activeDoc().ceilings?.[id]!;
    expect(c.widthFtOverride).toBe(20);
    expect(c.depthFtOverride).toBe(10);
    expect(c.anchorXFt).toBe(10);
    expect(c.anchorYFt).toBe(5);

    const before = useCADStore.getState().past.length;
    useCADStore.getState().clearCeilingOverrides(id);
    const after = useCADStore.getState().past.length;
    expect(after).toBe(before + 1);

    const cleared = activeDoc().ceilings?.[id]!;
    expect(cleared.widthFtOverride).toBeUndefined();
    expect(cleared.depthFtOverride).toBeUndefined();
    expect(cleared.anchorXFt).toBeUndefined();
    expect(cleared.anchorYFt).toBeUndefined();

    // Resolved points byte-equal to original (referential identity)
    const resolved = resolveCeilingPoints(cleared);
    expect(resolved).toBe(cleared.points);
  });
});
