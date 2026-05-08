/**
 * Phase 67 — Material engine foundation (MAT-ENGINE-01).
 *
 * Isolated IndexedDB keyspace for Material catalog entries. Mirrors the
 * Phase 34 userTextureStore architecture: separate named store ensures zero
 * coupling with the default idb-keyval store used by serialization.ts
 * (project save/load) and with the texture store. Writes here never trigger
 * project autosave; deletes never invalidate project snapshots (success
 * criterion #5).
 *
 * D-09 wrapper architecture: Material records store `colorMapId`,
 * `roughnessMapId?`, `reflectionMapId?` as `utex_`-prefixed references into
 * userTextureIdbStore. Each map upload flows through the existing
 * processTextureFile + saveUserTextureWithDedup pipeline (verbatim reuse).
 *
 * D-08 dedup: Only the color-map SHA-256 drives Material-level dedup. The
 * second upload of the same color JPEG returns the existing Material id
 * with `deduped: true`; metadata edits go through `updateMaterialMetadata`.
 *
 * Race semantics: same check-then-write race that exists in
 * saveUserTextureWithDedup. For a single-user local tool the race window is
 * the user's reaction time + processing time, so we accept the same tradeoff
 * as Phase 34. Documented per RESEARCH.md Pitfall 2.
 */
import { createStore, get, set, del, values, clear } from "idb-keyval";
import { uid } from "./geometry";
import { saveUserTextureWithDedup } from "./userTextureStore";
import { processTextureFile } from "./processTextureFile";
import type { Material } from "@/types/material";
import { MATERIAL_ID_PREFIX } from "@/types/material";

/** Named IDB store handle — DO NOT reuse for anything other than Material
 *  entries. The db+store names are both load-bearing: physically isolated
 *  from room-cad-user-textures (Phase 34) and from the default project
 *  store (serialization.ts). */
export const materialIdbStore = createStore("room-cad-materials", "materials");

export interface SaveMaterialInput {
  name: string;
  tileSizeFt: number;
  brand?: string;
  sku?: string;
  cost?: string;
  leadTime?: string;
  /** Phase 70: optional category for library sub-tab filtering. */
  category?: string;
  colorFile: File;
  roughnessFile?: File;
  reflectionFile?: File;
  /** Phase 78 PBR-01: optional AO map. Persisted via persistOptionalMap. */
  aoFile?: File;
  /** Phase 78 PBR-02: optional displacement map. Persisted via persistOptionalMap. */
  displacementFile?: File;
}

/**
 * Persist a Material with color-map dedup (D-08). Color map is mandatory;
 * roughness + reflection maps are optional. Each map flows through the
 * existing texture pipeline; only the color map's SHA-256 is the dedup key.
 *
 * Returns `{ id, deduped }`. When `deduped: true`, no new Material row was
 * written — the UI should surface the "Material already in your library."
 * toast rather than "Material saved.".
 */
export async function saveMaterialWithDedup(
  input: SaveMaterialInput,
): Promise<{ id: string; deduped: boolean }> {
  // (1) Process color map through the existing pipeline (MIME gate +
  //     2048px downscale + SHA-256). Same error surface as Phase 34.
  const color = await processTextureFile(input.colorFile);

  // (2) Persist or dedup the color UserTexture (uses existing texture-store
  //     dedup so identical bytes don't create a second blob). Phase 68
  //     surface renderers will resolve this id through pbrTextureCache.
  const { id: colorMapId } = await saveUserTextureWithDedup(
    {
      name: `${input.name} (color)`,
      tileSizeFt: input.tileSizeFt,
      blob: color.blob,
      mimeType: color.mimeType,
    },
    color.sha256,
  );

  // (3) Material-level dedup (D-08) — re-upload of the same color bytes
  //     returns the existing Material id even if metadata differs.
  const existing = await findMaterialByColorSha256(color.sha256);
  if (existing) return { id: existing.id, deduped: true };

  // (4) Optional roughness / reflection maps. Each goes through the same
  //     pipeline independently. NOT part of dedup per D-08.
  const roughnessMapId = input.roughnessFile
    ? await persistOptionalMap(
        input.roughnessFile,
        `${input.name} (roughness)`,
        input.tileSizeFt,
      )
    : undefined;
  const reflectionMapId = input.reflectionFile
    ? await persistOptionalMap(
        input.reflectionFile,
        `${input.name} (reflection)`,
        input.tileSizeFt,
      )
    : undefined;
  const aoMapId = input.aoFile
    ? await persistOptionalMap(input.aoFile, `${input.name} (ao)`, input.tileSizeFt)
    : undefined;
  const displacementMapId = input.displacementFile
    ? await persistOptionalMap(input.displacementFile, `${input.name} (displacement)`, input.tileSizeFt)
    : undefined;

  // (5) Write Material record. No blob — just metadata + utex_ refs.
  const id = `${MATERIAL_ID_PREFIX}${uid()}`;
  const mat: Material = {
    id,
    name: input.name,
    tileSizeFt: input.tileSizeFt,
    colorMapId,
    colorSha256: color.sha256,
    roughnessMapId,
    reflectionMapId,
    aoMapId,
    displacementMapId,
    brand: input.brand?.trim() || undefined,
    sku: input.sku?.trim() || undefined,
    cost: input.cost?.trim() || undefined,
    leadTime: input.leadTime?.trim() || undefined,
    category: input.category?.trim() || undefined,
    createdAt: Date.now(),
  };
  await set(id, mat, materialIdbStore);
  return { id, deduped: false };
}

async function persistOptionalMap(
  file: File,
  name: string,
  tileSizeFt: number,
): Promise<string> {
  const result = await processTextureFile(file);
  const { id } = await saveUserTextureWithDedup(
    { name, tileSizeFt, blob: result.blob, mimeType: result.mimeType },
    result.sha256,
  );
  return id;
}

/** Return all Material entries, most-recent-first. Mirrors texture-store
 *  D-06 sort convention. */
export async function listMaterials(): Promise<Material[]> {
  const all = (await values(materialIdbStore)) as Material[];
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

/** Scan the catalog for an entry whose `colorSha256` matches the given hex
 *  digest. Linear scan — realistic catalog size is O(10s) for a single-user
 *  local tool, so the scan cost is irrelevant. */
export async function findMaterialByColorSha256(
  sha256: string,
): Promise<Material | undefined> {
  const all = await listMaterials();
  return all.find((m) => m.colorSha256 === sha256);
}

/**
 * Phase 68 — paint Material dedup helper. Returns an existing paint Material
 * (one with `colorHex` set) whose hex matches `hex` (case-insensitive), or
 * undefined when none exists. Used by snapshot v5→v6 migration to avoid
 * spawning duplicate paint Materials when the same hex appears on multiple
 * surfaces.
 */
export async function findPaintMaterialByHex(
  hex: string,
): Promise<Material | undefined> {
  const target = hex.toLowerCase();
  const all = await listMaterials();
  return all.find((m) => m.colorHex?.toLowerCase() === target);
}

/**
 * Phase 68 — direct Material write (NO file processing). Used by snapshot
 * v5→v6 migration to persist Materials that wrap pre-existing UserTexture ids
 * (no new file upload happens during migration) or that represent paint
 * (no texture at all). DO NOT use from UI flows — those go through
 * `saveMaterialWithDedup` to ensure SHA-256 dedup + file processing.
 */
export async function saveMaterialDirect(
  partial: Omit<Material, "id" | "createdAt"> & {
    id?: string;
    createdAt?: number;
  },
): Promise<Material> {
  const id = partial.id ?? `${MATERIAL_ID_PREFIX}${uid()}`;
  const mat: Material = {
    ...partial,
    id,
    createdAt: partial.createdAt ?? Date.now(),
  };
  await set(id, mat, materialIdbStore);
  return mat;
}

/** Look up a Material by id. Returns `undefined` when absent. */
export async function getMaterial(id: string): Promise<Material | undefined> {
  return get<Material>(id, materialIdbStore);
}

/** Hard-delete a Material entry. The referenced UserTexture(s) are NOT
 *  cascade-deleted — orphan-tolerant per D-09. The MaterialCard component
 *  renders a placeholder + "Color map missing" warning when getUserTexture
 *  returns undefined for the orphaned reference. */
export async function deleteMaterial(id: string): Promise<void> {
  await del(id, materialIdbStore);
}

/** Mutate metadata fields on an existing Material. Texture-map references
 *  cannot be replaced through this API (matches Phase 34 D-11 catalog-edit
 *  pattern — to swap textures, delete and re-upload). */
export async function updateMaterialMetadata(
  id: string,
  changes: Partial<
    Pick<Material, "name" | "tileSizeFt" | "brand" | "sku" | "cost" | "leadTime" | "category">
  >,
): Promise<void> {
  const existing = await getMaterial(id);
  if (!existing) return;
  await set(id, { ...existing, ...changes }, materialIdbStore);
}

/** Test helper — clears the entire material keyspace. NOT exported for
 *  production UI; used by vitest beforeEach hooks to reset between cases. */
export async function clearAllMaterials(): Promise<void> {
  await clear(materialIdbStore);
}
