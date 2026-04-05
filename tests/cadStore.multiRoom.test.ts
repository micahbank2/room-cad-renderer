import { describe, it, expect, beforeEach } from "vitest";
import { useCADStore, resetCADStoreForTests } from "@/stores/cadStore";

describe("cadStore multi-room actions", () => {
  beforeEach(() => {
    resetCADStoreForTests();
  });

  it("addRoom creates a RoomDoc and returns its id", () => {
    const id = useCADStore.getState().addRoom("Office");
    expect(id.startsWith("room_")).toBe(true);
    const s = useCADStore.getState();
    expect(s.rooms[id].name).toBe("Office");
    expect(s.activeRoomId).toBe(id);
  });

  it("addRoom with template pre-populates perimeter walls", () => {
    const id = useCADStore.getState().addRoom("Living", "LIVING_ROOM");
    const doc = useCADStore.getState().rooms[id];
    expect(Object.keys(doc.walls)).toHaveLength(4);
    expect(doc.room).toEqual({ width: 16, length: 20, wallHeight: 9 });
  });

  it("switchRoom updates activeRoomId without pushing history", () => {
    const id = useCADStore.getState().addRoom("B");
    const pastLenBefore = useCADStore.getState().past.length;
    useCADStore.getState().switchRoom("room_main");
    const s = useCADStore.getState();
    expect(s.activeRoomId).toBe("room_main");
    expect(s.past.length).toBe(pastLenBefore);
  });

  it("renameRoom updates the room name in place", () => {
    useCADStore.getState().renameRoom("room_main", "Foyer");
    expect(useCADStore.getState().rooms.room_main.name).toBe("Foyer");
  });

  it("removeRoom last-room guard refuses to delete final room", () => {
    useCADStore.getState().removeRoom("room_main");
    expect(useCADStore.getState().rooms.room_main).toBeDefined();
  });

  it("removeRoom reassigns activeRoomId when active room is deleted", () => {
    const id = useCADStore.getState().addRoom("B");
    expect(useCADStore.getState().activeRoomId).toBe(id);
    useCADStore.getState().removeRoom(id);
    expect(useCADStore.getState().activeRoomId).toBe("room_main");
    expect(useCADStore.getState().rooms[id]).toBeUndefined();
  });

  it("addWall targets only the active room", () => {
    const id = useCADStore.getState().addRoom("B");
    useCADStore.getState().addWall({ x: 0, y: 0 }, { x: 5, y: 0 });
    expect(Object.keys(useCADStore.getState().rooms[id].walls)).toHaveLength(1);
    expect(Object.keys(useCADStore.getState().rooms.room_main.walls)).toHaveLength(0);
  });

  it("placedProducts are isolated across rooms", () => {
    useCADStore.getState().placeProduct("prod_x", { x: 1, y: 1 });
    const id = useCADStore.getState().addRoom("B");
    useCADStore.getState().placeProduct("prod_y", { x: 2, y: 2 });
    expect(Object.keys(useCADStore.getState().rooms.room_main.placedProducts)).toHaveLength(1);
    expect(Object.keys(useCADStore.getState().rooms[id].placedProducts)).toHaveLength(1);
    const mainPP = Object.values(useCADStore.getState().rooms.room_main.placedProducts)[0];
    expect(mainPP.productId).toBe("prod_x");
  });

  it("undo addRoom removes the entire room", () => {
    const id = useCADStore.getState().addRoom("B");
    expect(useCADStore.getState().rooms[id]).toBeDefined();
    useCADStore.getState().undo();
    expect(useCADStore.getState().rooms[id]).toBeUndefined();
  });
});
