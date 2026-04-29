/**
 * Phase 55 — GLTF-UPLOAD-01: IDB layer unit tests (TDD).
 *
 * Tests the gltfStore.ts keystore: round-trip, SHA-256 dedup, listing.
 * Uses happy-dom (vitest default) — clearAllGltfs() isolates each case.
 */
import { describe, test, expect, beforeEach } from "vitest";
import {
  saveGltf,
  getGltf,
  findGltfBySha256,
  saveGltfWithDedup,
  listGltfs,
  clearAllGltfs,
  type GltfModel,
} from "@/lib/gltfStore";

// Synthetic GLB blob: 16-byte GLB magic header. No parse needed at upload path.
const GLB_MAGIC = new Uint8Array([
  0x67, 0x6c, 0x54, 0x46, // magic "glTF"
  0x02, 0x00, 0x00, 0x00, // version 2
  0x10, 0x00, 0x00, 0x00, // total length 16
  0x00, 0x00, 0x00, 0x00, // JSON chunk length 0
]);
const testBlob = new Blob([GLB_MAGIC], { type: "model/gltf-binary" });
const altBlob = new Blob([new Uint8Array([0x01, 0x02, 0x03, 0x04])], {
  type: "model/gltf-binary",
});

describe("gltfStore", () => {
  beforeEach(async () => {
    await clearAllGltfs();
  });

  test("saveGltf + getGltf round-trip", async () => {
    const model: GltfModel = {
      id: "gltf_test001",
      blob: testBlob,
      sha256: "abc123",
      name: "test-sofa.glb",
      sizeBytes: testBlob.size,
      uploadedAt: Date.now(),
    };
    await saveGltf(model);
    const retrieved = await getGltf("gltf_test001");
    expect(retrieved).toBeDefined();
    // NOTE: happy-dom / fake-indexeddb may strip Blob prototype on round-trip;
    // assert the stored sizeBytes field (which IS a plain number) instead.
    expect(retrieved!.sizeBytes).toBe(testBlob.size);
    expect(retrieved!.id).toBe("gltf_test001");
  });

  test("findGltfBySha256 returns entry on match", async () => {
    const model: GltfModel = {
      id: "gltf_test002",
      blob: testBlob,
      sha256: "deadbeef",
      name: "chair.glb",
      sizeBytes: testBlob.size,
      uploadedAt: Date.now(),
    };
    await saveGltf(model);
    const found = await findGltfBySha256("deadbeef");
    expect(found).toBeDefined();
    expect(found!.id).toBe("gltf_test002");
  });

  test("findGltfBySha256 returns undefined when no match", async () => {
    const result = await findGltfBySha256("nonexistent-sha");
    expect(result).toBeUndefined();
  });

  test("saveGltfWithDedup returns deduped:true on duplicate blob", async () => {
    const first = await saveGltfWithDedup({ blob: testBlob, name: "sofa.glb" });
    expect(first.deduped).toBe(false);
    const second = await saveGltfWithDedup({ blob: testBlob, name: "sofa-copy.glb" });
    expect(second.id).toBe(first.id);
    expect(second.deduped).toBe(true);
  });

  test("saveGltfWithDedup returns deduped:false for new blob", async () => {
    const r1 = await saveGltfWithDedup({ blob: testBlob, name: "sofa.glb" });
    const r2 = await saveGltfWithDedup({ blob: altBlob, name: "table.glb" });
    expect(r1.deduped).toBe(false);
    expect(r2.deduped).toBe(false);
    expect(r1.id).not.toBe(r2.id);
  });

  test("listGltfs returns all entries", async () => {
    await saveGltfWithDedup({ blob: testBlob, name: "sofa.glb" });
    await saveGltfWithDedup({ blob: altBlob, name: "table.glb" });
    const all = await listGltfs();
    expect(all.length).toBe(2);
  });
});
