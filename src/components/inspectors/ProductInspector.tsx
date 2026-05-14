// src/components/inspectors/ProductInspector.tsx
//
// Phase 82 Plan 82-02 — Product inspector tab system (D-05).
// Tabs: Dimensions / Material / Rotation (default Dimensions).
//
// Dimensions tab owns: dim PanelSection + Position (collapsed) +
// set-dimensions inputs (catalog products without dims) + Reset-size
// button (when overrides exist).
// Material tab owns: Material + Finish (Phase 69 per-placement picker).
// Rotation tab owns: rotation row + RotationPresetChips.
// D-05 trailing row: <SavedCameraButtons> below tabs, always visible.
// D-03: key={pp.id} forces fresh mount on selection change.

import { useState } from "react";
import { useCADStore } from "@/stores/cadStore";
import { useProductStore } from "@/stores/productStore";
import type { Product } from "@/types/product";
import { hasDimensions } from "@/types/product";
import type { PlacedProduct } from "@/types/cad";
import { PanelSection } from "@/components/ui/PanelSection";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
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

type ProductTab = "dimensions" | "material" | "rotation";

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

  const [activeTab, setActiveTab] = useState<ProductTab>("dimensions");

  const product = productLibrary.find((p) => p.id === pp.productId);
  const libProduct =
    storeProducts.find((p) => p.id === pp.productId) ?? product;

  const hasOverrides =
    pp.widthFtOverride !== undefined || pp.depthFtOverride !== undefined;

  return (
    <div className="space-y-2" key={pp.id}>
      <div className="font-sans text-xs text-foreground">
        {product?.name?.toUpperCase() ?? "PRODUCT"}
      </div>
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as ProductTab)}
      >
        <TabsList>
          <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
          <TabsTrigger value="material">Material</TabsTrigger>
          <TabsTrigger value="rotation">Rotation</TabsTrigger>
        </TabsList>
        <TabsContent value="dimensions">
          <div className="space-y-2">
            {product && (
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
            )}
            <PanelSection id="position" label="Position" defaultOpen={false}>
              <div className="space-y-1.5">
                <Row
                  label="Position"
                  value={`${pp.position.x.toFixed(1)}, ${pp.position.y.toFixed(1)}`}
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
            {hasOverrides && (
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
        </TabsContent>
        <TabsContent value="material">
          <div className="space-y-2">
            {product && (
              <PanelSection id="material" label="Material">
                <div className="space-y-1.5">
                  <Row
                    label="Category"
                    value={product.category.toUpperCase()}
                  />
                  {product.material && (
                    <Row
                      label="Material"
                      value={product.material.toUpperCase()}
                    />
                  )}
                </div>
              </PanelSection>
            )}
            {product && (
              <PanelSection id="finish" label="Finish">
                <div className="space-y-1.5">
                  {product.gltfId && (
                    <p className="font-sans text-[11px] text-muted-foreground/60 italic mt-1">
                      GLTF products use their built-in materials. Finish picker
                      has no visual effect on this product (deferred to v1.20).
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
            )}
          </div>
        </TabsContent>
        <TabsContent value="rotation">
          {/* Plan 82-02 Task 3: single-section tab — PanelSection wrapper
              dropped (the tab IS the section label). */}
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
        </TabsContent>
      </Tabs>
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
    </div>
  );
}
