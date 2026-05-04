/**
 * Phase 56 GLTF-RENDER-3D-01: IDB → ObjectURL hook with module-level ref-counted cache.
 *
 * Design:
 * - Fetches GLTF blob from IDB via getGltf(gltfId) on mount
 * - Creates an ObjectURL via URL.createObjectURL(blob)
 * - Caches by gltfId — multiple products sharing the same gltfId share one ObjectURL
 * - Revokes on last unmount (ref-count → 0):
 *     1. useGLTF.clear(url)       — evict drei's suspend-react cache
 *     2. URL.revokeObjectURL(url) — release browser memory
 * CRITICAL ORDER per 56-RESEARCH.md §1: clear BEFORE revoke.
 *
 * Test export: __gltfBlobUrlCache exposed only in MODE === "test".
 */
import { useEffect, useState } from "react";
import { useGLTF } from "@react-three/drei";
import { getGltf } from "@/lib/gltfStore";

// ---------------------------------------------------------------------------
// Module-level ref-counted cache (shared across all hook instances)
// ---------------------------------------------------------------------------

interface CacheEntry {
  /** Resolved ObjectURL string. Empty string while promise is in-flight. */
  url: string;
  refCount: number;
  promise: Promise<string>;
}

const cache = new Map<string, CacheEntry>();

/** Increment ref-count for gltfId. Creates IDB fetch + ObjectURL if first consumer. */
function acquireUrl(gltfId: string): Promise<string> {
  const existing = cache.get(gltfId);
  if (existing) {
    existing.refCount++;
    return existing.promise;
  }

  const promise = getGltf(gltfId).then((model) => {
    if (!model) throw new Error(`GLTF not found in IDB: ${gltfId}`);
    const url = URL.createObjectURL(model.blob);
    // Update entry's url field so releaseUrl can reference it on cleanup
    const entry = cache.get(gltfId);
    if (entry) entry.url = url;
    return url;
  });

  cache.set(gltfId, { url: "", refCount: 1, promise });
  return promise;
}

/**
 * Decrement ref-count. On last release:
 *   1. useGLTF.clear(url) — evict drei cache so stale entry doesn't persist
 *   2. URL.revokeObjectURL(url) — release browser memory
 */
function releaseUrl(gltfId: string): void {
  const entry = cache.get(gltfId);
  if (!entry) return;

  entry.refCount--;
  if (entry.refCount <= 0) {
    cache.delete(gltfId);
    if (entry.url) {
      // CRITICAL ORDER: clear drei cache BEFORE revoking ObjectURL (56-RESEARCH.md §1)
      useGLTF.clear(entry.url);
      URL.revokeObjectURL(entry.url);
    }
  }
}

// ---------------------------------------------------------------------------
// Public hook
// ---------------------------------------------------------------------------

export interface GltfBlobUrlState {
  url: string | null;
  error: Error | null;
  loading: boolean;
}

/**
 * Given a gltfId (from Product.gltfId), resolves it to an ObjectURL pointing
 * at the GLTF blob stored in IndexedDB. Returns { url, error, loading }.
 *
 * - While IDB is fetching: { url: null, loading: true, error: null }
 * - On success:            { url: "blob:...", loading: false, error: null }
 * - On failure:            { url: null, loading: false, error: Error }
 *
 * If gltfId is undefined, returns { url: null, loading: false, error: null } immediately.
 * Multiple callers with the same gltfId share one ObjectURL (ref-counted).
 */
export function useGltfBlobUrl(gltfId: string | undefined): GltfBlobUrlState {
  const [state, setState] = useState<GltfBlobUrlState>({
    url: null,
    error: null,
    loading: !!gltfId,
  });

  useEffect(() => {
    if (!gltfId) {
      setState({ url: null, error: null, loading: false });
      return;
    }

    let cancelled = false;
    setState({ url: null, error: null, loading: true });

    acquireUrl(gltfId)
      .then((url) => {
        if (!cancelled) setState({ url, error: null, loading: false });
      })
      .catch((err: unknown) => {
        const error = err instanceof Error ? err : new Error(String(err));
        if (!cancelled) setState({ url: null, error, loading: false });
        // Release the ref we acquired (promise failed — blob never created)
        releaseUrl(gltfId);
      });

    return () => {
      cancelled = true;
      releaseUrl(gltfId);
    };
  }, [gltfId]);

  return state;
}

// ---------------------------------------------------------------------------
// Test export — mirrors productTextureCache.ts:22 pattern
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
export const __gltfBlobUrlCache: Map<string, CacheEntry> | undefined =
  import.meta.env.MODE === "test" ? cache : undefined;
