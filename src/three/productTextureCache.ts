import * as THREE from "three";
import { useEffect, useState } from "react";

const cache = new Map<string, Promise<THREE.Texture | null>>();
const loader = new THREE.TextureLoader();

export function getTexture(url: string): Promise<THREE.Texture | null> {
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

/** For tests only — clears the module cache. */
export function __clearTextureCache() {
  cache.clear();
}

/** React hook: resolves async texture, returns null while loading or on error. */
export function useProductTexture(url: string | null | undefined): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!url) {
      setTex(null);
      return;
    }
    let cancelled = false;
    getTexture(url).then((t) => {
      if (!cancelled) setTex(t);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);
  return tex;
}
