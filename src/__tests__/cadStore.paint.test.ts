import { describe, it, expect, beforeEach } from "vitest";
import { useCADStore, resetCADStoreForTests } from "@/stores/cadStore";
import type { PaintColor } from "@/types/paint";

beforeEach(() => {
  resetCADStoreForTests();
  // Reset paint-related state
  (useCADStore as any).setState((s: any) => ({
    ...s,
    customPaints: [],
    recentPaints: [],
  }));
});

describe("cadStore paint snapshot safety", () => {
  it("snapshot() includes customPaints array when present in state", () => {
    const testColor: PaintColor = {
      id: "custom_snap1",
      name: "Snap Color",
      hex: "#aabbcc",
      source: "custom",
    };
    (useCADStore as any).setState((s: any) => ({ ...s, customPaints: [testColor] }));

    // Trigger a history push by doing any action
    useCADStore.getState().setRoom({ width: 21 });

    const { past } = useCADStore.getState();
    expect(past.length).toBeGreaterThan(0);
    const snap = past[past.length - 1] as any;
    expect(snap.customPaints).toHaveLength(1);
    expect(snap.customPaints[0].id).toBe("custom_snap1");
  });

  it("snapshot() includes recentPaints array when present in state", () => {
    (useCADStore as any).setState((s: any) => ({ ...s, recentPaints: ["fb_001", "fb_002"] }));

    useCADStore.getState().setRoom({ width: 22 });

    const { past } = useCADStore.getState();
    const snap = past[past.length - 1] as any;
    expect(snap.recentPaints).toEqual(["fb_001", "fb_002"]);
  });

  it("undo restores customPaints from previous snapshot", () => {
    const color: PaintColor = { id: "custom_undo1", name: "Undo Color", hex: "#001122", source: "custom" };
    (useCADStore as any).setState((s: any) => ({ ...s, customPaints: [color] }));

    // Push history with color present, then change
    useCADStore.getState().setRoom({ width: 23 });
    (useCADStore as any).setState((s: any) => ({ ...s, customPaints: [] }));

    useCADStore.getState().undo();

    const state = useCADStore.getState() as any;
    expect(state.customPaints).toHaveLength(1);
    expect(state.customPaints[0].id).toBe("custom_undo1");
  });

  it("redo restores customPaints from future snapshot", () => {
    const color: PaintColor = { id: "custom_redo1", name: "Redo Color", hex: "#334455", source: "custom" };

    // Push a history entry
    useCADStore.getState().setRoom({ width: 24 });
    // Now set colors and push another entry
    (useCADStore as any).setState((s: any) => ({ ...s, customPaints: [color] }));
    useCADStore.getState().setRoom({ width: 25 });

    // Undo twice
    useCADStore.getState().undo();
    useCADStore.getState().undo();

    // Redo once (restores to state after first setRoom, no colors)
    useCADStore.getState().redo();

    // Redo again (restores to state with colors)
    useCADStore.getState().redo();
    const state = useCADStore.getState() as any;
    expect(state.customPaints).toHaveLength(1);
    expect(state.customPaints[0].id).toBe("custom_redo1");
  });

  it("loadSnapshot restores customPaints", async () => {
    const color: PaintColor = { id: "custom_load1", name: "Load Color", hex: "#667788", source: "custom" };
    const snap = {
      version: 2 as const,
      rooms: useCADStore.getState().rooms,
      activeRoomId: useCADStore.getState().activeRoomId,
      customPaints: [color],
    };
    await useCADStore.getState().loadSnapshot(snap);
    const state = useCADStore.getState() as any;
    expect(state.customPaints).toHaveLength(1);
    expect(state.customPaints[0].id).toBe("custom_load1");
  });

  it("loadSnapshot restores recentPaints", async () => {
    const snap = {
      version: 2 as const,
      rooms: useCADStore.getState().rooms,
      activeRoomId: useCADStore.getState().activeRoomId,
      recentPaints: ["fb_010", "fb_020"],
    };
    await useCADStore.getState().loadSnapshot(snap);
    const state = useCADStore.getState() as any;
    expect(state.recentPaints).toEqual(["fb_010", "fb_020"]);
  });
});

describe("cadStore addCustomPaint", () => {
  it("adds a PaintColor with custom_ prefix id and source='custom', pushes history", () => {
    const store = useCADStore.getState();
    const id = store.addCustomPaint({ name: "My Blue", hex: "#0000ff", hueFamily: "BLUES" });

    expect(id).toMatch(/^custom_/);
    const state = useCADStore.getState() as any;
    expect(state.customPaints).toHaveLength(1);
    expect(state.customPaints[0].id).toBe(id);
    expect(state.customPaints[0].source).toBe("custom");
    expect(state.customPaints[0].name).toBe("My Blue");
    // Should push history
    expect(state.past.length).toBeGreaterThan(0);
  });

  it("undo after addCustomPaint restores previous customPaints array", () => {
    const store = useCADStore.getState();
    store.addCustomPaint({ name: "Temp Color", hex: "#ff0000", hueFamily: "PINKS" });

    let state = useCADStore.getState() as any;
    expect(state.customPaints).toHaveLength(1);

    state.undo();
    state = useCADStore.getState() as any;
    expect(state.customPaints).toHaveLength(0);
  });
});

describe("cadStore removeCustomPaint", () => {
  it("removes by id, pushes history", () => {
    const store = useCADStore.getState();
    const id = store.addCustomPaint({ name: "To Remove", hex: "#aaaaaa", hueFamily: "NEUTRALS" });

    // Clear history to isolate
    (useCADStore as any).setState((s: any) => ({ ...s, past: [], future: [] }));

    store.removeCustomPaint(id);
    const state = useCADStore.getState() as any;
    expect(state.customPaints).toHaveLength(0);
    expect(state.past.length).toBeGreaterThan(0);
  });
});

describe("cadStore applyPaintToAllWalls", () => {
  it("sets kind='paint' + paintId on all walls for given side", () => {
    // Add some walls first
    useCADStore.getState().addWall({ x: 0, y: 0 }, { x: 10, y: 0 });
    useCADStore.getState().addWall({ x: 0, y: 5 }, { x: 10, y: 5 });

    useCADStore.getState().applyPaintToAllWalls("fb_001", "A");

    const doc = useCADStore.getState().rooms[useCADStore.getState().activeRoomId!];
    for (const wall of Object.values(doc.walls)) {
      expect(wall.wallpaper?.A?.kind).toBe("paint");
      expect((wall.wallpaper?.A as any)?.paintId).toBe("fb_001");
    }
  });

  it("applyPaintToAllWalls pushes exactly 1 history entry", () => {
    useCADStore.getState().addWall({ x: 0, y: 0 }, { x: 5, y: 0 });
    (useCADStore as any).setState((s: any) => ({ ...s, past: [], future: [] }));

    useCADStore.getState().applyPaintToAllWalls("fb_002", "B");

    const { past } = useCADStore.getState();
    expect(past).toHaveLength(1);
  });

  it("applyPaintToAllWalls updates recentPaints with the applied paintId at index 0", () => {
    useCADStore.getState().addWall({ x: 0, y: 0 }, { x: 5, y: 0 });
    useCADStore.getState().applyPaintToAllWalls("fb_003", "A");

    const state = useCADStore.getState() as any;
    expect(state.recentPaints[0]).toBe("fb_003");
  });

  it("recentPaints max length is 8, duplicates removed before prepend", () => {
    useCADStore.getState().addWall({ x: 0, y: 0 }, { x: 5, y: 0 });

    // Apply 10 different colors
    for (let i = 1; i <= 10; i++) {
      useCADStore.getState().applyPaintToAllWalls(`fb_${String(i).padStart(3, "0")}`, "A");
    }

    const state = useCADStore.getState() as any;
    expect(state.recentPaints).toHaveLength(8);
    expect(state.recentPaints[0]).toBe("fb_010");

    // Apply a color that's already in the list (no duplicate)
    useCADStore.getState().applyPaintToAllWalls("fb_005", "A");
    const state2 = useCADStore.getState() as any;
    expect(state2.recentPaints).toHaveLength(8);
    expect(state2.recentPaints[0]).toBe("fb_005");
    // fb_005 should appear only once
    const count = state2.recentPaints.filter((id: string) => id === "fb_005").length;
    expect(count).toBe(1);
  });

  it("applyPaintToAllWalls is a no-op when no active room", () => {
    (useCADStore as any).setState((s: any) => ({ ...s, activeRoomId: null }));

    // Should not throw
    expect(() => useCADStore.getState().applyPaintToAllWalls("fb_001", "A")).not.toThrow();

    const state = useCADStore.getState() as any;
    expect(state.recentPaints ?? []).toHaveLength(0);
  });
});
