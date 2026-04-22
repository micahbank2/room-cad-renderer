/**
 * Phase 34 — User-Uploaded Textures.
 *
 * React hook for the user-texture catalog. Consumed by the upload modal
 * (Plan 01), the MY TEXTURES picker tab (Plan 02), and the delete-confirm
 * flow (Plan 03). Mirrors the shape of useProductStore for consistency.
 *
 * Lifecycle:
 *   - On mount: calls listUserTextures() → sets textures state → flips
 *     loading to false. Cancel-guard prevents setState on an unmounted host.
 *   - save/update/remove: mutate IDB, then call reload() to refresh the list.
 *     Callers don't need to re-subscribe; state update is driven by the hook.
 *
 * NOTE: This is a *local* React state hook, NOT a Zustand store. Each
 * consumer gets its own copy of `textures`. For Plan 01/02/03 usage (one
 * mount site per picker) this is fine; if cross-component propagation
 * becomes needed later, promote to a Zustand store using the same API.
 */
import { useCallback, useEffect, useState } from "react";
import { set } from "idb-keyval";
import type { UserTexture } from "@/types/userTexture";
import {
  listUserTextures,
  saveUserTextureWithDedup,
  deleteUserTexture,
  userTextureIdbStore,
  getUserTexture,
  type SaveTextureInput,
} from "@/lib/userTextureStore";

export interface UseUserTexturesResult {
  textures: UserTexture[];
  loading: boolean;
  /** Save a new UserTexture or dedup to an existing one. Returns the resolved id. */
  save: (input: SaveTextureInput, sha256: string) => Promise<string>;
  /** Update catalog metadata (name / tileSizeFt) on an existing entry (D-11). */
  update: (
    id: string,
    changes: Partial<Pick<UserTexture, "name" | "tileSizeFt">>,
  ) => Promise<void>;
  /** Hard-delete a UserTexture entry. CADSnapshot references are left in place
   *  (orphan fallback handles them per D-08/D-09). */
  remove: (id: string) => Promise<void>;
  /** Manually re-list — rarely needed; save/update/remove already call this. */
  reload: () => Promise<void>;
}

export function useUserTextures(): UseUserTexturesResult {
  const [textures, setTextures] = useState<UserTexture[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const list = await listUserTextures();
    setTextures(list);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await listUserTextures();
      if (!cancelled) {
        setTextures(list);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(
    async (input: SaveTextureInput, sha256: string) => {
      const { id } = await saveUserTextureWithDedup(input, sha256);
      await reload();
      return id;
    },
    [reload],
  );

  const update = useCallback(
    async (
      id: string,
      changes: Partial<Pick<UserTexture, "name" | "tileSizeFt">>,
    ) => {
      const existing = await getUserTexture(id);
      if (!existing) return;
      await set(id, { ...existing, ...changes }, userTextureIdbStore);
      await reload();
    },
    [reload],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteUserTexture(id);
      await reload();
    },
    [reload],
  );

  return { textures, loading, save, update, remove, reload };
}

// Phase 29/30/31 test-driver pattern — gated by vite test mode so it never
// ships to production bundles. Consumers in vitest can call
// window.__getUserTextures() to inspect IDB state without re-importing.
if (typeof window !== "undefined" && import.meta.env.MODE === "test") {
  (window as unknown as { __getUserTextures: () => Promise<UserTexture[]> }).__getUserTextures =
    () => listUserTextures();
}
