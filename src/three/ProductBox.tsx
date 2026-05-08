/**
 * Phase 56 GLTF-RENDER-3D-01: ProductBox — extracted box mesh sub-component.
 *
 * Pure refactor extracted from ProductMesh.tsx. Renders a textured or placeholder
 * box representing a product in the 3D viewport. Position/rotation live on the
 * wrapping <group> in ProductMesh; this component only handles Y centering via
 * position={[0, height/2, 0]}.
 *
 * Phase 69 MAT-LINK-01: accepts optional finishMaterialId. When set (and not a
 * placeholder), resolves the Material via useMaterials and applies its colorHex
 * or colorMapId texture instead of the product.imageUrl texture. Hooks are called
 * unconditionally (rules of hooks).
 */
import type { Texture } from "three";
import { useProductTexture } from "./productTextureCache";
import { useMaterials } from "@/hooks/useMaterials";
import { useUserTexture } from "@/hooks/useUserTexture";

interface ProductBoxProps {
  width: number;
  depth: number;
  height: number;
  isSelected: boolean;
  isPlaceholder: boolean;
  textureUrl: string | null;
  /** Phase 69 MAT-LINK-01: when set, overrides product.imageUrl texture
   *  with the referenced Material's color/colorMap + roughness.
   *  Ignored for placeholders (D-03 — placeholders never textured). */
  finishMaterialId?: string;
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
  finishMaterialId,
}: ProductBoxProps) {
  const productTexture: Texture | null = useProductTexture(textureUrl);

  // Phase 69: Material lookup. Hooks must run unconditionally (rules of hooks).
  const { materials } = useMaterials();
  const finishMat = finishMaterialId
    ? materials.find((m) => m.id === finishMaterialId)
    : undefined;
  const finishTexture = useUserTexture(finishMat?.colorMapId);

  // Resolve final color + map + roughness.
  // Precedence: placeholder color (debug) > selected highlight > finish Material > catalog default
  const useFinish = !isPlaceholder && !!finishMat;
  const finalColor = isSelected
    ? "#93c5fd"
    : isPlaceholder
      ? "#7c5bf0"
      : useFinish && finishMat?.colorHex
        ? finishMat.colorHex
        : "#ffffff";
  const finalMap: Texture | null = isPlaceholder
    ? null
    : useFinish
      ? (finishTexture ?? null) // textured finish; null if still resolving — falls to flat color
      : productTexture;
  const finalRoughness = isPlaceholder
    ? 0.6
    : useFinish
      ? 0.55 // future: read finishMat.roughnessMapId — out of scope for v1.19
      : 0.55;

  return (
    <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial
        color={finalColor}
        map={finalMap}
        transparent={isPlaceholder}
        opacity={isPlaceholder ? 0.8 : 1}
        roughness={finalRoughness}
        metalness={isPlaceholder ? 0.1 : 0.05}
      />
    </mesh>
  );
}
