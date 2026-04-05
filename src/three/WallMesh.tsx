import { useMemo } from "react";
import * as THREE from "three";
import type { WallSegment } from "@/types/cad";
import { wallLength, angle } from "@/lib/geometry";

interface Props {
  wall: WallSegment;
  isSelected: boolean;
}

// Module-level texture cache for wallpaper + wall art data-URL images
const surfaceTextureCache = new Map<string, THREE.Texture>();
function getSurfaceTexture(dataUrl: string): THREE.Texture {
  let tex = surfaceTextureCache.get(dataUrl);
  if (!tex) {
    const loader = new THREE.TextureLoader();
    tex = loader.load(dataUrl);
    surfaceTextureCache.set(dataUrl, tex);
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

  // Wallpaper → base material color or pattern texture
  const baseColor = isSelected ? "#93c5fd" : wall.wallpaper?.color ?? "#f8f5ef";
  const wallpaperTexture =
    wall.wallpaper?.kind === "pattern" && wall.wallpaper.imageUrl
      ? getSurfaceTexture(wall.wallpaper.imageUrl)
      : null;
  if (wallpaperTexture && wall.wallpaper?.scaleFt) {
    wallpaperTexture.wrapS = THREE.RepeatWrapping;
    wallpaperTexture.wrapT = THREE.RepeatWrapping;
    wallpaperTexture.repeat.set(length / wall.wallpaper.scaleFt, height / wall.wallpaper.scaleFt);
  }

  // Wainscoting band (bottom of wall)
  const wainscotHeight = wall.wainscoting?.enabled ? wall.wainscoting.heightFt : 0;
  // Crown molding band (top of wall)
  const crownHeight = wall.crownMolding?.enabled ? wall.crownMolding.heightFt : 0;
  const bandOffset = 0.01; // small offset to avoid z-fighting

  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          color={baseColor}
          map={wallpaperTexture ?? undefined}
          roughness={0.85}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Wainscoting band — plane on interior wall face, bottom-aligned */}
      {wainscotHeight > 0 && (
        <mesh
          position={[0, -halfH + wainscotHeight / 2, thickness / 2 + bandOffset]}
        >
          <planeGeometry args={[length, wainscotHeight]} />
          <meshStandardMaterial
            color={wall.wainscoting!.color}
            roughness={0.75}
            metalness={0}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Crown molding band — plane on interior wall face, top-aligned */}
      {crownHeight > 0 && (
        <mesh
          position={[0, halfH - crownHeight / 2, thickness / 2 + bandOffset]}
        >
          <planeGeometry args={[length, crownHeight]} />
          <meshStandardMaterial
            color={wall.crownMolding!.color}
            roughness={0.7}
            metalness={0}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Wall art items — textured planes on interior face */}
      {(wall.wallArt ?? []).map((art) => {
        const tex = getSurfaceTexture(art.imageUrl);
        const artX = art.offset - halfLen + art.width / 2;
        const artY = art.centerY - halfH;
        return (
          <mesh
            key={art.id}
            position={[artX, artY, thickness / 2 + bandOffset * 2]}
          >
            <planeGeometry args={[art.width, art.height]} />
            <meshStandardMaterial map={tex} roughness={0.5} metalness={0} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );
}
