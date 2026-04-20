import { useState } from "react";
import { flushSync } from "react-dom";
import { useCADStore, useActiveWalls, useActivePlacedProducts, useActiveCeilings } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { useProductStore } from "@/stores/productStore";
import { formatFeet, wallLength } from "@/lib/geometry";
import { validateInput } from "@/canvas/dimensionEditor";
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
  const resizeWallByLabel = useCADStore((s) => s.resizeWallByLabel);
  const updateWall = useCADStore((s) => s.updateWall);
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
          BULK ACTIONS
        </h3>
        <div className="font-mono text-[11px] text-accent-light">
          {totalCount} ITEMS SELECTED
          {wallIds.length > 0 && ` (${wallIds.length} WALLS)`}
        </div>

        {wallIds.length > 0 && (
          <div className="space-y-2 border-t border-outline-variant/20 pt-2">
            <div className="font-mono text-[11px] text-text-dim">PAINT ALL WALLS</div>
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
                APPLIES TO BOTH SIDES
              </span>
            </div>
          </div>
        )}

        <button
          onClick={handleDelete}
          className="w-full font-mono text-[11px] text-error tracking-widest py-1 border border-error/30 rounded-sm hover:bg-error/10"
        >
          DELETE ALL ({totalCount})
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
            CEILING {ceiling.id.slice(-4).toUpperCase()}
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
            WALL SEGMENT {wall.id.slice(-4).toUpperCase()}
          </div>
          <div className="space-y-1.5">
            <EditableRow
              label="LENGTH"
              value={wallLength(wall)}
              suffix="FT"
              onCommit={(v) => resizeWallByLabel(wall.id, v)}
              min={0.5}
              parser={validateInput}
            />
            <EditableRow
              label="THICKNESS"
              value={wall.thickness}
              suffix="FT"
              onCommit={(v) => updateWall(wall.id, { thickness: v })}
              min={0.1}
              step={0.1}
            />
            <EditableRow
              label="HEIGHT"
              value={wall.height}
              suffix="FT"
              onCommit={(v) => updateWall(wall.id, { height: v })}
              min={1}
            />
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
              {product?.name?.toUpperCase() ?? "PRODUCT"}
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
                  SET DIMENSIONS (FT)
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
        DELETE ELEMENT
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

function EditableRow({
  label,
  value,
  suffix,
  onCommit,
  min = 0,
  step = 0.25,
  parser,
}: {
  label: string;
  value: number;
  suffix: string;
  onCommit: (v: number) => void;
  min?: number;
  step?: number;
  parser?: (raw: string) => number | null;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  function startEdit() {
    // flushSync so the <input> is in the DOM synchronously after click —
    // keeps inline-edit deterministic for tests and consistent with the
    // wainscot popover precedent.
    flushSync(() => {
      setDraft(value.toFixed(2));
      setEditing(true);
    });
  }

  function commit() {
    setEditing(false);
    // D-05a: when parser supplied, use it; otherwise preserve parseFloat behavior
    const parsed = parser ? parser(draft) : parseFloat(draft);
    // Silent cancel on null/NaN/non-finite (D-06a)
    if (parsed === null || parsed === undefined || !isFinite(parsed as number)) {
      return;
    }
    const v = parsed as number;
    // Existing min guard
    if (v < min) return;
    // RESEARCH Pitfall #2: no-op guard — suppress commits within float-drift tolerance
    if (Math.abs(v - value) <= 1e-6) return;
    onCommit(v);
  }

  if (editing) {
    return (
      <div className="flex justify-between items-center">
        <span className="font-mono text-[11px] text-text-ghost tracking-wider">{label}</span>
        <input
          autoFocus
          type={parser ? "text" : "number"}
          step={step}
          min={min}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          className="w-20 px-1 py-0.5 text-right font-mono text-[11px] text-accent-light bg-obsidian-deepest border border-accent/30 rounded-sm outline-none"
        />
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center group cursor-pointer" onClick={startEdit}>
      <span className="font-mono text-[11px] text-text-ghost tracking-wider">{label}</span>
      <span className="font-mono text-[11px] text-accent-light group-hover:underline">
        {formatFeet(value)} {suffix && <span className="text-text-ghost">{suffix}</span>}
      </span>
    </div>
  );
}
