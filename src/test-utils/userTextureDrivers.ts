// src/test-utils/userTextureDrivers.ts
// Phase 49: window-level drivers for BUG-02 e2e test. Gated by MODE === "test".
//
// seedUserTexture — writes a texture blob directly to IDB and pre-warms the
// module-level cache, bypassing the full upload UI flow (SHA dedup, compression
// pipeline). This matches Phase 46/47/48 driver conventions.
//
// getWallMeshMapResolved — reads from wallMeshMaterials registry (populated by
// WallMesh.tsx's test-mode useEffect) to assert that material.map is non-null
// for a given wall id after setWallpaper is called.

import * as THREE from "three";
import { saveUserTexture, getUserTexture } from "@/lib/userTextureStore";
import { getUserTextureCached } from "@/three/userTextureCache";
import { USER_TEXTURE_ID_PREFIX } from "@/types/userTexture";
import { uid } from "@/lib/geometry";

// Registry filled by WallMesh.tsx test-mode useEffect.
// Exported so WallMesh can write to it directly without a dynamic import.
export const wallMeshMaterials: Record<string, THREE.MeshStandardMaterial | null> = {};

/**
 * Write a UserTexture entry directly to IDB and pre-warm the module-level
 * `userTextureCache` so that `useUserTexture` resolves instantly in test.
 *
 * @param blob     Raw image bytes (any format; a 1×1 JPEG is sufficient)
 * @param name     Catalog display name
 * @param sizeFt   Tile size in feet (must be > 0)
 * @returns        The new texture id (prefixed with USER_TEXTURE_ID_PREFIX)
 */
export async function seedUserTexture(
  blob: Blob,
  name: string,
  sizeFt: number,
): Promise<string> {
  if (import.meta.env.MODE !== "test") {
    throw new Error("seedUserTexture must not be called outside test mode");
  }
  const id = `${USER_TEXTURE_ID_PREFIX}${uid()}`;
  await saveUserTexture({
    id,
    sha256: "test-sha256-placeholder",
    name,
    tileSizeFt: sizeFt,
    blob,
    mimeType: blob.type || "image/jpeg",
    createdAt: Date.now(),
  });
  // Pre-warm: trigger the async load chain so the cache entry is settled
  // before setWallpaper fires. This ensures useUserTexture resolves quickly.
  await getUserTextureCached(id);
  return id;
}

/**
 * Returns true if the WallMesh for `wallId` has a non-null `material.map`
 * (i.e. the user texture was successfully applied to the meshStandardMaterial).
 */
export function getWallMeshMapResolved(wallId: string): boolean {
  if (import.meta.env.MODE !== "test") {
    throw new Error("getWallMeshMapResolved must not be called outside test mode");
  }
  return !!(wallMeshMaterials[wallId]?.map);
}

/**
 * Returns an ObjectURL for the blob stored under `id` in the user-texture IDB.
 * Use this as `imageUrl` in an `addWallArt` call to exercise the blob-URL path
 * through `wallArtTextureCache` (keyed by imageUrl).
 *
 * Caller must revoke the URL when done: `URL.revokeObjectURL(url)`.
 * Gated by MODE === "test".
 */
export async function getWallArtBlobUrl(id: string): Promise<string> {
  if (import.meta.env.MODE !== "test") {
    throw new Error("getWallArtBlobUrl must not be called outside test mode");
  }
  const entry = await getUserTexture(id);
  if (!entry) throw new Error(`getWallArtBlobUrl: no UserTexture found for id="${id}"`);
  return URL.createObjectURL(entry.blob);
}

/**
 * Phase 49: install user-texture test drivers. Production no-op.
 */
export function installUserTextureDrivers(): void {
  if (typeof window === "undefined") return;
  if (import.meta.env.MODE !== "test") return;

  (window as unknown as { __seedUserTexture: typeof seedUserTexture }).__seedUserTexture =
    seedUserTexture;
  (
    window as unknown as { __getWallMeshMapResolved: typeof getWallMeshMapResolved }
  ).__getWallMeshMapResolved = getWallMeshMapResolved;

  // Expose registry object on window so WallMesh can write to it without
  // importing this module in production (tree-shaking safety).
  (
    window as unknown as { __wallMeshMaterials: typeof wallMeshMaterials }
  ).__wallMeshMaterials = wallMeshMaterials;

  (window as unknown as { __getWallArtBlobUrl: typeof getWallArtBlobUrl }).__getWallArtBlobUrl =
    getWallArtBlobUrl;
}

declare global {
  interface Window {
    __seedUserTexture?: (blob: Blob, name: string, sizeFt: number) => Promise<string>;
    __getWallMeshMapResolved?: (wallId: string) => boolean;
    __wallMeshMaterials?: Record<string, THREE.MeshStandardMaterial | null>;
    __getWallArtBlobUrl?: (id: string) => Promise<string>;
  }
}

export {};
