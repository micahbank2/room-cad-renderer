import { describe, it } from "vitest";
describe("productTextureCache (VIZ-04)", () => {
  it.todo("cache hit: returns same THREE.Texture instance on repeat getTexture(url) calls");
  it.todo("cache miss: calls TextureLoader.loadAsync on first call for a url");
  it.todo("error fallback: rejected loadAsync resolves getTexture to null without throwing");
  it.todo("colorSpace: cached texture has SRGBColorSpace set");
});
