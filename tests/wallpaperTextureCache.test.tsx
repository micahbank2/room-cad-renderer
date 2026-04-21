import { describe, it, expect, vi, beforeEach } from "vitest";
import * as THREE from "three";
import {
  getWallpaperTexture,
  __clearWallpaperCacheForTests,
} from "@/three/wallpaperTextureCache";

describe("wallpaperTextureCache (VIZ-07) — non-disposing contract", () => {
  beforeEach(() => {
    __clearWallpaperCacheForTests();
    vi.restoreAllMocks();
  });

  it("same URL returns same Texture instance across sequential acquires", async () => {
    // Each mock call creates a NEW Texture — if the cache worked, only the first
    // call's Texture is resolved; both awaits should resolve to the same instance.
    const spy = vi
      .spyOn(THREE.TextureLoader.prototype, "loadAsync")
      .mockImplementation(() => Promise.resolve(new THREE.Texture()));
    const t1 = await getWallpaperTexture("data:image/png;base64,AAA");
    const t2 = await getWallpaperTexture("data:image/png;base64,AAA");
    expect(t1).toBe(t2);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("simulated unmount + remount of same URL resolves to SAME Texture instance (non-disposing)", async () => {
    // This is the point of the whole plan: ThreeViewport unmounts on 2D↔3D toggle,
    // but the module cache persists — the second 3D mount must get the same texture
    // instance that the first mount got, so THREE re-uploads it to the new WebGL context.
    const spy = vi
      .spyOn(THREE.TextureLoader.prototype, "loadAsync")
      .mockImplementation(() => Promise.resolve(new THREE.Texture()));

    // First "mount"
    const texFirst = await getWallpaperTexture("data:image/png;base64,BBB");
    // (Simulated unmount — with non-disposing cache, there is nothing to release.
    //  Even if we tried, the cache should survive.)
    // Second "mount" (e.g., after view toggle)
    const texSecond = await getWallpaperTexture("data:image/png;base64,BBB");

    expect(texSecond).toBe(texFirst);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("different URLs return different Texture instances", async () => {
    vi.spyOn(THREE.TextureLoader.prototype, "loadAsync").mockImplementation(
      () => Promise.resolve(new THREE.Texture())
    );
    const tA = await getWallpaperTexture("data:image/png;base64,AAA");
    const tB = await getWallpaperTexture("data:image/png;base64,BBB");
    expect(tA).not.toBe(tB);
  });

  it("__clearWallpaperCacheForTests empties the module cache (new Texture after clear)", async () => {
    vi.spyOn(THREE.TextureLoader.prototype, "loadAsync").mockImplementation(
      () => Promise.resolve(new THREE.Texture())
    );
    const t1 = await getWallpaperTexture("data:image/png;base64,CCC");
    __clearWallpaperCacheForTests();
    const t2 = await getWallpaperTexture("data:image/png;base64,CCC");
    expect(t2).not.toBe(t1);
  });

  it("resolved texture has SRGBColorSpace + RepeatWrapping configured", async () => {
    vi.spyOn(THREE.TextureLoader.prototype, "loadAsync").mockImplementation(
      () => Promise.resolve(new THREE.Texture())
    );
    const t = await getWallpaperTexture("data:image/png;base64,DDD");
    expect(t).not.toBeNull();
    expect(t!.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(t!.wrapS).toBe(THREE.RepeatWrapping);
    expect(t!.wrapT).toBe(THREE.RepeatWrapping);
  });

  it("error fallback: rejected loadAsync resolves to null without throwing", async () => {
    vi.spyOn(THREE.TextureLoader.prototype, "loadAsync").mockRejectedValue(
      new Error("mock load failure")
    );
    const result = await getWallpaperTexture("http://example.com/bad.png");
    expect(result).toBeNull();
  });
});
