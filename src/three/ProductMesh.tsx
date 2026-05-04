/**
 * Phase 56 GLTF-RENDER-3D-01: ProductMesh — branches on gltfId to render GLTF or box.
 *
 * Task 2 (intermediate): ProductBox extraction with <group> wrapping.
 * Task 4 (final): GLTF branching + Suspense + ErrorBoundary added below.
 */
import type { ThreeEvent } from "@react-three/fiber";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import type { PlacedProduct } from "@/types/cad";
import type { Product } from "@/types/product";
import { resolveEffectiveDims } from "@/types/product";
import { useUIStore } from "@/stores/uiStore";
import { useClickDetect } from "@/hooks/useClickDetect";
import { useGltfBlobUrl } from "@/hooks/useGltfBlobUrl";
import { ProductBox } from "./ProductBox";
import GltfProduct from "./GltfProduct";

interface Props {
  placed: PlacedProduct;
  product: Product | undefined;
  isSelected: boolean;
}

export default function ProductMesh({ placed, product, isSelected }: Props) {
  // Phase 54 PROPS3D-01: left-click to select (drag-threshold-aware)
  const { handlePointerDown, handlePointerUp } = useClickDetect(() => {
    useUIStore.getState().select([placed.id]);
  });

  // Phase 31: per-axis overrides resolved here so 3D mesh respects edge drags.
  const { width, depth, height, isPlaceholder } = resolveEffectiveDims(product, placed);

  // D-03: placeholders never receive textures, even if imageUrl exists
  const textureUrl = !isPlaceholder && product?.imageUrl ? product.imageUrl : null;

  const rotY = -(placed.rotation * Math.PI) / 180;

  // useGltfBlobUrl ALWAYS called (rules of hooks) — url used only in gltfId branch
  const { url } = useGltfBlobUrl(product?.gltfId);

  const handlers = {
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
    onContextMenu: (e: ThreeEvent<MouseEvent>) => {
      if (e.nativeEvent.button !== 2) return;
      e.stopPropagation();
      e.nativeEvent.preventDefault();
      useUIStore.getState().openContextMenu("product", placed.id, {
        x: e.nativeEvent.clientX,
        y: e.nativeEvent.clientY,
      });
    },
  };

  // GLTF product path (D-08)
  if (product?.gltfId) {
    return (
      <group
        position={[placed.position.x, 0, placed.position.y]}
        rotation={[0, rotY, 0]}
        {...handlers}
      >
        {url ? (
          <Suspense
            fallback={
              <ProductBox
                width={width}
                depth={depth}
                height={height}
                isSelected={isSelected}
                isPlaceholder={isPlaceholder}
                textureUrl={textureUrl}
              />
            }
          >
            <ErrorBoundary
              fallback={
                <ProductBox
                  width={width}
                  depth={depth}
                  height={height}
                  isSelected={isSelected}
                  isPlaceholder={isPlaceholder}
                  textureUrl={textureUrl}
                />
              }
            >
              <GltfProduct
                url={url}
                width={width}
                depth={depth}
                height={height}
                isSelected={isSelected}
              />
            </ErrorBoundary>
          </Suspense>
        ) : (
          // IDB fetch in flight OR error — show box fallback (D-04, D-05)
          <ProductBox
            width={width}
            depth={depth}
            height={height}
            isSelected={isSelected}
            isPlaceholder={isPlaceholder}
            textureUrl={textureUrl}
          />
        )}
      </group>
    );
  }

  // Image-only / placeholder path — unchanged behavior (D-12 regression guard)
  return (
    <group
      position={[placed.position.x, 0, placed.position.y]}
      rotation={[0, rotY, 0]}
      {...handlers}
    >
      <ProductBox
        width={width}
        depth={depth}
        height={height}
        isSelected={isSelected}
        isPlaceholder={isPlaceholder}
        textureUrl={textureUrl}
      />
    </group>
  );
}
