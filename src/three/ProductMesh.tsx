import { useMemo } from "react";
import * as THREE from "three";
import type { PlacedProduct } from "@/types/cad";
import type { Product } from "@/types/product";
import { effectiveDimensions } from "@/types/product";

interface Props {
  placed: PlacedProduct;
  product: Product | undefined;
  isSelected: boolean;
}

export default function ProductMesh({ placed, product, isSelected }: Props) {
  const { width, depth, height, isPlaceholder } = effectiveDimensions(product);

  const texture = useMemo(() => {
    if (isPlaceholder || !product?.imageUrl) return null;
    const loader = new THREE.TextureLoader();
    try {
      const tex = loader.load(product.imageUrl);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    } catch {
      return null;
    }
  }, [product?.imageUrl, isPlaceholder]);

  const rotY = -(placed.rotation * Math.PI) / 180;

  return (
    <mesh
      position={[placed.position.x, height / 2, placed.position.y]}
      rotation={[0, rotY, 0]}
    >
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial
        color={isSelected ? "#93c5fd" : isPlaceholder ? "#7c5bf0" : "#f3f4f6"}
        map={texture}
        transparent={isPlaceholder}
        opacity={isPlaceholder ? 0.8 : 1}
        roughness={0.6}
        metalness={0.1}
      />
    </mesh>
  );
}
