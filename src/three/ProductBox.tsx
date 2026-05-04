/**
 * Phase 56 GLTF-RENDER-3D-01: ProductBox — extracted box mesh sub-component.
 *
 * Pure refactor extracted from ProductMesh.tsx. Renders a textured or placeholder
 * box representing a product in the 3D viewport. Position/rotation live on the
 * wrapping <group> in ProductMesh; this component only handles Y centering via
 * position={[0, height/2, 0]}.
 */
import type { Texture } from "three";
import { useProductTexture } from "./productTextureCache";

interface ProductBoxProps {
  width: number;
  depth: number;
  height: number;
  isSelected: boolean;
  isPlaceholder: boolean;
  textureUrl: string | null;
}

/**
 * Renders the box geometry + standard material for a product.
 * Used as the primary render for image-only products and as the
 * loading/error fallback for GLTF products.
 */
export function ProductBox({
  width,
  depth,
  height,
  isSelected,
  isPlaceholder,
  textureUrl,
}: ProductBoxProps) {
  const texture: Texture | null = useProductTexture(textureUrl);

  return (
    <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial
        color={isSelected ? "#93c5fd" : isPlaceholder ? "#7c5bf0" : "#ffffff"}
        map={texture}
        transparent={isPlaceholder}
        opacity={isPlaceholder ? 0.8 : 1}
        roughness={isPlaceholder ? 0.6 : 0.55}
        metalness={isPlaceholder ? 0.1 : 0.05}
      />
    </mesh>
  );
}
