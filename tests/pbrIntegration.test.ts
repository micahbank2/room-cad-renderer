import { describe, it, expect, beforeEach, vi } from "vitest";
import * as THREE from "three";
import { SURFACE_MATERIALS } from "@/data/surfaceMaterials";
import {
  loadPbrSet,
  releaseTexture,
  __resetPbrCacheForTests,
  __getPbrCacheState,
} from "@/three/pbrTextureCache";

// Mock THREE.TextureLoader so tests don't hit network.
// Mirrors the pattern in tests/pbrTextureCache.test.ts (Plan 02).
vi.mock("three", async () => {
  const actual = await vi.importActual<typeof import("three")>("three");
  class MockLoader {
    load(
      url: string,
      onLoad: (tex: unknown) => void,
      _onProg: unknown,
      _onError: (e: Error) => void
    ) {
      const tex = new actual.Texture();
      // Tag texture URL for debugging; actual refcount assertions use cache state.
      (tex as unknown as { __mockUrl: string }).__mockUrl = url;
      queueMicrotask(() => onLoad(tex));
    }
  }
  return { ...actual, TextureLoader: MockLoader };
});

beforeEach(() => {
  __resetPbrCacheForTests();
});

describe("PBR integration — registry × loader", () => {
  it("WOOD_PLANK pbr block loads with correct color spaces", async () => {
    const pbr = SURFACE_MATERIALS.WOOD_PLANK.pbr;
    expect(pbr).toBeDefined();
    if (!pbr) throw new Error("unreachable");
    const set = await loadPbrSet(pbr);
    expect(set.albedo.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(set.normal.colorSpace).toBe(THREE.NoColorSpace);
    expect(set.roughness.colorSpace).toBe(THREE.NoColorSpace);
  });

  it("CONCRETE pbr block loads with correct tile size 4×4", () => {
    const pbr = SURFACE_MATERIALS.CONCRETE.pbr;
    expect(pbr).toBeDefined();
    expect(pbr?.tile.wFt).toBe(4);
    expect(pbr?.tile.lFt).toBe(4);
  });

  it("PLASTER pbr block loads with correct tile size 6×6", () => {
    const pbr = SURFACE_MATERIALS.PLASTER.pbr;
    expect(pbr).toBeDefined();
    expect(pbr?.tile.wFt).toBe(6);
    expect(pbr?.tile.lFt).toBe(6);
  });

  it('WOOD_PLANK has 6"×48" plank tile (0.5×4 ft)', () => {
    const pbr = SURFACE_MATERIALS.WOOD_PLANK.pbr;
    expect(pbr?.tile.wFt).toBe(0.5);
    expect(pbr?.tile.lFt).toBe(4);
  });

  it("PAINTED_DRYWALL does NOT have pbr (success criterion 2)", () => {
    expect(SURFACE_MATERIALS.PAINTED_DRYWALL.pbr).toBeUndefined();
  });

  it("legacy materials WOOD_OAK, TILE_WHITE, MARBLE, etc. do not have pbr", () => {
    for (const id of [
      "WOOD_OAK",
      "WOOD_WALNUT",
      "TILE_WHITE",
      "TILE_BLACK",
      "CARPET",
      "MARBLE",
      "STONE",
    ]) {
      expect(SURFACE_MATERIALS[id].pbr).toBeUndefined();
    }
  });

  it("refcount tracks across multiple loadPbrSet calls on same pbr block", async () => {
    const pbr = SURFACE_MATERIALS.WOOD_PLANK.pbr!;
    await loadPbrSet(pbr);
    await loadPbrSet(pbr);
    const state = __getPbrCacheState();
    const albedoEntry = state.find((e) => e.url === pbr.albedo);
    expect(albedoEntry?.refs).toBe(2);
  });

  it("releaseTexture on each URL of a loaded set empties the cache", async () => {
    const pbr = SURFACE_MATERIALS.WOOD_PLANK.pbr!;
    await loadPbrSet(pbr);
    releaseTexture(pbr.albedo);
    releaseTexture(pbr.normal);
    releaseTexture(pbr.roughness);
    const state = __getPbrCacheState();
    expect(state.filter((e) => e.url.startsWith("/textures/wood-plank/"))).toHaveLength(0);
  });

  it("all three PBR materials use /textures/ absolute paths", () => {
    for (const id of ["WOOD_PLANK", "CONCRETE", "PLASTER"]) {
      const pbr = SURFACE_MATERIALS[id].pbr!;
      expect(pbr.albedo.startsWith("/textures/")).toBe(true);
      expect(pbr.normal.startsWith("/textures/")).toBe(true);
      expect(pbr.roughness.startsWith("/textures/")).toBe(true);
    }
  });
});
