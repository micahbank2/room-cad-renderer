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

  it("getFloorTexture: module-level memoization returns same texture instance on repeat calls", () => {
    const a = getFloorTexture(16, 12);
    const b = getFloorTexture(20, 10);
    expect(a).toBe(b);
  });

  it("tileRepeatFor: room 16x12 at 4ft scale returns repeat (4, 3)", () => {
    expect(tileRepeatFor(16, 12)).toEqual({ x: 4, y: 3 });
  });

  it("tileRepeatFor: room 8x8 at 4ft scale returns repeat (2, 2)", () => {
    expect(tileRepeatFor(8, 8)).toEqual({ x: 2, y: 2 });
  });
});
