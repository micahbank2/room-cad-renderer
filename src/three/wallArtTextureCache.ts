import * as THREE from "three";
import { useEffect, useState } from "react";

/**
 * WallArt texture cache — intentionally non-disposing.
 * See wallpaperTextureCache.ts for rationale.
 */
const cache = new Map<string, Promise<THREE.Texture | null>>();
const loader = new THREE.TextureLoader();

export function getWallArtTexture(url: string): Promise<THREE.Texture | null> {
  const existing = cache.get(url);
  if (existing) return existing;
  const p = loader
    .loadAsync(url)
    .then((tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    })
    .catch(() => null);
  cache.set(url, p);
  return p;
}

/**
 * Batch-acquire textures keyed by id; returns Map<id, Texture|null>.
 * Stable on item churn: only refetches when ids/urls change.
 */
export function useWallArtTextures(
  items: Array<{ id: string; url: string }>
): Map<string, THREE.Texture | null> {
  const sig = items.map((i) => `${i.id}:${i.url}`).join("|");
  const [map, setMap] = useState<Map<string, THREE.Texture | null>>(() => new Map());
  useEffect(() => {
    let cancelled = false;
    const next = new Map<string, THREE.Texture | null>();
    Promise.all(
      items.map((i) =>
        getWallArtTexture(i.url).then((t) => ({ id: i.id, tex: t }))
      )
    ).then((results) => {
      if (cancelled) return;
      for (const r of results) next.set(r.id, r.tex);
      setMap(next);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
  return map;
}

export function __clearWallArtCacheForTests(): void {
  cache.clear();
}
