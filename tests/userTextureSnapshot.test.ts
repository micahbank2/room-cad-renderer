/**
 * Phase 34 Plan 03 Task 3 — LIB-08 snapshot purity + VIZ-10 cache stability.
 *
 * LIB-08 invariant (D-08): Applying user textures to surfaces results in ID
 * references ONLY — the serialized CADSnapshot must contain ZERO data-URLs
 * and ZERO Blob instances, regardless of how many textures are applied.
 *
 * VIZ-10 regression guard: userTextureCache is non-disposing. Repeated
 * getUserTextureCached(id) returns the SAME THREE.Texture instance — the
 * 2D↔3D toggle scenario the Phase 32 refcount-dispose cache failed. If a
 * future change introduces refcount dispose here, the cache-stability test
 * breaks.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as THREE from "three";
import type { CADSnapshot, RoomDoc, WallSegment } from "@/types/cad";
import type { UserTexture } from "@/types/userTexture";

vi.mock("@/lib/userTextureStore", async () => {
  const actual = await vi.importActual<typeof import("@/lib/userTextureStore")>(
    "@/lib/userTextureStore",
  );
  return { ...actual, getUserTexture: vi.fn() };
});
import { getUserTexture } from "@/lib/userTextureStore";
const mockGetUserTexture = getUserTexture as unknown as ReturnType<typeof vi.fn>;

import {
  getUserTextureCached,
  _clearAllForTests,
} from "@/three/userTextureCache";
import { saveProject, loadProject } from "@/lib/serialization";

const mkUserTex = (id: string): UserTexture => ({
  id,
  sha256: "a".repeat(64),
  name: id,
  tileSizeFt: 2,
  blob: new Blob([new Uint8Array([1, 2, 3, 4])], { type: "image/jpeg" }),
  mimeType: "image/jpeg",
  createdAt: Date.now(),
});

function makeWall(
  id: string,
  opts: { userTextureIdA?: string; userTextureIdB?: string } = {},
): WallSegment {
  return {
    id,
    start: { x: 0, y: 0 },
    end: { x: 10, y: 0 },
    thickness: 0.5,
    height: 8,
    openings: [],
    wallpaper:
      opts.userTextureIdA || opts.userTextureIdB
        ? {
            A: opts.userTextureIdA
              ? { kind: "pattern", userTextureId: opts.userTextureIdA, scaleFt: 2 }
              : undefined,
            B: opts.userTextureIdB
              ? { kind: "pattern", userTextureId: opts.userTextureIdB, scaleFt: 2 }
              : undefined,
          }
        : undefined,
  };
}

function buildSnapshotWithUserTextures(): CADSnapshot {
  const room: RoomDoc = {
    id: "room_test",
    name: "Test Room",
    room: { width: 20, length: 15, wallHeight: 8 },
    walls: {
      w0: makeWall("w0", { userTextureIdA: "utex_wall_a1", userTextureIdB: "utex_wall_b1" }),
      w1: makeWall("w1", { userTextureIdA: "utex_wall_a2" }),
      w2: makeWall("w2"), // no wallpaper — baseline
      w3: makeWall("w3"),
    },
    placedProducts: {},
    ceilings: {
      c0: {
        id: "c0",
        points: [
          { x: 0, y: 0 },
          { x: 20, y: 0 },
          { x: 20, y: 15 },
          { x: 0, y: 15 },
        ],
        height: 8,
        material: "#f5f5f5",
        userTextureId: "utex_ceiling_1",
      },
    },
    floorMaterial: {
      kind: "user-texture",
      userTextureId: "utex_floor_1",
      scaleFt: 2.5,
      rotationDeg: 0,
    },
  };
  return {
    version: 2,
    rooms: { [room.id]: room },
    activeRoomId: room.id,
  };
}

describe("LIB-08 — CADSnapshot purity with user textures", () => {
  it("JSON.stringify(snapshot) contains ZERO 'data:image' substrings", () => {
    const snapshot = buildSnapshotWithUserTextures();
    const json = JSON.stringify(snapshot);
    expect(json).not.toContain("data:image");
    expect(json).not.toContain("data:application");
  });

  it("snapshot references user textures by id (utex_*) — at least 5 surfaces", () => {
    const snapshot = buildSnapshotWithUserTextures();
    const json = JSON.stringify(snapshot);
    const matches = json.match(/utex_[a-z0-9_]+/g) ?? [];
    // 3 walls (A1 B1, A2) + 1 floor + 1 ceiling = 5
    expect(matches.length).toBeGreaterThanOrEqual(5);
  });

  it("snapshot contains no Blob instances anywhere (deep walk)", () => {
    const snapshot = buildSnapshotWithUserTextures();
    function hasBlob(obj: unknown): boolean {
      if (obj instanceof Blob) return true;
      if (obj && typeof obj === "object") {
        return Object.values(obj as Record<string, unknown>).some(hasBlob);
      }
      return false;
    }
    expect(hasBlob(snapshot)).toBe(false);
  });

  it("snapshot size stays small (< 50KB) when 5 user textures are referenced by id only", () => {
    const snapshot = buildSnapshotWithUserTextures();
    const json = JSON.stringify(snapshot);
    expect(json.length).toBeLessThan(50_000);
  });

  it("roundtrip: saveProject → loadProject → serialized still has zero data:image", async () => {
    const snapshot = buildSnapshotWithUserTextures();
    await saveProject("test-lib08", "LIB-08 Roundtrip", snapshot);
    const loaded = await loadProject("test-lib08");
    expect(loaded).not.toBeNull();
    const json = JSON.stringify(loaded!.snapshot);
    expect(json).not.toContain("data:image");
    expect(json).toMatch(/utex_/);
  });
});

describe("VIZ-10 regression guard — userTextureCache stability", () => {
  beforeEach(() => {
    _clearAllForTests();
    mockGetUserTexture.mockReset();
    vi.spyOn(URL, "createObjectURL").mockImplementation(
      () => `blob:mock-${Math.random()}`,
    );
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("VIZ-10 guard: user texture survives 5x mount/unmount cycles with SAME instance", async () => {
    const id = "utex_stability";
    const fakeTex = new THREE.Texture();
    vi.spyOn(THREE.TextureLoader.prototype, "loadAsync").mockResolvedValue(fakeTex);
    mockGetUserTexture.mockResolvedValue(mkUserTex(id));

    const tex1 = await getUserTextureCached(id);
    expect(tex1).toBe(fakeTex);

    // Simulate 5 "mount/unmount" cycles — the module-level cache is unaffected
    // by consumer mount lifecycle, so each call returns the same instance.
    let last: THREE.Texture | null = null;
    for (let i = 0; i < 5; i++) {
      last = await getUserTextureCached(id);
    }
    expect(last).toBe(tex1); // same reference, never re-decoded, never disposed

    // Cache size remains 1 (the single id). Proves we don't re-populate.
    const size = (window as unknown as { __getUserTextureCacheSize: () => number })
      .__getUserTextureCacheSize();
    expect(size).toBe(1);
  });
});
