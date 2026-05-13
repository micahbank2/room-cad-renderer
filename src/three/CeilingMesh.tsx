// VIZ-10 audit — `<primitive attach="map" object={tex} dispose={null} />` in
// this file is KEPT per .planning/phases/36-viz-10-regression/ROOT-CAUSE.md §4.2.
// Same rationale as WallMesh.tsx header: `dispose={null}` prevents R3F from
// disposing the cached Texture on mesh unmount. Harness evidence: same
// `tex.uuid` across 5 cycles. Site in this file: line 110 (user-texture ceiling).

import { useMemo } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { useUIStore } from "@/stores/uiStore";
import type { Ceiling } from "@/types/cad";
import { resolvePaintHex } from "@/lib/colorUtils";
import { polygonBbox, resolveCeilingPoints } from "@/lib/geometry";
import { usePaintStore } from "@/stores/paintStore";
import { SURFACE_MATERIALS } from "@/data/surfaceMaterials";
import { PbrSurface } from "./PbrSurface";
import { useUserTexture } from "@/hooks/useUserTexture";
import { useUserTextures } from "@/hooks/useUserTextures";
import { useClickDetect } from "@/hooks/useClickDetect";
import { useResolvedMaterial } from "./useResolvedMaterial";

interface Props {
  ceiling: Ceiling;
  isSelected: boolean;
}

/** Ceiling rendered as a horizontal polygon mesh at its height, facing down. */
export default function CeilingMesh({ ceiling, isSelected }: Props) {
  // Phase 54 PROPS3D-01: left-click to select (drag-threshold-aware)
  const { handlePointerDown, handlePointerUp } = useClickDetect(() => {
    useUIStore.getState().select([ceiling.id]);
  });

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

  // Phase 65 CEIL-02 — resolved points apply width/depth/anchor overrides
  // when set. Returns referential-identity ceiling.points when no overrides
  // (fast path) so this useMemo cheaply detects "no resize" via reference
  // equality on the next render.
  //
  // PERF v1.17 NOTE: re-extrudes ShapeGeometry mid-drag (~60 fps). Acceptable
  // for v1.16 — flat ShapeGeometry, small polygons (≤10 verts in practice).
  // If profiling shows GPU thrashing on 6+ vertex L-shapes mid-drag, apply
  // Phase 25 PERF-01 16ms-throttle (debounce useMemo input via a ref + RAF)
  // as a v1.17 mitigation.
  const renderedPoints = useMemo(
    () => resolveCeilingPoints(ceiling),
    [
      ceiling.points,
      ceiling.widthFtOverride,
      ceiling.depthFtOverride,
      ceiling.anchorXFt,
      ceiling.anchorYFt,
    ],
  );

  const bbox = useMemo(() => {
    if (renderedPoints.length === 0) return { w: 1, l: 1 };
    const b = polygonBbox(renderedPoints);
    return { w: Math.max(0.1, b.width), l: Math.max(0.1, b.depth) };
  }, [renderedPoints]);

  // Phase 68 Plan 04 — priority-1 ceiling.materialId resolution. Beats every
  // legacy ceiling branch (userTextureId, surfaceMaterialId, paintId, raw
  // material string) when set AND the Material exists in the catalog.
  // Hooks called unconditionally (Rules of Hooks); ceiling.scaleFt overrides
  // material.tileSizeFt per D-04.
  const resolved = useResolvedMaterial(ceiling.materialId, ceiling.scaleFt, bbox.w, bbox.l);

  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    if (renderedPoints.length === 0) return new THREE.ShapeGeometry(shape);
    shape.moveTo(renderedPoints[0].x, renderedPoints[0].y);
    for (let i = 1; i < renderedPoints.length; i++) {
      shape.lineTo(renderedPoints[i].x, renderedPoints[i].y);
    }
    shape.closePath();
    const geom = new THREE.ShapeGeometry(shape);
    // ShapeGeometry sits in XY; rotate to XZ (ground plane), then flip normal to face down
    geom.rotateX(Math.PI / 2);
    return geom;
  }, [renderedPoints]);

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

  // Phase 78 PBR-03: add uv2 attribute to ShapeGeometry for aoMap sampler.
  // useEffect approach because geometry is created via useMemo (not JSX ref).
  // No cleanup needed — uv2 BufferAttribute is owned by the geometry instance.
  const geoRef = useMemo(() => {
    if (geometry && !geometry.attributes.uv2) {
      const uv = geometry.attributes.uv as THREE.BufferAttribute | undefined;
      if (uv) geometry.setAttribute('uv2', new THREE.BufferAttribute(uv.array.slice(), 2));
    }
    return geometry;
  }, [geometry]);

  return (
    <mesh
      geometry={geoRef}
      position={[0, ceiling.height, 0]}
      receiveShadow
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onContextMenu={(e: ThreeEvent<MouseEvent>) => {
        if (e.nativeEvent.button !== 2) return;
        e.stopPropagation();
        e.nativeEvent.preventDefault();
        useUIStore.getState().openContextMenu("ceiling", ceiling.id, {
          x: e.nativeEvent.clientX,
          y: e.nativeEvent.clientY,
        });
      }}
    >
      {resolved && (resolved.colorHex || resolved.colorMap) ? (
        // Phase 68 Plan 04 — priority-1 materialId branch. Wins over every
        // legacy ceiling render path. Orphan colorMap (texture missing from
        // IDB) falls through to legacy chain so the ceiling still renders.
        resolved.colorHex ? (
          <meshStandardMaterial
            color={resolved.colorHex}
            side={THREE.DoubleSide}
            roughness={resolved.roughness}
            metalness={resolved.metalness}
            emissive={isSelected ? "#7c5bf0" : "#000000"}
            emissiveIntensity={isSelected ? 0.2 : 0}
          />
        ) : (
          // Phase 78 PBR-03: aoMap + displacementMap props. displacementScale=0.05
          // prevents geometry explosion in foot-coordinate world (RESEARCH Pitfall 2).
          <meshStandardMaterial
            color="#ffffff"
            side={THREE.DoubleSide}
            roughness={resolved.roughness}
            metalness={resolved.metalness}
            map={resolved.colorMap ?? undefined}
            roughnessMap={resolved.roughnessMap ?? undefined}
            metalnessMap={resolved.reflectionMap ?? undefined}
            aoMap={resolved.aoMap ?? undefined}
            aoMapIntensity={1}
            displacementMap={resolved.displacementMap ?? undefined}
            displacementScale={0.05}
            emissive={isSelected ? "#7c5bf0" : "#000000"}
            emissiveIntensity={isSelected ? 0.2 : 0}
          />
        )
      ) : useUserTextureBranch ? (
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
