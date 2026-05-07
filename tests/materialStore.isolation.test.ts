/**
 * Phase 67 Plan 01 — Wave 0 RED test for materialStore isolation from cadStore + project store.
 *
 * Verifies success criterion #5: Material writes do NOT trigger project autosave;
 * project save/load round trip does NOT mutate the material store; cadStore default
 * state has no material reference fields.
 *
 * Mirrors tests/userTextureStore.test.ts §"named IDB keyspace isolation" assertions
 * but at the higher level of the project-snapshot pipeline.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { keys as defaultKeys, set as defaultSet, clear as defaultClear } from "idb-keyval";
import {
  saveMaterialWithDedup,
  listMaterials,
  clearAllMaterials,
} from "@/lib/materialStore";
import { clearAllUserTextures } from "@/lib/userTextureStore";
import { useCADStore } from "@/stores/cadStore";

// Same processTextureFile shim as materialStore.test.ts so happy-dom can hash
// without createImageBitmap / OffscreenCanvas.
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
        width: 1024,
        height: 768,
      };
    }),
  };
});

function makeFile(content: string): File {
  return new File([new TextEncoder().encode(content)], "x.jpg", { type: "image/jpeg" });
}

beforeEach(async () => {
  await clearAllMaterials();
  await clearAllUserTextures();
  await defaultClear();
});

describe("materialStore — physical isolation from cadStore", () => {
  it("cadStore default state has no material reference fields", () => {
    const state = useCADStore.getState();
    expect(state).not.toHaveProperty("materials");
    expect(state).not.toHaveProperty("materialStore");
    expect(state).not.toHaveProperty("materialIds");
  });

  it("Material writes do NOT call setItem on the project (default) store", async () => {
    const before = await defaultKeys();
    await saveMaterialWithDedup({
      name: "IsolatedMat",
      tileSizeFt: 2,
      colorFile: makeFile("isolated-bytes"),
    });
    const after = await defaultKeys();
    // No new keys leaked into the default project store.
    expect(after.length).toBe(before.length);
  });

  it("Material writes do not mutate any module-level cadStore subscriber", async () => {
    // Snapshot cadStore state, write material, verify no subscriber tick caused mutation.
    const initial = useCADStore.getState();
    const initialKeys = Object.keys(initial);

    await saveMaterialWithDedup({
      name: "NoCadStoreImpact",
      tileSizeFt: 2,
      colorFile: makeFile("no-cad"),
    });

    const after = useCADStore.getState();
    expect(Object.keys(after)).toEqual(initialKeys);
  });
});

describe("materialStore — survives project save/load round trip", () => {
  it("Project save/load round trip does NOT mutate materialIdbStore", async () => {
    // Seed material store
    const result = await saveMaterialWithDedup({
      name: "Persist",
      tileSizeFt: 2,
      colorFile: makeFile("persist-bytes"),
    });
    const before = await listMaterials();
    expect(before.length).toBe(1);
    expect(before[0].id).toBe(result.id);

    // Simulate a project save+load: write something to the default store and read back.
    await defaultSet("room-cad-project-fakeId", {
      id: "fakeId",
      name: "Test Project",
      payload: { walls: [], placedProducts: [] },
    });
    const projectKeys = await defaultKeys();
    expect(projectKeys.length).toBeGreaterThan(0);

    // Material store untouched.
    const after = await listMaterials();
    expect(after.length).toBe(1);
    expect(after[0].id).toBe(before[0].id);
    expect(after[0].colorSha256).toBe(before[0].colorSha256);
  });
});
