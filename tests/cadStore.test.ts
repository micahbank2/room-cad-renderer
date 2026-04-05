import { describe, it, expect, beforeEach } from "vitest";
import { useCADStore, resetCADStoreForTests } from "@/stores/cadStore";

function activeDoc() {
  const s = useCADStore.getState();
  return s.rooms[s.activeRoomId!];
}

describe("cadStore actions", () => {
  beforeEach(() => { resetCADStoreForTests(); });

  it("placeProduct returns new id and adds to placedProducts", () => {
    const id = useCADStore.getState().placeProduct("prod_1", { x: 5, y: 6 });
    expect(id).toMatch(/^pp_/);
    const pp = activeDoc().placedProducts[id];
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
    expect(activeDoc().placedProducts[id].rotation).toBe(45);
    expect(useCADStore.getState().past.length).toBe(before + 1);
  });

  it("rotate: rotateProductNoHistory updates rotation without pushing history", () => {
    const id = useCADStore.getState().placeProduct("prod_1", { x: 0, y: 0 });
    const before = useCADStore.getState().past.length;
    useCADStore.getState().rotateProductNoHistory(id, 30);
    expect(activeDoc().placedProducts[id].rotation).toBe(30);
    expect(useCADStore.getState().past.length).toBe(before);
  });
  it("updateWall: wall resize corner propagates to shared-endpoint walls", () => {
    useCADStore.getState().addWall({ x: 0, y: 0 }, { x: 10, y: 0 });
    useCADStore.getState().addWall({ x: 10, y: 0 }, { x: 10, y: 10 });
    const walls = activeDoc().walls;
    const wallAId = Object.values(walls).find((w) => w.start.x === 0)!.id;
    const wallBId = Object.values(walls).find((w) => w.start.x === 10 && w.start.y === 0)!.id;

    useCADStore.getState().resizeWallByLabel(wallAId, 5);

    const wallA = activeDoc().walls[wallAId];
    const wallB = activeDoc().walls[wallBId];
    expect(wallA.end.x).toBeCloseTo(5);
    expect(wallA.end.y).toBeCloseTo(0);
    expect(wallB.start.x).toBeCloseTo(5);
    expect(wallB.start.y).toBeCloseTo(0);
    expect(wallB.end.x).toBeCloseTo(10);
    expect(wallB.end.y).toBeCloseTo(10);
  });
  it.todo("undo restores prior snapshot");
  it.todo("redo re-applies undone snapshot");
});
