import { useMemo } from "react";
import * as THREE from "three";
import type { WallSegment, Wallpaper, WainscotConfig, CrownConfig, WallArt } from "@/types/cad";
import { wallLength, angle } from "@/lib/geometry";
import { FRAME_PRESETS } from "@/types/framedArt";

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
    const wainscotHeight = wains?.enabled ? wains.heightFt : 0;
    const crownHeight = crown?.enabled ? crown.heightFt : 0;

    return (
      <>
        {/* Wainscoting — 3D recessed panels */}
        {wainscotHeight > 0 && (() => {
          const color = wains!.color;
          const frameColor = color;
          const frameDepth = 0.18;
          const backDepth = 0.05;
          const stileWidth = 0.33;
          const railHeight = 0.33;
          const chairCapHeight = 0.17;
          const chairCapDepth = 0.25;

          const targetPanelWidth = Math.max(1.5, wainscotHeight * 0.9);
          const interiorWidth = length - 2 * stileWidth;
          const panelCount = Math.max(1, Math.round(interiorWidth / targetPanelWidth));
          const actualPanelWidth =
            (interiorWidth - (panelCount - 1) * stileWidth) / panelCount;

          const mat = (
            <meshStandardMaterial color={frameColor} roughness={0.65} metalness={0} />
          );

          const meshes: React.ReactNode[] = [];

          meshes.push(
            <mesh
              key="back"
              position={[0, -halfH + wainscotHeight / 2, thickness / 2 + backDepth / 2]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[length, wainscotHeight, backDepth]} />
              <meshStandardMaterial color={color} roughness={0.7} metalness={0} />
            </mesh>
          );

          const topRailY = -halfH + wainscotHeight - chairCapHeight - railHeight / 2;
          meshes.push(
            <mesh
              key="top-rail"
              position={[0, topRailY, thickness / 2 + frameDepth / 2]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[length, railHeight, frameDepth]} />
              {mat}
            </mesh>
          );

          const bottomRailY = -halfH + railHeight / 2;
          meshes.push(
            <mesh
              key="bottom-rail"
              position={[0, bottomRailY, thickness / 2 + frameDepth / 2]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[length, railHeight, frameDepth]} />
              {mat}
            </mesh>
          );

          const panelAreaHeight = wainscotHeight - chairCapHeight - 2 * railHeight;
          const panelCenterY = -halfH + railHeight + panelAreaHeight / 2;
          for (let i = 0; i <= panelCount; i++) {
            const stileX =
              -length / 2 + stileWidth / 2 + i * (actualPanelWidth + stileWidth);
            meshes.push(
              <mesh
                key={`stile-${i}`}
                position={[stileX, panelCenterY, thickness / 2 + frameDepth / 2]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[stileWidth, panelAreaHeight, frameDepth]} />
                {mat}
              </mesh>
            );
          }

          meshes.push(
            <mesh
              key="chair-cap"
              position={[
                0,
                -halfH + wainscotHeight - chairCapHeight / 2,
                thickness / 2 + chairCapDepth / 2,
              ]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[length, chairCapHeight, chairCapDepth]} />
              {mat}
            </mesh>
          );

          return <group>{meshes}</group>;
        })()}

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
