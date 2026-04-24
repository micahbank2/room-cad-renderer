/**
 * Phase 34 Plan 03 Task 1 — React hook for user-texture THREE.Texture.
 *
 * Returns `null` while loading and on orphan (texture missing from IDB).
 * Unmount NEVER disposes the texture — the module-level cache owns
 * lifetime (see `userTextureCache.ts` for the VIZ-10 rationale).
 *
 * Usage (inside R3F mesh):
 *   const tex = useUserTexture(wall.wallpaper?.A?.userTextureId);
 *   if (tex) { tex.repeat.set(...); }
 *   return <meshStandardMaterial>{tex && <primitive attach="map" object={tex} dispose={null} />}</meshStandardMaterial>;
 */
import { useEffect, useState } from "react";
import * as THREE from "three";
import { getUserTextureCached } from "@/three/userTextureCache";

export function useUserTexture(
  id: string | undefined,
): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!id) {
      setTex(null);
      return;
    }
    let cancelled = false;
    // Clear on id change so consumers don't see the previous texture while
    // the new one is resolving.
    setTex(null);
    getUserTextureCached(id).then((t) => {
      if (!cancelled) setTex(t);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return tex;
}
