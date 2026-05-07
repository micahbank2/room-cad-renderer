/**
 * Phase 67 — Material entity (MAT-ENGINE-01).
 *
 * A Material is a user-curated catalog entry pairing a color texture map
 * (mandatory) and optional roughness/reflection maps with real-world metadata
 * (brand, SKU, cost, lead time, tile size). Materials live in their own IDB
 * keyspace ("room-cad-materials") — separate from UserTextures and from
 * project snapshots. They wrap UserTexture references rather than owning
 * blobs directly (D-09 RESOLVED: wrapper architecture).
 *
 * Dedup semantics (D-08): SHA-256 of the color map only. Re-upload of the
 * same color map returns the existing Material id even if metadata differs;
 * the user must edit the existing entry to change metadata. Roughness and
 * reflection map hashes are NOT part of the dedup key.
 *
 * Cost (D-04) and lead-time (D-05) are intentionally free-text strings, not
 * structured numbers — accommodating real-world vendor data like
 * "Quote on request", "$5.99/sqft", "2-4 weeks", "Made to order".
 */
export const MATERIAL_ID_PREFIX = "mat_";

export interface Material {
  /** Opaque id, prefixed with MATERIAL_ID_PREFIX. */
  id: string;
  /** Required ≤40 chars (matches UserTexture convention). */
  name: string;
  /** Real-world tile size in decimal feet. Required, parsed via validateInput. */
  tileSizeFt: number;

  /** Reference into userTextureIdbStore. Required (D-09 wrapper). */
  colorMapId: string;
  /** Lowercase hex SHA-256 of the color map's downscaled JPEG bytes. D-08 dedup key. */
  colorSha256: string;
  /** Optional reference into userTextureIdbStore. */
  roughnessMapId?: string;
  /** Optional reference into userTextureIdbStore. */
  reflectionMapId?: string;

  /** Optional metadata (D-03). Free-text. */
  brand?: string;
  /** Optional metadata. Free-text. */
  sku?: string;
  /** D-04: free-text, e.g. "$5.99/sqft", "Quote on request". NOT a number. */
  cost?: string;
  /** D-05: free-text, e.g. "2-4 weeks", "In stock", "Made to order". NOT integer days. */
  leadTime?: string;

  /** Upload timestamp (Date.now()). Drives listMaterials sort order. */
  createdAt: number;
}
