/**
 * Phase 55 — GLTF/GLB Upload + IDB Storage (GLTF-UPLOAD-01).
 *
 * Isolated IDB keyspace for user-uploaded GLTF/GLB Blobs. Mirrors Phase 32
 * LIB-08 userTextureStore.ts exactly. computeSHA256 imported — NOT duplicated.
 *
 * DB name: "room-cad-gltf-models" / Object store: "models"
 * Key: GltfModel.id (prefixed "gltf_")
 */
import { createStore, get, set, del, values, clear } from "idb-keyval";
import { uid } from "@/lib/geometry";
import { computeSHA256 } from "@/lib/userTextureStore"; // reuse — DO NOT duplicate

/** Named IDB store handle — DO NOT reuse for anything other than GltfModel
 *  entries. The db+store names are both load-bearing: serialization.ts uses
 *  the default (unnamed) store, so this is physically isolated at the
 *  IndexedDB database level. */
export const gltfIdbStore = createStore("room-cad-gltf-models", "models");

export interface GltfModel {
  id: string;        // "gltf_" + uid()
  blob: Blob;
  sha256: string;    // hex string
  name: string;      // original filename
  sizeBytes: number; // file.size at upload time
  uploadedAt: number; // epoch ms (mirrors userTextureStore.ts createdAt pattern)
}

/** Write a GltfModel entry verbatim. Caller is responsible for assigning
 *  a correctly-prefixed id and computing sha256. Usually prefer
 *  `saveGltfWithDedup` which handles both. */
export async function saveGltf(model: GltfModel): Promise<void> {
  await set(model.id, model, gltfIdbStore);
}

/** Look up a GltfModel by id. Returns `undefined` when absent (orphan path). */
export async function getGltf(id: string): Promise<GltfModel | undefined> {
  return get<GltfModel>(id, gltfIdbStore);
}

/** Hard-delete a GltfModel entry. Product references to the id are NOT
 *  swept — orphan fallback handles them at render time. */
export async function deleteGltf(id: string): Promise<void> {
  await del(id, gltfIdbStore);
}

/** Return all GltfModel entries, most-recent-first (mirrors listUserTextures D-06). */
export async function listGltfs(): Promise<GltfModel[]> {
  const all = (await values(gltfIdbStore)) as GltfModel[];
  return all.sort((a, b) => b.uploadedAt - a.uploadedAt);
}

/** Scan the catalog for an entry whose sha256 matches the given hex digest.
 *  Linear scan is fine for a single-user local tool — realistic catalog size
 *  is O(10s), not O(1000s). */
export async function findGltfBySha256(sha256: string): Promise<GltfModel | undefined> {
  const all = await listGltfs();
  return all.find((m) => m.sha256 === sha256);
}

/**
 * Save a new GltfModel OR return the existing entry id when the SHA-256
 * matches a catalog entry (GLTF-UPLOAD-01 dedup). `deduped: true` in the
 * result signals to callers that no new row was written.
 */
export async function saveGltfWithDedup(input: {
  blob: Blob;
  name: string;
}): Promise<{ id: string; deduped: boolean }> {
  const bytes = await input.blob.arrayBuffer(); // must await before computeSHA256
  const sha256 = await computeSHA256(bytes);
  const existing = await findGltfBySha256(sha256);
  if (existing) return { id: existing.id, deduped: true };
  const id = `gltf_${uid()}`;
  const model: GltfModel = {
    id,
    blob: input.blob,
    sha256,
    name: input.name,
    sizeBytes: input.blob.size,
    uploadedAt: Date.now(),
  };
  await saveGltf(model);
  return { id, deduped: false };
}

/** Test helper — clears entire gltf keyspace. NOT used in production UI. */
export async function clearAllGltfs(): Promise<void> {
  await clear(gltfIdbStore);
}
