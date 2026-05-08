/**
 * Phase 78 Plan 01 Task 2 — RED test for aoMap + displacementMap in useResolvedMaterial.
 *
 * Tests that resolveSurfaceMaterial threads aoMapId/displacementMapId through the
 * texture-material branch, and that useResolvedMaterial returns aoMap + displacementMap
 * THREE.Texture refs.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import * as THREE from "three";
import type { Material } from "@/types/material";
import { resolveSurfaceMaterial } from "@/lib/surfaceMaterial";

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

// ─── resolveSurfaceMaterial tests ───────────────────────────────────────────

describe("resolveSurfaceMaterial — Phase 78 PBR fields", () => {
  it("Test 1: textured material with ao+disp → resolved has aoMapId + displacementMapId", () => {
    const mat: Material = {
      id: "mat_pbr1",
      name: "PBR Tile",
      tileSizeFt: 2,
      colorMapId: "tex_color",
      colorSha256: "abc",
      roughnessMapId: "tex_rough",
      reflectionMapId: "tex_reflect",
      aoMapId: "tex_ao",
      displacementMapId: "tex_disp",
      createdAt: Date.now(),
    };
    const resolved = resolveSurfaceMaterial("mat_pbr1", undefined, [mat]);
    expect(resolved).not.toBeNull();
    expect(resolved!.aoMapId).toBe("tex_ao");
    expect(resolved!.displacementMapId).toBe("tex_disp");
  });

  it("Test 2: paint material → aoMapId and displacementMapId NOT in resolved output", () => {
    const mat: Material = {
      id: "mat_paint_pbr",
      name: "Blue Paint",
      tileSizeFt: 1,
      colorHex: "#1a2b3c",
      aoMapId: "tex_ao_paint", // even if set on the record, paint branch should not include
      displacementMapId: "tex_disp_paint",
      createdAt: Date.now(),
    };
    const resolved = resolveSurfaceMaterial("mat_paint_pbr", undefined, [mat]);
    expect(resolved).not.toBeNull();
    expect(resolved!.colorHex).toBe("#1a2b3c");
    // Paint branch must NOT include aoMapId or displacementMapId
    expect((resolved as any).aoMapId).toBeUndefined();
    expect((resolved as any).displacementMapId).toBeUndefined();
  });
});

// ─── useResolvedMaterial tests ───────────────────────────────────────────────

describe("useResolvedMaterial — Phase 78 aoMap + displacementMap", () => {
  it("Test 3: material with ao+disp map ids → hook returns aoMap + displacementMap THREE.Texture", async () => {
    mockMaterials.push({
      id: "mat_pbr_hook",
      name: "PBR Floor",
      tileSizeFt: 2,
      colorMapId: "tex_color_hook",
      colorSha256: "xyz",
      aoMapId: "tex_ao_hook",
      displacementMapId: "tex_disp_hook",
      createdAt: Date.now(),
    });
    const { result } = renderHook(() =>
      useResolvedMaterial("mat_pbr_hook", undefined, 10, 8),
    );
    await waitFor(() => {
      expect(result.current?.colorMap).toBeTruthy();
    });
    expect(result.current?.aoMap).toBeInstanceOf(THREE.Texture);
    expect(result.current?.displacementMap).toBeInstanceOf(THREE.Texture);
  });

  it("aoMap and displacementMap get repeat/wrap applied same as colorMap", async () => {
    mockMaterials.push({
      id: "mat_pbr_repeat",
      name: "PBR Marble",
      tileSizeFt: 2,
      colorMapId: "tex_color_repeat",
      colorSha256: "def2",
      aoMapId: "tex_ao_repeat",
      displacementMapId: "tex_disp_repeat",
      createdAt: Date.now(),
    });
    const { result } = renderHook(() =>
      useResolvedMaterial("mat_pbr_repeat", undefined, 10, 6),
    );
    await waitFor(() => {
      expect(result.current?.aoMap).toBeTruthy();
    });
    const ao = result.current!.aoMap!;
    const disp = result.current!.displacementMap!;
    // 10 / 2 = 5; 6 / 2 = 3
    expect(ao.repeat.x).toBeCloseTo(5);
    expect(ao.repeat.y).toBeCloseTo(3);
    expect(ao.wrapS).toBe(THREE.RepeatWrapping);
    expect(disp.repeat.x).toBeCloseTo(5);
    expect(disp.wrapT).toBe(THREE.RepeatWrapping);
  });
});
