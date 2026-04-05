import { describe, it, expect, beforeEach } from "vitest";
import { useCADStore } from "@/stores/cadStore";

function reset() {
  useCADStore.setState({
    room: { width: 20, length: 16, wallHeight: 8 },
    walls: {},
    placedProducts: {},
    past: [],
    future: [],
  });
}

describe("cadStore actions", () => {
  beforeEach(reset);

  it("placeProduct returns new id and adds to placedProducts", () => {
    const id = useCADStore.getState().placeProduct("prod_1", { x: 5, y: 6 });
    expect(id).toMatch(/^pp_/);
    const pp = useCADStore.getState().placedProducts[id];
    expect(pp).toBeDefined();
    expect(pp.productId).toBe("prod_1");
    expect(pp.position).toEqual({ x: 5, y: 6 });
    expect(pp.rotation).toBe(0);
  });

  it.todo("moveProduct updates position");

  it("rotateProduct updates rotation and pushes history", () => {
    const id = useCADStore.getState().placeProduct("prod_1", { x: 0, y: 0 });
    const before = useCADStore.getState().past.length;
    useCADStore.getState().rotateProduct(id, 45);
    expect(useCADStore.getState().placedProducts[id].rotation).toBe(45);
    expect(useCADStore.getState().past.length).toBe(before + 1);
  });

  it("rotate: rotateProductNoHistory updates rotation without pushing history", () => {
    const id = useCADStore.getState().placeProduct("prod_1", { x: 0, y: 0 });
    const before = useCADStore.getState().past.length;
    useCADStore.getState().rotateProductNoHistory(id, 30);
    expect(useCADStore.getState().placedProducts[id].rotation).toBe(30);
    expect(useCADStore.getState().past.length).toBe(before);
  });
  it.todo("updateWall: wall resize corner propagates to shared-endpoint walls");
  it.todo("undo restores prior snapshot");
  it.todo("redo re-applies undone snapshot");
});
