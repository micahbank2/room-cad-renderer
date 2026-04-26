import { describe, it, expect, beforeEach } from "vitest";
import { useCADStore } from "@/stores/cadStore";

// ---------------------------------------------------------------------------
// Self-contained inline seed (WARNING-3 fix). NO cross-plan helper imports.
// ---------------------------------------------------------------------------
function inlineSeed(): {
  wallId: string;
  productId: string;
  ceilingId: string;
  customId: string;
} {
  const wallId = "wall_test_1";
  const productId = "pp_test_1";
  const ceilingId = "ceiling_test_1";
  const customId = "pce_test_1";
  const roomId = "room_test_1";

  useCADStore.setState((prev) => ({
    ...prev,
    activeRoomId: roomId,
    rooms: {
      [roomId]: {
        id: roomId,
        name: "Test",
        room: { width: 20, length: 16, wallHeight: 8 },
        walls: {
          [wallId]: {
            id: wallId,
            start: { x: 0, y: 0 },
            end: { x: 10, y: 0 },
            thickness: 0.5,
            height: 8,
            openings: [],
          },
        },
        placedProducts: {
          [productId]: {
            id: productId,
            productId: "test_product_lib_id",
            position: { x: 5, y: 5 },
            rotation: 0,
          },
        },
        ceilings: {
          [ceilingId]: {
            id: ceilingId,
            points: [
              { x: 0, y: 0 },
              { x: 10, y: 0 },
              { x: 10, y: 10 },
              { x: 0, y: 10 },
            ],
            height: 8,
            material: "#f5f5f5",
          },
        },
        placedCustomElements: {
          [customId]: {
            id: customId,
            customElementId: "test_ce_lib_id",
            position: { x: 3, y: 3 },
            rotation: 0,
          },
        },
      },
    },
    past: [],
    future: [],
  }));

  return { wallId, productId, ceilingId, customId };
}

describe("cadStore — Phase 48 savedCamera NoHistory actions (D-03, D-04)", () => {
  beforeEach(() => {
    inlineSeed();
  });

  it("setSavedCameraOnWallNoHistory writes savedCameraPos + savedCameraTarget on the wall", () => {
    const { wallId } = inlineSeed();
    const pos: [number, number, number] = [1, 2, 3];
    const target: [number, number, number] = [4, 5, 6];
    const store = useCADStore.getState() as ReturnType<typeof useCADStore.getState> & {
      setSavedCameraOnWallNoHistory?: (id: string, p: [number,number,number], t: [number,number,number]) => void;
    };
    expect(typeof store.setSavedCameraOnWallNoHistory).toBe("function");
    store.setSavedCameraOnWallNoHistory!(wallId, pos, target);
    const state = useCADStore.getState();
    const doc = state.activeRoomId ? state.rooms[state.activeRoomId] : undefined;
    const wall = doc?.walls?.[wallId] as { savedCameraPos?: [number,number,number]; savedCameraTarget?: [number,number,number] } | undefined;
    expect(wall?.savedCameraPos).toEqual(pos);
    expect(wall?.savedCameraTarget).toEqual(target);
  });

  it("setSavedCameraOn{Wall,Product,Ceiling,CustomElement}NoHistory does NOT push to past[] (D-04)", () => {
    const { wallId, productId, ceilingId, customId } = inlineSeed();
    const store = useCADStore.getState() as ReturnType<typeof useCADStore.getState> & {
      setSavedCameraOnWallNoHistory?: (id: string, p: [number,number,number], t: [number,number,number]) => void;
      setSavedCameraOnProductNoHistory?: (id: string, p: [number,number,number], t: [number,number,number]) => void;
      setSavedCameraOnCeilingNoHistory?: (id: string, p: [number,number,number], t: [number,number,number]) => void;
      setSavedCameraOnCustomElementNoHistory?: (id: string, p: [number,number,number], t: [number,number,number]) => void;
      past?: unknown[];
    };
    const pastBefore = (store.past ?? []).length;
    store.setSavedCameraOnWallNoHistory!(wallId, [1,2,3], [4,5,6]);
    store.setSavedCameraOnProductNoHistory!(productId, [7,8,9], [10,11,12]);
    store.setSavedCameraOnCeilingNoHistory!(ceilingId, [1,1,1], [2,2,2]);
    store.setSavedCameraOnCustomElementNoHistory!(customId, [3,3,3], [4,4,4]);
    const after = useCADStore.getState() as typeof store;
    expect((after.past ?? []).length).toBe(pastBefore);
  });

  it("setSavedCameraOnProductNoHistory writes on placedProducts[id]", () => {
    const { productId } = inlineSeed();
    const store = useCADStore.getState() as ReturnType<typeof useCADStore.getState> & {
      setSavedCameraOnProductNoHistory?: (id: string, p: [number,number,number], t: [number,number,number]) => void;
    };
    store.setSavedCameraOnProductNoHistory!(productId, [10, 20, 30], [40, 50, 60]);
    const state = useCADStore.getState();
    const doc = state.activeRoomId ? state.rooms[state.activeRoomId] : undefined;
    const pp = doc?.placedProducts?.[productId] as { savedCameraPos?: [number,number,number] } | undefined;
    expect(pp?.savedCameraPos).toEqual([10, 20, 30]);
  });

  it("setSavedCameraOnCeilingNoHistory writes on (ceilings ?? {})[id]", () => {
    const { ceilingId } = inlineSeed();
    const store = useCADStore.getState() as ReturnType<typeof useCADStore.getState> & {
      setSavedCameraOnCeilingNoHistory?: (id: string, p: [number,number,number], t: [number,number,number]) => void;
    };
    store.setSavedCameraOnCeilingNoHistory!(ceilingId, [11, 12, 13], [14, 15, 16]);
    const state = useCADStore.getState();
    const doc = state.activeRoomId ? state.rooms[state.activeRoomId] : undefined;
    const c = (doc?.ceilings ?? {})[ceilingId] as { savedCameraPos?: [number,number,number] } | undefined;
    expect(c?.savedCameraPos).toEqual([11, 12, 13]);
  });

  it("setSavedCameraOnCustomElementNoHistory writes on (placedCustomElements ?? {})[id]", () => {
    const { customId } = inlineSeed();
    const store = useCADStore.getState() as ReturnType<typeof useCADStore.getState> & {
      setSavedCameraOnCustomElementNoHistory?: (id: string, p: [number,number,number], t: [number,number,number]) => void;
    };
    store.setSavedCameraOnCustomElementNoHistory!(customId, [21, 22, 23], [24, 25, 26]);
    const state = useCADStore.getState();
    const doc = state.activeRoomId ? state.rooms[state.activeRoomId] : undefined;
    const pce = (doc?.placedCustomElements ?? {})[customId] as { savedCameraPos?: [number,number,number] } | undefined;
    expect(pce?.savedCameraPos).toEqual([21, 22, 23]);
  });

  it("clearSavedCameraNoHistory('wall', id) sets both fields to undefined and does not push history", () => {
    const { wallId } = inlineSeed();
    const store = useCADStore.getState() as ReturnType<typeof useCADStore.getState> & {
      setSavedCameraOnWallNoHistory?: (id: string, p: [number,number,number], t: [number,number,number]) => void;
      clearSavedCameraNoHistory?: (kind: "wall"|"product"|"ceiling"|"custom", id: string) => void;
      past?: unknown[];
    };
    store.setSavedCameraOnWallNoHistory!(wallId, [1,2,3], [4,5,6]);
    const pastBefore = (store.past ?? []).length;
    store.clearSavedCameraNoHistory!("wall", wallId);
    const state = useCADStore.getState() as typeof store;
    const doc = state.activeRoomId ? state.rooms[state.activeRoomId] : undefined;
    const wall = doc?.walls?.[wallId] as { savedCameraPos?: unknown; savedCameraTarget?: unknown } | undefined;
    expect(wall?.savedCameraPos).toBeUndefined();
    expect(wall?.savedCameraTarget).toBeUndefined();
    expect((state.past ?? []).length).toBe(pastBefore);
  });

  it("clearSavedCameraNoHistory works for product / ceiling / custom kinds", () => {
    const { productId, ceilingId, customId } = inlineSeed();
    const store = useCADStore.getState() as ReturnType<typeof useCADStore.getState> & {
      setSavedCameraOnProductNoHistory?: (id: string, p: [number,number,number], t: [number,number,number]) => void;
      setSavedCameraOnCeilingNoHistory?: (id: string, p: [number,number,number], t: [number,number,number]) => void;
      setSavedCameraOnCustomElementNoHistory?: (id: string, p: [number,number,number], t: [number,number,number]) => void;
      clearSavedCameraNoHistory?: (kind: "wall"|"product"|"ceiling"|"custom", id: string) => void;
    };
    store.setSavedCameraOnProductNoHistory!(productId, [1,2,3], [4,5,6]);
    store.setSavedCameraOnCeilingNoHistory!(ceilingId, [1,2,3], [4,5,6]);
    store.setSavedCameraOnCustomElementNoHistory!(customId, [1,2,3], [4,5,6]);
    store.clearSavedCameraNoHistory!("product", productId);
    store.clearSavedCameraNoHistory!("ceiling", ceilingId);
    store.clearSavedCameraNoHistory!("custom", customId);
    const state = useCADStore.getState();
    const doc = state.activeRoomId ? state.rooms[state.activeRoomId] : undefined;
    expect((doc?.placedProducts?.[productId] as { savedCameraPos?: unknown } | undefined)?.savedCameraPos).toBeUndefined();
    expect(((doc?.ceilings ?? {})[ceilingId] as { savedCameraPos?: unknown } | undefined)?.savedCameraPos).toBeUndefined();
    expect(((doc?.placedCustomElements ?? {})[customId] as { savedCameraPos?: unknown } | undefined)?.savedCameraPos).toBeUndefined();
  });

  it("setter with unknown id is a no-op (does not throw)", () => {
    const store = useCADStore.getState() as ReturnType<typeof useCADStore.getState> & {
      setSavedCameraOnWallNoHistory?: (id: string, p: [number,number,number], t: [number,number,number]) => void;
    };
    expect(() => store.setSavedCameraOnWallNoHistory!("does_not_exist", [1,2,3], [4,5,6])).not.toThrow();
  });

  // WARNING-6 fix: serialization round-trip test
  it("savedCamera fields survive JSON.stringify → JSON.parse round-trip (D-03 forward-compat)", () => {
    const { wallId } = inlineSeed();
    const store = useCADStore.getState() as ReturnType<typeof useCADStore.getState> & {
      setSavedCameraOnWallNoHistory?: (id: string, p: [number,number,number], t: [number,number,number]) => void;
    };
    const pos: [number, number, number] = [7.5, 6.0, 11.25];
    const target: [number, number, number] = [3.5, 1.0, 4.75];
    store.setSavedCameraOnWallNoHistory!(wallId, pos, target);

    const rooms = useCADStore.getState().rooms;
    const cloned = JSON.parse(JSON.stringify(rooms)) as typeof rooms;
    const room = Object.values(cloned)[0] as { walls: Record<string, { savedCameraPos?: [number,number,number]; savedCameraTarget?: [number,number,number] }> };
    expect(room.walls[wallId].savedCameraPos).toEqual(pos);
    expect(room.walls[wallId].savedCameraTarget).toEqual(target);
  });
});
