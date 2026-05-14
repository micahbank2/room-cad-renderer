// src/components/inspectors/ProductInspector.tsx
//
// Phase 82 Plan 82-01 — Product inspector extracted from PropertiesPanel.tsx
// L423-528 plus the L626-636 Reset-size button. JSX is verbatim. No tabs
// yet (Plan 82-02).
//
// The original was an inline IIFE `{pp && (() => { ... })()}` — flattened
// here into a normal function body. The Reset-size button (previously
// rendered as a sibling to the IIFE) is folded inline at the bottom
// since it's product-specific.

import { useCADStore } from "@/stores/cadStore";
import { useProductStore } from "@/stores/productStore";
import type { Product } from "@/types/product";
import { hasDimensions } from "@/types/product";
import type { PlacedProduct } from "@/types/cad";
import { PanelSection } from "@/components/ui/PanelSection";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MaterialPicker } from "@/components/MaterialPicker";
import {
  Row,
  RotationPresetChips,
  SavedCameraButtons,
} from "./PropertiesPanel.shared";

interface Props {
  pp: PlacedProduct;
  productLibrary: Product[];
  viewMode: "2d" | "3d" | "split" | "library";
}

export function ProductInspector({ pp, productLibrary, viewMode }: Props) {
  const updateProduct = useProductStore((s) => s.updateProduct);
  const storeProducts = useProductStore((s) => s.products);
  const setSavedCameraOnProductNoHistory = useCADStore(
    (s) => s.setSavedCameraOnProductNoHistory,
  );
  const clearSavedCameraNoHistory = useCADStore(
    (s) => s.clearSavedCameraNoHistory,
  );
  const clearProductOverrides = useCADStore((s) => s.clearProductOverrides);

  const product = productLibrary.find((p) => p.id === pp.productId);
  const libProduct =
    storeProducts.find((p) => p.id === pp.productId) ?? product;

  return (
    <div className="space-y-2">
      <div className="font-sans text-xs text-foreground">
        {product?.name?.toUpperCase() ?? "PRODUCT"}
      </div>
      {product && (
        <>
          <PanelSection id="dimensions" label="Dimensions">
            <div className="space-y-1.5">
              {hasDimensions(product) ? (
                <>
                  <Row label="Width" value={`${product.width} FT`} />
                  <Row label="Depth" value={`${product.depth} FT`} />
                  <Row label="Height" value={`${product.height} FT`} />
                </>
              ) : (
                <Row label="Size" value="Unset" />
              )}
            </div>
          </PanelSection>
          <PanelSection id="material" label="Material">
            <div className="space-y-1.5">
              <Row label="Category" value={product.category.toUpperCase()} />
              {product.material && (
                <Row label="Material" value={product.material.toUpperCase()} />
              )}
            </div>
          </PanelSection>
          {/* Phase 69 MAT-LINK-01: per-placement finish picker. */}
          <PanelSection id="finish" label="Finish">
            <div className="space-y-1.5">
              {product.gltfId && (
                <p className="font-sans text-[11px] text-muted-foreground/60 italic mt-1">
                  GLTF products use their built-in materials. Finish picker has no visual effect on this product (deferred to v1.20).
                </p>
              )}
              <MaterialPicker
                surface="customElementFace"
                value={pp.finishMaterialId}
                onChange={(materialId) =>
                  useCADStore.getState().applyProductFinish(pp.id, materialId)
                }
              />
            </div>
          </PanelSection>
        </>
      )}
      <PanelSection id="position" label="Position">
        <div className="space-y-1.5">
          <Row
            label="Position"
            value={`${pp.position.x.toFixed(1)}, ${pp.position.y.toFixed(1)}`}
          />
        </div>
      </PanelSection>
      <PanelSection id="rotation" label="Rotation">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Row label="Rotation" value={`${pp.rotation.toFixed(0)}°`} />
          </div>
          <RotationPresetChips
            currentRotation={pp.rotation}
            onSelect={(deg) =>
              useCADStore.getState().rotateProduct(pp.id, deg)
            }
          />
        </div>
      </PanelSection>
      {libProduct && !hasDimensions(libProduct) && (
        <div className="space-y-1.5 pt-2 border-t border-border/50">
          <span className="font-sans text-[11px] text-muted-foreground/60 tracking-wider">
            Set dimensions (ft)
          </span>
          <div className="grid grid-cols-3 gap-1">
            {(["width", "depth", "height"] as const).map((axis) => (
              <Input
                key={axis}
                type="number"
                step={0.25}
                min={0.25}
                placeholder={axis.charAt(0).toUpperCase()}
                defaultValue={libProduct[axis] ?? ""}
                onBlur={(e) => {
                  const v = parseFloat(e.target.value);
                  if (v > 0) updateProduct(libProduct.id, { [axis]: v });
                }}
                className="h-7 text-xs px-1.5"
              />
            ))}
          </div>
        </div>
      )}
      <SavedCameraButtons
        kind="product"
        id={pp.id}
        hasSavedCamera={!!pp.savedCameraPos}
        viewMode={viewMode}
        onSave={(pId, pos, target) =>
          setSavedCameraOnProductNoHistory(pId, pos, target)
        }
        onClear={clearSavedCameraNoHistory}
      />
      {(pp.widthFtOverride !== undefined ||
        pp.depthFtOverride !== undefined) && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => clearProductOverrides(pp.id)}
        >
          Reset size
        </Button>
      )}
    </div>
  );
}
