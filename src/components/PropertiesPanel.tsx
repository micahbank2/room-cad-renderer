import { useCADStore, useActiveWalls, useActivePlacedProducts } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { useProductStore } from "@/stores/productStore";
import { formatFeet, wallLength } from "@/lib/geometry";
import type { Product } from "@/types/product";
import { hasDimensions } from "@/types/product";
import WallSurfacePanel from "./WallSurfacePanel";

interface Props {
  productLibrary: Product[];
}

export default function PropertiesPanel({ productLibrary }: Props) {
  const selectedIds = useUIStore((s) => s.selectedIds);
  const walls = useActiveWalls();
  const placedProducts = useActivePlacedProducts();
  const removeSelected = useCADStore((s) => s.removeSelected);
  const clearSelection = useUIStore((s) => s.clearSelection);
  const updateProduct = useProductStore((s) => s.updateProduct);
  const storeProducts = useProductStore((s) => s.products);

  const id = selectedIds[0];
  const wall = id ? walls[id] : undefined;
  const pp = id ? placedProducts[id] : undefined;

  if (!wall && !pp) return null;

  function handleDelete() {
    removeSelected(selectedIds);
    clearSelection();
  }

  return (
    <div className="absolute right-3 top-3 z-10 w-60 glass-panel rounded-sm p-4 space-y-3">
      <h3 className="font-mono text-[10px] text-text-ghost tracking-widest">
        PROPERTIES
      </h3>

      {wall && (
        <div className="space-y-2">
          <div className="font-mono text-xs text-accent-light">
            WALL_SEGMENT_{wall.id.slice(-4).toUpperCase()}
          </div>
          <div className="space-y-1.5">
            <Row label="LENGTH" value={formatFeet(wallLength(wall))} />
            <Row label="THICKNESS" value={formatFeet(wall.thickness)} />
            <Row label="HEIGHT" value={formatFeet(wall.height)} />
            <Row
              label="START"
              value={`${wall.start.x.toFixed(1)}, ${wall.start.y.toFixed(1)}`}
            />
            <Row
              label="END"
              value={`${wall.end.x.toFixed(1)}, ${wall.end.y.toFixed(1)}`}
            />
          </div>
          <div className="font-mono text-[9px] text-text-ghost">
            {wall.openings.length} OPENING(S)
          </div>
          <WallSurfacePanel />
        </div>
      )}

      {pp && (() => {
        const product = productLibrary.find((p) => p.id === pp.productId);
        const libProduct = storeProducts.find((p) => p.id === pp.productId) ?? product;
        return (
          <div className="space-y-2">
            <div className="font-mono text-xs text-accent-light">
              {product?.name?.toUpperCase().replace(/\s/g, "_") ?? "PRODUCT"}
            </div>
            {product && (
              <div className="space-y-1.5">
                {hasDimensions(product) ? (
                  <>
                    <Row label="WIDTH" value={`${product.width} FT`} />
                    <Row label="DEPTH" value={`${product.depth} FT`} />
                    <Row label="HEIGHT" value={`${product.height} FT`} />
                  </>
                ) : (
                  <Row label="SIZE" value="UNSET" />
                )}
                <Row label="CATEGORY" value={product.category.toUpperCase()} />
                {product.material && (
                  <Row label="MATERIAL" value={product.material.toUpperCase()} />
                )}
              </div>
            )}
            <div className="space-y-1.5">
              <Row
                label="POSITION"
                value={`${pp.position.x.toFixed(1)}, ${pp.position.y.toFixed(1)}`}
              />
              <Row label="ROTATION" value={`${pp.rotation.toFixed(0)}°`} />
            </div>
            {libProduct && !hasDimensions(libProduct) && (
              <div className="space-y-1.5 pt-2 border-t border-outline-variant/20">
                <span className="font-mono text-[9px] text-text-ghost tracking-wider">
                  SET_DIMENSIONS (FT)
                </span>
                <div className="grid grid-cols-3 gap-1">
                  {(["width", "depth", "height"] as const).map((axis) => (
                    <input
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
                      className="w-full px-1.5 py-1 text-[10px] font-mono bg-obsidian-deepest border border-outline-variant/30"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      <button
        onClick={handleDelete}
        className="w-full py-1.5 rounded-sm font-mono text-[10px] tracking-widest bg-red-900/30 text-red-400 border border-red-900/40 hover:bg-red-900/50 transition-colors"
      >
        DELETE_ELEMENT
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="font-mono text-[9px] text-text-ghost tracking-wider">{label}</span>
      <span className="font-mono text-[11px] text-accent-light">{value}</span>
    </div>
  );
}
