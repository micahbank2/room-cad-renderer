import { useEffect, useState } from "react";
import * as THREE from "three";
import { acquireTexture, releaseTexture } from "./pbrTextureCache";

/**
 * Suspense-friendly hook: acquires a texture via the shared refcount cache,
 * releases on unmount. Returns null while loading; the caller renders the
 * fallback (e.g., wallpaper renders base color until the texture resolves).
 *
 * Extracted from WallMesh.tsx in Phase 32 Plan 05 so the hook is directly
 * testable without rendering the full mesh tree. See
 * `tests/wallpaperViewToggle.test.tsx` for the unmount+remount-within-grace
 * regression coverage.
 */
export function useSharedTexture(url: string | undefined): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!url) {
      setTex(null);
      return;
    }
    let cancelled = false;
    acquireTexture(url, "albedo")
      .then((t) => {
        if (!cancelled) setTex(t);
        else releaseTexture(url);
      })
      .catch(() => {
        // On error: leave tex null; caller renders base color (existing behavior for wallpaper).
        if (!cancelled) setTex(null);
      });
    return () => {
      cancelled = true;
      releaseTexture(url);
    };
  }, [url]);
  return tex;
}
