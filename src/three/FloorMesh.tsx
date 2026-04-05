import { useMemo } from "react";
import * as THREE from "three";
import type { FloorMaterial } from "@/types/cad";
import { FLOOR_PRESETS, type FloorPresetId } from "@/data/floorMaterials";

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

  return (
    <mesh
      position={[halfW, 0, halfL]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[width, length]} />
      <meshStandardMaterial
        map={texture ?? undefined}
        color={color}
        roughness={roughness}
        metalness={0}
      />
    </mesh>
  );
}
