import type { ThreeEvent } from "@react-three/fiber";
import type { PlacedProduct } from "@/types/cad";
import type { Product } from "@/types/product";
import { resolveEffectiveDims } from "@/types/product";
import { useProductTexture } from "./productTextureCache";
import { useUIStore } from "@/stores/uiStore";

interface Props {
  placed: PlacedProduct;
  product: Product | undefined;
  isSelected: boolean;
}

export default function ProductMesh({ placed, product, isSelected }: Props) {
  // Phase 31: per-axis overrides resolved here so 3D mesh respects edge drags.
  const { width, depth, height, isPlaceholder } = resolveEffectiveDims(product, placed);

  // D-03: placeholders never receive textures, even if imageUrl exists
  const textureUrl = !isPlaceholder && product?.imageUrl ? product.imageUrl : null;
  const texture = useProductTexture(textureUrl);

  const rotY = -(placed.rotation * Math.PI) / 180;

  return (
    <mesh
      position={[placed.position.x, height / 2, placed.position.y]}
      rotation={[0, rotY, 0]}
      castShadow
      receiveShadow
      onContextMenu={(e: ThreeEvent<MouseEvent>) => {
        if (e.nativeEvent.button !== 2) return;
        e.stopPropagation();
        e.nativeEvent.preventDefault();
        useUIStore.getState().openContextMenu("product", placed.id, {
          x: e.nativeEvent.clientX,
          y: e.nativeEvent.clientY,
        });
      }}
    >
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
