import type { CADSnapshot, RoomDoc, LegacySnapshotV1, FloorMaterial } from "@/types/cad";
import { computeSHA256, saveUserTextureWithDedup } from "@/lib/userTextureStore";

export function defaultSnapshot(): CADSnapshot {
  const mainRoom: RoomDoc = {
    id: "room_main",
    name: "Main Room",
    room: { width: 20, length: 16, wallHeight: 8 },
    walls: {},
    placedProducts: {},
  };
  return {
    version: 3,
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
  // v3 passthrough — already migrated, no mutations needed
  if (
    raw &&
    typeof raw === "object" &&
    (raw as CADSnapshot).version === 3 &&
    (raw as CADSnapshot).rooms
  ) {
    return raw as CADSnapshot;
  }
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

/**
 * Phase 51 — DEBT-05: migrate a single FloorMaterial entry from the legacy
 * { kind: "custom", imageUrl: "data:..." } shape to { kind: "user-texture", userTextureId }.
 * On any failure, preserves the original entry (graceful degradation per D-03).
 */
async function migrateOneFloorMaterial(mat: FloorMaterial): Promise<FloorMaterial> {
  if (mat.kind !== "custom" || !(mat as any).imageUrl?.startsWith("data:")) return mat;
  try {
    const imageUrl = (mat as any).imageUrl as string;
    const commaIdx = imageUrl.indexOf(",");
    if (commaIdx === -1) throw new Error("no comma in data URL");
    const header = imageUrl.slice(5, commaIdx);
    const mimeType = header.split(";")[0] || "image/jpeg";
    const b64 = imageUrl.slice(commaIdx + 1);
    if (!b64) throw new Error("empty base64 payload");
    const binary = atob(b64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: mimeType });
    const sha256 = await computeSHA256(bytes.buffer);
    const { id } = await saveUserTextureWithDedup(
      { name: "Imported Floor", tileSizeFt: mat.scaleFt ?? 4, blob, mimeType },
      sha256,
    );
    return { kind: "user-texture", userTextureId: id, scaleFt: mat.scaleFt, rotationDeg: mat.rotationDeg };
  } catch (err) {
    console.warn("[Phase51] FloorMaterial migration failed — entry preserved as legacy:", err);
    return mat;
  }
}

/**
 * Phase 51 — DEBT-05: async migration pass. Runs AFTER migrateSnapshot (sync v1→v2).
 * Converts any { kind: "custom", imageUrl: "data:..." } FloorMaterial to
 * { kind: "user-texture", userTextureId } via the SHA-256 dedup IDB pipeline.
 * Idempotent: v3 snapshots are returned immediately with no IDB calls.
 * Bumps snap.version to 3 (D-05).
 */
export async function migrateFloorMaterials(snap: CADSnapshot): Promise<CADSnapshot> {
  if (snap.version >= 3) return snap; // idempotency gate — v3 already migrated
  for (const doc of Object.values(snap.rooms)) {
    if (!doc?.floorMaterial) continue;
    (doc as any).floorMaterial = await migrateOneFloorMaterial(doc.floorMaterial as FloorMaterial);
  }
  snap.version = 3;
  return snap;
}
