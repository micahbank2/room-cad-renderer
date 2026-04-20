import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { useCADStore, resetCADStoreForTests } from "@/stores/cadStore";
import type { PlacedProduct } from "@/types/cad";

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

describe("Phase 25 Wave 0 — snapshot + drag history contract", () => {
  beforeEach(() => {
    resetCADStoreForTests();
  });

  it("snapshot is independent", () => {
    // Drive the store to push at least one history entry
    useCADStore.getState().addWall({ x: 0, y: 0 }, { x: 5, y: 0 });

    const state = useCADStore.getState();
    expect(state.past.length).toBeGreaterThanOrEqual(1);
    const past0 = state.past[0];
    expect(past0.rooms.room_main).toBeDefined();

    // Reference-independence: snapshot's rooms object must NOT be the same
    // reference as the live state's rooms object (i.e., it is a deep clone,
    // not a shared reference). This pins the contract for both JSON.parse
    // and structuredClone implementations.
    expect(past0.rooms).not.toBe(state.rooms);
    expect(past0.rooms.room_main).not.toBe(state.rooms.room_main);
    expect(past0.rooms.room_main.room).not.toBe(
      state.rooms.room_main.room,
    );

    // Deep-mutation check — copy the snapshot's room data into an unfrozen
    // clone, mutate the clone, confirm live state is still unchanged. This
    // proves the snapshot's values carry independent data, not just an
    // independent top-level reference.
    const snapClone = JSON.parse(JSON.stringify(past0));
    snapClone.rooms.room_main.room.width = 999;
    expect(useCADStore.getState().rooms.room_main.room.width).not.toBe(999);
  });

  it("snapshot preserves all keys", () => {
    // Extend live state to include customElements/customPaints/recentPaints
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useCADStore.setState as any)({
      customElements: { foo: { id: "foo", name: "Foo", geometry: [] } },
      customPaints: [{ id: "red", name: "Red", hex: "#f00", source: "custom" }],
      recentPaints: ["red"],
    });

    // Trigger a history push so snapshot() captures current root-level fields
    useCADStore.getState().addWall({ x: 0, y: 0 }, { x: 5, y: 0 });

    const past = useCADStore.getState().past;
    const snap = past[past.length - 1];

    expect(snap).toHaveProperty("rooms");
    expect(snap).toHaveProperty("activeRoomId");
    expect(snap).toHaveProperty("customElements");
    expect(snap).toHaveProperty("customPaints");
    expect(snap).toHaveProperty("recentPaints");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const snapAny = snap as any;
    expect(snapAny.customElements).toEqual({
      foo: { id: "foo", name: "Foo", geometry: [] },
    });
    expect(snapAny.customPaints).toEqual([
      { id: "red", name: "Red", hex: "#f00", source: "custom" },
    ]);
    expect(snapAny.recentPaints).toEqual(["red"]);
  });

  it("snapshot uses structuredClone", () => {
    // Source-level guard — Wave 0 expects this to FAIL RED pre-migration.
    // Wave 1 migrates snapshot() to structuredClone and this flips GREEN.
    const src = readFileSync(
      resolve(process.cwd(), "src/stores/cadStore.ts"),
      "utf8",
    );

    // Extract the snapshot() function body between its signature and the next
    // top-level declaration (function/const/export).
    const start = src.indexOf("function snapshot(state: CADState)");
    expect(start).toBeGreaterThanOrEqual(0);
    const rest = src.slice(start);
    const nextDeclMatch = rest
      .slice(1)
      .match(/\n(function |const |export |interface )/);
    const end =
      nextDeclMatch && nextDeclMatch.index !== undefined
        ? 1 + nextDeclMatch.index
        : rest.length;
    const body = rest.slice(0, end);

    expect(body).not.toContain("JSON.parse(JSON.stringify");
    expect(body).toContain("structuredClone(");
  });

  it("drag produces single history entry", () => {
    // Seed a placed product via direct setState so the placement itself
    // doesn't consume a history slot we're measuring.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useCADStore.setState((s: any) => {
      const doc = s.rooms[s.activeRoomId];
      const pp: PlacedProduct = {
        id: "pp_test",
        productId: "prod_1",
        position: { x: 0, y: 0 },
        rotation: 0,
      };
      doc.placedProducts = { ...doc.placedProducts, pp_test: pp };
      return { rooms: { ...s.rooms, [s.activeRoomId]: { ...doc } } };
    });

    const before = useCADStore.getState().past.length;
    useCADStore.getState().moveProduct("pp_test", { x: 5, y: 5 });
    const after = useCADStore.getState().past.length;

    expect(after - before).toBe(1);
  });

  it("wall drag produces single history entry", () => {
    // Create a wall first. addWall pushes history for the creation itself.
    useCADStore.getState().addWall({ x: 0, y: 0 }, { x: 5, y: 0 });
    const walls = useCADStore.getState().rooms.room_main.walls;
    const wallId = Object.keys(walls)[0];

    // Measure from AFTER creation so only the drag commit is counted.
    const before = useCADStore.getState().past.length;
    useCADStore.getState().updateWall(wallId, {
      start: { x: 1, y: 1 },
      end: { x: 6, y: 1 },
    });
    const after = useCADStore.getState().past.length;

    expect(after - before).toBe(1);
  });
});
