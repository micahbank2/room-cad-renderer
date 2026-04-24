import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { WallSegment, Wallpaper, WainscotConfig, CrownConfig, WallArt } from "@/types/cad";
import { wallLength, angle } from "@/lib/geometry";
import { FRAME_PRESETS } from "@/types/framedArt";
import { useWainscotStyleStore } from "@/stores/wainscotStyleStore";
import { renderWainscotStyle } from "./wainscotStyles";
import type { WainscotStyleItem } from "@/types/wainscotStyle";
import { resolvePaintHex } from "@/lib/colorUtils";
import { usePaintStore } from "@/stores/paintStore";
import { useWallpaperTexture } from "./wallpaperTextureCache";
import { useWallArtTextures } from "./wallArtTextureCache";
import { useUserTexture } from "@/hooks/useUserTexture";

interface Props {
  wall: WallSegment;
  isSelected: boolean;
}

export default function WallMesh({ wall, isSelected }: Props) {
  const wainscotStyles = useWainscotStyleStore((s) => s.items);
  const customColors = usePaintStore((s) => s.customColors);
  const { position, rotation, dimensions } = useMemo(() => {
    const len = wallLength(wall);
    const midX = (wall.start.x + wall.end.x) / 2;
    const midY = (wall.start.y + wall.end.y) / 2;
    const a = angle(wall.start, wall.end);
    return {
      position: new THREE.Vector3(midX, wall.height / 2, midY),
      rotation: new THREE.Euler(0, -a, 0),
      dimensions: { length: len, height: wall.height, thickness: wall.thickness },
    };
  }, [wall]);

  const { length, height, thickness } = dimensions;
  const halfLen = length / 2;
  const halfH = height / 2;

  // Base wall geometry (with openings cut out)
  const geometry = useMemo(() => {
    if (wall.openings.length === 0) {
      return new THREE.BoxGeometry(length, height, thickness);
    }
    const shape = new THREE.Shape();
    shape.moveTo(-halfLen, -halfH);
    shape.lineTo(halfLen, -halfH);
    shape.lineTo(halfLen, halfH);
    shape.lineTo(-halfLen, halfH);
    shape.lineTo(-halfLen, -halfH);
    for (const opening of wall.openings) {
      const oLeft = opening.offset - halfLen;
      const oRight = oLeft + opening.width;
      const oBottom = opening.sillHeight - halfH;
      const oTop = oBottom + opening.height;
      const hole = new THREE.Path();
      hole.moveTo(oLeft, oBottom);
      hole.lineTo(oRight, oBottom);
      hole.lineTo(oRight, oTop);
      hole.lineTo(oLeft, oTop);
      hole.lineTo(oLeft, oBottom);
      shape.holes.push(hole);
    }
    const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
    geo.translate(0, 0, -thickness / 2);
    return geo;
  }, [length, height, thickness, halfLen, halfH, wall.openings]);

  const baseColor = isSelected ? "#93c5fd" : "#f8f5ef"; // neutral drywall
  const bandOffset = 0.01;

  // Hoisted hooks: resolve textures once at component top level (Rules of Hooks).
  const wpAUrl = wall.wallpaper?.A?.kind === "pattern" ? wall.wallpaper.A.imageUrl : undefined;
  const wpBUrl = wall.wallpaper?.B?.kind === "pattern" ? wall.wallpaper.B.imageUrl : undefined;
  const wallpaperATex = useWallpaperTexture(wpAUrl);
  const wallpaperBTex = useWallpaperTexture(wpBUrl);

  // Phase 34 — user-texture lookup per side. `useUserTexture` returns null on
  // orphan (texture deleted but surface still references it) → overlay
  // skipped → base drywall color renders (D-08/D-09).
  const userTexA = useUserTexture(wall.wallpaper?.A?.userTextureId);
  const userTexB = useUserTexture(wall.wallpaper?.B?.userTextureId);

  // Apply repeat for user-texture side A on change.
  useEffect(() => {
    if (userTexA && wall.wallpaper?.A) {
      const s = wall.wallpaper.A.scaleFt ?? 2;
      if (s > 0) {
        userTexA.repeat.set(length / s, height / s);
        userTexA.needsUpdate = true;
      }
    }
  }, [userTexA, wall.wallpaper?.A?.scaleFt, length, height]);

  // Apply repeat for user-texture side B on change.
  useEffect(() => {
    if (userTexB && wall.wallpaper?.B) {
      const s = wall.wallpaper.B.scaleFt ?? 2;
      if (s > 0) {
        userTexB.repeat.set(length / s, height / s);
        userTexB.needsUpdate = true;
      }
    }
  }, [userTexB, wall.wallpaper?.B?.scaleFt, length, height]);

  const artA = (wall.wallArt ?? []).filter((a) => (a.side ?? "A") === "A");
  const artB = (wall.wallArt ?? []).filter((a) => (a.side ?? "A") === "B");
  const allArt = useMemo(
    () => [...artA, ...artB].map((a) => ({ id: a.id, url: a.imageUrl })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [artA.map((a) => `${a.id}:${a.imageUrl}`).join(","), artB.map((a) => `${a.id}:${a.imageUrl}`).join(",")]
  );
  const artTextures = useWallArtTextures(allArt);

  // Build a wallpaper overlay plane for one face (null if no wallpaper on that side)
  const renderWallpaperOverlay = (
    wp: Wallpaper | undefined,
    tex: THREE.Texture | null,
    userTex: THREE.Texture | null,
    key: string,
  ) => {
    if (!wp) return null;

    // Phase 34 priority: user-uploaded texture beats the legacy data-URL
    // path when both are set. Null userTex (orphan) falls through to the
    // legacy branches below → base drywall color if nothing else matches.
    if (wp.userTextureId && userTex) {
      return (
        <mesh key={key} position={[0, 0, thickness / 2 + bandOffset / 2]}>
          <planeGeometry args={[length, height]} />
          <meshStandardMaterial
            color="#ffffff"
            roughness={0.85}
            metalness={0}
            side={THREE.DoubleSide}
          >
            <primitive attach="map" object={userTex} dispose={null} />
          </meshStandardMaterial>
        </mesh>
      );
    }

    // kind="paint" branch — must come before kind="color" to avoid fall-through
    if (wp.kind === "paint" && wp.paintId) {
      const hex = resolvePaintHex(wp.paintId, customColors);
      const roughness = wp.limeWash ? 0.95 : 0.85;
      return (
        <mesh key={key} position={[0, 0, thickness / 2 + bandOffset / 2]}>
          <planeGeometry args={[length, height]} />
          <meshStandardMaterial
            color={hex}
            roughness={roughness}
            metalness={0}
            side={THREE.DoubleSide}
          />
        </mesh>
      );
    }

    // Apply wrap/repeat each render (shared cache returns the singleton; we mutate per-render).
    if (wp.kind === "pattern" && wp.imageUrl && tex) {
      const s = wp.scaleFt ?? 0;
      if (s > 0) {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(length / s, height / s);
      } else {
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.repeat.set(1, 1);
      }
      tex.needsUpdate = true;
    }
    return (
      <mesh key={key} position={[0, 0, thickness / 2 + bandOffset / 2]}>
        <planeGeometry args={[length, height]} />
        <meshStandardMaterial
          color={wp.kind === "color" ? wp.color ?? "#f8f5ef" : "#ffffff"}
          roughness={0.85}
          metalness={0}
          side={THREE.DoubleSide}
        >
          {tex && <primitive attach="map" object={tex} dispose={null} />}
        </meshStandardMaterial>
      </mesh>
    );
  };

  // Build decor (wainscoting + crown + art) for one face. All positions are in
  // wall-local space with +Z = "this face". Side B wraps this in a group that
  // rotates 180° around Y, naturally flipping X and Z to the back face.
  const renderSideDecor = (
    wains: WainscotConfig | undefined,
    crown: CrownConfig | undefined,
    artItems: WallArt[]
  ) => {
    const crownHeight = crown?.enabled ? crown.heightFt : 0;

    // Wainscoting: look up library item by id, or build fallback from legacy fields
    let wainscotItem: WainscotStyleItem | null = null;
    if (wains?.enabled) {
      const found = wains.styleItemId
        ? wainscotStyles.find((s) => s.id === wains.styleItemId)
        : null;
      wainscotItem =
        found ?? {
          id: "legacy",
          name: "Legacy",
          style: "recessed-panel",
          heightFt: wains.heightFt,
          color: wains.color,
        };
    }

    return (
      <>
        {wainscotItem &&
          renderWainscotStyle({
            length,
            halfLen,
            halfH,
            thickness,
            item: wainscotItem,
          })}

        {/* Crown molding */}
        {crownHeight > 0 && (
          <mesh
            position={[0, halfH - crownHeight / 2, thickness / 2 + 0.08]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[length, crownHeight, 0.15]} />
            <meshStandardMaterial
              color={crown!.color}
              roughness={0.6}
              metalness={0}
            />
          </mesh>
        )}

        {/* Wall art — framed or flat */}
        {artItems.map((art) => {
          const tex = artTextures.get(art.id) ?? null;
          // Wall art uses clamped wrap (stretched). Apply each render (shared singleton).
          if (tex) {
            tex.wrapS = THREE.ClampToEdgeWrapping;
            tex.wrapT = THREE.ClampToEdgeWrapping;
            tex.repeat.set(1, 1);
            tex.needsUpdate = true;
          }
          const artX = art.offset - halfLen + art.width / 2;
          const artY = art.centerY - halfH;
          const preset = art.frameStyle ? FRAME_PRESETS[art.frameStyle] : null;
          const frameW = preset?.width ?? 0;
          const frameD = preset?.depth ?? 0;
          const baseZ = thickness / 2 + bandOffset * 2;
          const frameColor = art.frameColorOverride ?? preset?.color ?? "#ffffff";

          if (!preset || art.frameStyle === "none" || frameW === 0) {
            return (
              <mesh key={art.id} position={[artX, artY, baseZ]}>
                <planeGeometry args={[art.width, art.height]} />
                <meshStandardMaterial
                  roughness={0.5}
                  metalness={0}
                  side={THREE.DoubleSide}
                >
                  {tex && <primitive attach="map" object={tex} dispose={null} />}
                </meshStandardMaterial>
              </mesh>
            );
          }

          const innerW = Math.max(0.01, art.width - 2 * frameW);
          const innerH = Math.max(0.01, art.height - 2 * frameW);
          const artZ = baseZ + 0.002;
          const frameCenterZ = baseZ + frameD / 2;

          return (
            <group key={art.id} position={[artX, artY, 0]}>
              <mesh position={[0, 0, artZ]}>
                <planeGeometry args={[innerW, innerH]} />
                <meshStandardMaterial
                  roughness={0.5}
                  metalness={0}
                  side={THREE.DoubleSide}
                >
                  {tex && <primitive attach="map" object={tex} dispose={null} />}
                </meshStandardMaterial>
              </mesh>
              <mesh position={[0, art.height / 2 - frameW / 2, frameCenterZ]} castShadow>
                <boxGeometry args={[art.width, frameW, frameD]} />
                <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.2} />
              </mesh>
              <mesh position={[0, -(art.height / 2 - frameW / 2), frameCenterZ]} castShadow>
                <boxGeometry args={[art.width, frameW, frameD]} />
                <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.2} />
              </mesh>
              <mesh position={[-(art.width / 2 - frameW / 2), 0, frameCenterZ]} castShadow>
                <boxGeometry args={[frameW, innerH, frameD]} />
                <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.2} />
              </mesh>
              <mesh position={[art.width / 2 - frameW / 2, 0, frameCenterZ]} castShadow>
                <boxGeometry args={[frameW, innerH, frameD]} />
                <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.2} />
              </mesh>
            </group>
          );
        })}
      </>
    );
  };

  return (
    <group position={position} rotation={rotation}>
      {/* Base wall — neutral drywall color */}
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          color={baseColor}
          roughness={0.85}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Side B — positive Z face (matches +perp / right side in 2D) */}
      <group>
        {renderWallpaperOverlay(wall.wallpaper?.B, wallpaperBTex, userTexB, "wp-B")}
        {renderSideDecor(wall.wainscoting?.B, wall.crownMolding?.B, artB)}
      </group>

      {/* Side A — flip 180° around Y to -Z face (matches -perp / left side in 2D) */}
      <group rotation={[0, Math.PI, 0]}>
        {renderWallpaperOverlay(wall.wallpaper?.A, wallpaperATex, userTexA, "wp-A")}
        {renderSideDecor(wall.wainscoting?.A, wall.crownMolding?.A, artA)}
      </group>
    </group>
  );
}
