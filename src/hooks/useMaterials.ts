/**
 * Phase 67 — Material engine foundation (MAT-ENGINE-01).
 *
 * React hook for the Material catalog. Mirrors the shape of `useUserTextures`
 * for consistency: hydrate from IDB on mount, cross-instance sync via window
 * CustomEvents, save/update/remove/reload mutators.
 *
 * Cross-instance sync: every hook instance subscribes to window
 * `material-saved` / `material-updated` / `material-deleted` events and
 * reloads on receipt. Mutators dispatch the matching event so peers in
 * other library hosts stay in sync.
 *
 * Pattern #7 (CLAUDE.md StrictMode-safety): the cross-instance listener
 * registration lives in a useEffect with a removeEventListener cleanup so
 * StrictMode double-mount does not leak handlers. The test driver bridges
 * (`window.__driveMaterialUpload`, `window.__getMaterials`) are installed at
 * MODULE EVAL TIME, NOT inside a useEffect — they run once, never re-run,
 * and don't need cleanup. Per RESEARCH.md Pitfall 4 + Phase 58/64 trap.
 */
import { useCallback, useEffect, useState } from "react";
import type { Material } from "@/types/material";
import {
  listMaterials,
  saveMaterialWithDedup,
  deleteMaterial,
  updateMaterialMetadata,
  type SaveMaterialInput,
} from "@/lib/materialStore";

export const MATERIAL_SAVED_EVENT = "material-saved";
export const MATERIAL_UPDATED_EVENT = "material-updated";
export const MATERIAL_DELETED_EVENT = "material-deleted";

export interface UseMaterialsResult {
  materials: Material[];
  loading: boolean;
  /** Save a new Material or dedup to an existing one. Returns `{ id, deduped }`. */
  save: (input: SaveMaterialInput) => Promise<{ id: string; deduped: boolean }>;
  /** Update catalog metadata on an existing entry (D-11 pattern). */
  update: (
    id: string,
    changes: Partial<
      Pick<Material, "name" | "tileSizeFt" | "brand" | "sku" | "cost" | "leadTime">
    >,
  ) => Promise<void>;
  /** Hard-delete a Material entry. UserTexture refs are NOT cascade-deleted
   *  (orphan fallback handles them at render time). */
  remove: (id: string) => Promise<void>;
  /** Manually re-list — rarely needed; save/update/remove already call this. */
  reload: () => Promise<void>;
}

function notify(event: string, id: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(event, { detail: { id } }));
}

export function useMaterials(): UseMaterialsResult {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const list = await listMaterials();
    setMaterials(list);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await listMaterials();
      if (!cancelled) {
        setMaterials(list);
        setLoading(false);
      }
    })();

    // Cross-instance sync: reload whenever any sibling hook mutates IDB.
    // Pattern #7 guard: matching removeEventListener on cleanup.
    const onMutation = () => {
      if (!cancelled) reload();
    };
    const events = [
      MATERIAL_SAVED_EVENT,
      MATERIAL_UPDATED_EVENT,
      MATERIAL_DELETED_EVENT,
    ];
    if (typeof window !== "undefined") {
      events.forEach((e) => window.addEventListener(e, onMutation));
    }

    return () => {
      cancelled = true;
      if (typeof window !== "undefined") {
        events.forEach((e) => window.removeEventListener(e, onMutation));
      }
    };
  }, [reload]);

  const save = useCallback(
    async (input: SaveMaterialInput) => {
      const result = await saveMaterialWithDedup(input);
      await reload();
      notify(MATERIAL_SAVED_EVENT, result.id);
      return result;
    },
    [reload],
  );

  const update = useCallback(
    async (
      id: string,
      changes: Partial<
        Pick<Material, "name" | "tileSizeFt" | "brand" | "sku" | "cost" | "leadTime">
      >,
    ) => {
      await updateMaterialMetadata(id, changes);
      await reload();
      notify(MATERIAL_UPDATED_EVENT, id);
    },
    [reload],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteMaterial(id);
      await reload();
      notify(MATERIAL_DELETED_EVENT, id);
    },
    [reload],
  );

  return { materials, loading, save, update, remove, reload };
}

// ---- Test driver bridges (Pattern #7: module-eval install, NOT useEffect) --
// Mirrors useUserTextures.ts:131-134 + UploadTextureModal.tsx:460-477. Runs
// once when the module is first imported, never re-runs, never needs cleanup.
// Gated by import.meta.env.MODE === "test" so production bundles never see it.
if (typeof window !== "undefined" && import.meta.env.MODE === "test") {
  (window as unknown as {
    __getMaterials: () => Promise<Material[]>;
  }).__getMaterials = () => listMaterials();
  (window as unknown as {
    __driveMaterialUpload: (
      input: SaveMaterialInput,
    ) => Promise<{ id: string; deduped: boolean }>;
  }).__driveMaterialUpload = (input: SaveMaterialInput) =>
    saveMaterialWithDedup(input);
}
