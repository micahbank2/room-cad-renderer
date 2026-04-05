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

/** Phase 17: wrap legacy singleton treatments in { A, B } shape. Mutates in place. */
function migrateWallsPerSide(rooms: Record<string, RoomDoc> | undefined): void {
  if (!rooms) return;
  for (const doc of Object.values(rooms)) {
    if (!doc?.walls) continue;
    for (const wall of Object.values(doc.walls)) {
      const w = wall as any;
      // Wallpaper: detect legacy singleton (has .kind)
      if (w.wallpaper && typeof w.wallpaper === "object" && "kind" in w.wallpaper) {
        w.wallpaper = { A: w.wallpaper };
      }
      // Wainscoting: detect legacy (has .enabled)
      if (w.wainscoting && typeof w.wainscoting === "object" && "enabled" in w.wainscoting) {
        w.wainscoting = { A: w.wainscoting };
      }
      // Crown: same pattern
      if (w.crownMolding && typeof w.crownMolding === "object" && "enabled" in w.crownMolding) {
        w.crownMolding = { A: w.crownMolding };
      }
      // WallArt items: default missing side to "A"
      if (Array.isArray(w.wallArt)) {
        for (const art of w.wallArt) {
          if (!art.side) art.side = "A";
        }
      }
    }
  }
}

export function migrateSnapshot(raw: unknown): CADSnapshot {
  // v2 passthrough
  if (
    raw &&
    typeof raw === "object" &&
    (raw as CADSnapshot).version === 2 &&
    (raw as CADSnapshot).rooms
  ) {
    const snap = raw as CADSnapshot;
    migrateWallsPerSide(snap.rooms);
    return snap;
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
    const rooms = { room_main: mainRoom };
    migrateWallsPerSide(rooms);
    return {
      version: 2,
      rooms,
      activeRoomId: "room_main",
    };
  }
  // unknown / empty
  return defaultSnapshot();
}
