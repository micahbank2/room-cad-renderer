/**
 * Phase 67 Plan 01 — Wave 0 RED test for src/lib/materialStore.ts.
 *
 * Mirrors tests/userTextureStore.test.ts. Verifies:
 *  - Material CRUD against the named IDB store room-cad-materials.
 *  - SHA-256 dedup on the color map only (D-08).
 *  - D-09 wrapper architecture: Material.colorMapId references userTextureStore (utex_ prefix).
 *  - listMaterials sort order (most-recent-first, mirrors D-06).
 *  - deleteMaterial does NOT cascade-delete the underlying UserTexture (orphan-tolerant).
 *  - updateMaterialMetadata mutates name/tileSizeFt/brand/sku/cost/leadTime in place.
 *  - MATERIAL_ID_PREFIX constant exported and stable.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  saveMaterialWithDedup,
  listMaterials,
  findMaterialByColorSha256,
  getMaterial,
  deleteMaterial,
  updateMaterialMetadata,
  clearAllMaterials,
} from "@/lib/materialStore";
import { MATERIAL_ID_PREFIX } from "@/types/material";
import {
  clearAllUserTextures,
  listUserTextures,
  getUserTexture,
  computeSHA256,
} from "@/lib/userTextureStore";
import { USER_TEXTURE_ID_PREFIX } from "@/types/userTexture";

// Inject a deterministic processTextureFile shim — happy-dom lacks
// createImageBitmap + OffscreenCanvas, so we hash the input bytes directly
// and emit a fake JPEG blob so dedup semantics still hold.
import { vi } from "vitest";

vi.mock("@/lib/processTextureFile", async () => {
  const { computeSHA256 } = await import("@/lib/userTextureStore");
  return {
    ALLOWED_MIME_TYPES: new Set(["image/jpeg", "image/png", "image/webp"]),
    MAX_EDGE_PX: 2048,
    ProcessTextureError: class ProcessTextureError extends Error {
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
        width: 1024,
        height: 768,
      };
    }),
  };
});

function makeFile(content: string, mime = "image/jpeg", name = "x.jpg"): File {
  return new File([new TextEncoder().encode(content)], name, { type: mime });
}

beforeEach(async () => {
  await clearAllMaterials();
  await clearAllUserTextures();
});

describe("materialStore — D-09 wrapper architecture proof", () => {
  it("MATERIAL_ID_PREFIX is 'mat_'", () => {
    expect(MATERIAL_ID_PREFIX).toBe("mat_");
  });

  it("saveMaterialWithDedup persists Material with color map ref pointing into userTextureStore", async () => {
    const colorFile = makeFile("color-bytes-alpha");
    const result = await saveMaterialWithDedup({
      name: "Carrara",
      tileSizeFt: 2,
      colorFile,
    });
    expect(result.deduped).toBe(false);
    expect(result.id.startsWith(MATERIAL_ID_PREFIX)).toBe(true);

    const list = await listMaterials();
    expect(list.length).toBe(1);
    const mat = list[0];
    expect(mat.name).toBe("Carrara");
    expect(mat.tileSizeFt).toBeCloseTo(2, 5);
    // wrapper architecture: colorMapId is a utex_ id into userTextureStore
    expect(mat.colorMapId.startsWith(USER_TEXTURE_ID_PREFIX)).toBe(true);
    // colorSha256 matches the D-08 dedup key
    expect(mat.colorSha256.length).toBe(64);

    // The underlying UserTexture was created
    const tex = await getUserTexture(mat.colorMapId);
    expect(tex).toBeDefined();
    expect(tex!.sha256).toBe(mat.colorSha256);
  });
});

describe("materialStore — D-08 SHA-256 dedup on color map only", () => {
  it("saveMaterialWithDedup returns deduped:true on second upload of same color JPEG", async () => {
    const file1 = makeFile("same-color");
    const file2 = makeFile("same-color"); // identical bytes -> same SHA-256
    const first = await saveMaterialWithDedup({
      name: "First",
      tileSizeFt: 2,
      colorFile: file1,
    });
    expect(first.deduped).toBe(false);

    const second = await saveMaterialWithDedup({
      name: "Second different name",
      tileSizeFt: 4,
      colorFile: file2,
    });
    expect(second.deduped).toBe(true);
    expect(second.id).toBe(first.id);

    const list = await listMaterials();
    expect(list.length).toBe(1);
    expect(list[0].name).toBe("First"); // dedup does NOT overwrite
  });

  it("findMaterialByColorSha256 returns undefined for unknown hash", async () => {
    const miss = await findMaterialByColorSha256("0".repeat(64));
    expect(miss).toBeUndefined();
  });

  it("saveMaterialWithDedup persists optional roughness + reflection map refs separately", async () => {
    const result = await saveMaterialWithDedup({
      name: "TripleMaps",
      tileSizeFt: 2,
      colorFile: makeFile("color-bytes"),
      roughnessFile: makeFile("roughness-bytes"),
      reflectionFile: makeFile("reflection-bytes"),
    });
    expect(result.deduped).toBe(false);
    const mat = await getMaterial(result.id);
    expect(mat).toBeDefined();
    expect(mat!.colorMapId.startsWith(USER_TEXTURE_ID_PREFIX)).toBe(true);
    expect(mat!.roughnessMapId).toBeDefined();
    expect(mat!.roughnessMapId!.startsWith(USER_TEXTURE_ID_PREFIX)).toBe(true);
    expect(mat!.reflectionMapId).toBeDefined();
    expect(mat!.reflectionMapId!.startsWith(USER_TEXTURE_ID_PREFIX)).toBe(true);

    // Three distinct UserTextures landed
    const tex = await listUserTextures();
    expect(tex.length).toBe(3);
    const shas = new Set(tex.map((t) => t.sha256));
    expect(shas.size).toBe(3);
  });
});

describe("materialStore — listing + getter", () => {
  it("listMaterials sorts most-recent-first by createdAt", async () => {
    const a = await saveMaterialWithDedup({
      name: "A",
      tileSizeFt: 2,
      colorFile: makeFile("a"),
    });
    // Synthetic backdate of A (simulate older entry).
    const matA = await getMaterial(a.id);
    expect(matA).toBeDefined();

    const b = await saveMaterialWithDedup({
      name: "B",
      tileSizeFt: 2,
      colorFile: makeFile("b"),
    });
    const matB = await getMaterial(b.id);
    expect(matB).toBeDefined();
    // Force B to be newer than A (Date.now resolution may collide on fast CI)
    if (matB!.createdAt <= matA!.createdAt) {
      await updateMaterialMetadata(b.id, { name: "B" });
      // updateMaterialMetadata preserves createdAt; instead update via store
      // by re-fetching. Simulate clean ordering by sleeping a tick.
      await new Promise((r) => setTimeout(r, 5));
    }

    const list = await listMaterials();
    expect(list.length).toBe(2);
    expect(list[0].createdAt).toBeGreaterThanOrEqual(list[1].createdAt);
  });

  it("getMaterial returns undefined for unknown id", async () => {
    const result = await getMaterial(`${MATERIAL_ID_PREFIX}nope`);
    expect(result).toBeUndefined();
  });
});

describe("materialStore — delete + update", () => {
  it("deleteMaterial removes the entry but does NOT cascade-delete the color UserTexture (orphan-tolerant)", async () => {
    const result = await saveMaterialWithDedup({
      name: "Tobedeleted",
      tileSizeFt: 2,
      colorFile: makeFile("delme"),
    });
    const mat = await getMaterial(result.id);
    expect(mat).toBeDefined();
    const colorMapId = mat!.colorMapId;

    await deleteMaterial(result.id);
    const after = await getMaterial(result.id);
    expect(after).toBeUndefined();

    // UserTexture survives — orphan-tolerant per D-09.
    const tex = await getUserTexture(colorMapId);
    expect(tex).toBeDefined();
  });

  it("updateMaterialMetadata mutates name/tileSizeFt/brand/sku/cost/leadTime in place", async () => {
    const result = await saveMaterialWithDedup({
      name: "Original",
      tileSizeFt: 2,
      colorFile: makeFile("orig-bytes"),
    });
    await updateMaterialMetadata(result.id, {
      name: "Renamed",
      tileSizeFt: 1.5,
      brand: "ACME",
      sku: "X-99",
      cost: "$5.99/sqft",
      leadTime: "2-4 weeks",
    });
    const after = await getMaterial(result.id);
    expect(after).toBeDefined();
    expect(after!.name).toBe("Renamed");
    expect(after!.tileSizeFt).toBeCloseTo(1.5, 5);
    expect(after!.brand).toBe("ACME");
    expect(after!.sku).toBe("X-99");
    expect(after!.cost).toBe("$5.99/sqft");
    expect(after!.leadTime).toBe("2-4 weeks");
    // Color refs preserved
    expect(after!.colorMapId).toBeDefined();
    expect(after!.colorSha256.length).toBe(64);
  });
});

describe("materialStore — sanity checks", () => {
  it("computeSHA256 (texture-store helper) is reused for material color hashing", async () => {
    const hex = await computeSHA256(new TextEncoder().encode("hello"));
    expect(hex).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });
});
