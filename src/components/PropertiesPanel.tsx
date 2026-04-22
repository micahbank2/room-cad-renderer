import { useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import {
  useCADStore,
  useActiveWalls,
  useActivePlacedProducts,
  useActiveCeilings,
  useActivePlacedCustomElements,
  useCustomElements,
} from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { useProductStore } from "@/stores/productStore";
import { formatFeet, wallLength } from "@/lib/geometry";
import { validateInput } from "@/canvas/dimensionEditor";
import type { Product } from "@/types/product";
import { hasDimensions } from "@/types/product";
import type { PlacedCustomElement } from "@/types/cad";
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

  // Phase 31 CUSTOM-06 — custom-element placement selectors (open question 1).
  const placedCustoms = useActivePlacedCustomElements();
  const customCatalog = useCustomElements();
  const clearCustomElementOverrides = useCADStore(
    (s) => s.clearCustomElementOverrides,
  );
  const clearProductOverrides = useCADStore((s) => s.clearProductOverrides);

  const id = selectedIds[0];
  const wall = id ? walls[id] : undefined;
  const pp = id ? placedProducts[id] : undefined;
  const ceiling = id ? ceilings[id] : undefined;
  const pce = id ? placedCustoms[id] : undefined;
  const ce = pce ? customCatalog[pce.customElementId] : undefined;

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
        <h3 id="bulk-actions" className="font-mono text-base font-medium text-text-muted">
          Bulk actions
        </h3>
        <div className="font-mono text-[11px] text-accent-light">
          {totalCount} ITEMS SELECTED
          {wallIds.length > 0 && ` (${wallIds.length} WALLS)`}
        </div>

        {wallIds.length > 0 && (
          <div className="space-y-2 border-t border-outline-variant/20 pt-2">
            <div id="paint-walls" className="font-mono text-sm font-medium text-text-muted">Paint all walls</div>
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
          className="w-full font-mono text-sm font-normal text-error tracking-widest py-1 border border-error/30 rounded-sm hover:bg-error/10"
        >
          Delete all ({totalCount})
        </button>
      </div>
    );
  }

  if (!wall && !pp && !ceiling && !pce) return null;

  return (
    <div className="absolute right-3 top-3 z-10 w-64 max-h-[calc(100vh-6rem)] overflow-y-auto glass-panel rounded-sm p-4 space-y-3">
      <h3 id="properties" aria-label="Properties" className="font-mono text-base font-medium text-text-muted">
        Properties
      </h3>

      {ceiling && (
        <div className="space-y-2">
          <div className="font-mono text-xs text-accent-light">
            CEILING {ceiling.id.slice(-4).toUpperCase()}
          </div>
          <h4 id="dimensions" aria-label="Dimensions" className="font-mono text-sm font-medium text-text-muted">
            Dimensions
          </h4>
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
          <h4 id="dimensions" className="font-mono text-sm font-medium text-text-muted">
            Dimensions
          </h4>
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
          </div>
          <h4 id="position" aria-label="Position" className="font-mono text-sm font-medium text-text-muted">
            Position
          </h4>
          <div className="space-y-1.5">
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
              <>
                <h4 id="dimensions" className="font-mono text-sm font-medium text-text-muted">
                  Dimensions
                </h4>
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
                </div>
                <h4 id="material" aria-label="Material" className="font-mono text-sm font-medium text-text-muted">
                  Material
                </h4>
                <div className="space-y-1.5">
                  <Row label="CATEGORY" value={product.category.toUpperCase()} />
                  {product.material && (
                    <Row label="MATERIAL" value={product.material.toUpperCase()} />
                  )}
                </div>
              </>
            )}
            <h4 id="position" className="font-mono text-sm font-medium text-text-muted">
              Position
            </h4>
            <div className="space-y-1.5">
              <Row
                label="POSITION"
                value={`${pp.position.x.toFixed(1)}, ${pp.position.y.toFixed(1)}`}
              />
            </div>
            <h4 id="rotation" aria-label="Rotation" className="font-mono text-sm font-medium text-text-muted">
              Rotation
            </h4>
            <div className="space-y-1.5">
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

      {pce && ce && (
        <div className="space-y-2">
          <div className="font-mono text-xs text-accent-light">
            {ce.name.toUpperCase()}
          </div>
          <h4 id="dimensions" className="font-mono text-sm font-medium text-text-muted">
            Dimensions
          </h4>
          <div className="space-y-1.5">
            <Row label="WIDTH" value={`${ce.width} FT`} />
            <Row label="DEPTH" value={`${ce.depth} FT`} />
            <Row label="HEIGHT" value={`${ce.height} FT`} />
          </div>
          <h4 id="position" className="font-mono text-sm font-medium text-text-muted">
            Position
          </h4>
          <div className="space-y-1.5">
            <Row
              label="POSITION"
              value={`${pce.position.x.toFixed(1)}, ${pce.position.y.toFixed(1)}`}
            />
          </div>
          <h4 id="rotation" className="font-mono text-sm font-medium text-text-muted">
            Rotation
          </h4>
          <div className="space-y-1.5">
            <Row label="ROTATION" value={`${pce.rotation.toFixed(0)}°`} />
          </div>
          <LabelOverrideInput pce={pce} catalogName={ce.name} />
          {(pce.widthFtOverride !== undefined ||
            pce.depthFtOverride !== undefined) && (
            <button
              type="button"
              onClick={() => clearCustomElementOverrides(pce.id)}
              className="w-full font-mono text-sm font-normal text-accent hover:text-accent-light tracking-wider py-1 border border-accent/30 rounded-sm"
            >
              Reset size
            </button>
          )}
        </div>
      )}

      {pp &&
        (pp.widthFtOverride !== undefined || pp.depthFtOverride !== undefined) && (
          <button
            type="button"
            onClick={() => clearProductOverrides(pp.id)}
            className="w-full font-mono text-sm font-normal text-accent hover:text-accent-light tracking-wider py-1 border border-accent/30 rounded-sm"
          >
            Reset size
          </button>
        )}

      <button
        onClick={handleDelete}
        className="w-full py-1.5 rounded-sm font-mono text-sm font-normal bg-red-900/30 text-red-400 border border-red-900/40 hover:bg-red-900/50 transition-colors"
      >
        Delete element
      </button>
    </div>
  );
}

/**
 * Phase 31 CUSTOM-06 — per-placement label override.
 *
 * Live preview on every keystroke via NoHistory (D-09 no debounce).
 * Commit on Enter or blur via the history-pushing variant — exactly ONE
 * history entry per edit session (D-10). Escape rewinds the live-preview
 * via NoHistory back to the original value (mirror Phase 29).
 *
 * Empty string (after trim) commits as `undefined` so the canvas reverts
 * to the catalog name (D-11). Client-enforced 40-char cap (D-12).
 */
function LabelOverrideInput({
  pce,
  catalogName,
}: {
  pce: PlacedCustomElement;
  catalogName: string;
}) {
  const updatePlacedCustomElement = useCADStore(
    (s) => s.updatePlacedCustomElement,
  );
  const updatePlacedCustomElementNoHistory = useCADStore(
    (s) => s.updatePlacedCustomElementNoHistory,
  );
  const [draft, setDraft] = useState<string>(pce.labelOverride ?? "");
  const originalRef = useRef<string | undefined>(pce.labelOverride);
  // Pitfall guard: Escape calls .blur() to clean up focus, which also fires
  // onBlur → commit(). Escape ran cancel() with the pre-edit value, but
  // commit() reads the stale draft closure (still has the typed text). Set
  // this ref in cancel() so onBlur skips commit for the cancellation cycle.
  const skipNextBlurRef = useRef<boolean>(false);

  // Reseed on selection swap.
  useEffect(() => {
    setDraft(pce.labelOverride ?? "");
    originalRef.current = pce.labelOverride;
  }, [pce.id]);

  function commit() {
    if (skipNextBlurRef.current) {
      skipNextBlurRef.current = false;
      return;
    }
    const trimmed = draft.trim();
    const finalValue = trimmed === "" ? undefined : draft.slice(0, 40);
    updatePlacedCustomElement(pce.id, { labelOverride: finalValue });
    originalRef.current = finalValue;
  }

  function cancel() {
    skipNextBlurRef.current = true;
    updatePlacedCustomElementNoHistory(pce.id, {
      labelOverride: originalRef.current,
    });
    setDraft(originalRef.current ?? "");
  }

  // Phase 31 CUSTOM-06 D-10 — programmatic test driver. Bypasses the DOM
  // input but exercises the same store-action sequence the keyboard path
  // uses (NoHistory keystrokes + history-pushing commit).
  useEffect(() => {
    if (import.meta.env.MODE !== "test" || typeof window === "undefined") return;
    (window as unknown as {
      __driveLabelOverride?: {
        typeAndCommit: (
          pceId: string,
          text: string,
          mode: "enter" | "blur",
        ) => void;
      };
    }).__driveLabelOverride = {
      typeAndCommit: (pceId, text, _mode) => {
        // Live preview: one NoHistory write per cumulative prefix.
        for (let i = 1; i <= text.length; i++) {
          updatePlacedCustomElementNoHistory(pceId, {
            labelOverride: text.slice(0, i),
          });
        }
        // Commit: one history-pushing write.
        const trimmed = text.trim();
        const finalValue = trimmed === "" ? undefined : text.slice(0, 40);
        updatePlacedCustomElement(pceId, { labelOverride: finalValue });
        // mode is observational — Enter and blur are identical per D-10.
        void _mode;
      },
    };
    return () => {
      delete (window as unknown as { __driveLabelOverride?: unknown })
        .__driveLabelOverride;
    };
  }, [pce.id, updatePlacedCustomElement, updatePlacedCustomElementNoHistory]);

  return (
    <div className="flex flex-col gap-1">
      <label className="font-mono text-[11px] text-text-ghost tracking-wider">
        LABEL_OVERRIDE
      </label>
      <input
        type="text"
        value={draft}
        maxLength={40}
        placeholder={catalogName.toUpperCase()}
        aria-label="Label override"
        onChange={(e) => {
          const v = e.target.value;
          setDraft(v);
          updatePlacedCustomElementNoHistory(pce.id, { labelOverride: v });
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit();
            (e.target as HTMLInputElement).blur();
          } else if (e.key === "Escape") {
            cancel();
            (e.target as HTMLInputElement).blur();
          }
        }}
        onBlur={commit}
        className="px-2 py-1 font-mono text-[11px] text-text-primary bg-obsidian-deepest border border-outline-variant/30 rounded-sm"
      />
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
