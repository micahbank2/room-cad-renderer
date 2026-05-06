/**
 * Phase 62 MEASURE-01 (D-15) component tests C1-C3.
 *
 * C1: PropertiesPanel renders AREA: 100 SQ FT for a closed 10×10 room (no entity selected).
 * C2: Annotation edit dispatches updateAnnotationNoHistory per keystroke; commit
 *     via updateAnnotation pushes exactly one history entry.
 * C3: measureLine endpoint drag transaction pattern (Phase 31): empty-patch
 *     updateMeasureLine at start + N×updateMeasureLineNoHistory mid-drag →
 *     past.length increments by exactly 1 per drag cycle.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useCADStore, resetCADStoreForTests } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import PropertiesPanel from "@/components/PropertiesPanel";

function seedClosedSquareRoom() {
  resetCADStoreForTests();
  // 10×10 closed loop CCW. polygonArea() expects walls[i].end ≈ walls[i+1].start.
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

describe("Phase 62 PropertiesPanel — Room properties branch", () => {
  beforeEach(seedClosedSquareRoom);

  it("C1: renders AREA: 100 SQ FT when 10×10 room is implicitly selected", () => {
    render(<PropertiesPanel productLibrary={[]} viewMode={"2d" as never} />);
    // The label and value are rendered as separate spans (Row component); use
    // a regex matcher to find the value cell.
    expect(screen.getByText(/AREA/)).toBeTruthy();
    expect(screen.getByText(/100 SQ FT/)).toBeTruthy();
  });

  it("hides AREA row when wall loop is non-closed (polygonArea returns 0)", () => {
    // Re-seed with a non-closed loop: gap between wall b end and wall c start.
    useCADStore.setState({
      rooms: {
        room_main: {
          id: "room_main",
          name: "Main Room",
          room: { width: 10, length: 10, wallHeight: 8 },
          walls: {
            a: { id: "a", start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, thickness: 0.5, height: 8, openings: [] },
            b: { id: "b", start: { x: 10, y: 0 }, end: { x: 10, y: 10 }, thickness: 0.5, height: 8, openings: [] },
            // gap: c starts at 11,10 instead of 10,10
            c: { id: "c", start: { x: 11, y: 10 }, end: { x: 0, y: 10 }, thickness: 0.5, height: 8, openings: [] },
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
    render(<PropertiesPanel productLibrary={[]} viewMode={"2d" as never} />);
    // AREA row hidden — query with queryByText returns null.
    expect(screen.queryByText(/SQ FT/)).toBeNull();
  });
});

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
