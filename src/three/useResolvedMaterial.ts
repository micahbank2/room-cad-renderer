/**
 * Phase 68 Plan 04 Task 1 — R3F wrapper around `resolveSurfaceMaterial` +
 * `useUserTexture`.
 *
 * Returns ready-to-use THREE.Texture refs with `repeat` / `wrap` already applied
 * for the surface dimensions. Returns `null` when materialId is unset OR the
 * Material is missing — caller falls back to the legacy priority chain.
 *
 * Pattern #7 (CLAUDE.md StrictMode-safety): no module-level registry writes,
 * no side effects in render — texture mutations happen inside `useEffect` with
 * proper deps. The texture instances themselves are owned by the module-level
 * userTextureCache (see `userTextureCache.ts`); R3F unmount NEVER disposes
 * externally-passed texture props (Phase 49 BUG-02 contract).
 */
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import {
  resolveSurfaceMaterial,
  type ResolvedSurfaceMaterial,
} from "@/lib/surfaceMaterial";
import { useMaterials } from "@/hooks/useMaterials";
import { useUserTexture } from "@/hooks/useUserTexture";

export interface ResolvedSurfaceMaterialWithTextures
  extends Omit<
    ResolvedSurfaceMaterial,
    "colorMapId" | "roughnessMapId" | "reflectionMapId"
  > {
  /** Resolved THREE.Texture for the color map (null while loading or orphan). */
  colorMap?: THREE.Texture | null;
  /** Resolved THREE.Texture for the roughness map (null while loading or orphan). */
  roughnessMap?: THREE.Texture | null;
  /** Resolved THREE.Texture for the reflection map (null while loading or orphan). */
  reflectionMap?: THREE.Texture | null;
}

/**
 * Resolves a Material reference into a ready-to-bind material descriptor with
 * THREE.Texture instances. Always called UNCONDITIONALLY at the top of a
 * component body (Rules of Hooks).
 *
 * @param materialId        Material id (`mat_…`) or undefined
 * @param surfaceScaleFt    Per-surface tile-size override (Phase 66) or undefined
 * @param surfaceWidthFt    Real-world width of the surface in feet (drives repeat.x)
 * @param surfaceHeightFt   Real-world height of the surface in feet (drives repeat.y)
 *
 * @returns Resolved descriptor or null. Null = caller should use legacy priority chain.
 */
export function useResolvedMaterial(
  materialId: string | undefined,
  surfaceScaleFt: number | undefined,
  surfaceWidthFt: number,
  surfaceHeightFt: number,
): ResolvedSurfaceMaterialWithTextures | null {
  const { materials } = useMaterials();

  const resolved = useMemo(
    () => resolveSurfaceMaterial(materialId, surfaceScaleFt, materials),
    [materialId, surfaceScaleFt, materials],
  );

  // Hooks must be called unconditionally — pass undefined when not needed so the
  // hook still runs and React's hook-order invariant holds.
  const colorMap = useUserTexture(resolved?.colorMapId);
  const roughnessMap = useUserTexture(resolved?.roughnessMapId);
  const reflectionMap = useUserTexture(resolved?.reflectionMapId);

  // Apply tile-size repeat once textures resolve. Effect re-runs whenever the
  // texture instance changes (e.g. orphan → resolved) or the surface dims do.
  // The shared cache returns singleton THREE.Texture instances; mutating their
  // repeat/wrap is the same pattern wallpaper/floor/art branches already use
  // (see WallMesh.tsx hoisted hooks comment).
  const tileSizeFt = resolved?.tileSizeFt ?? 1;
  useEffect(() => {
    if (!resolved) return;
    const repeatX = surfaceWidthFt / Math.max(0.1, tileSizeFt);
    const repeatY = surfaceHeightFt / Math.max(0.1, tileSizeFt);
    if (colorMap) {
      colorMap.wrapS = THREE.RepeatWrapping;
      colorMap.wrapT = THREE.RepeatWrapping;
      colorMap.repeat.set(repeatX, repeatY);
      colorMap.needsUpdate = true;
    }
    if (roughnessMap) {
      roughnessMap.wrapS = THREE.RepeatWrapping;
      roughnessMap.wrapT = THREE.RepeatWrapping;
      roughnessMap.repeat.set(repeatX, repeatY);
      roughnessMap.needsUpdate = true;
    }
    if (reflectionMap) {
      reflectionMap.wrapS = THREE.RepeatWrapping;
      reflectionMap.wrapT = THREE.RepeatWrapping;
      reflectionMap.repeat.set(repeatX, repeatY);
      reflectionMap.needsUpdate = true;
    }
  }, [
    resolved,
    colorMap,
    roughnessMap,
    reflectionMap,
    surfaceWidthFt,
    surfaceHeightFt,
    tileSizeFt,
  ]);

  if (!resolved) return null;

  // Strip the *Id keys; pass through everything else from ResolvedSurfaceMaterial
  // and add the THREE.Texture refs in their place.
  return {
    colorHex: resolved.colorHex,
    tileSizeFt: resolved.tileSizeFt,
    roughness: resolved.roughness,
    metalness: resolved.metalness,
    material: resolved.material,
    colorMap,
    roughnessMap,
    reflectionMap,
  };
}
