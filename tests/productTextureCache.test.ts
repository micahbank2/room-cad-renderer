import { describe, it, expect, vi, beforeEach } from "vitest";
import * as THREE from "three";
import { getTexture, __clearTextureCache } from "@/three/productTextureCache";

describe("productTextureCache (VIZ-04)", () => {
  beforeEach(() => {
    __clearTextureCache();
    vi.restoreAllMocks();
  });

  it("cache hit: returns same Promise instance on repeat getTexture(url) calls", () => {
    const fakeTex = new THREE.Texture();
    vi.spyOn(THREE.TextureLoader.prototype, "loadAsync").mockResolvedValue(fakeTex);
    const p1 = getTexture("data:image/png;base64,AAA");
    const p2 = getTexture("data:image/png;base64,AAA");
    expect(p1).toBe(p2);
  });

  it("cache miss: calls TextureLoader.loadAsync on first call for a url", async () => {
    const fakeTex = new THREE.Texture();
    const spy = vi.spyOn(THREE.TextureLoader.prototype, "loadAsync").mockResolvedValue(fakeTex);
    await getTexture("http://example.com/a.png");
    await getTexture("http://example.com/b.png");
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("error fallback: rejected loadAsync resolves getTexture to null without throwing", async () => {
    vi.spyOn(THREE.TextureLoader.prototype, "loadAsync").mockRejectedValue(new Error("404"));
    const result = await getTexture("http://example.com/bad.png");
    expect(result).toBeNull();
  });

  it("colorSpace: resolved texture has SRGBColorSpace set", async () => {
    const fakeTex = new THREE.Texture();
    vi.spyOn(THREE.TextureLoader.prototype, "loadAsync").mockResolvedValue(fakeTex);
    const result = await getTexture("http://example.com/c.png");
    expect(result).not.toBeNull();
    expect(result!.colorSpace).toBe(THREE.SRGBColorSpace);
  });
});
