// VIZ-10 audit — `<primitive attach="map" object={tex} dispose={null} />` in
// this file is KEPT per .planning/phases/36-viz-10-regression/ROOT-CAUSE.md §4.2.
// Same rationale as WallMesh.tsx header: `dispose={null}` prevents R3F from
// disposing the cached Texture on mesh unmount. Harness evidence: same
// `tex.uuid` across 5 cycles. Site in this file: line 110 (user-texture ceiling).

import { useMemo } from "react";
import * as THREE from "three";
import type { Ceiling } from "@/types/cad";
import { resolvePaintHex } from "@/lib/colorUtils";
import { usePaintStore } from "@/stores/paintStore";
import { SURFACE_MATERIALS } from "@/data/surfaceMaterials";
import { PbrSurface } from "./PbrSurface";
import { useUserTexture } from "@/hooks/useUserTexture";
import { useUserTextures } from "@/hooks/useUserTextures";

interface Props {
  ceiling: Ceiling;
  isSelected: boolean;
}

/** Ceiling rendered as a horizontal polygon mesh at its height, facing down. */
export default function CeilingMesh({ ceiling, isSelected }: Props) {
  const customColors = usePaintStore((s) => s.customColors);

  // Phase 34 — user-texture branch is HIGHEST priority. Hook returns null on
  // orphan (D-08/D-09) → fall through to surfaceMaterialId / paint chain.
  const userTex = useUserTexture(ceiling.userTextureId);
  // Phase 42 BUG-01 — resolver precedence: ceiling.scaleFt (per-surface
  // override) ?? entry.tileSizeFt (catalog default) ?? 2 (last resort).
  // The override is written at apply-time by the picker; existing snapshots
  // without it fall through to the catalog default — functionally equivalent
  // to pre-fix behavior. Closes GH #96.
  const { textures: userTextureCatalog } = useUserTextures();
  const userTextureTileSizeFt = useMemo(() => {
    if (ceiling.scaleFt !== undefined) return ceiling.scaleFt;
    if (!ceiling.userTextureId) return 2;
    const entry = userTextureCatalog.find((t) => t.id === ceiling.userTextureId);
    return entry?.tileSizeFt ?? 2;
  }, [ceiling.scaleFt, ceiling.userTextureId, userTextureCatalog]);

  const pbrMaterial = useMemo(() => {
    if (!ceiling.surfaceMaterialId) return null;
    const mat = SURFACE_MATERIALS[ceiling.surfaceMaterialId];
    return mat?.pbr ? { mat, pbr: mat.pbr } : null;
  }, [ceiling.surfaceMaterialId]);

  const bbox = useMemo(() => {
    if (ceiling.points.length === 0) return { w: 1, l: 1 };
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of ceiling.points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    return { w: Math.max(0.1, maxX - minX), l: Math.max(0.1, maxY - minY) };
  }, [ceiling.points]);

  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    if (ceiling.points.length === 0) return new THREE.ShapeGeometry(shape);
    shape.moveTo(ceiling.points[0].x, ceiling.points[0].y);
    for (let i = 1; i < ceiling.points.length; i++) {
      shape.lineTo(ceiling.points[i].x, ceiling.points[i].y);
    }
    shape.closePath();
    const geom = new THREE.ShapeGeometry(shape);
    // ShapeGeometry sits in XY; rotate to XZ (ground plane), then flip normal to face down
    geom.rotateX(Math.PI / 2);
    return geom;
  }, [ceiling.points]);

  const { color, roughness } = useMemo(() => {
    // Tier 1: surface material preset
    if (ceiling.surfaceMaterialId) {
      const mat = SURFACE_MATERIALS[ceiling.surfaceMaterialId];
      if (mat) return { color: mat.color, roughness: mat.roughness };
    }
    // Tier 2: paint (F&B or custom)
    if (ceiling.paintId) {
      return {
        color: resolvePaintHex(ceiling.paintId, customColors),
        roughness: ceiling.limeWash ? 0.95 : 0.8,
      };
    }
    // Tier 3: legacy material fallback
    return {
      color: ceiling.material.startsWith("#") ? ceiling.material : "#f5f5f5",
      roughness: 0.8,
    };
  }, [ceiling.surfaceMaterialId, ceiling.paintId, ceiling.limeWash, ceiling.material, customColors]);

  // Apply repeat to user texture when active. Ceiling XY bbox drives repeats.
  if (userTex && ceiling.userTextureId) {
    const s = Math.max(0.1, userTextureTileSizeFt);
    userTex.repeat.set(bbox.w / s, bbox.l / s);
    userTex.needsUpdate = true;
  }

  // Phase 34 — user-texture branch wins over PBR and flat paths when loaded.
  const useUserTextureBranch = ceiling.userTextureId && userTex !== null;

  return (
    <mesh
      geometry={geometry}
      position={[0, ceiling.height, 0]}
      receiveShadow
    >
      {useUserTextureBranch ? (
        <meshStandardMaterial
          color="#ffffff"
          side={THREE.DoubleSide}
          roughness={0.8}
          metalness={0}
          emissive={isSelected ? "#7c5bf0" : "#000000"}
          emissiveIntensity={isSelected ? 0.2 : 0}
        >
          <primitive attach="map" object={userTex!} dispose={null} />
        </meshStandardMaterial>
      ) : pbrMaterial ? (
        <PbrSurface
          pbr={pbrMaterial.pbr}
          widthFt={bbox.w}
          lengthFt={bbox.l}
          fallback={
            <meshStandardMaterial
              color={pbrMaterial.mat.color}
              side={THREE.DoubleSide}
              roughness={pbrMaterial.mat.roughness}
              metalness={0}
              emissive={isSelected ? "#7c5bf0" : "#000000"}
              emissiveIntensity={isSelected ? 0.2 : 0}
            />
          }
        />
      ) : (
        <meshStandardMaterial
          color={color}
          side={THREE.DoubleSide}
          roughness={roughness}
          metalness={0}
          emissive={isSelected ? "#7c5bf0" : "#000000"}
          emissiveIntensity={isSelected ? 0.2 : 0}
        />
      )}
    </mesh>
  );
}
