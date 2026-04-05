import { describe, it } from "vitest";

describe("cadStore multi-room actions", () => {
  it.todo("addRoom creates a RoomDoc and returns its id");
  it.todo("addRoom with template pre-populates perimeter walls");
  it.todo("switchRoom updates activeRoomId without pushing history");
  it.todo("renameRoom updates the room name in place");
  it.todo("removeRoom last-room guard refuses to delete final room");
  it.todo("removeRoom reassigns activeRoomId when active room is deleted");
  it.todo("addWall targets only the active room");
  it.todo("placedProducts are isolated across rooms");
  it.todo("undo addRoom removes the entire room");
});
