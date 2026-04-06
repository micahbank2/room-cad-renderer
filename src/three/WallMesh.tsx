import { useMemo } from "react";
import * as THREE from "three";
import type { WallSegment, Wallpaper, WainscotConfig, CrownConfig, WallArt } from "@/types/cad";
import { wallLength, angle } from "@/lib/geometry";
import { FRAME_PRESETS } from "@/types/framedArt";
import { useWainscotStyleStore } from "@/stores/wainscotStyleStore";
import { renderWainscotStyle } from "./wainscotStyles";
import type { WainscotStyleItem } from "@/types/wainscotStyle";
import { resolvePaintHex } from "@/lib/colorUtils";
import { usePaintStore } from "@/stores/paintStore";

interface Props {
  wall: WallSegment;
  isSelected: boolean;
}

// Separate caches for wall art (clamped, stretched) vs wallpaper (tiling).
const wallArtTextureCache = new Map<string, THREE.Texture>();
function getWallArtTexture(dataUrl: string): THREE.Texture {
  let tex = wallArtTextureCache.get(dataUrl);
  if (!tex) {
    const loader = new THREE.TextureLoader();
    tex = loader.load(dataUrl);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(1, 1);
    wallArtTextureCache.set(dataUrl, tex);
  }
  return tex;
}

const wallpaperTextureCache = new Map<string, THREE.Texture>();
function getWallpaperTexture(dataUrl: string): THREE.Texture {
  let tex = wallpaperTextureCache.get(dataUrl);
  if (!tex) {
    const loader = new THREE.TextureLoader();
    tex = loader.load(dataUrl);
    wallpaperTextureCache.set(dataUrl, tex);
  }
  return tex;
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

  // Build a wallpaper overlay plane for one face (null if no wallpaper on that side)
  const renderWallpaperOverlay = (wp: Wallpaper | undefined, key: string) => {
    if (!wp) return null;

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

    let tex: THREE.Texture | null = null;
    if (wp.kind === "pattern" && wp.imageUrl) {
      tex = getWallpaperTexture(wp.imageUrl);
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
          map={tex ?? undefined}
          roughness={0.85}
          metalness={0}
          side={THREE.DoubleSide}
        />
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
          const tex = getWallArtTexture(art.imageUrl);
          const artX = art.offset - halfLen + art.width / 2;
          const artY = art.centerY - halfH;
          const preset = art.frameStyle ? FRAME_PRESETS[art.frameStyle] : null;
          const frameW = preset?.width ?? 0;
          const frameD = preset?.depth ?? 0;
          const baseZ = thickness / 2 + bandOffset * 2;

          if (!preset || art.frameStyle === "none" || frameW === 0) {
            return (
              <mesh key={art.id} position={[artX, artY, baseZ]}>
                <planeGeometry args={[art.width, art.height]} />
                <meshStandardMaterial
                  map={tex}
                  roughness={0.5}
                  metalness={0}
                  side={THREE.DoubleSide}
                />
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
                  map={tex}
                  roughness={0.5}
                  metalness={0}
                  side={THREE.DoubleSide}
                />
              </mesh>
              <mesh position={[0, art.height / 2 - frameW / 2, frameCenterZ]} castShadow>
                <boxGeometry args={[art.width, frameW, frameD]} />
                <meshStandardMaterial color={preset.color} roughness={0.4} metalness={0.2} />
              </mesh>
              <mesh position={[0, -(art.height / 2 - frameW / 2), frameCenterZ]} castShadow>
                <boxGeometry args={[art.width, frameW, frameD]} />
                <meshStandardMaterial color={preset.color} roughness={0.4} metalness={0.2} />
              </mesh>
              <mesh position={[-(art.width / 2 - frameW / 2), 0, frameCenterZ]} castShadow>
                <boxGeometry args={[frameW, innerH, frameD]} />
                <meshStandardMaterial color={preset.color} roughness={0.4} metalness={0.2} />
              </mesh>
              <mesh position={[art.width / 2 - frameW / 2, 0, frameCenterZ]} castShadow>
                <boxGeometry args={[frameW, innerH, frameD]} />
                <meshStandardMaterial color={preset.color} roughness={0.4} metalness={0.2} />
              </mesh>
            </group>
          );
        })}
      </>
    );
  };

  const artA = (wall.wallArt ?? []).filter((a) => (a.side ?? "A") === "A");
  const artB = (wall.wallArt ?? []).filter((a) => (a.side ?? "A") === "B");

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

      {/* Side A — positive Z face */}
      <group>
        {renderWallpaperOverlay(wall.wallpaper?.A, "wp-A")}
        {renderSideDecor(wall.wainscoting?.A, wall.crownMolding?.A, artA)}
      </group>

      {/* Side B — flip 180° around Y so decor lands on -Z face */}
      <group rotation={[0, Math.PI, 0]}>
        {renderWallpaperOverlay(wall.wallpaper?.B, "wp-B")}
        {renderSideDecor(wall.wainscoting?.B, wall.crownMolding?.B, artB)}
      </group>
    </group>
  );
}
