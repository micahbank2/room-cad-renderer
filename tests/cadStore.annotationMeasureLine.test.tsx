/**
 * Phase 62 MEASURE-01 (D-15) — cadStore transaction tests C2 + C3.
 *
 * Originally part of tests/components/PropertiesPanel.area.test.tsx; that file
 * was deleted by issue #182 cleanup (the C1 "empty-state Room properties" case
 * was asserting UX that Phase 82 D-01 retired — empty selection = no panel).
 * The C2/C3 cadStore-only assertions are preserved here because they do not
 * depend on the PropertiesPanel component at all.
 *
 * C2: Annotation edit dispatches updateAnnotationNoHistory per keystroke; commit
 *     via updateAnnotation pushes exactly one history entry.
 * C3: measureLine endpoint drag transaction pattern (Phase 31): empty-patch
 *     updateMeasureLine at start + N×updateMeasureLineNoHistory mid-drag →
 *     past.length increments by exactly 1 per drag cycle.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useCADStore, resetCADStoreForTests } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";

function seedClosedSquareRoom() {
  resetCADStoreForTests();
  useCADStore.setState({
    rooms: {
      room_main: {
        id: "room_main",
        name: "Main Room",
        room: { width: 10, length: 10, wallHeight: 8 },
        walls: {
          a: { id: "a", start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, thickness: 0.5, height: 8, openings: [] },
          b: { id: "b", start: { x: 10, y: 0 }, end: { x: 10, y: 10 }, thickness: 0.5, height: 8, openings: [] },
          c: { id: "c", start: { x: 10, y: 10 }, end: { x: 0, y: 10 }, thickness: 0.5, height: 8, openings: [] },
          d: { id: "d", start: { x: 0, y: 10 }, end: { x: 0, y: 0 }, thickness: 0.5, height: 8, openings: [] },
        },
        placedProducts: {},
        stairs: {},
        measureLines: {},
        annotations: {},
      },
    },
    activeRoomId: "room_main",
    past: [],
    future: [],
  });
  useUIStore.setState({ selectedIds: [] });
}

describe("Phase 62 cadStore — annotation edit + measureLine drag transactions (D-13, D-07)", () => {
  beforeEach(seedClosedSquareRoom);

  it("C2: annotation edit — NoHistory keystrokes + 1 update commit = past.length +1", () => {
    const id = useCADStore.getState().addAnnotation("room_main", {
      position: { x: 5, y: 5 },
      text: "",
    });
    const baseline = useCADStore.getState().past.length;
    // Simulate live-preview keystrokes (multiple updateAnnotationNoHistory)
    useCADStore.getState().updateAnnotationNoHistory("room_main", id, { text: "C" });
    useCADStore.getState().updateAnnotationNoHistory("room_main", id, { text: "Cl" });
    useCADStore.getState().updateAnnotationNoHistory("room_main", id, { text: "Clo" });
    expect(useCADStore.getState().past.length).toBe(baseline);
    // Commit via updateAnnotation pushes 1 entry.
    useCADStore.getState().updateAnnotation("room_main", id, { text: "Closet" });
    expect(useCADStore.getState().past.length).toBe(baseline + 1);
    expect(useCADStore.getState().rooms.room_main.annotations!["" + id].text).toBe("Closet");
  });

  it("C3: measureLine endpoint drag pattern — past.length increments by exactly 1", () => {
    const id = useCADStore.getState().addMeasureLine("room_main", {
      start: { x: 0, y: 0 },
      end: { x: 5, y: 0 },
    });
    const baseline = useCADStore.getState().past.length;
    // Simulate Phase 31 transaction: empty-patch updateMeasureLine pushes 1
    // history entry at drag start; subsequent NoHistory mid-drag mutations
    // do not push.
    useCADStore.getState().updateMeasureLine("room_main", id, {});
    useCADStore.getState().updateMeasureLineNoHistory("room_main", id, { end: { x: 6, y: 0 } });
    useCADStore.getState().updateMeasureLineNoHistory("room_main", id, { end: { x: 7, y: 0 } });
    useCADStore.getState().updateMeasureLineNoHistory("room_main", id, { end: { x: 8, y: 0 } });
    useCADStore.getState().updateMeasureLineNoHistory("room_main", id, { end: { x: 9, y: 0 } });
    useCADStore.getState().updateMeasureLineNoHistory("room_main", id, { end: { x: 10, y: 0 } });
    expect(useCADStore.getState().past.length - baseline).toBe(1);
    expect(useCADStore.getState().rooms.room_main.measureLines![id].end).toEqual({ x: 10, y: 0 });
  });
});
