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

/**
 * Phase 68 D-07: face directions for `PlacedCustomElement.faceMaterials`.
 * Each face independently resolves to a Material (or falls back to the catalog
 * `CustomElement.color`).
 *
 * Coordinate convention (matches CustomElementMesh box geometry):
 * - top    → +Z face (looking down at the box)
 * - bottom → -Z face
 * - north  → +Y face (away from origin in 2D plan)
 * - south  → -Y face
 * - east   → +X face
 * - west   → -X face
 */
export type FaceDirection =
  | "top"
  | "bottom"
  | "north"
  | "south"
  | "east"
  | "west";

export interface Material {
  /** Opaque id, prefixed with MATERIAL_ID_PREFIX. */
  id: string;
  /** Required ≤40 chars (matches UserTexture convention). */
  name: string;
  /** Real-world tile size in decimal feet. Required, parsed via validateInput. */
  tileSizeFt: number;

  /**
   * Phase 68 D-02: paint Material — flat color (no texture).
   *
   * Mutually exclusive with `colorMapId` at the data-model level. If both are
   * set, `resolveSurfaceMaterial` (src/lib/surfaceMaterial.ts) treats it as a
   * data error: it `console.warn`s and prefers `colorHex`. TypeScript can't
   * cheaply enforce mutual exclusion at the struct level, so this is a runtime
   * guard — auto-generated paint Materials from snapshot v5→v6 migration leave
   * `colorMapId` unset, while textured Materials leave `colorHex` unset.
   *
   * Standard CSS hex: `#rrggbb` lowercase (e.g. `"#f5f0e8"`).
   */
  colorHex?: string;

  /**
   * Reference into userTextureIdbStore. Required for textured Materials, omitted
   * for paint Materials (when `colorHex` is set instead — D-02).
   *
   * Marked optional in the type system to allow paint Materials; runtime invariant
   * (enforced by validators / saveMaterialWithDedup) is that exactly one of
   * `colorHex` or `colorMapId` is set per Material.
   */
  colorMapId?: string;
  /** Lowercase hex SHA-256 of the color map's downscaled JPEG bytes. D-08 dedup key. */
  colorSha256?: string;
  /** Optional reference into userTextureIdbStore. */
  roughnessMapId?: string;
  /** Optional reference into userTextureIdbStore. */
  reflectionMapId?: string;
  /** Optional reference into userTextureIdbStore. Phase 78 PBR-01. */
  aoMapId?: string;
  /** Optional reference into userTextureIdbStore. Phase 78 PBR-02. */
  displacementMapId?: string;

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

  /**
   * Phase 70 LIB-REBUILD-01 — optional category for library sub-tab filtering.
   * Previously-saved Materials without a category appear under "All" only.
   */
  category?: string;
}

export const MATERIAL_CATEGORIES = [
  "Flooring",
  "Wall coverings",
  "Countertops",
  "Paint",
] as const;

export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];
