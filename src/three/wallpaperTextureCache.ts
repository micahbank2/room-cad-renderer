import * as THREE from "three";
import { useEffect, useState } from "react";

/**
 * Wallpaper texture cache — intentionally non-disposing.
 *
 * Wallpaper images are usually user-uploaded data URLs. They are typically
 * small in count (a handful per project) but can be large per entry.
 * `ThreeViewport` unmounts on every 2D↔3D view toggle, which destroys the
 * WebGL context. If we disposed textures on unmount (like the refcount
 * `pbrTextureCache` does), the cached `THREE.Texture` would be invalidated
 * and the next 3D mount would render the wallpaper blank — which is the
 * regression Phase 32 Plan 06 reverts.
 *
 * Pre-Phase-32 behavior: module-level Map, never disposed. THREE's internal
 * renderer properties map is fresh per WebGLRenderer, so on remount the new
 * renderer re-uploads the same Texture instance automatically.
 */
const cache = new Map<string, Promise<THREE.Texture | null>>();
const loader = new THREE.TextureLoader();

// Phase 36 Plan 01 — VIZ-10 lifecycle tap (test-mode gated).
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

// Helper: truncate a data-URL/blob-URL for log readability (the URL itself is
// the cache key and may be a huge data:image/... string).
function idFromUrl(url: string): string {
  if (url.startsWith("data:")) return `data:${url.length}`;
  if (url.startsWith("blob:")) return url;
  return url.length > 80 ? url.slice(0, 80) + "…" : url;
}

export function getWallpaperTexture(url: string): Promise<THREE.Texture | null> {
  const existing = cache.get(url);
  if (existing) return existing;
  const id = idFromUrl(url);
  tapEvent({ event: "wallpaperTex:load-start", id });
  const p = loader
    .loadAsync(url)
    .then((tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tapEvent({
        event: "wallpaperTex:load-resolve",
        id,
        uuid: tex.uuid,
        context: { sourceUuid: tex.source?.uuid ?? null },
      });
      return tex;
    })
    .catch((err) => {
      tapEvent({
        event: "wallpaperTex:load-fail",
        id,
        context: { message: String(err) },
      });
      return null;
    });
  cache.set(url, p);
  return p;
}

export function useWallpaperTexture(url: string | undefined): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!url) {
      setTex(null);
      return;
    }
    let cancelled = false;
    getWallpaperTexture(url).then((t) => {
      if (!cancelled) setTex(t);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);
  return tex;
}

/** For tests only — clears the module cache. */
export function __clearWallpaperCacheForTests(): void {
  cache.clear();
}
