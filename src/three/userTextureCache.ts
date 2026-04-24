/**
 * Phase 34 Plan 03 Task 1 — User-texture THREE.Texture cache.
 *
 * MIRRORS the Phase 32 `wallpaperTextureCache` pattern (non-disposing).
 * DOES NOT reuse `pbrTextureCache` (refcount-dispose) — that pattern caused
 * the VIZ-10 class of bugs where textures went blank after a 2D↔3D toggle.
 *
 * Contract:
 *   - Module-level Map<id, Promise<THREE.Texture | null>> — survives
 *     `ThreeViewport` unmount/remount so textures re-upload to the new
 *     WebGL context without re-decoding.
 *   - `getUserTextureCached(id)` dedups: same id → same Promise instance.
 *   - Cache miss path reads the Blob from IDB (`getUserTexture(id)`),
 *     creates an ObjectURL, loads via `THREE.TextureLoader().loadAsync`,
 *     sets `SRGBColorSpace` + `RepeatWrapping` on both axes. Loader
 *     failure → resolves to null (no throw). Orphan (Blob missing) →
 *     resolves to null (no throw). Both paths rely on caller fallback
 *     to base color (D-08/D-09).
 *   - `clearUserTextureCache(id)` is the invalidation knob: it drops the
 *     cache entry AND revokes the ObjectURL to free the decoded JPEG.
 *   - Subscribes to `window 'user-texture-deleted'` (dispatched by Plan 02
 *     DeleteTextureDialog on successful delete). Event → cache invalidate
 *     → next mesh render falls back to base color.
 *   - Consumers MUST attach the returned texture with `dispose={null}` on
 *     the `<primitive>` to opt out of R3F auto-dispose. The cache owns
 *     lifetime; no consumer is allowed to dispose.
 */
import * as THREE from "three";
import { getUserTexture } from "@/lib/userTextureStore";

// Non-disposing per .planning/phases/36-viz-10-regression/ROOT-CAUSE.md §4.1 —
// load-bearing: Phase 36-01 harness evidence shows `userTex:load-start` fires
// exactly once across 5 ThreeViewport mount cycles while same `tex.uuid` is
// returned on every resolve. Removing the non-disposing contract would force
// a per-mount decode and re-open the VIZ-10 failure surface. Do NOT change
// to refcount disposal without first landing a reproducer in the harness.
const cache = new Map<string, Promise<THREE.Texture | null>>();
const objectUrls = new Map<string, string>();

// Phase 36 Plan 01 — VIZ-10 lifecycle instrumentation.
// Test-mode only; writes to window.__textureLifecycleEvents[] for Playwright
// harness to read at end-of-test for ROOT-CAUSE.md evidence. Buffer NEVER
// cleared between cycles — the full sequence across 5 mounts is the audit
// value (36-RESEARCH Anti-Patterns).
type LifecycleEvent = {
  t: number;
  event: string;
  id?: string;
  uuid?: string;
  context?: Record<string, unknown>;
};
function tapEvent(e: Omit<LifecycleEvent, "t">): void {
  if (typeof window === "undefined" || import.meta.env.MODE !== "test") return;
  const w = window as unknown as { __textureLifecycleEvents?: LifecycleEvent[] };
  if (!w.__textureLifecycleEvents) w.__textureLifecycleEvents = [];
  w.__textureLifecycleEvents.push({ t: performance.now(), ...e });
}

export function getUserTextureCached(
  id: string,
): Promise<THREE.Texture | null> {
  const existing = cache.get(id);
  if (existing) return existing;

  tapEvent({ event: "userTex:load-start", id });
  const p = (async (): Promise<THREE.Texture | null> => {
    const rec = await getUserTexture(id);
    if (!rec) {
      tapEvent({ event: "userTex:load-fail", id, context: { reason: "idb-miss" } });
      return null;
    }
    const url = URL.createObjectURL(rec.blob);
    objectUrls.set(id, url);
    const loader = new THREE.TextureLoader();
    try {
      const tex = await loader.loadAsync(url);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.needsUpdate = true;
      tapEvent({
        event: "userTex:load-resolve",
        id,
        uuid: tex.uuid,
        context: {
          imageWidth: (tex.image as HTMLImageElement | undefined)?.width ?? null,
          imageHeight: (tex.image as HTMLImageElement | undefined)?.height ?? null,
          sourceUuid: tex.source?.uuid ?? null,
        },
      });
      return tex;
    } catch (err) {
      tapEvent({
        event: "userTex:load-fail",
        id,
        context: { reason: "loader-error", message: String(err) },
      });
      return null;
    }
  })();

  cache.set(id, p);
  return p;
}

export function clearUserTextureCache(id: string): void {
  tapEvent({ event: "userTex:cache-clear", id });
  cache.delete(id);
  const url = objectUrls.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    objectUrls.delete(id);
  }
}

/** Test-only escape hatch — wipes the module state without dispatching any
 *  events. NOT exported for production callers. */
export function _clearAllForTests(): void {
  for (const url of objectUrls.values()) URL.revokeObjectURL(url);
  objectUrls.clear();
  cache.clear();
}

// Subscribe to the delete event dispatched by Plan 02's DeleteTextureDialog.
// The listener is installed once at module load; since this module is a
// singleton per app, there's no accumulation concern.
if (typeof window !== "undefined") {
  window.addEventListener("user-texture-deleted", (ev) => {
    const detail = (ev as CustomEvent<{ id: string }>).detail;
    if (detail?.id) clearUserTextureCache(detail.id);
  });
}

// ───────────────────────────────────────────────────────────────────────
// Test driver (gated). Exposes cache size + orphan simulator for
// integration tests. Phase 29/30/31 convention: window-scoped, test mode only.
// ───────────────────────────────────────────────────────────────────────
if (typeof window !== "undefined" && import.meta.env.MODE === "test") {
  (window as unknown as { __getUserTextureCacheSize: () => number }).__getUserTextureCacheSize =
    () => cache.size;
  (
    window as unknown as { __simulateUserTextureOrphan: (id: string) => void }
  ).__simulateUserTextureOrphan = (id: string) => {
    // Cache-only invalidation; does NOT touch IDB or dispatch events.
    cache.delete(id);
  };
}
