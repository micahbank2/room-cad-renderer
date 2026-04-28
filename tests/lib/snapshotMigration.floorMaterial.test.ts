/**
 * Phase 51 — DEBT-05: FloorMaterial legacy data-URL migration unit tests.
 *
 * TDD: these tests are written BEFORE the implementation is in place.
 * All 6 must FAIL (RED) on first run, then PASS (GREEN) after impl.
 *
 * Covers:
 * 1. v2 snapshot with 1 legacy custom FloorMaterial → migrates to kind:"user-texture"
 * 2. v2 snapshot with 0 legacy entries → no-op, version bumps to 3
 * 3. v3 snapshot input → passthrough, no IDB calls
 * 4. Malformed data URL (no comma) → entry preserved, console.warn called, version bumps
 * 5. Two identical data URLs → 1 IDB entry, both userTextureId values equal
 * 6. IDB quota rejection → entry preserved as legacy, version still bumps to 3
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { migrateFloorMaterials } from "@/lib/snapshotMigration";
import {
  clearAllUserTextures,
  listUserTextures,
  saveUserTextureWithDedup,
} from "@/lib/userTextureStore";
import type { CADSnapshot } from "@/types/cad";

// 1×1 white PNG (67 bytes) — valid, decodable, deterministic SHA-256.
const TINY_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==";
const VALID_DATA_URL = `data:image/png;base64,${TINY_PNG_B64}`;
const MALFORMED_DATA_URL = "data:image/pngNOCOMMA";

function makeV2SnapWithFloor(imageUrl: string): CADSnapshot {
  return {
    version: 2,
    activeRoomId: "room_main",
    rooms: {
      room_main: {
        id: "room_main",
        name: "Main Room",
        room: { width: 12, length: 10, wallHeight: 8 },
        walls: {},
        placedProducts: {},
        floorMaterial: {
          kind: "custom",
          imageUrl,
          scaleFt: 4,
          rotationDeg: 0,
        } as any,
      },
    },
  };
}

function makeV2SnapNoFloor(): CADSnapshot {
  return {
    version: 2,
    activeRoomId: "room_main",
    rooms: {
      room_main: {
        id: "room_main",
        name: "Main Room",
        room: { width: 12, length: 10, wallHeight: 8 },
        walls: {},
        placedProducts: {},
      },
    },
  };
}

describe("migrateFloorMaterials", () => {
  beforeEach(async () => {
    await clearAllUserTextures();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Test 1: v2 snapshot with 1 legacy custom FloorMaterial migrates to kind:user-texture", async () => {
    const snap = makeV2SnapWithFloor(VALID_DATA_URL);
    const result = await migrateFloorMaterials(snap);

    const floor = result.rooms["room_main"].floorMaterial as any;
    expect(floor).toBeDefined();
    expect(floor.kind).toBe("user-texture");
    expect(typeof floor.userTextureId).toBe("string");
    expect(floor.userTextureId).toMatch(/^utex_/);
    expect(floor.imageUrl).toBeUndefined();

    const textures = await listUserTextures();
    expect(textures).toHaveLength(1);
    expect(result.version).toBe(3);
  });

  it("Test 2: v2 snapshot with 0 legacy custom entries has version bumped to 3, no IDB writes", async () => {
    const snap = makeV2SnapNoFloor();
    const result = await migrateFloorMaterials(snap);

    expect(result.version).toBe(3);
    const textures = await listUserTextures();
    expect(textures).toHaveLength(0);
    expect(result.rooms["room_main"]).toBeDefined();
  });

  it("Test 3: v3 snapshot input is returned unchanged (passthrough, no IDB calls)", async () => {
    const snap: CADSnapshot = {
      version: 3,
      activeRoomId: "room_main",
      rooms: {
        room_main: {
          id: "room_main",
          name: "Main Room",
          room: { width: 12, length: 10, wallHeight: 8 },
          walls: {},
          placedProducts: {},
        },
      },
    } as any;

    const saveSpy = vi.spyOn(
      await import("@/lib/userTextureStore"),
      "saveUserTextureWithDedup",
    );
    const result = await migrateFloorMaterials(snap);

    expect(result).toBe(snap); // same reference — no clone
    expect(result.version).toBe(3);
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it("Test 4: malformed data URL (no comma) preserves entry, emits console.warn, version bumps", async () => {
    const warnSpy = vi.spyOn(console, "warn");
    const snap = makeV2SnapWithFloor(MALFORMED_DATA_URL);
    const result = await migrateFloorMaterials(snap);

    const floor = result.rooms["room_main"].floorMaterial as any;
    expect(floor.kind).toBe("custom");
    expect(floor.imageUrl).toBe(MALFORMED_DATA_URL);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[Phase51]"),
      expect.anything(),
    );
    expect(result.version).toBe(3);

    const textures = await listUserTextures();
    expect(textures).toHaveLength(0);
  });

  it("Test 5: two FloorMaterials with identical data URLs produce 1 IDB entry, same userTextureId", async () => {
    const snap: CADSnapshot = {
      version: 2,
      activeRoomId: "room_a",
      rooms: {
        room_a: {
          id: "room_a",
          name: "Room A",
          room: { width: 10, length: 10, wallHeight: 8 },
          walls: {},
          placedProducts: {},
          floorMaterial: {
            kind: "custom",
            imageUrl: VALID_DATA_URL,
            scaleFt: 4,
            rotationDeg: 0,
          } as any,
        },
        room_b: {
          id: "room_b",
          name: "Room B",
          room: { width: 10, length: 10, wallHeight: 8 },
          walls: {},
          placedProducts: {},
          floorMaterial: {
            kind: "custom",
            imageUrl: VALID_DATA_URL,
            scaleFt: 4,
            rotationDeg: 0,
          } as any,
        },
      },
    };

    const result = await migrateFloorMaterials(snap);

    const floorA = result.rooms["room_a"].floorMaterial as any;
    const floorB = result.rooms["room_b"].floorMaterial as any;

    expect(floorA.kind).toBe("user-texture");
    expect(floorB.kind).toBe("user-texture");
    expect(floorA.userTextureId).toBe(floorB.userTextureId);

    const textures = await listUserTextures();
    expect(textures).toHaveLength(1);
    expect(result.version).toBe(3);
  });

  it("Test 6: IDB quota rejection preserves entry as legacy, version still bumps to 3", async () => {
    vi.spyOn(
      await import("@/lib/userTextureStore"),
      "saveUserTextureWithDedup",
    ).mockRejectedValue(new DOMException("QuotaExceededError", "QuotaExceededError"));

    const warnSpy = vi.spyOn(console, "warn");
    const snap = makeV2SnapWithFloor(VALID_DATA_URL);
    const result = await migrateFloorMaterials(snap);

    const floor = result.rooms["room_main"].floorMaterial as any;
    expect(floor.kind).toBe("custom"); // preserved as legacy
    expect(floor.imageUrl).toBe(VALID_DATA_URL);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[Phase51]"),
      expect.anything(),
    );
    expect(result.version).toBe(3);
  });
});
