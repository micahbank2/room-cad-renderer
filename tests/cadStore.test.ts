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

  // --- copyWallSide tests (POLISH-03) ---

  it("copyWallSide copies wallpaper from source to target side (deep clone)", () => {
    // Add a wall
    useCADStore.getState().addWall({ x: 0, y: 0 }, { x: 10, y: 0 });
    const wallId = Object.keys(activeDoc().walls)[0];

    // Apply wallpaper to side A
    useCADStore.getState().setWallpaper(wallId, "A", { kind: "color", color: "#ff0000" });

    // Copy A -> B
    useCADStore.getState().copyWallSide(wallId, "A", "B");

    const wall = activeDoc().walls[wallId];
    expect(wall.wallpaper?.B).toBeDefined();
    expect(wall.wallpaper?.B?.color).toBe("#ff0000");

    // Mutate side A after copy — side B should be independent (deep clone)
    useCADStore.getState().setWallpaper(wallId, "A", { kind: "color", color: "#00ff00" });
    const wallAfter = activeDoc().walls[wallId];
    expect(wallAfter.wallpaper?.A?.color).toBe("#00ff00");
    expect(wallAfter.wallpaper?.B?.color).toBe("#ff0000"); // unchanged
  });

  it("copyWallSide copies wall art with new IDs", () => {
    useCADStore.getState().addWall({ x: 0, y: 0 }, { x: 10, y: 0 });
    const wallId = Object.keys(activeDoc().walls)[0];

    // Add art on side A
    const artId = useCADStore.getState().addWallArt(wallId, {
      offset: 3,
      centerY: 4,
      width: 2,
      height: 2.5,
      imageUrl: "data:image/png;base64,test",
      side: "A",
    });

    // Copy A -> B
    useCADStore.getState().copyWallSide(wallId, "A", "B");

    const wall = activeDoc().walls[wallId];
    const sideBArt = (wall.wallArt ?? []).filter((a) => (a.side ?? "A") === "B");
    expect(sideBArt.length).toBe(1);
    expect(sideBArt[0].id).not.toBe(artId); // new ID
    expect(sideBArt[0].width).toBe(2);
    expect(sideBArt[0].height).toBe(2.5);
    expect(sideBArt[0].side).toBe("B");
  });

  it("copyWallSide pushes exactly one history entry", () => {
    useCADStore.getState().addWall({ x: 0, y: 0 }, { x: 10, y: 0 });
    const wallId = Object.keys(activeDoc().walls)[0];

    const before = useCADStore.getState().past.length;
    useCADStore.getState().copyWallSide(wallId, "A", "B");
    expect(useCADStore.getState().past.length).toBe(before + 1);
  });

  // --- updateWallArtNoHistory tests (POLISH-04) ---

  it("updateWallArtNoHistory updates frameColorOverride without pushing history", () => {
    useCADStore.getState().addWall({ x: 0, y: 0 }, { x: 10, y: 0 });
    const wallId = Object.keys(activeDoc().walls)[0];

    const artId = useCADStore.getState().addWallArt(wallId, {
      offset: 3,
      centerY: 4,
      width: 2,
      height: 2.5,
      imageUrl: "data:image/png;base64,test",
      side: "A",
      frameStyle: "classic",
    });

    const before = useCADStore.getState().past.length;
    useCADStore.getState().updateWallArtNoHistory(wallId, artId, {
      frameColorOverride: "#ff00ff",
    });

    const wall = activeDoc().walls[wallId];
    const art = wall.wallArt!.find((a) => a.id === artId)!;
    expect(art.frameColorOverride).toBe("#ff00ff");
    expect(useCADStore.getState().past.length).toBe(before); // no history push
  });

  it("updateWallArt pushes history when updating frameColorOverride", () => {
    useCADStore.getState().addWall({ x: 0, y: 0 }, { x: 10, y: 0 });
    const wallId = Object.keys(activeDoc().walls)[0];

    const artId = useCADStore.getState().addWallArt(wallId, {
      offset: 3,
      centerY: 4,
      width: 2,
      height: 2.5,
      imageUrl: "data:image/png;base64,test",
      side: "A",
      frameStyle: "classic",
    });

    const before = useCADStore.getState().past.length;
    useCADStore.getState().updateWallArt(wallId, artId, {
      frameColorOverride: "#00ffaa",
    });

    expect(useCADStore.getState().past.length).toBe(before + 1);
  });
});
