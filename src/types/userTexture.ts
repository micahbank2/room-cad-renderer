/**
 * Phase 34 — User-Uploaded Textures (LIB-06/07/08).
 *
 * UserTexture is the catalog-entry shape for a user-uploaded JPEG/PNG/WebP
 * image that has been client-side downscaled (≤2048px longest edge) and
 * re-encoded to JPEG. The binary Blob lives in a dedicated IDB keyspace
 * (`room-cad-user-textures` / `textures`) — NOT inside CADSnapshot JSON.
 *
 * Surfaces reference textures by `userTextureId` (plain string) only. This
 * keeps snapshots free of data-URL bloat (LIB-08 invariant).
 */
export const USER_TEXTURE_ID_PREFIX = "utex_";

export interface UserTexture {
  /** Opaque id, prefixed with USER_TEXTURE_ID_PREFIX. */
  id: string;
  /** Lowercase hex SHA-256 of the downscaled JPEG bytes (LIB-07 dedup key). */
  sha256: string;
  /** User-given name. Client-enforced ≤40 chars. */
  name: string;
  /** Real-world tile size in decimal feet (from validateInput). Must be > 0. */
  tileSizeFt: number;
  /** Downscaled JPEG blob — always mimeType="image/jpeg" after processing. */
  blob: Blob;
  /** Always "image/jpeg" after downscale pipeline. */
  mimeType: string;
  /** Upload timestamp (Date.now()). Drives listUserTextures sort (D-06). */
  createdAt: number;
}
