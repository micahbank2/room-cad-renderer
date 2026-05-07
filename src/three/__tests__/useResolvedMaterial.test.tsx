/**
 * Phase 68 Plan 04 Task 1 — useResolvedMaterial R3F hook.
 *
 * RED test: this fails until src/three/useResolvedMaterial.ts exists and
 * the hook returns the expected shape.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import * as THREE from "three";
import type { Material } from "@/types/material";

// Mock useMaterials to control the catalog deterministically.
const mockMaterials: Material[] = [];
vi.mock("@/hooks/useMaterials", () => ({
  useMaterials: () => ({
    materials: mockMaterials,
    loading: false,
    save: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    reload: vi.fn(),
  }),
}));

// Mock useUserTexture to return predictable THREE.Texture instances per id.
const textureMap = new Map<string, THREE.Texture>();
vi.mock("@/hooks/useUserTexture", () => ({
  useUserTexture: (id: string | undefined) => {
    if (!id) return null;
    if (!textureMap.has(id)) {
      const tex = new THREE.Texture();
      tex.image = { width: 256, height: 256 };
      textureMap.set(id, tex);
    }
    return textureMap.get(id) ?? null;
  },
}));

import { useResolvedMaterial } from "../useResolvedMaterial";

beforeEach(() => {
  mockMaterials.length = 0;
  textureMap.clear();
});

describe("useResolvedMaterial", () => {
  it("returns null when materialId is undefined", () => {
    const { result } = renderHook(() => useResolvedMaterial(undefined, undefined, 10, 8));
    expect(result.current).toBeNull();
  });

  it("returns null when material missing from catalog", () => {
    const { result } = renderHook(() => useResolvedMaterial("mat_missing", undefined, 10, 8));
    expect(result.current).toBeNull();
  });

  it("returns colorHex for paint Material (no texture)", () => {
    mockMaterials.push({
      id: "mat_paint1",
      name: "Paint #f5f0e8",
      tileSizeFt: 1,
      colorHex: "#f5f0e8",
      createdAt: Date.now(),
    });
    const { result } = renderHook(() => useResolvedMaterial("mat_paint1", undefined, 10, 8));
    expect(result.current).not.toBeNull();
    expect(result.current?.colorHex).toBe("#f5f0e8");
    expect(result.current?.colorMap).toBeFalsy();
    expect(result.current?.tileSizeFt).toBe(1);
  });

  it("returns colorMap THREE.Texture for textured Material", async () => {
    mockMaterials.push({
      id: "mat_tex1",
      name: "Oak Floor",
      tileSizeFt: 2,
      colorMapId: "tex_oak_color",
      colorSha256: "abc",
      createdAt: Date.now(),
    });
    const { result } = renderHook(() => useResolvedMaterial("mat_tex1", undefined, 10, 6));
    await waitFor(() => {
      expect(result.current?.colorMap).toBeTruthy();
    });
    expect(result.current?.colorMap).toBeInstanceOf(THREE.Texture);
    expect(result.current?.colorHex).toBeFalsy();
  });

  it("applies repeat.set(width/tileSize, height/tileSize) on color texture", async () => {
    mockMaterials.push({
      id: "mat_tex2",
      name: "Marble",
      tileSizeFt: 2,
      colorMapId: "tex_marble_color",
      colorSha256: "def",
      createdAt: Date.now(),
    });
    const { result } = renderHook(() => useResolvedMaterial("mat_tex2", undefined, 10, 6));
    await waitFor(() => {
      expect(result.current?.colorMap).toBeTruthy();
    });
    const tex = result.current!.colorMap!;
    // 10 / 2 = 5 ; 6 / 2 = 3
    expect(tex.repeat.x).toBeCloseTo(5);
    expect(tex.repeat.y).toBeCloseTo(3);
    expect(tex.wrapS).toBe(THREE.RepeatWrapping);
    expect(tex.wrapT).toBe(THREE.RepeatWrapping);
  });

  it("uses surface scaleFt override over material tileSizeFt (D-04)", async () => {
    mockMaterials.push({
      id: "mat_tex3",
      name: "Tile",
      tileSizeFt: 4,
      colorMapId: "tex_tile_color",
      colorSha256: "ghi",
      createdAt: Date.now(),
    });
    // surface override = 1ft → 12 / 1 = 12
    const { result } = renderHook(() => useResolvedMaterial("mat_tex3", 1, 12, 8));
    await waitFor(() => {
      expect(result.current?.colorMap).toBeTruthy();
    });
    expect(result.current!.tileSizeFt).toBe(1);
    expect(result.current!.colorMap!.repeat.x).toBeCloseTo(12);
    expect(result.current!.colorMap!.repeat.y).toBeCloseTo(8);
  });
});
