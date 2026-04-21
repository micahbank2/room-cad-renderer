import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { applyColorSpace } from "@/three/textureColorSpace";

describe("applyColorSpace", () => {
  it("sets SRGBColorSpace for albedo", () => {
    const tex = new THREE.Texture();
    const out = applyColorSpace(tex, "albedo");
    expect(out).toBe(tex);
    expect(out.colorSpace).toBe(THREE.SRGBColorSpace);
  });
  it("sets NoColorSpace for normal", () => {
    const tex = new THREE.Texture();
    expect(applyColorSpace(tex, "normal").colorSpace).toBe(THREE.NoColorSpace);
  });
  it("sets NoColorSpace for roughness", () => {
    const tex = new THREE.Texture();
    expect(applyColorSpace(tex, "roughness").colorSpace).toBe(THREE.NoColorSpace);
  });
  it("throws on unknown channel", () => {
    const tex = new THREE.Texture();
    // @ts-expect-error testing runtime guard
    expect(() => applyColorSpace(tex, "metallic")).toThrow(/channel/);
  });
});
