import { useMemo } from "react";
import * as THREE from "three";
import type { WallSegment } from "@/types/cad";
import { wallLength, angle } from "@/lib/geometry";

interface Props {
  wall: WallSegment;
  isSelected: boolean;
}

// Separate caches for wall art (clamped, stretched) vs wallpaper (tiling).
// Sharing one cache caused repeat-settings leak between the two uses.
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

// Procedural wainscoting texture — board-and-batten pattern.
const wainscotTextureCache = new Map<string, THREE.CanvasTexture>();
function getWainscotingTexture(color: string): THREE.CanvasTexture {
  const key = color;
  const cached = wainscotTextureCache.get(key);
  if (cached) return cached;
  const PX = 256;
  const canvas = document.createElement("canvas");
  canvas.width = PX;
  canvas.height = PX;
  const ctx = canvas.getContext("2d")!;
  // Base fill
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, PX, PX);
  // Shadow lines: top + bottom rails + left/right stiles
  const rail = 6;
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(0, 0, PX, rail); // top rail
  ctx.fillRect(0, PX - rail, PX, rail); // bottom rail
  ctx.fillRect(0, 0, rail, PX); // left stile
  ctx.fillRect(PX - rail, 0, rail, PX); // right stile
  // Inset panel shadow
  const inset = 24;
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth = 2;
  ctx.strokeRect(inset, inset, PX - inset * 2, PX - inset * 2);
  // Highlight inset panel top/left (raised-panel illusion)
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(inset + 2, PX - inset - 2);
  ctx.lineTo(inset + 2, inset + 2);
  ctx.lineTo(PX - inset - 2, inset + 2);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  wainscotTextureCache.set(key, tex);
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
      ? getWallpaperTexture(wall.wallpaper.imageUrl)
      : null;
  if (wallpaperTexture) {
    // scaleFt > 0 = tile; undefined/0 = stretch across whole wall
    const s = wall.wallpaper?.scaleFt ?? 0;
    if (s > 0) {
      wallpaperTexture.wrapS = THREE.RepeatWrapping;
      wallpaperTexture.wrapT = THREE.RepeatWrapping;
      wallpaperTexture.repeat.set(length / s, height / s);
    } else {
      wallpaperTexture.wrapS = THREE.ClampToEdgeWrapping;
      wallpaperTexture.wrapT = THREE.ClampToEdgeWrapping;
      wallpaperTexture.repeat.set(1, 1);
    }
    wallpaperTexture.needsUpdate = true;
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

      {/* Wainscoting — 3D extruded panels with chair rail cap */}
      {wainscotHeight > 0 && (() => {
        const color = wall.wainscoting!.color;
        const tex = getWainscotingTexture(color);
        const panelWidth = Math.max(1, wainscotHeight * 0.7);
        tex.repeat.set(length / panelWidth, 1);
        tex.needsUpdate = true;
        const baseDepth = 0.08; // ~1" panel protrusion
        const railDepth = 0.15; // ~1.8" chair rail (sticks out further)
        const railHeight = 0.17; // ~2" chair rail height
        return (
          <group>
            {/* Main wainscoting panel — extruded box protruding from wall */}
            <mesh
              position={[0, -halfH + wainscotHeight / 2, thickness / 2 + baseDepth / 2]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[length, wainscotHeight, baseDepth]} />
              <meshStandardMaterial
                map={tex}
                color={color}
                roughness={0.7}
                metalness={0}
              />
            </mesh>
            {/* Chair rail cap at the top — sticks out further, classic wainscoting profile */}
            <mesh
              position={[0, -halfH + wainscotHeight - railHeight / 2, thickness / 2 + railDepth / 2]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[length, railHeight, railDepth]} />
              <meshStandardMaterial
                color={color}
                roughness={0.6}
                metalness={0}
              />
            </mesh>
          </group>
        );
      })()}

      {/* Crown molding — 3D extruded band at ceiling line */}
      {crownHeight > 0 && (
        <mesh
          position={[0, halfH - crownHeight / 2, thickness / 2 + 0.08]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[length, crownHeight, 0.15]} />
          <meshStandardMaterial
            color={wall.crownMolding!.color}
            roughness={0.6}
            metalness={0}
          />
        </mesh>
      )}

      {/* Wall art items — textured planes on interior face (never tiled) */}
      {(wall.wallArt ?? []).map((art) => {
        const tex = getWallArtTexture(art.imageUrl);
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
