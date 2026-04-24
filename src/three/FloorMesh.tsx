// VIZ-10 audit — every `<primitive attach="map" object={tex} dispose={null} />`
// in this file is KEPT per .planning/phases/36-viz-10-regression/ROOT-CAUSE.md §4.2.
// Same rationale as WallMesh.tsx header: `dispose={null}` prevents R3F from
// disposing the cached Texture on mesh unmount, preserving identity across
// ThreeViewport remounts. Harness evidence: same `tex.uuid` across 5 cycles.
// Sites in this file: lines 102 (user-texture floor), 127 (pattern/imageUrl floor).

import { useMemo } from "react";
import * as THREE from "three";
import type { FloorMaterial } from "@/types/cad";
import { FLOOR_PRESETS, type FloorPresetId } from "@/data/floorMaterials";
import { SURFACE_MATERIALS } from "@/data/surfaceMaterials";
import { PbrSurface } from "./PbrSurface";
import { useUserTexture } from "@/hooks/useUserTexture";

interface Props {
  width: number;
  length: number;
  halfW: number;
  halfL: number;
  material: FloorMaterial | undefined;
  fallbackTexture: THREE.Texture;
}

/** Module-level texture cache for uploaded custom floor images (data URLs). */
const customTextureCache = new Map<string, THREE.Texture>();

function getCustomTexture(dataUrl: string, scaleFt: number, rotationDeg: number, width: number, length: number): THREE.Texture {
  let tex = customTextureCache.get(dataUrl);
  if (!tex) {
    const loader = new THREE.TextureLoader();
    tex = loader.load(dataUrl);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    customTextureCache.set(dataUrl, tex);
  }
  // Apply repeat + rotation each render
  const repeatX = width / Math.max(0.1, scaleFt);
  const repeatY = length / Math.max(0.1, scaleFt);
  tex.repeat.set(repeatX, repeatY);
  tex.center.set(0.5, 0.5);
  tex.rotation = (rotationDeg * Math.PI) / 180;
  tex.needsUpdate = true;
  return tex;
}

export default function FloorMesh({ width, length, halfW, halfL, material, fallbackTexture }: Props) {
  // PBR branch: if material.presetId resolves to a SURFACE_MATERIALS entry with pbr, route through PbrSurface
  const pbrMaterial = useMemo(() => {
    if (material?.kind !== "preset" || !material.presetId) return null;
    const surf = SURFACE_MATERIALS[material.presetId];
    return surf?.pbr ? { mat: surf, pbr: surf.pbr } : null;
  }, [material]);

  // Phase 34 — user-texture floor branch. When `kind === "user-texture"` AND
  // the hook returns a THREE.Texture (not null), this branch renders. Null
  // (orphan: the id was deleted from IDB) falls through to the flat-color
  // fallback below (D-08/D-09).
  const userTexId =
    material?.kind === "user-texture" ? material.userTextureId : undefined;
  const userTex = useUserTexture(userTexId);

  // Determine rendering path
  const { texture, color, roughness } = useMemo(() => {
    if (!material) {
      // No material chosen → default procedural wood
      return { texture: fallbackTexture, color: "#ffffff", roughness: 0.75 };
    }
    if (material.kind === "custom" && material.imageUrl) {
      const tex = getCustomTexture(material.imageUrl, material.scaleFt, material.rotationDeg, width, length);
      return { texture: tex, color: "#ffffff", roughness: 0.75 };
    }
    if (material.kind === "preset" && material.presetId) {
      const preset = FLOOR_PRESETS[material.presetId as FloorPresetId];
      if (preset) {
        return { texture: null as THREE.Texture | null, color: preset.color, roughness: preset.roughness };
      }
    }
    return { texture: fallbackTexture, color: "#ffffff", roughness: 0.75 };
  }, [material, fallbackTexture, width, length]);

  // Apply repeat/rotation to the user texture each render. The cache returns
  // the singleton THREE.Texture, so mutation is safe (per-render is the
  // same pattern wallpaper/art use).
  if (material?.kind === "user-texture" && userTex) {
    const s = Math.max(0.1, material.scaleFt);
    userTex.repeat.set(width / s, length / s);
    userTex.center.set(0.5, 0.5);
    userTex.rotation = (material.rotationDeg * Math.PI) / 180;
    userTex.needsUpdate = true;
  }

  // Phase 34 — user-texture branch wins over PBR/preset when present AND loaded.
  // When userTex === null (orphan or still loading) → PBR/preset branch handles it.
  const useUserTextureBranch =
    material?.kind === "user-texture" && userTex !== null;

  return (
    <mesh
      position={[halfW, 0, halfL]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[width, length]} />
      {useUserTextureBranch ? (
        // Phase 34 user-texture: non-disposing cache (userTextureCache.ts).
        // `userTex` is guaranteed non-null by `useUserTextureBranch`.
        <meshStandardMaterial color="#ffffff" roughness={0.75} metalness={0}>
          <primitive attach="map" object={userTex!} dispose={null} />
        </meshStandardMaterial>
      ) : pbrMaterial ? (
        <PbrSurface
          pbr={pbrMaterial.pbr}
          widthFt={width}
          lengthFt={length}
          fallback={
            <meshStandardMaterial
              color={pbrMaterial.mat.color}
              roughness={pbrMaterial.mat.roughness}
              metalness={0}
            />
          }
        />
      ) : (
        // Cached texture (custom-upload data URL via getCustomTexture module cache,
        // or the shared procedural fallbackTexture created once in ThreeViewport).
        // dispose={null} opts out of R3F auto-dispose so the cached instance
        // survives 2D↔3D toggles — matches WallMesh fix (Plan 32-07).
        <meshStandardMaterial
          color={color}
          roughness={roughness}
          metalness={0}
        >
          {texture && <primitive attach="map" object={texture} dispose={null} />}
        </meshStandardMaterial>
      )}
    </mesh>
  );
}
