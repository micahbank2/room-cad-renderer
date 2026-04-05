import type { CADSnapshot, RoomDoc, LegacySnapshotV1 } from "@/types/cad";

export function defaultSnapshot(): CADSnapshot {
  const mainRoom: RoomDoc = {
    id: "room_main",
    name: "Main Room",
    room: { width: 20, length: 16, wallHeight: 8 },
    walls: {},
    placedProducts: {},
  };
  return {
    version: 2,
    rooms: { room_main: mainRoom },
    activeRoomId: "room_main",
  };
}

export function migrateSnapshot(raw: unknown): CADSnapshot {
  // v2 passthrough
  if (
    raw &&
    typeof raw === "object" &&
    (raw as CADSnapshot).version === 2 &&
    (raw as CADSnapshot).rooms
  ) {
    return raw as CADSnapshot;
  }
  // v1 legacy shape
  if (
    raw &&
    typeof raw === "object" &&
    "room" in raw &&
    "walls" in (raw as Record<string, unknown>)
  ) {
    const legacy = raw as LegacySnapshotV1;
    const mainRoom: RoomDoc = {
      id: "room_main",
      name: "Main Room",
      room: legacy.room,
      walls: legacy.walls ?? {},
      placedProducts: legacy.placedProducts ?? {},
    };
    return {
      version: 2,
      rooms: { room_main: mainRoom },
      activeRoomId: "room_main",
    };
  }
  // unknown / empty
  return defaultSnapshot();
}
