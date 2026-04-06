import { useCADStore, useActiveWalls, useActivePlacedProducts, useActiveCeilings } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { useProductStore } from "@/stores/productStore";
import { formatFeet, wallLength } from "@/lib/geometry";
import type { Product } from "@/types/product";
import { hasDimensions } from "@/types/product";
import WallSurfacePanel from "./WallSurfacePanel";
import CeilingPaintSection from "./CeilingPaintSection";

interface Props {
  productLibrary: Product[];
}

export default function PropertiesPanel({ productLibrary }: Props) {
  const selectedIds = useUIStore((s) => s.selectedIds);
  const walls = useActiveWalls();
  const placedProducts = useActivePlacedProducts();
  const ceilings = useActiveCeilings();
  const removeSelected = useCADStore((s) => s.removeSelected);
  const clearSelection = useUIStore((s) => s.clearSelection);
  const updateProduct = useProductStore((s) => s.updateProduct);
  const storeProducts = useProductStore((s) => s.products);

  const id = selectedIds[0];
  const wall = id ? walls[id] : undefined;
  const pp = id ? placedProducts[id] : undefined;
  const ceiling = id ? ceilings[id] : undefined;

  function handleDelete() {
    removeSelected(selectedIds);
    clearSelection();
  }

  // Multi-selection bulk actions (POLISH-05)
  if (selectedIds.length > 1) {
    const wallIds = selectedIds.filter((id) => !!walls[id]);
    const totalCount = selectedIds.length;

    return (
      <div className="absolute right-3 top-3 z-10 w-64 max-h-[calc(100vh-6rem)] overflow-y-auto glass-panel rounded-sm p-4 space-y-3">
        <h3 className="font-mono text-[11px] text-text-ghost tracking-widest">
          BULK_ACTIONS
        </h3>
        <div className="font-mono text-[11px] text-accent-light">
          {totalCount} ITEMS_SELECTED
          {wallIds.length > 0 && ` (${wallIds.length} WALLS)`}
        </div>

        {wallIds.length > 0 && (
          <div className="space-y-2 border-t border-outline-variant/20 pt-2">
            <div className="font-mono text-[11px] text-text-dim">PAINT_ALL_WALLS</div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                defaultValue="#f8f5ef"
                onChange={(e) => {
                  const color = e.target.value;
                  for (const wId of wallIds) {
                    useCADStore.getState().setWallpaper(wId, "A", { kind: "color", color });
                    useCADStore.getState().setWallpaper(wId, "B", { kind: "color", color });
                  }
                }}
                className="w-8 h-7 bg-transparent border border-outline-variant/30 rounded-sm cursor-pointer"
              />
              <span className="font-mono text-[11px] text-text-ghost">
                APPLIES_TO_BOTH_SIDES
              </span>
            </div>
          </div>
        )}

        <button
          onClick={handleDelete}
          className="w-full font-mono text-[11px] text-error tracking-widest py-1 border border-error/30 rounded-sm hover:bg-error/10"
        >
          DELETE_ALL ({totalCount})
        </button>
      </div>
    );
  }

  if (!wall && !pp && !ceiling) return null;

  return (
    <div className="absolute right-3 top-3 z-10 w-64 max-h-[calc(100vh-6rem)] overflow-y-auto glass-panel rounded-sm p-4 space-y-3">
      <h3 className="font-mono text-[11px] text-text-ghost tracking-widest">
        PROPERTIES
      </h3>

      {ceiling && (
        <div className="space-y-2">
          <div className="font-mono text-xs text-accent-light">
            CEILING_{ceiling.id.slice(-4).toUpperCase()}
          </div>
          <div className="space-y-1.5">
            <Row label="HEIGHT" value={`${ceiling.height.toFixed(1)} FT`} />
            <Row label="VERTICES" value={String(ceiling.points.length)} />
          </div>
          <CeilingPaintSection ceilingId={ceiling.id} ceiling={ceiling} />
        </div>
      )}

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
          <div className="font-mono text-[11px] text-text-ghost">
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
                <span className="font-mono text-[11px] text-text-ghost tracking-wider">
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
                      className="w-full px-1.5 py-1 text-[11px] font-mono bg-obsidian-deepest border border-outline-variant/30"
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
        className="w-full py-1.5 rounded-sm font-mono text-[11px] tracking-widest bg-red-900/30 text-red-400 border border-red-900/40 hover:bg-red-900/50 transition-colors"
      >
        DELETE_ELEMENT
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="font-mono text-[11px] text-text-ghost tracking-wider">{label}</span>
      <span className="font-mono text-[11px] text-accent-light">{value}</span>
    </div>
  );
}
