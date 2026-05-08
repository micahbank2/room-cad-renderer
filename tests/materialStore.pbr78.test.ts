/**
 * Phase 78 Plan 01 Task 1 — RED test for AO + displacement map plumbing in materialStore.
 *
 * Tests that SaveMaterialInput accepts aoFile/displacementFile and that
 * saveMaterialWithDedup persists aoMapId / displacementMapId on the Material record.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  saveMaterialWithDedup,
  clearAllMaterials,
} from "@/lib/materialStore";
import { clearAllUserTextures } from "@/lib/userTextureStore";

vi.mock("@/lib/processTextureFile", async () => {
  const { computeSHA256 } = await import("@/lib/userTextureStore");
  return {
    ALLOWED_MIME_TYPES: new Set(["image/jpeg", "image/png", "image/webp"]),
    MAX_EDGE_PX: 2048,
    ProcessTextureError: class extends Error {
      code: string;
      constructor(code: string, message: string) {
        super(message);
        this.code = code;
        this.name = "ProcessTextureError";
      }
    },
    processTextureFile: vi.fn(async (file: File) => {
      const buf = await file.arrayBuffer();
      const sha256 = await computeSHA256(buf);
      return {
        blob: new Blob([buf], { type: "image/jpeg" }),
        mimeType: "image/jpeg",
        sha256,
        width: 512,
        height: 512,
      };
    }),
  };
});

function makeFile(content: string, name = "x.jpg"): File {
  return new File([new TextEncoder().encode(content)], name, { type: "image/jpeg" });
}

const minimal = {
  name: "Test Material",
  tileSizeFt: 2,
  colorFile: makeFile("color-bytes"),
};

beforeEach(async () => {
  await clearAllMaterials();
  await clearAllUserTextures();
});

describe("saveMaterialWithDedup — Phase 78 AO map (PBR-01)", () => {
  it("Test 1: aoFile provided → Material.aoMapId is populated", async () => {
    const result = await saveMaterialWithDedup({
      ...minimal,
      colorFile: makeFile("color-ao-test"),
      aoFile: makeFile("ao-bytes"),
    });
    expect(result.deduped).toBe(false);
    // aoMapId should be a utex_ or mat_ prefixed string
    const { getMaterial } = await import("@/lib/materialStore");
    const mat = await getMaterial(result.id);
    expect(mat).toBeDefined();
    expect(typeof mat!.aoMapId).toBe("string");
    expect(mat!.aoMapId!.length).toBeGreaterThan(0);
  });

  it("Test 2: displacementFile provided → Material.displacementMapId is populated", async () => {
    const result = await saveMaterialWithDedup({
      ...minimal,
      colorFile: makeFile("color-disp-test"),
      displacementFile: makeFile("disp-bytes"),
    });
    expect(result.deduped).toBe(false);
    const { getMaterial } = await import("@/lib/materialStore");
    const mat = await getMaterial(result.id);
    expect(mat).toBeDefined();
    expect(typeof mat!.displacementMapId).toBe("string");
    expect(mat!.displacementMapId!.length).toBeGreaterThan(0);
  });

  it("Test 3: no ao/disp files → both fields are undefined", async () => {
    const result = await saveMaterialWithDedup({
      ...minimal,
      colorFile: makeFile("color-only-bytes"),
    });
    const { getMaterial } = await import("@/lib/materialStore");
    const mat = await getMaterial(result.id);
    expect(mat).toBeDefined();
    expect(mat!.aoMapId).toBeUndefined();
    expect(mat!.displacementMapId).toBeUndefined();
  });

  it("Test 4: both aoFile and displacementFile → both ids independently populated", async () => {
    const result = await saveMaterialWithDedup({
      ...minimal,
      colorFile: makeFile("color-both-test"),
      aoFile: makeFile("ao-both-bytes"),
      displacementFile: makeFile("disp-both-bytes"),
    });
    const { getMaterial } = await import("@/lib/materialStore");
    const mat = await getMaterial(result.id);
    expect(mat).toBeDefined();
    expect(typeof mat!.aoMapId).toBe("string");
    expect(typeof mat!.displacementMapId).toBe("string");
    // They should be different ids (different files → different textures)
    expect(mat!.aoMapId).not.toBe(mat!.displacementMapId);
  });
});
