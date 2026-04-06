import { describe, it, expect, beforeEach } from "vitest";
import * as THREE from "three";
import {
  createFloorTexture,
  getFloorTexture,
  tileRepeatFor,
  __resetFloorTextureCache,
} from "@/three/floorTexture";

describe("floorTexture (VIZ-06)", () => {
  beforeEach(() => {
    __resetFloorTextureCache();
  });

  it("createFloorTexture: returns THREE.CanvasTexture with 512x512 source canvas", () => {
    const tex = createFloorTexture();
    expect(tex).toBeInstanceOf(THREE.CanvasTexture);
    const canvas = tex.image as HTMLCanvasElement;
    expect(canvas.width).toBe(512);
    expect(canvas.height).toBe(512);
    expect(tex.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(tex.wrapS).toBe(THREE.RepeatWrapping);
    expect(tex.wrapT).toBe(THREE.RepeatWrapping);
  });

  it("getFloorTexture: returns distinct texture instances per call (clone fix)", () => {
    const a = getFloorTexture(16, 12);
    const b = getFloorTexture(20, 10);
    expect(a).not.toBe(b);
    expect(a.source).toBe(b.source); // shared canvas data
  });

  it("getFloorTexture: distinct room dims produce textures with different repeat values", () => {
    const a = getFloorTexture(16, 12);
    const b = getFloorTexture(8, 8);
    expect(a.repeat.x).toBe(4); // 16/4
    expect(b.repeat.x).toBe(2); // 8/4
  });

  it("tileRepeatFor: room 16x12 at 4ft scale returns repeat (4, 3)", () => {
    expect(tileRepeatFor(16, 12)).toEqual({ x: 4, y: 3 });
  });

  it("tileRepeatFor: room 8x8 at 4ft scale returns repeat (2, 2)", () => {
    expect(tileRepeatFor(8, 8)).toEqual({ x: 2, y: 2 });
  });
});
