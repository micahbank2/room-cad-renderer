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

export function getWallpaperTexture(url: string): Promise<THREE.Texture | null> {
  const existing = cache.get(url);
  if (existing) return existing;
  const p = loader
    .loadAsync(url)
    .then((tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      return tex;
    })
    .catch(() => null);
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
