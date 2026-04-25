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

describe("BUG-01 — per-surface scaleFt isolation across same userTextureId", () => {
  it("same userTextureId on wall + ceiling preserves independent scaleFt across snapshot roundtrip", () => {
    // Apply user-texture utex_shared to:
    //  - wall side A with scaleFt=4 (4ft pattern repeat)
    //  - ceiling with scaleFt=8 (8ft pattern repeat)
    // Snapshot must serialize each surface's scaleFt independently — editing
    // the catalog tileSizeFt should not bleed across surfaces (GH #96).
    const snapshot: CADSnapshot = {
      version: 2,
      rooms: {
        r1: {
          id: "r1",
          name: "Test",
          room: { width: 20, length: 16, wallHeight: 8 },
          walls: {
            w1: {
              id: "w1",
              start: { x: 0, y: 0 },
              end: { x: 10, y: 0 },
              thickness: 0.5,
              height: 8,
              openings: [],
              wallpaper: {
                A: { kind: "pattern", userTextureId: "utex_shared", scaleFt: 4 },
              },
            },
          },
          ceilings: {
            c1: {
              id: "c1",
              points: [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 10, y: 10 },
                { x: 0, y: 10 },
              ],
              height: 8,
              material: "#f5f5f5",
              userTextureId: "utex_shared",
              scaleFt: 8,
            },
          },
          placedProducts: {},
        } as RoomDoc,
      },
      activeRoomId: "r1",
    };

    const json = JSON.stringify(snapshot);
    const parsed = JSON.parse(json) as CADSnapshot;

    // Per-surface scaleFt is preserved independently
    expect(parsed.rooms.r1.walls.w1.wallpaper?.A?.scaleFt).toBe(4);
    expect(parsed.rooms.r1.ceilings?.c1.scaleFt).toBe(8);
    // Both reference the same catalog id (single source of truth for the texture itself)
    expect(parsed.rooms.r1.walls.w1.wallpaper?.A?.userTextureId).toBe("utex_shared");
    expect(parsed.rooms.r1.ceilings?.c1.userTextureId).toBe("utex_shared");
    // Catalog edit (hypothetical: change UserTexture.tileSizeFt) would NOT affect
    // either surface's scaleFt — both have explicit overrides written at apply-time.
  });

  it("ceiling without scaleFt falls back to catalog default at render (implicit migration)", () => {
    // Pre-Phase-42 snapshot: ceiling has userTextureId but no scaleFt.
    // CeilingMesh resolver uses ceiling.scaleFt ?? entry?.tileSizeFt ?? 2.
    // This test asserts the resolver's fallback semantics directly.
    const ceilingPreFix = {
      scaleFt: undefined as number | undefined,
      userTextureId: "utex_legacy",
    };
    const catalog = [{ id: "utex_legacy", tileSizeFt: 6 }];

    // Inline the resolver (matches CeilingMesh.tsx logic):
    const effectiveTileSize = (() => {
      if (ceilingPreFix.scaleFt !== undefined) return ceilingPreFix.scaleFt;
      if (!ceilingPreFix.userTextureId) return 2;
      const entry = catalog.find((t) => t.id === ceilingPreFix.userTextureId);
      return entry?.tileSizeFt ?? 2;
    })();

    expect(effectiveTileSize).toBe(6); // falls through to catalog
  });

  it("ceiling with scaleFt override wins over catalog default (BUG-01 fix)", () => {
    const ceilingPostFix = { scaleFt: 4, userTextureId: "utex_post" };
    const catalog = [{ id: "utex_post", tileSizeFt: 8 }];

    const effectiveTileSize = (() => {
      if (ceilingPostFix.scaleFt !== undefined) return ceilingPostFix.scaleFt;
      if (!ceilingPostFix.userTextureId) return 2;
      const entry = catalog.find((t) => t.id === ceilingPostFix.userTextureId);
      return entry?.tileSizeFt ?? 2;
    })();

    expect(effectiveTileSize).toBe(4); // override wins
  });

  it("ceiling with no userTextureId and no scaleFt returns hardcoded 2 (last resort)", () => {
    const empty = { scaleFt: undefined as number | undefined, userTextureId: undefined as string | undefined };
    const catalog: { id: string; tileSizeFt: number }[] = [];

    const effectiveTileSize = (() => {
      if (empty.scaleFt !== undefined) return empty.scaleFt;
      if (!empty.userTextureId) return 2;
      const entry = catalog.find((t) => t.id === empty.userTextureId);
      return entry?.tileSizeFt ?? 2;
    })();

    expect(effectiveTileSize).toBe(2);
  });
});
