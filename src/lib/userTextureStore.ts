/**
 * Phase 34 — User-Uploaded Textures (LIB-06/07/08).
 *
 * Isolated IndexedDB keyspace for user-uploaded texture Blobs. Separate named
 * store ensures zero coupling with the default `idb-keyval` store used by
 * serialization.ts (project save/load). Writes here never trigger project
 * autosave; deletes here never invalidate project snapshots.
 *
 * Design (RESEARCH.md §B):
 * - DB name: "room-cad-user-textures"
 * - Object store: "textures"
 * - Key: UserTexture.id (string, prefixed "utex_")
 * - Value: full UserTexture object including Blob
 *
 * SHA-256 dedup (LIB-07): `saveUserTextureWithDedup` looks up any existing
 * entry with matching `sha256` hex and returns its id instead of writing a
 * duplicate. The second upload under a different name still links to the
 * first entry — by design; catalog edits (name / tileSizeFt) on the existing
 * entry are the correct flow for renaming (D-11).
 *
 * Listing order (D-06): `listUserTextures` returns most-recent-first
 * (`createdAt DESC`). Matches the dominant usage pattern ("I just added oak,
 * let me apply it").
 */
import { createStore, get, set, del, values, clear } from "idb-keyval";
import { uid } from "./geometry";
import type { UserTexture } from "@/types/userTexture";
import { USER_TEXTURE_ID_PREFIX } from "@/types/userTexture";

/** Named IDB store handle — DO NOT reuse for anything other than UserTexture
 *  entries. The db+store names are both load-bearing: serialization.ts uses
 *  the default (unnamed) store, so this is physically isolated at the
 *  IndexedDB database level. */
export const userTextureIdbStore = createStore("room-cad-user-textures", "textures");

/**
 * Compute the SHA-256 of arbitrary bytes and return lowercase hex.
 * Uses Web Crypto `crypto.subtle.digest("SHA-256", ...)` — available in all
 * Chromium-class browsers + Safari and in happy-dom (test env).
 */
export async function computeSHA256(bytes: ArrayBuffer | ArrayBufferView): Promise<string> {
  // crypto.subtle.digest accepts BufferSource; normalize ArrayBufferView to its
  // underlying ArrayBuffer view for consistent behavior across runtimes.
  const buf =
    bytes instanceof ArrayBuffer
      ? bytes
      : bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Write a UserTexture entry verbatim. Caller is responsible for assigning
 *  a correctly-prefixed id and computing sha256. Usually prefer
 *  `saveUserTextureWithDedup` which handles both. */
export async function saveUserTexture(tex: UserTexture): Promise<void> {
  await set(tex.id, tex, userTextureIdbStore);
}

/** Look up a UserTexture by id. Returns `undefined` when absent (orphan path). */
export async function getUserTexture(id: string): Promise<UserTexture | undefined> {
  return get<UserTexture>(id, userTextureIdbStore);
}

/** Hard-delete a UserTexture entry. CADSnapshot references to the id are NOT
 *  swept — orphan fallback (D-08/D-09) handles them at render time. */
export async function deleteUserTexture(id: string): Promise<void> {
  await del(id, userTextureIdbStore);
}

/** Return all UserTexture entries, most-recent-first (D-06). */
export async function listUserTextures(): Promise<UserTexture[]> {
  const all = (await values(userTextureIdbStore)) as UserTexture[];
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

/** Scan the catalog for an entry whose sha256 matches the given hex digest.
 *  Linear scan is fine for a single-user local tool — realistic catalog size
 *  is O(10s), not O(1000s). */
export async function findTextureBySha256(
  sha256: string,
): Promise<UserTexture | undefined> {
  const all = await listUserTextures();
  return all.find((t) => t.sha256 === sha256);
}

export interface SaveTextureInput {
  name: string;
  tileSizeFt: number;
  blob: Blob;
  mimeType: string;
}

/**
 * Save a new UserTexture OR return the existing entry id when the SHA-256
 * matches a catalog entry (LIB-07 dedup). `deduped: true` in the result
 * signals to callers that no new row was written — the UI should surface
 * "texture already in your library" toast rather than "uploaded".
 */
export async function saveUserTextureWithDedup(
  input: SaveTextureInput,
  sha256: string,
): Promise<{ id: string; deduped: boolean }> {
  const existing = await findTextureBySha256(sha256);
  if (existing) return { id: existing.id, deduped: true };
  const id = `${USER_TEXTURE_ID_PREFIX}${uid()}`;
  const tex: UserTexture = {
    id,
    sha256,
    name: input.name,
    tileSizeFt: input.tileSizeFt,
    blob: input.blob,
    mimeType: input.mimeType,
    createdAt: Date.now(),
  };
  await saveUserTexture(tex);
  return { id, deduped: false };
}

/** Test helper — clears the entire user-texture keyspace. NOT exported in
 *  production UI; used by vitest beforeEach hooks to reset between cases. */
export async function clearAllUserTextures(): Promise<void> {
  await clear(userTextureIdbStore);
}
