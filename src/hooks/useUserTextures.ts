/**
 * Phase 34 — User-Uploaded Textures.
 *
 * React hook for the user-texture catalog. Consumed by the upload modal
 * (Plan 01), the MY TEXTURES picker tab (Plan 02), and the delete-confirm
 * flow (Plan 03). Mirrors the shape of useProductStore for consistency.
 *
 * Cross-instance sync: every hook instance subscribes to window
 * `user-texture-saved`/`user-texture-updated`/`user-texture-deleted` events
 * and reloads on receipt. Any mutator (save/update/remove) dispatches the
 * matching event so peers in other pickers stay in sync.
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

export const USER_TEXTURE_SAVED_EVENT = "user-texture-saved";
export const USER_TEXTURE_UPDATED_EVENT = "user-texture-updated";

function notify(event: string, id: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(event, { detail: { id } }));
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

    // Cross-instance sync: reload whenever any sibling hook mutates IDB.
    const onMutation = () => {
      if (!cancelled) reload();
    };
    const events = [
      USER_TEXTURE_SAVED_EVENT,
      USER_TEXTURE_UPDATED_EVENT,
      "user-texture-deleted",
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
    async (input: SaveTextureInput, sha256: string) => {
      const { id } = await saveUserTextureWithDedup(input, sha256);
      await reload();
      notify(USER_TEXTURE_SAVED_EVENT, id);
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
      notify(USER_TEXTURE_UPDATED_EVENT, id);
    },
    [reload],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteUserTexture(id);
      await reload();
      // DeleteTextureDialog dispatches user-texture-deleted itself (it needs
      // to fire even when called outside the hook's scope for cache
      // invalidation). We don't re-dispatch here to avoid doubles.
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
