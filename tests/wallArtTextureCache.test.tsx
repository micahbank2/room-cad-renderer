import { describe, it, expect, vi, beforeEach } from "vitest";
import * as THREE from "three";
import {
  getWallArtTexture,
  __clearWallArtCacheForTests,
} from "@/three/wallArtTextureCache";

describe("wallArtTextureCache (VIZ-08) — non-disposing contract", () => {
  beforeEach(() => {
    __clearWallArtCacheForTests();
    vi.restoreAllMocks();
  });

  it("same URL returns same Texture instance across sequential acquires", async () => {
    const spy = vi
      .spyOn(THREE.TextureLoader.prototype, "loadAsync")
      .mockImplementation(() => Promise.resolve(new THREE.Texture()));
    const t1 = await getWallArtTexture("data:image/png;base64,ART1");
    const t2 = await getWallArtTexture("data:image/png;base64,ART1");
    expect(t1).toBe(t2);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("simulated unmount + remount of same URL resolves to SAME Texture instance (non-disposing)", async () => {
    vi.spyOn(THREE.TextureLoader.prototype, "loadAsync").mockImplementation(
      () => Promise.resolve(new THREE.Texture())
    );
    const first = await getWallArtTexture("data:image/png;base64,ART2");
    const second = await getWallArtTexture("data:image/png;base64,ART2");
    expect(second).toBe(first);
  });

  it("resolved texture has SRGBColorSpace configured", async () => {
    vi.spyOn(THREE.TextureLoader.prototype, "loadAsync").mockImplementation(
      () => Promise.resolve(new THREE.Texture())
    );
    const t = await getWallArtTexture("data:image/png;base64,ART3");
    expect(t).not.toBeNull();
    expect(t!.colorSpace).toBe(THREE.SRGBColorSpace);
  });
});
