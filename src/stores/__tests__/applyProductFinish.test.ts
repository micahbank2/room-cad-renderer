import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { useCADStore } from "@/stores/cadStore";
import type { RoomDoc } from "@/types/cad";

const baseRoom: RoomDoc = {
  id: "r1",
  name: "R1",
  room: { width: 20, length: 16, wallHeight: 8 },
  walls: {},
  placedProducts: {
    pp_a: { id: "pp_a", productId: "prod_x", position: { x: 5, y: 5 }, rotation: 0 },
  },
  stairs: {},
  measureLines: {},
  annotations: {},
};

function seedState() {
  useCADStore.setState({
    rooms: { r1: structuredClone(baseRoom) },
    activeRoomId: "r1",
    past: [],
    future: [],
  } as any);
}

describe("applyProductFinish", () => {
  beforeEach(() => {
    seedState();
  });

  it("sets finishMaterialId and pushes one history entry", () => {
    const before = useCADStore.getState().past.length;
    useCADStore.getState().applyProductFinish("pp_a", "mat_x");
    const s = useCADStore.getState();
    expect(s.rooms.r1.placedProducts.pp_a.finishMaterialId).toBe("mat_x");
    expect(s.past.length).toBe(before + 1);
  });

  it("clears finishMaterialId when materialId is undefined", () => {
    useCADStore.getState().applyProductFinish("pp_a", "mat_x");
    useCADStore.getState().applyProductFinish("pp_a", undefined);
    const s = useCADStore.getState();
    expect(s.rooms.r1.placedProducts.pp_a.finishMaterialId).toBeUndefined();
  });

  it("NoHistory variant does not push history", () => {
    const before = useCADStore.getState().past.length;
    useCADStore.getState().applyProductFinishNoHistory("pp_a", "mat_y");
    const s = useCADStore.getState();
    expect(s.rooms.r1.placedProducts.pp_a.finishMaterialId).toBe("mat_y");
    expect(s.past.length).toBe(before);
  });

  it("single undo reverts the apply", () => {
    const beforeFinish = useCADStore.getState().rooms.r1.placedProducts.pp_a.finishMaterialId;
    useCADStore.getState().applyProductFinish("pp_a", "mat_x");
    useCADStore.getState().undo();
    const s = useCADStore.getState();
    expect(s.rooms.r1.placedProducts.pp_a.finishMaterialId).toBe(beforeFinish);
  });

  it("no-op on unknown placedId", () => {
    const before = useCADStore.getState().past.length;
    useCADStore.getState().applyProductFinish("pp_DOES_NOT_EXIST", "mat_x");
    expect(useCADStore.getState().past.length).toBe(before);
  });
});

describe("PlacedProduct.finishMaterialId persistence", () => {
  it("round-trips through loadSnapshot", async () => {
    await useCADStore.getState().loadSnapshot({
      version: 7,
      rooms: {
        r1: {
          id: "r1", name: "R1",
          room: { width: 20, length: 16, wallHeight: 8 },
          walls: {},
          placedProducts: {
            pp_a: { id: "pp_a", productId: "prod_x", position: { x: 5, y: 5 }, rotation: 0, finishMaterialId: "mat_xyz" },
          },
          stairs: {}, measureLines: {}, annotations: {},
        },
      },
      activeRoomId: "r1",
    });
    const reloaded = useCADStore.getState();
    expect(reloaded.rooms.r1.placedProducts.pp_a.finishMaterialId).toBe("mat_xyz");
  });
});
