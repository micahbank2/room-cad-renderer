import { describe, it, expect, beforeEach } from "vitest";
import { useCADStore } from "@/stores/cadStore";

const ROOM_A = "room_main";

function reset() {
  useCADStore.setState({
    rooms: {
      [ROOM_A]: {
        id: ROOM_A,
        name: "Main Room",
        room: { width: 20, length: 16, wallHeight: 8 },
        walls: {},
        placedProducts: {},
        stairs: {},
        measureLines: {},
        annotations: {},
      },
    },
    activeRoomId: ROOM_A,
    past: [],
    future: [],
  });
}

describe("cadStore — Phase 62 measure-line CRUD", () => {
  beforeEach(reset);

  it("addMeasureLine returns id and writes to measureLines map (history +1)", () => {
    const before = useCADStore.getState().past.length;
    const id = useCADStore.getState().addMeasureLine(ROOM_A, {
      start: { x: 0, y: 0 },
      end: { x: 10, y: 0 },
    });
    const line = useCADStore.getState().rooms[ROOM_A].measureLines![id];
    expect(line).toBeDefined();
    expect(line.id).toBe(id);
    expect(line.start).toEqual({ x: 0, y: 0 });
    expect(line.end).toEqual({ x: 10, y: 0 });
    expect(useCADStore.getState().past.length).toBe(before + 1);
  });

  it("updateMeasureLine merges patch (history +1)", () => {
    const id = useCADStore.getState().addMeasureLine(ROOM_A, {
      start: { x: 0, y: 0 },
      end: { x: 10, y: 0 },
    });
    const before = useCADStore.getState().past.length;
    useCADStore.getState().updateMeasureLine(ROOM_A, id, { end: { x: 5, y: 5 } });
    const line = useCADStore.getState().rooms[ROOM_A].measureLines![id];
    expect(line.end).toEqual({ x: 5, y: 5 });
    expect(line.start).toEqual({ x: 0, y: 0 });
    expect(useCADStore.getState().past.length).toBe(before + 1);
  });

  it("updateMeasureLineNoHistory does NOT push history", () => {
    const id = useCADStore.getState().addMeasureLine(ROOM_A, {
      start: { x: 0, y: 0 },
      end: { x: 10, y: 0 },
    });
    const before = useCADStore.getState().past.length;
    useCADStore.getState().updateMeasureLineNoHistory(ROOM_A, id, { end: { x: 7, y: 7 } });
    expect(useCADStore.getState().past.length).toBe(before);
    expect(useCADStore.getState().rooms[ROOM_A].measureLines![id].end).toEqual({ x: 7, y: 7 });
  });

  it("removeMeasureLine deletes the entry (history +1)", () => {
    const id = useCADStore.getState().addMeasureLine(ROOM_A, {
      start: { x: 0, y: 0 },
      end: { x: 10, y: 0 },
    });
    const before = useCADStore.getState().past.length;
    useCADStore.getState().removeMeasureLine(ROOM_A, id);
    expect(useCADStore.getState().rooms[ROOM_A].measureLines![id]).toBeUndefined();
    expect(useCADStore.getState().past.length).toBe(before + 1);
  });

  it("removeMeasureLineNoHistory deletes without history push", () => {
    const id = useCADStore.getState().addMeasureLine(ROOM_A, {
      start: { x: 0, y: 0 },
      end: { x: 10, y: 0 },
    });
    const before = useCADStore.getState().past.length;
    useCADStore.getState().removeMeasureLineNoHistory(ROOM_A, id);
    expect(useCADStore.getState().rooms[ROOM_A].measureLines![id]).toBeUndefined();
    expect(useCADStore.getState().past.length).toBe(before);
  });
});

describe("cadStore — Phase 62 annotation CRUD", () => {
  beforeEach(reset);

  it("addAnnotation returns id and writes to annotations map", () => {
    const id = useCADStore.getState().addAnnotation(ROOM_A, {
      position: { x: 5, y: 5 },
      text: "Closet",
    });
    const ann = useCADStore.getState().rooms[ROOM_A].annotations![id];
    expect(ann.id).toBe(id);
    expect(ann.position).toEqual({ x: 5, y: 5 });
    expect(ann.text).toBe("Closet");
  });

  it("updateAnnotation merges patch (history +1)", () => {
    const id = useCADStore.getState().addAnnotation(ROOM_A, {
      position: { x: 5, y: 5 },
      text: "",
    });
    const before = useCADStore.getState().past.length;
    useCADStore.getState().updateAnnotation(ROOM_A, id, { text: "Pantry" });
    expect(useCADStore.getState().rooms[ROOM_A].annotations![id].text).toBe("Pantry");
    expect(useCADStore.getState().past.length).toBe(before + 1);
  });

  it("updateAnnotationNoHistory does NOT push history", () => {
    const id = useCADStore.getState().addAnnotation(ROOM_A, {
      position: { x: 5, y: 5 },
      text: "",
    });
    const before = useCADStore.getState().past.length;
    useCADStore.getState().updateAnnotationNoHistory(ROOM_A, id, { text: "X" });
    useCADStore.getState().updateAnnotationNoHistory(ROOM_A, id, { text: "XY" });
    expect(useCADStore.getState().rooms[ROOM_A].annotations![id].text).toBe("XY");
    expect(useCADStore.getState().past.length).toBe(before);
  });

  it("removeAnnotation deletes (history +1)", () => {
    const id = useCADStore.getState().addAnnotation(ROOM_A, {
      position: { x: 5, y: 5 },
      text: "X",
    });
    const before = useCADStore.getState().past.length;
    useCADStore.getState().removeAnnotation(ROOM_A, id);
    expect(useCADStore.getState().rooms[ROOM_A].annotations![id]).toBeUndefined();
    expect(useCADStore.getState().past.length).toBe(before + 1);
  });

  it("removeAnnotationNoHistory deletes without history push", () => {
    const id = useCADStore.getState().addAnnotation(ROOM_A, {
      position: { x: 5, y: 5 },
      text: "X",
    });
    const before = useCADStore.getState().past.length;
    useCADStore.getState().removeAnnotationNoHistory(ROOM_A, id);
    expect(useCADStore.getState().rooms[ROOM_A].annotations![id]).toBeUndefined();
    expect(useCADStore.getState().past.length).toBe(before);
  });
});

describe("cadStore — multi-room scoping", () => {
  it("action on room A does not touch room B", () => {
    const ROOM_B = "room_b";
    useCADStore.setState({
      rooms: {
        [ROOM_A]: {
          id: ROOM_A,
          name: "A",
          room: { width: 10, length: 10, wallHeight: 8 },
          walls: {},
          placedProducts: {},
          stairs: {},
          measureLines: {},
          annotations: {},
        },
        [ROOM_B]: {
          id: ROOM_B,
          name: "B",
          room: { width: 10, length: 10, wallHeight: 8 },
          walls: {},
          placedProducts: {},
          stairs: {},
          measureLines: {},
          annotations: {},
        },
      },
      activeRoomId: ROOM_A,
      past: [],
      future: [],
    });

    const idA = useCADStore.getState().addMeasureLine(ROOM_A, {
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0 },
    });
    expect(useCADStore.getState().rooms[ROOM_A].measureLines![idA]).toBeDefined();
    expect(Object.keys(useCADStore.getState().rooms[ROOM_B].measureLines ?? {})).toEqual([]);
  });
});
