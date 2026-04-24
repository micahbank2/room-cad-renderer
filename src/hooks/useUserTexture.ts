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

export function useUserTexture(
  id: string | undefined,
): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!id) {
      setTex(null);
      return;
    }
    tapEvent({ event: "useUserTexture:hook-mount", id });
    let cancelled = false;
    // Clear on id change so consumers don't see the previous texture while
    // the new one is resolving.
    setTex(null);
    getUserTextureCached(id).then((t) => {
      if (!cancelled) {
        setTex(t);
        tapEvent({
          event: "useUserTexture:hook-resolve",
          id,
          uuid: t?.uuid,
          context: { resolvedTo: t ? "texture" : "null" },
        });
      }
    });
    return () => {
      cancelled = true;
      tapEvent({ event: "useUserTexture:hook-unmount", id });
    };
  }, [id]);

  return tex;
}
