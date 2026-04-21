import { describe, it, expect, beforeEach, vi } from "vitest";
import * as THREE from "three";
import {
  acquireTexture,
  releaseTexture,
  registerRenderer,
  loadPbrSet,
  __resetPbrCacheForTests,
  __setDisposeGraceMsForTests,
} from "@/three/pbrTextureCache";

// Mock THREE.TextureLoader so tests don't hit network.
vi.mock("three", async () => {
  const actual = await vi.importActual<typeof import("three")>("three");
  class MockLoader {
    load(
      url: string,
      onLoad: (tex: any) => void,
      _onProg: unknown,
      onError: (e: Error) => void
    ) {
      if (url.includes("fail")) {
        queueMicrotask(() => onError(new Error("mock load error")));
      } else {
        const tex = new actual.Texture();
        queueMicrotask(() => onLoad(tex));
      }
    }
  }
  return {
    ...actual,
    TextureLoader: MockLoader,
  };
});

beforeEach(() => {
  __resetPbrCacheForTests();
  // Phase 32 Plan 05: default is now 3000ms debounced dispose. This suite
  // asserts synchronous-dispose semantics for refcount behavior, so opt
  // into grace=0 (documented test-only knob). New `pbrTextureCacheDebounce`
  // suite covers the debounced path explicitly.
  __setDisposeGraceMsForTests(0);
});

describe("pbrTextureCache", () => {
  it("returns same texture for repeated acquires of same URL", async () => {
    const t1 = await acquireTexture("/a.jpg", "albedo");
    const t2 = await acquireTexture("/a.jpg", "albedo");
    expect(t1).toBe(t2);
  });

  it("applies albedo color space", async () => {
    const t = await acquireTexture("/a.jpg", "albedo");
    expect(t.colorSpace).toBe(THREE.SRGBColorSpace);
  });

  it("applies NoColorSpace for normal and roughness", async () => {
    const n = await acquireTexture("/n.jpg", "normal");
    const r = await acquireTexture("/r.jpg", "roughness");
    expect(n.colorSpace).toBe(THREE.NoColorSpace);
    expect(r.colorSpace).toBe(THREE.NoColorSpace);
  });

  it("sets RepeatWrapping on both axes", async () => {
    const t = await acquireTexture("/a.jpg", "albedo");
    expect(t.wrapS).toBe(THREE.RepeatWrapping);
    expect(t.wrapT).toBe(THREE.RepeatWrapping);
  });

  it("clamps anisotropy to 8", async () => {
    const fakeRenderer = {
      capabilities: { getMaxAnisotropy: () => 16 },
    } as unknown as THREE.WebGLRenderer;
    registerRenderer(fakeRenderer);
    const t = await acquireTexture("/a.jpg", "albedo");
    expect(t.anisotropy).toBe(8);
  });

  it("disposes and evicts when refs reach zero", async () => {
    const t = await acquireTexture("/a.jpg", "albedo");
    const disposeSpy = vi.spyOn(t, "dispose");
    releaseTexture("/a.jpg");
    expect(disposeSpy).toHaveBeenCalledTimes(1);
    // Next acquire must load fresh (not reuse disposed)
    const t2 = await acquireTexture("/a.jpg", "albedo");
    expect(t2).not.toBe(t);
  });

  it("refcount prevents premature disposal", async () => {
    const t = await acquireTexture("/a.jpg", "albedo");
    await acquireTexture("/a.jpg", "albedo"); // refs = 2
    const disposeSpy = vi.spyOn(t, "dispose");
    releaseTexture("/a.jpg"); // refs = 1
    expect(disposeSpy).not.toHaveBeenCalled();
    releaseTexture("/a.jpg"); // refs = 0 -> dispose
    expect(disposeSpy).toHaveBeenCalledTimes(1);
  });

  it("rejects on loader error and evicts from cache", async () => {
    await expect(acquireTexture("/fail.jpg", "albedo")).rejects.toThrow(/mock load error/);
    // Should be able to retry (entry was evicted)
    await expect(acquireTexture("/fail.jpg", "albedo")).rejects.toThrow();
  });

  it("releaseTexture on unknown URL is a no-op", () => {
    expect(() => releaseTexture("/unknown.jpg")).not.toThrow();
  });

  it("loadPbrSet returns all three configured textures", async () => {
    const set = await loadPbrSet({
      albedo: "/a.jpg",
      normal: "/n.jpg",
      roughness: "/r.jpg",
    });
    expect(set.albedo.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(set.normal.colorSpace).toBe(THREE.NoColorSpace);
    expect(set.roughness.colorSpace).toBe(THREE.NoColorSpace);
  });
});
